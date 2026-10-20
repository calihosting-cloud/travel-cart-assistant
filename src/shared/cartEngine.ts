import type {
  CartItem,
  FlightCartItem,
  HotelCartItem,
  SearchContext,
  TourCartItem,
  TransferCartItem,
} from '../engine/core/types';
import type { HotelCompareOptionGroup } from './quoteOptions';
import type { TaConfig, TaSelection, TaType } from './taConfig';
import { resolveTaUnitCop, suggestTaType } from './taConfig';
import {
  DisplayCurrency,
  copToUsd,
  effectiveTrm,
  usdToCop,
} from './trm';
import { overlayBriefingPax, paxFromBriefingContext } from './tripGuide';
import { transfersForHotel } from './hotelTransferKit';

export const MAYOR_VALOR_ID = 'mayor_valor_cobrado';
export const REDONDEO_ID = 'redondeo';

export interface FeeDefinition {
  id: string;
  label: string;
  defaultValue: number;
}

export const FEE_DEFINITIONS: FeeDefinition[] = [
  { id: MAYOR_VALOR_ID, label: 'Mayor valor cobrado', defaultValue: 0 },
  { id: REDONDEO_ID, label: 'Redondeo', defaultValue: 0 },
];

export function defaultFees(): Record<string, number> {
  const fees: Record<string, number> = {};
  for (const def of FEE_DEFINITIONS) fees[def.id] = def.defaultValue;
  return fees;
}

export function formatCartPrice(currency: string, amount: number): string {
  const cur = (currency || 'COP').toUpperCase();
  const usd = cur === 'USD';
  const formatted = amount.toLocaleString('es-CO', {
    minimumFractionDigits: usd ? 2 : 0,
    maximumFractionDigits: usd ? 2 : 0,
  });
  // Prefer "USD …" over Intl "US$…" for American dollar quotes.
  return usd ? `USD ${formatted}` : `$${formatted}`;
}

/**
 * When accommodations/pax are known: "Total ítem: USD 300 x 5 personas = USD 1.500".
 * Otherwise just "Total ítem: USD 1.500".
 */
export function formatServiceItemTotal(
  currency: string,
  total: number,
  pax: number,
  breakdown: boolean
): string {
  const totalLabel = formatCartPrice(currency, total);
  if (!breakdown || !(pax > 0)) return `Total ítem: ${totalLabel}`;
  const n = Math.max(1, Math.round(pax));
  const pp = total / n;
  return `Total ítem: ${formatCartPrice(currency, pp)} x ${n} persona${n !== 1 ? 's' : ''} = ${totalLabel}`;
}

