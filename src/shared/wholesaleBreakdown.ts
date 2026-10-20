import type { CartItem, HotelCartItem, TransferCartItem } from '../engine/core/types';
import type { BriefingRoom } from './roomPlan';
import { formatBriefingPaxCompact, formatRoomPlanMix, summarizeRoomPlan, wholesaleTotalFromPlan } from './roomPlan';
import type { DisplayCurrency } from './trm';
import { charmNineTarget } from './cartEngine';
import {
  accommodationMixBreakdown,
  itemPersonRates,
  kitPersonRates,
  occupancyRatesToCurrency,
  optionKitPersonRates,
  packageTierPrices,
  sumPackageTier,
  wholesaleFeePax,
  wholesaleServiceShares,
  wholesaleTierWithOriginal,
  type OccupancyTierRates,
} from './occupancyRates';
import { transfersForHotel } from './hotelTransferKit';

export interface WholesaleBreakdownLine {
  kind: 'section' | 'shared' | 'hotel' | 'kit' | 'tier' | 'mix' | 'fee' | 'ta' | 'total';
  label: string;
  original?: number;
  rounded?: number;
  mayor?: number;
  services?: number;
  kit?: number;
  ta?: number;
  count?: number;
  pp?: number;
  total: number;
  currency: string;
}

export interface WholesaleOptionBreakdown {
  optionIndex: number;
  optionId: string;
  mixLabel: string;
  paxLabel: string;
  currency: string;
  lines: WholesaleBreakdownLine[];
  groupTotal?: number;
  missingHint: string | null;
}

function splitTierUplift(
  original: number | undefined,
  current: number,
  currency: string
): { rounded?: number; mayor?: number } {
  if (original == null || !Number.isFinite(original) || current <= original) return {};
  const disp = (currency || 'COP').toUpperCase() as DisplayCurrency;
  const nineTarget = charmNineTarget(original, disp);
  const roundDelta = nineTarget > original ? nineTarget - original : 0;
  const totalUplift = current - original;
  if (roundDelta > 0 && totalUplift <= roundDelta + (disp === 'USD' ? 0.01 : 1)) {
    return { rounded: totalUplift };
  }
  return {
    rounded: roundDelta > 0 ? roundDelta : undefined,
    mayor: totalUplift - (roundDelta > 0 ? roundDelta : 0) || undefined,
  };
}

function tierPkgPp(
  rates: OccupancyTierRates | undefined,
  code: string
): number | undefined {
  if (!rates) return undefined;
  if (code === 'SGL') return rates.sglPp;
  if (code === 'DBL') return rates.dblPp;
  if (code === 'TPL') return rates.tplPp;
  if (code === 'CHD') return rates.childEqualsAdult ? undefined : rates.chd;
  return undefined;
}