/** e.g. "Valor original: $ 1.200.000 / USD$ 300,00" (always both sides when TRM > 0). */
export function formatValorOriginalDual(
  amount: number,
  currency: string,
  effTrm: number
): string {
  const from = (currency || 'COP').toUpperCase();
  let cop = amount;
  let usd = amount;
  if (from === 'COP') {
    usd = effTrm > 0 ? copToUsd(amount, effTrm) : amount;
  } else if (from === 'USD') {
    cop = effTrm > 0 ? usdToCop(amount, effTrm) : amount;
    usd = amount;
  }
  const copFmt = Math.round(cop).toLocaleString('es-CO');
  const usdFmt = usd.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Valor original: $ ${copFmt} / USD$ ${usdFmt}`;
}

export function getEffectiveTrm(trmRate: number, trmSuplemento: number): number {
  return effectiveTrm(trmRate, trmSuplemento);
}

/**
 * Colchón FX: (TRM_día + suplemento) / TRM_día.
 * Ejemplo: 3144.28 + 100 → factor ≈ 1.0318 (1000 USD → 1031.80 al cliente).
 */
export function trmCushionFactor(trmDia: number, trmEff: number): number {
  if (!(trmDia > 0) || !(trmEff > 0) || trmEff <= trmDia) return 1;
  return trmEff / trmDia;
}

/**
 * Convert to display currency.
 * With `trmDia`, same-currency amounts also get the FX cushion so the client
 * sees more USD/COP at the day rate without showing the inflated TRM.
 * Mayor valor / fees should keep using copAmountToDisplay (no same-currency cushion).
 */
export function toDisplay(
  amount: number,
  fromCurrency: string,
  displayCurrency: DisplayCurrency,
  effTrm: number,
  trmDia?: number
): { currency: string; price: number } {
  const target = displayCurrency;
  const from = (fromCurrency || 'COP').toUpperCase();
  const dia = trmDia != null && trmDia > 0 ? trmDia : 0;
  const factor = dia > 0 ? trmCushionFactor(dia, effTrm) : 1;

  if (from === target) {
    return { currency: target, price: amount * factor };
  }
  // Without TRM we must not relabel COP as USD (or vice versa) — that created
  // "millions of dollars" from peso magnitudes.
  if (!(effTrm > 0)) return { currency: from, price: amount };
  if (from === 'USD' && target === 'COP') {
    return { currency: 'COP', price: usdToCop(amount, effTrm) };
  }
  if (from === 'COP' && target === 'USD') {
    // COP protegido (= amount × factor) ÷ TRM del día
    if (dia > 0) {
      return { currency: 'USD', price: (amount * factor) / dia };
    }
    return { currency: 'USD', price: copToUsd(amount, effTrm) };
  }
  return { currency: from, price: amount };
}

export function copAmountToDisplay(
  cop: number,
  displayCurrency: DisplayCurrency,
  effTrm: number
): number {
  if (displayCurrency === 'COP') return cop;
  if (!(effTrm > 0)) return cop;
  return copToUsd(cop, effTrm);
}

export function displayAmountToCop(
  amount: number,
  displayCurrency: DisplayCurrency,
  effTrm: number
): number {
  if (displayCurrency === 'COP') return amount;
  if (!(effTrm > 0)) return amount;
  return usdToCop(amount, effTrm);
}

export function getItemNativePrice(item: CartItem): { currency: string; price: number } {
  if (item.type === 'hotel') {
    return { currency: item.selectedRate.currency, price: item.selectedRate.price };
  }
  return { currency: item.currency, price: item.price };
}

export function getItemBasePrice(
  item: CartItem,
  displayCurrency: DisplayCurrency,
  effTrm: number,
  trmDia?: number
): { currency: string; price: number } {
  const native = getItemNativePrice(item);
  return toDisplay(native.price, native.currency, displayCurrency, effTrm, trmDia);
}

export function getItemLineTotal(
  item: CartItem,
  displayCurrency: DisplayCurrency,
  effTrm: number,
  trmDia?: number
): { currency: string; price: number } {
  const base = getItemBasePrice(item, displayCurrency, effTrm, trmDia);
  const mayor = copAmountToDisplay(Math.max(0, Number(item.mayorValor) || 0), displayCurrency, effTrm);
  const redondeo = copAmountToDisplay(Math.max(0, Number(item.redondeo) || 0), displayCurrency, effTrm);
  return { currency: base.currency, price: base.price + mayor + redondeo };
}

export function getTotalsByCurrency(
  items: CartItem[],
  displayCurrency: DisplayCurrency,
  effTrm: number,
  trmDia?: number
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    const { currency, price } = getItemLineTotal(item, displayCurrency, effTrm, trmDia);
    totals.set(currency, (totals.get(currency) || 0) + price);
  }
  return totals;
}

export function getPrimaryCurrency(
  subtotals: Map<string, number>,
  displayCurrency: DisplayCurrency
): string {
  if (subtotals.has(displayCurrency)) return displayCurrency;
  let best: string = displayCurrency;
  let bestValue = -Infinity;
  for (const [currency, value] of subtotals) {
    if (value > bestValue) {
      bestValue = value;
      best = currency;
    }
  }
  return best || displayCurrency;
}

export function getTaPaxCount(
  items: CartItem[],
  tripGuide: SearchContext | null,
  searchContext: SearchContext | null
): number {
  const overlaid = overlayBriefingPax(searchContext, tripGuide);
  const fromBrief =
    paxFromBriefingContext(overlaid) || paxFromBriefingContext(tripGuide);
  if (fromBrief) return Math.max(1, fromBrief.adults + fromBrief.children);

  const flight = items.find((i): i is FlightCartItem => i.type === 'flight');
  if (flight && flight.adults + flight.children + flight.infants > 0) {
    return flight.adults + flight.children + flight.infants;
  }

  return Math.max(1, items.length > 0 ? 1 : 0);
}

/** Vuelo suelto o bloqueo aéreo (cobertura / «hay aéreo»). */
export function cartHasAirService(items: CartItem[]): boolean {
  return items.some(
    (i) => i.type === 'flight' || (i.type === 'tour' && (i as TourCartItem).isBloqueo)
  );
}

/** Bloqueo / cupo aéreo en circuitos (precio ya trae TA). */
export function cartHasBloqueo(items: CartItem[]): boolean {
  return items.some((i) => i.type === 'tour' && (i as TourCartItem).isBloqueo);
}

/**
 * TA cobrada aparte solo con billete de aerolínea (Wingo, Avianca…).
 * Bloqueo/circuito aéreo ya incluye la TA → no sumar de nuevo.
 */
export function cartNeedsTaFee(items: CartItem[]): boolean {
  return items.some((i) => i.type === 'flight');
}

export function getTaTotal(taSelection: TaSelection, pax: number, items?: CartItem[]): number {
  if (items && !cartNeedsTaFee(items)) return 0;
  if (!(taSelection.unitCop > 0)) return 0;
  return Math.round(taSelection.unitCop * pax);
}

/** Hint under TA inputs (cart + panel). */
export function taFeeHintForItems(items: CartItem[]): string {
  if (cartNeedsTaFee(items)) return '';
  if (cartHasBloqueo(items)) return ' · TA = 0 (ya incluida en el bloqueo/circuito).';
  return ' · Se suma solo si hay vuelo de aerolínea (no bloqueo).';
}

/** Fees (mayor+redondeo+TA) converted to display currency. */
export function getFeesTotalDisplay(
  fees: Record<string, number>,
  taTotalCop: number,
  displayCurrency: DisplayCurrency,
  effTrm: number
): number {
  const base = FEE_DEFINITIONS.reduce((sum, def) => sum + (fees[def.id] || 0), 0);
  return copAmountToDisplay(base + taTotalCop, displayCurrency, effTrm);
}

export function roundUnit(displayCurrency: DisplayCurrency): number {
  return displayCurrency === 'USD' ? 10 : 10_000;
}

/**
 * Psychological price ending in 9:
 * - COP: next decena de mil − 1.000 → …9.000 (e.g. 1.254.675 → 1.259.000)
 * - USD: next decena − 1 → …9 (e.g. 1345 → 1349)
 */
export function charmNineTarget(amount: number, displayCurrency: DisplayCurrency): number {
  const unit = roundUnit(displayCurrency);
  const offset = displayCurrency === 'USD' ? 1 : 1_000;
  let target = Math.ceil(amount / unit) * unit - offset;
  if (target < amount) target += unit;
  return displayCurrency === 'USD' ? Math.round(target * 100) / 100 : Math.round(target);
}

/** Excess (display currency) to reach charm-9 from base+mayor. */
export function charmNineExcess(amount: number, displayCurrency: DisplayCurrency): number {
  return Math.max(0, charmNineTarget(amount, displayCurrency) - amount);
}

/** Excess to store as Redondeo (COP) to reach next round unit. */
export function computeRoundingExcessCop(
  items: CartItem[],
  fees: Record<string, number>,
  taTotalCop: number,
  displayCurrency: DisplayCurrency,
  effTrm: number
): number {
  const subtotals = getTotalsByCurrency(items, displayCurrency, effTrm);
  if (subtotals.size === 0) return 0;
  const primary = getPrimaryCurrency(subtotals, displayCurrency);
  const itemsTotal = subtotals.get(primary) || 0;
  const mayorValor = copAmountToDisplay(fees[MAYOR_VALOR_ID] || 0, displayCurrency, effTrm);
  const taTotal = copAmountToDisplay(taTotalCop, displayCurrency, effTrm);
  const base = itemsTotal + mayorValor + taTotal;
  const unit = roundUnit(displayCurrency);
  const rounded = Math.ceil(base / unit) * unit;
  const excessDisplay = Math.max(0, rounded - base);
  return displayAmountToCop(excessDisplay, displayCurrency, effTrm);
}

export function applyTaType(
  taConfig: TaConfig,
  type: TaType,
  effTrm: number
): TaSelection {
  return {
    type,
    unitCop: resolveTaUnitCop(taConfig, type, effTrm),
  };
}

export function suggestTaFromItems(items: CartItem[]): TaType | null {
  const flight = items.find((i): i is FlightCartItem => i.type === 'flight');
  if (!flight) return null;
  return suggestTaType({
    routeType: flight.routeType,
    originCode: flight.origin.code,
    destinationCode: flight.destination.code,
  });
}

function normalizeChildAges(ages?: number[]): number[] {
  if (!Array.isArray(ages)) return [];
  return ages.filter((a) => typeof a === 'number' && a >= 0);
}

/** Sticky flight guide wins; enrich ages from search/hotels when missing. */
export function headerSearchContext(
  tripGuide: SearchContext | null,
  searchContext: SearchContext | null,
  items: CartItem[]
): SearchContext | null {
  const guide = tripGuide;
  const search = searchContext;
  if (!guide) return search;

  const guideAges = normalizeChildAges(guide.childrenAges).filter((a) => a > 0);
  if (guideAges.length > 0) return { ...guide, childrenAges: normalizeChildAges(guide.childrenAges) };

  const fromSearch = normalizeChildAges(search?.childrenAges).filter((a) => a > 0);
  if (fromSearch.length > 0 && guide.totalChildren > 0) {
    return {
      ...guide,
      childrenAges: fromSearch.slice(0, guide.totalChildren),
    };
  }

  const fromHotels = normalizeChildAges(
    items
      .filter((i): i is HotelCartItem => i.type === 'hotel')
      .flatMap((h) => h.occupancy.flatMap((o) => o.childrenAges ?? []))
  );
  if (fromHotels.length > 0) {
    return {
      ...guide,
      childrenAges: fromHotels,
      totalChildren: Math.max(guide.totalChildren, fromHotels.length),
    };
  }

  return guide;
}

export function itemTotalsMap(
  items: CartItem[],
  displayCurrency: DisplayCurrency,
  effTrm: number
): Record<string, number> {
  return Object.fromEntries(
    items.map((item) => [item.id, getItemLineTotal(item, displayCurrency, effTrm).price])
  );
}

/**
 * Kit transfers (linked to a cart hotel) are exclusive to options that include
 * that hotel. Unlinked transfers (and flights, seguros, etc.) are shared.
 */
function partitionCompareServices(items: CartItem[]): {
  hotels: HotelCartItem[];
  transfers: TransferCartItem[];
  kitTransferIds: Set<string>;
  shared: CartItem[];
} {
  const hotels = items.filter((i): i is HotelCartItem => i.type === 'hotel');
  const transfers = items.filter((i): i is TransferCartItem => i.type === 'transfer');
  const kitTransferIds = new Set<string>();
  for (const hotel of hotels) {
    for (const t of transfersForHotel(hotel, transfers)) {
      kitTransferIds.add(t.id);
    }
  }
  const shared = items.filter((i) => i.type !== 'hotel' && !kitTransferIds.has(i.id));
  return { hotels, transfers, kitTransferIds, shared };
}

function kitTransferSumForHotels(
  hotels: HotelCartItem[],
  transfers: TransferCartItem[],
  kitTransferIds: Set<string>,
  displayCurrency: DisplayCurrency,
  effTrm: number
): number {
  if (hotels.length === 0 || kitTransferIds.size === 0) return 0;
  let sum = 0;
  const counted = new Set<string>();
  for (const hotel of hotels) {
    for (const t of transfersForHotel(hotel, transfers)) {
      if (!kitTransferIds.has(t.id) || counted.has(t.id)) continue;
      counted.add(t.id);
      sum += getItemLineTotal(t, displayCurrency, effTrm).price;
    }
  }
  return sum;
}

/**
 * Option item subtotals: shared services (vuelo, seguro, traslado suelto…)
 * + hotels of the option + kit transfers of those hotels only.
 * `feesAddDisplay` (mayor/redondeo) se suma a cada opción (alternativa de paquete).
 */
export function compareOptionSubtotals(
  items: CartItem[],
  groups: HotelCompareOptionGroup[],
  displayCurrency: DisplayCurrency,
  effTrm: number,
  feesAddDisplay = 0
): Array<{ index: number; subtotal: number }> {
  const { hotels, transfers, kitTransferIds, shared } = partitionCompareServices(items);
  const sharedSum = shared.reduce(
    (s, i) => s + getItemLineTotal(i, displayCurrency, effTrm).price,
    0
  );
  const fees = Number.isFinite(feesAddDisplay) ? Math.max(0, feesAddDisplay) : 0;

  return groups.map((g, index) => {
    const groupHotels = hotels.filter((h) => g.hotelIds.includes(h.id));
    const hotelSum = groupHotels.reduce(
      (s, h) => s + getItemLineTotal(h, displayCurrency, effTrm).price,
      0
    );
    const kitSum = kitTransferSumForHotels(
      groupHotels,
      transfers,
      kitTransferIds,
      displayCurrency,
      effTrm
    );
    return { index: index + 1, subtotal: sharedSum + hotelSum + kitSum + fees };
  });
}

/** Option totals when comparing hotels (same kit rules as subtotals + fees). */
export function compareOptionTotals(
  items: CartItem[],
  groups: HotelCompareOptionGroup[],
  feesTotalDisplay: number,
  displayCurrency: DisplayCurrency,
  effTrm: number
): Array<{ index: number; id: string; hotelNames: string[]; total: number; perPerson: number; pax: number }> {
  const { hotels, transfers, kitTransferIds, shared } = partitionCompareServices(items);
  const sharedSum = shared.reduce(
    (s, i) => s + getItemLineTotal(i, displayCurrency, effTrm).price,
    0
  );
  const pax = getTaPaxCount(items, null, null);
  const fees = Number.isFinite(feesTotalDisplay) ? Math.max(0, feesTotalDisplay) : 0;

  return groups.map((g, index) => {
    const groupHotels = hotels.filter((h) => g.hotelIds.includes(h.id));
    const hotelSum = groupHotels.reduce(
      (s, h) => s + getItemLineTotal(h, displayCurrency, effTrm).price,
      0
    );
    const kitSum = kitTransferSumForHotels(
      groupHotels,
      transfers,
      kitTransferIds,
      displayCurrency,
      effTrm
    );
    const total = sharedSum + hotelSum + kitSum + fees;
    return {
      index: index + 1,
      id: g.id,
      hotelNames: groupHotels.map((h) => h.hotelName),
      total,
      perPerson: Math.round(total / Math.max(1, pax)),
      pax: Math.max(1, pax),
    };
  });
}