export function buildWholesaleOptionBreakdown(
  optionIndex: number,
  optionId: string,
  hotels: HotelCartItem[],
  allItems: CartItem[],
  feesMayorRedondeo: number,
  pax: number,
  roomPlan: BriefingRoom[] | undefined,
  linePrice: (item: CartItem) => number,
  taUnit: number,
  opts: { displayCurrency: DisplayCurrency; effTrm: number; trmDia?: number },
  tripGuide?: { adults?: number; children?: number; roomPlan?: BriefingRoom[] }
): WholesaleOptionBreakdown {
  const displayCurrency = opts.displayCurrency;
  const effTrm = opts.effTrm;
  const trmDia = opts.trmDia;
  const feePax = wholesaleFeePax(pax, roomPlan);
  const feePp = (Number.isFinite(feesMayorRedondeo) ? feesMayorRedondeo : 0) / Math.max(1, feePax);
  const ta = Number.isFinite(taUnit) ? taUnit : 0;

  const linkedIds = (() => {
    const ids = new Set<string>();
    const transfers = allItems.filter((i): i is TransferCartItem => i.type === 'transfer');
    for (const h of hotels) {
      for (const t of transfersForHotel(h, transfers)) ids.add(t.id);
    }
    return ids;
  })();
  const lines: WholesaleBreakdownLine[] = [];
  const currency = displayCurrency;

  lines.push({ kind: 'section', label: 'Servicios compartidos (todas las opciones)', total: 0, currency });

  for (const item of allItems) {
    if (item.type === 'hotel' || linkedIds.has(item.id)) continue;
    const { adult } = itemPersonRates(item, linePrice(item));
    if (!(adult > 0)) continue;
    const label =
      item.type === 'flight'
        ? `Vuelo · ${item.title || 'vuelo'}`
        : item.type === 'transfer'
          ? `Traslado · ${item.name}`
          : item.type === 'activity'
            ? `Actividad · ${item.name}`
            : item.type === 'insurance'
              ? `Seguro · ${item.name}`
              : item.type === 'tour'
                ? item.isBloqueo
                  ? `Bloqueo aéreo · ${item.name}`
                  : `Circuito · ${item.name}`
                : 'Servicio';
    lines.push({
      kind: 'shared',
      label: `${label} (pp adulto)`,
      services: adult,
      pp: adult,
      total: adult,
      currency,
    });
  }

  if (feePp > 0) {
    lines.push({
      kind: 'fee',
      label: `Mayor valor / redondeo global (÷ ${feePax} pax)`,
      mayor: feePp,
      pp: feePp,
      total: feePp,
      currency,
    });
  }
  if (ta > 0) {
    lines.push({
      kind: 'ta',
      label: 'TA (pp)',
      ta,
      pp: ta,
      total: ta,
      currency,
    });
  }

  const shared = wholesaleServiceShares(hotels, allItems, linePrice, feesMayorRedondeo, feePax, taUnit);
  const optionKit = optionKitPersonRates(hotels, allItems, linePrice);
  const pkgs = hotels.map((hotel) => {
    const ratesDisp = occupancyRatesToCurrency(
      hotel.occupancyRates as OccupancyTierRates | undefined,
      displayCurrency,
      effTrm,
      trmDia
    );
    const kit = kitPersonRates(hotel, allItems, linePrice);
    return {
      hotel,
      ratesDisp,
      kit,
      // Hotel-only for per-hotel rows; combined adds shared + kits once below.
      pkg: packageTierPrices(ratesDisp, 0, 0),
    };
  });

  if (hotels.length > 0) {
    lines.push({ kind: 'section', label: `Opción ${optionIndex + 1} — tarifas hotel`, total: 0, currency });
  }

  for (const { hotel, ratesDisp, kit } of pkgs) {
    lines.push({ kind: 'section', label: hotel.hotelName, total: 0, currency });

    for (const t of wholesaleTierWithOriginal(ratesDisp)) {
      const orig = t.original ?? t.current;
      const split = splitTierUplift(t.original, t.current, t.currency);
      lines.push({
        kind: 'tier',
        label: `Tarifa pp ${t.label} (hotel)`,
        original: orig,
        rounded: split.rounded,
        mayor: split.mayor,
        pp: t.current,
        total: t.current,
        currency: t.currency,
      });
    }

    for (const t of transfersForHotel(
      hotel,
      allItems.filter((i): i is TransferCartItem => i.type === 'transfer')
    )) {
      const { adult } = itemPersonRates(t, linePrice(t));
      if (!(adult > 0)) continue;
      lines.push({
        kind: 'kit',
        label: `Kit traslado · ${t.name} (pp)`,
        kit: adult,
        pp: adult,
        total: adult,
        currency,
      });
    }

    if (kit.adult > 0) {
      void kit;
    }
  }

  const hotelSum = sumPackageTier(pkgs.map((p) => p.pkg));
  const combined = packageTierPrices(
    {
      currency: hotelSum.currency || currency,
      sglPp: hotelSum.sglPp,
      dblPp: hotelSum.dblPp,
      tplPp: hotelSum.tplPp,
      chd: hotelSum.chd,
      childEqualsAdult: hotelSum.childEqualsAdult,
    },
    shared.adultShare + optionKit.adult,
    shared.childShare + optionKit.child
  );
  const mix = accommodationMixBreakdown(roomPlan, combined as OccupancyTierRates);

  if (mix.lines.length > 0) {
    lines.push({ kind: 'section', label: 'Mix según acomodación', total: 0, currency });
    for (const l of mix.lines) {
      const pkgPp = tierPkgPp(combined as OccupancyTierRates, l.code);
      lines.push({
        kind: 'mix',
        label: `${l.code} × ${l.count}`,
        pp: pkgPp,
        count: l.count,
        total: l.total,
        currency,
      });
    }
  }

  const groupTotal = hotels.length === 0 ? undefined : wholesaleTotalFromPlan(roomPlan, combined) ?? undefined;

  const mixLabel = formatRoomPlanMix(roomPlan);
  const planSummary = summarizeRoomPlan(roomPlan ?? []);
  const paxFromGuide = tripGuide ? formatBriefingPaxCompact(tripGuide) : '';
  const paxLabel =
    paxFromGuide ||
    (planSummary.adults + planSummary.children > 0
      ? `${planSummary.adults} adulto${planSummary.adults !== 1 ? 's' : ''}${
          planSummary.children > 0
            ? ` + ${planSummary.children} niño${planSummary.children !== 1 ? 's' : ''}`
            : ''
        }`
      : '');

  if (groupTotal != null) {
    lines.push({
      kind: 'total',
      label: `Total opción ${optionIndex + 1}`,
      total: groupTotal,
      currency,
    });
  }

  return {
    optionIndex,
    optionId,
    mixLabel,
    paxLabel,
    currency,
    lines,
    groupTotal,
    missingHint: null,
  };
}

/** Advisor-only Excel-style breakdown (never sent to WhatsApp / PDF). */
export function renderWholesaleBreakdownTable(
  breakdown: WholesaleOptionBreakdown,
  escape: (s: string) => string,
  formatPrice: (currency: string, amount: number) => string
): string {
  const rows: string[] = [];
  for (const line of breakdown.lines) {
    if (line.kind === 'section') {
      rows.push(
        `<tr class="wb-section"><td colspan="7"><strong>${escape(line.label)}</strong></td></tr>`
      );
      continue;
    }
    if (line.kind === 'total') {
      rows.push(
        `<tr class="wb-total"><td colspan="6"><strong>${escape(line.label)}</strong></td><td class="num"><strong>${escape(formatPrice(line.currency, line.total))}</strong></td></tr>`
      );
      continue;
    }
    const fmt = (n?: number) =>
      n != null && Number.isFinite(n) && n !== 0 ? escape(formatPrice(line.currency, n)) : '—';
    const finalCell =
      line.kind === 'mix' && line.pp != null && line.count
        ? `${escape(formatPrice(line.currency, line.pp))} × ${line.count} = ${escape(formatPrice(line.currency, line.total))}`
        : line.pp != null
          ? escape(formatPrice(line.currency, line.pp))
          : fmt(line.total);
    rows.push(`<tr class="wb-row wb-row--${line.kind}">
      <td>${escape(line.label)}</td>
      <td class="num">${fmt(line.original)}</td>
      <td class="num">${fmt(line.rounded)}</td>
      <td class="num">${fmt(line.mayor)}</td>
      <td class="num">${fmt(line.services ?? line.kit)}</td>
      <td class="num">${fmt(line.ta)}</td>
      <td class="num">${finalCell}</td>
    </tr>`);
  }

  return `<div class="wb-wrap"><table class="wb-table" aria-label="Desglose asesor opción ${breakdown.optionIndex + 1}">
    <thead><tr>
      <th>Concepto</th><th>Original</th><th>…9</th><th>Mayor</th><th>Serv/Kit pp</th><th>TA pp</th><th>Final pp / total</th>
    </tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table></div>`;
}
