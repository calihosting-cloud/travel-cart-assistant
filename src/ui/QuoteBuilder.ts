import {
  CartItem,
  FlightCartItem,
  HotelCartItem,
  SearchContext,
  TourCartItem,
  TransferCartItem,
} from '../engine/core/types';
import { formatQuoteRef } from '../shared/quoteHistory';
import { QuoteLine } from '../shared/quoteConfig';
import {
  displayHotelBoardBasis,
  displayHotelRoomType,
  occupancyHintOptsFromPlan,
  occupancyRatesStatus,
  commercialRoomLabel,
  approxCommissionAmount,
  summarizeWholesaleOption,
  type CommissionApproxKind,
  type OccupancyTierRates,
} from '../shared/occupancyRates';
import { transfersForHotel, collectComboToursFromItems, collectTourLabelsFromItems } from '../shared/hotelTransferKit';
import {
  formatRoomPlanSummary,
  formatWholesaleClientTotalLead,
  hasAccommodationPlan,
  normalizeRoomPlan,
} from '../shared/roomPlan';
import { DEFAULT_QUOTE_MODE, type QuoteMode } from '../shared/quoteMode';
import { paxFromBriefingContext } from '../shared/tripGuide';
import { mainCityLabel } from '../shared/mainCity';
import { getItemBasePrice } from '../shared/cartEngine';
import { formatBloqueoItineraryLines } from '../shared/tourBloqueo';

export interface QuoteBuildInput {
  items: CartItem[];
  searchContext: SearchContext | null;
  /** Items subtotal by currency (before fees). */
  subtotals: Map<string, number>;
  /** Fee total applied to primary currency (mayor valor + redondeo + TA×pax). */
  feesTotal: number;
  /**
   * Mayor valor + redondeo (display currency) folded into Tarifa pp in mayorista.
   * When omitted, derived as feesTotal − taUnit×pax (same as retail).
   * Must not be forced to 0 in wholesale — opciones UI already includes it.
   */
  feesMayorRedondeo?: number;
  /** TA per person in display currency; 0 when there is no air. Wholesale adds this unit, not ÷pax. */
  taUnit?: number;
  primaryCurrency: string;
  quoteLines: QuoteLine[];
  /** Optional override for the cotización title destination. */
  destinationOverride?: string;
  optionLabel?: string;
  quoteNumber?: number;
  advisorName?: string;
  /** Agency / brand shown on the PDF header (replaces hardcoded GRUPOS TRAVEL). */
  agencyName?: string;
  /** COP per 1 USD — TRM del día shown to client when enabled. */
  trm?: number;
  /** TRM del día for FX cushion math (always pass when known). */
  trmDia?: number;
  /** TRM efectiva (día + suplemento) for price math; falls back to `trm`/`trmDia`. */
  trmEff?: number;
  /** When true, append COP↔USD equivalent lines (default off). */
  includeUsdEquiv?: boolean;
  /** Treat each option group as shared services + its hotels (multi-hotel per option). */
  hotelsAsOptions?: boolean;
  /** Option columns when comparing; hotel ids may appear in more than one group. */
  hotelOptionGroups?: Array<{ id: string; hotelIds: string[] }>;
  /** Final line totals (after currency conversion and item adjustments), by item id. */
  itemTotals?: Record<string, number>;
  /** retail = total÷pax; wholesale = DBL/TPL/CHD package lines. */
  quoteMode?: QuoteMode;
  /** Mayorista: incluir total DBL×n + CHD×n (solo si el asesor lo marca en Acomodación). */
  includeOccupancyTotal?: boolean;
  /** Mayorista: mostrar comisión aproximada (requiere includeOccupancyTotal). */
  includeCommissionApprox?: boolean;
  /** freelance 10% | agency 12% — solo servicios (sin aéreos/bloqueos). */
  commissionApproxKind?: CommissionApproxKind | null;
  /** Texto libre tras 💰*DEPÓSITO INICIAL:* en cotización mayorista. */
  initialDeposit?: string;
  /** Mayorista: redondear Tarifa pp (paquete) a …9. Default true. */
  autoRoundOccupancy?: boolean;
  /** Con auto off: ids de opción con redondeo manual de Tarifa pp. */
  manualPackageRoundIds?: string[];
  /** Incluir anexo de coberturas de asistencia al final del PDF. */
  includePdfInsuranceAnnex?: boolean;
  /** Airline logo data URLs keyed by IATA (filled before PDF HTML). */
  airlineLogos?: Record<string, string>;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Today as DD/MM/YYYY. */
export function formatQuoteDate(d = new Date()): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** DD-MM-YYYY → human range helper pieces. */
function parseDdMmYyyy(s?: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function parseIsoDate(s?: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatDayMonth(d: Date, withYear = false): string {
  const base = `${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`;
  return withYear ? `${base} de ${d.getFullYear()}` : base;
}

/** e.g. "19 al 23 de octubre de 2026" or "19 de octubre de 2026 al 5 de noviembre de 2026". */
export function formatTravelDates(from?: Date | null, to?: Date | null): string {
  if (!from) return '';
  if (!to) return formatDayMonth(from, true);
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${from.getDate()} al ${to.getDate()} de ${MONTHS_ES[from.getMonth()]} de ${from.getFullYear()}`;
  }
  if (from.getFullYear() === to.getFullYear()) {
    return `${from.getDate()} de ${MONTHS_ES[from.getMonth()]} al ${to.getDate()} de ${MONTHS_ES[to.getMonth()]} de ${from.getFullYear()}`;
  }
  return `${formatDayMonth(from, true)} al ${formatDayMonth(to, true)}`;
}

function formatMoney(currency: string, amount: number): string {
  const usd = currency.toUpperCase() === 'USD';
  const formatted = amount.toLocaleString('es-CO', {
    minimumFractionDigits: usd ? 2 : 0,
    maximumFractionDigits: usd ? 2 : 0,
  });
  return usd ? `USD ${formatted}` : `$${formatted}`;
}

function stars(n?: number): string {
  if (!n || n <= 0) return '';
  return ' ' + '★'.repeat(Math.min(5, Math.round(n)));
}

function roomCapacityLabel(adults: number, children: number): string {
  return commercialRoomLabel(adults, children).toUpperCase();
}

/** Per-room occupancy for WhatsApp, e.g. "Hab 1: DOBLE · 2 adultos · Hab 2: TRIPLE · 3 adultos". */
function occupancyLabel(hotel: HotelCartItem): string {
  if (hotel.occupancy.length === 0) return 'DOBLE';
  if (hotel.occupancy.length === 1) {
    const room = hotel.occupancy[0];
    return roomCapacityLabel(room.adults, room.children);
  }
  return hotel.occupancy
    .map((room, i) => {
      const pax: string[] = [];
      if (room.adults > 0) pax.push(`${room.adults} adulto${room.adults !== 1 ? 's' : ''}`);
      if (room.children > 0) pax.push(`${room.children} niño${room.children !== 1 ? 's' : ''}`);
      return `Hab ${i + 1}: ${roomCapacityLabel(room.adults, room.children)}${
        pax.length ? ` · ${pax.join(', ')}` : ''
      }`;
    })
    .join(' · ');
}

export interface QuotePaxBreakdown {
  adults: number;
  children: number;
  infants: number;
}

export function resolveQuotePaxBreakdown(
  items: CartItem[],
  ctx: SearchContext | null,
  quoteMode: QuoteMode
): QuotePaxBreakdown {
  const fromBrief = paxFromBriefingContext(ctx);
  if (fromBrief) return fromBrief;

  const flight = items.find((i): i is FlightCartItem => i.type === 'flight');
  if (flight && flight.adults + flight.children + flight.infants > 0) {
    return {
      adults: flight.adults,
      children: flight.children,
      infants: flight.infants,
    };
  }

  if (quoteMode !== 'wholesale') {
    const hotel = items.find((i): i is HotelCartItem => i.type === 'hotel');
    if (hotel) {
      const adults = hotel.occupancy.reduce((s, o) => s + o.adults, 0);
      const children = hotel.occupancy.reduce((s, o) => s + o.children, 0);
      if (adults + children > 0) return { adults, children, infants: 0 };
    }
  }

  return { adults: 1, children: 0, infants: 0 };
}

/** Paying pax for per-person rate (adults + children; infants excluded). */
export function quotePayingPax(pax: QuotePaxBreakdown): number {
  return Math.max(1, pax.adults + pax.children);
}

export function formatQuotePaxBreakdown(pax: QuotePaxBreakdown): string {
  const parts: string[] = [];
  if (pax.adults > 0) {
    parts.push(`${pax.adults} adulto${pax.adults !== 1 ? 's' : ''}`);
  }
  if (pax.children > 0) {
    parts.push(`${pax.children} niño${pax.children !== 1 ? 's' : ''}`);
  }
  if (pax.infants > 0) {
    parts.push(`${pax.infants} bebé${pax.infants !== 1 ? 's' : ''}`);
  }
  return parts.join(', ') || '1 adulto';
}

function resolveNights(
  items: CartItem[],
  ctx: SearchContext | null,
  from: Date | null,
  to: Date | null
): number {
  if (ctx?.nights && ctx.nights > 0) return ctx.nights;

  const hotel = items.find((i): i is HotelCartItem => i.type === 'hotel');
  if (hotel?.nights && hotel.nights > 0) return hotel.nights;

  const tour = items.find((i): i is TourCartItem => i.type === 'tour');
  if (tour?.nights != null && tour.nights > 0) return tour.nights;

  if (from && to) {
    const diff = Math.round((to.getTime() - from.getTime()) / 86_400_000);
    if (diff > 0) return diff;
  }

  return 0;
}

function resolveDestination(items: CartItem[], ctx: SearchContext | null, override?: string): string {
  if (override?.trim()) return mainCityLabel(override) || override.trim();
  if (ctx?.destinationText?.trim()) {
    const city = mainCityLabel(ctx.destinationText);
    if (city) return city;
  }
  const tour = items.find((i): i is TourCartItem => i.type === 'tour');
  if (tour?.destinationCity) return mainCityLabel(tour.destinationCity) || tour.destinationCity;
  const flight = items.find((i): i is FlightCartItem => i.type === 'flight');
  if (flight) {
    const name = flight.destination.name || flight.destination.code || flight.title;
    return mainCityLabel(name) || name;
  }
  return '';
}

/** "Cartagena, Bolívar, Colombia" → "CARTAGENA" */
function formatDestHeadline(destination: string): string {
  const primary = mainCityLabel(destination) || destination.split(',')[0]?.trim() || destination;
  return primary.toLocaleUpperCase('es-CO');
}

function resolveDateRange(items: CartItem[], ctx: SearchContext | null): { from: Date | null; to: Date | null } {
  const fromCtx = parseDdMmYyyy(ctx?.checkIn);
  const toCtx = parseDdMmYyyy(ctx?.checkOut);
  if (fromCtx) return { from: fromCtx, to: toCtx };

  const hotel = items.find((i): i is HotelCartItem => i.type === 'hotel');
  if (hotel) {
    return { from: parseDdMmYyyy(hotel.checkIn), to: parseDdMmYyyy(hotel.checkOut) };
  }

  const tour = items.find((i): i is TourCartItem => i.type === 'tour');
  if (tour) {
    return {
      from: parseDdMmYyyy(tour.departureDate),
      to: parseDdMmYyyy(tour.returnDate) || parseDdMmYyyy(tour.departureDate),
    };
  }

  const flight = items.find((i): i is FlightCartItem => i.type === 'flight');
  if (flight) {
    return {
      from: parseIsoDate(flight.departureDate),
      to: parseIsoDate(flight.returnDate) || parseIsoDate(flight.departureDate),
    };
  }

  const transfer = items.find((i): i is TransferCartItem => i.type === 'transfer');
  if (transfer) {
    return { from: parseDdMmYyyy(transfer.checkIn), to: parseDdMmYyyy(transfer.checkOut) };
  }

  return { from: null, to: null };
}

export function formatFlightStopsLabel(stops: number | undefined): string {
  if (stops == null || !Number.isFinite(stops)) return '';
  if (stops === 0) return 'Directo';
  return `${stops} escala${stops !== 1 ? 's' : ''}`;
}

export function formatFlightLegLine(flight: FlightCartItem, direction: 'outbound' | 'return'): string {
  const leg = flight.legs.find((l) => l.direction === direction);
  if (!leg) return '';
  const first = leg.segments[0];
  const last = leg.segments[leg.segments.length - 1];
  const airline = leg.airlines[0] || first?.airlineName || first?.airlineCode || '';
  const num = first?.flightNumber || '';
  const dep = first?.departure;
  const arr = last?.arrival;
  const parts = [
    airline && num ? `${airline} ${num}` : airline || num,
    dep ? `${dep.airportCode} ${dep.hour || ''}`.trim() : '',
    arr ? `→ ${arr.airportCode} ${arr.hour || ''}`.trim() : '',
    leg.dateLabel || '',
    formatFlightStopsLabel(leg.stops),
  ].filter(Boolean);
  return parts.join(' · ');
}

/** Prefer per-leg baggage; avoid trip-level union when legs already differ. */
export function flightBaggageForDirection(
  flight: FlightCartItem,
  direction: 'outbound' | 'return'
): string[] {
  const leg = flight.legs.find((l) => l.direction === direction);
  if (leg?.baggageIncluded?.length) return leg.baggageIncluded;
  const anyLegHasBag = flight.legs.some((l) => (l.baggageIncluded || []).length > 0);
  if (anyLegHasBag) return [];
  return flight.baggageIncluded || [];
}

export function formatFlightBaggageLines(flight: FlightCartItem): string[] {
  const ida = flightBaggageForDirection(flight, 'outbound');
  const vuelta = flightBaggageForDirection(flight, 'return');
  const lines: string[] = [];
  const same =
    ida.length > 0 &&
    vuelta.length > 0 &&
    ida.join('|') === vuelta.join('|');
  if (same) {
    lines.push(`🎒 *_Equipaje (ida y regreso):_* ${ida.join(' · ')}`);
    return lines;
  }
  if (ida.length) lines.push(`🎒 *_Equipaje ida:_* ${ida.join(' · ')}`);
  if (vuelta.length) lines.push(`🎒 *_Equipaje regreso:_* ${vuelta.join(' · ')}`);
  if (!lines.length && flight.baggageIncluded?.length) {
    lines.push(`🎒 *_Equipaje cotizado:_* ${flight.baggageIncluded.join(' · ')}`);
  }
  return lines;
}

function lineText(line: QuoteLine): string {
  const emoji = line.emoji ? `${line.emoji} ` : '';
  return `${emoji}${line.text}`.trim();
}

function appendMoneyEquiv(
  lines: string[],
  moneyCurrency: string,
  grandTotal: number,
  trm: number | undefined
): void {
  if (!(trm && trm > 0)) return;
  if (moneyCurrency === 'USD') {
    lines.push(
      `💱 *Equivalente COP (TRM ${Math.round(trm).toLocaleString('es-CO')}):*  ${formatMoney('COP', Math.round(grandTotal * trm))}`
    );
  } else if (moneyCurrency === 'COP') {
    lines.push(
      `💱 *Equivalente USD (TRM ${Math.round(trm).toLocaleString('es-CO')}):*  ${formatMoney('USD', Math.round((grandTotal / trm) * 100) / 100)}`
    );
  }
}

function appendWholesaleAgencyRates(
  lines: string[],
  pkg: {
    currency?: string;
    sglPp?: number;
    dblPp?: number;
    tplPp?: number;
    qplPp?: number;
    chd?: number;
    childEqualsAdult?: boolean;
  },
  moneyCurrency: string,
  roomPlan?: SearchContext['roomPlan'],
  ratesForHints?: OccupancyTierRates,
  opts?: {
    includeOccupancyTotal?: boolean;
    groupTotal?: number;
  }
): void {
  const includeTotal = opts?.includeOccupancyTotal === true;
  const status = occupancyRatesStatus(ratesForHints);
  const hintOpts = occupancyHintOptsFromPlan(roomPlan);
  const cur = pkg.currency || moneyCurrency;

  if (pkg.sglPp != null) {
    lines.push(
      `👤 *Tarifa por persona en acomodación _SENCILLA_:*  ${formatMoney(cur, pkg.sglPp)}`
    );
  }
  if (pkg.dblPp != null) {
    lines.push(
      `👥 *Tarifa por persona en acomodación _DOBLE_:*  ${formatMoney(cur, pkg.dblPp)}`
    );
  }
  if (pkg.tplPp != null) {
    lines.push(
      `👪 *Tarifa por persona en acomodación _TRIPLE_:*  ${formatMoney(cur, pkg.tplPp)}`
    );
  }
  if (pkg.qplPp != null) {
    lines.push(
      `👨‍👩‍👧‍👦 *Tarifa por persona en acomodación _CUÁDRUPLE_:*  ${formatMoney(cur, pkg.qplPp)}`
    );
  }
  if (pkg.childEqualsAdult) {
    lines.push(`👶 _Tarifa por persona en acomodación NIÑO = tarifa adulto._`);
  } else if (pkg.chd != null) {
    lines.push(
      `👶 *Tarifa por persona en acomodación _NIÑO_:*  ${formatMoney(cur, pkg.chd)}`
    );
  }

  if (hintOpts.requireSgl && !status.hasSgl) {
    lines.push(`⚠️ _Falta tarifa SGL — busca 1 hab · 1 adulto y +🛒, o edítala en el carrito._`);
  }
  if (hintOpts.requireDbl && !status.hasDbl) {
    lines.push(`⚠️ _Falta tarifa DBL — busca 1 hab · 2 adultos y +🛒, o edítala en el carrito._`);
  }
  if (hintOpts.requireTpl && !status.hasTpl) {
    lines.push(`⚠️ _Falta tarifa TPL — busca 1 hab · 3 adultos y +🛒, o edítala en el carrito._`);
  }
  if (hintOpts.requireQpl && !status.hasQpl) {
    lines.push(`⚠️ _Falta tarifa QPL — busca 1 hab · 4 adultos y +🛒, o edítala en el carrito._`);
  }

  if (includeTotal && opts?.groupTotal != null) {
    const lead =
      formatWholesaleClientTotalLead(roomPlan) ||
      (hasAccommodationPlan({ roomPlan })
        ? `Valor para ${formatRoomPlanSummary(normalizeRoomPlan(roomPlan))}`
        : 'Valor total');
    lines.push(`💰 *${lead} = ${formatMoney(pkg.currency || moneyCurrency, opts.groupTotal)}*`);
  }
}

/**
 * Mensaje WhatsApp aparte (confidencial): comisión por opción.
 * No va en la cotización del pasajero — pegar en un segundo mensaje.
 */
export function buildCommissionApproxWhatsApp(input: QuoteBuildInput): string | null {
  const {
    items,
    searchContext,
    feesTotal,
    primaryCurrency,
    hotelOptionGroups,
    itemTotals = {},
    quoteMode = DEFAULT_QUOTE_MODE,
    taUnit = 0,
    includeOccupancyTotal = false,
    includeCommissionApprox = false,
    commissionApproxKind = null,
    autoRoundOccupancy,
    manualPackageRoundIds,
    hotelsAsOptions = false,
  } = input;

  if (
    quoteMode !== 'wholesale' ||
    !includeOccupancyTotal ||
    !includeCommissionApprox ||
    (commissionApproxKind !== 'freelance' && commissionApproxKind !== 'agency')
  ) {
    return null;
  }

  const moneyCurrency = primaryCurrency || 'COP';
  const trmEff =
    input.trmEff && input.trmEff > 0
      ? input.trmEff
      : input.trmDia && input.trmDia > 0
        ? input.trmDia
        : input.trm && input.trm > 0
          ? input.trm
          : 0;
  const trmDia =
    input.trmDia && input.trmDia > 0
      ? input.trmDia
      : input.trm && input.trm > 0
        ? input.trm
        : undefined;
  const pax = quotePayingPax(resolveQuotePaxBreakdown(items, searchContext, quoteMode));
  const feesMayorRedondeo =
    input.feesMayorRedondeo != null && Number.isFinite(input.feesMayorRedondeo)
      ? Math.max(0, input.feesMayorRedondeo)
      : Math.max(0, (feesTotal || 0) - (taUnit || 0) * Math.max(1, pax));

  const hotels = items.filter((i): i is HotelCartItem => i.type === 'hotel');
  if (hotels.length === 0) return null;
  const byId = new Map(hotels.map((h) => [h.id, h]));
  const optionBlocks =
    (hotelsAsOptions || hotelOptionGroups) && hotelOptionGroups && hotelOptionGroups.length > 0
      ? hotelOptionGroups
          .map((g, idx) => {
            const groupHotels = g.hotelIds
              .map((id) => byId.get(id))
              .filter((h): h is HotelCartItem => !!h);
            if (groupHotels.length === 0) return null;
            return { index: idx + 1, hotels: groupHotels, optionId: g.id };
          })
          .filter((b): b is { index: number; hotels: HotelCartItem[]; optionId: string } => !!b)
      : hotels.map((h, idx) => ({ index: idx + 1, hotels: [h], optionId: h.id }));

  const lines: string[] = [
    '🔒 *Comisión aproximada (confidencial — no enviar al pasajero)*',
    '',
  ];

  let any = false;
  for (const block of optionBlocks) {
    const roundCharmNine =
      autoRoundOccupancy !== false ||
      (manualPackageRoundIds || []).includes(block.optionId);
    const sum = summarizeWholesaleOption(
      block.hotels,
      items,
      feesMayorRedondeo,
      pax,
      searchContext?.roomPlan,
      (item) => itemTotals[item.id] || 0,
      taUnit || 0,
      (item) =>
        getItemBasePrice(
          item,
          moneyCurrency === 'USD' ? 'USD' : 'COP',
          trmEff,
          trmDia
        ).price,
      {
        displayCurrency: moneyCurrency,
        effTrm: trmEff,
        trmDia,
        roundCharmNine,
      }
    );
    const commission = approxCommissionAmount(
      sum.commissionableGroupTotal,
      commissionApproxKind
    );
    if (commission == null) continue;
    any = true;
    const hotelNames = block.hotels.map((h) => h.hotelName).filter(Boolean).join(' · ');
    lines.push(
      hotelNames
        ? `*OPCIÓN ${block.index}* · ${hotelNames}`
        : `*OPCIÓN ${block.index}*`
    );
    lines.push(
      `💼 *Valor aproximado de comisión:*  ${formatMoney(sum.currency || moneyCurrency, commission)}`
    );
    lines.push('');
  }

  if (!any) return null;
  return lines.join('\n').trim() + '\n';
}

/**
 * Builds a WhatsApp-ready cotización (markdown-ish *bold* / _italic_) from
 * the cart grand total + enabled include/exclude/policy lines.
 */
export function buildWhatsAppQuote(input: QuoteBuildInput): string {
  const {
    items,
    searchContext,
    subtotals,
    feesTotal,
    primaryCurrency,
    quoteLines,
    destinationOverride,
    optionLabel = 'OPCIÓN 1',
    quoteNumber,
    advisorName,
    trm,
    includeUsdEquiv = false,
    hotelsAsOptions = false,
    hotelOptionGroups,
    itemTotals = {},
    quoteMode = DEFAULT_QUOTE_MODE,
    taUnit = 0,
    includeOccupancyTotal = false,
    initialDeposit = '',
    autoRoundOccupancy,
    manualPackageRoundIds,
  } = input;

  const trmEff =
    input.trmEff && input.trmEff > 0
      ? input.trmEff
      : input.trmDia && input.trmDia > 0
        ? input.trmDia
        : trm && trm > 0
          ? trm
          : 0;
  const trmDia =
    input.trmDia && input.trmDia > 0
      ? input.trmDia
      : trm && trm > 0
        ? trm
        : undefined;

  const wholesale = quoteMode === 'wholesale';
  const destination = resolveDestination(items, searchContext, destinationOverride);
  const destTitle = destination ? formatDestHeadline(destination) : '';
  const { from, to } = resolveDateRange(items, searchContext);
  const travelDates = formatTravelDates(from, to) || 'por confirmar';
  const nights = resolveNights(items, searchContext, from, to);
  const quoteDate = formatQuoteDate();

  const itemsTotal = subtotals.get(primaryCurrency) || 0;
  const grandTotal = itemsTotal + (primaryCurrency ? feesTotal : 0);
  const paxBreakdown = resolveQuotePaxBreakdown(items, searchContext, quoteMode);
  const pax = quotePayingPax(paxBreakdown);
  const perPerson = grandTotal / pax;
  const moneyCurrency = primaryCurrency || 'COP';

  const hotels = items.filter((i): i is HotelCartItem => i.type === 'hotel');
  const flights = items.filter((i): i is FlightCartItem => i.type === 'flight');
  const flight = flights[0];
  const allTransfers = items.filter((i): i is TransferCartItem => i.type === 'transfer');
  const linkedTransferIds = new Set<string>();
  for (const hotel of hotels) {
    for (const t of transfersForHotel(hotel, allTransfers)) linkedTransferIds.add(t.id);
  }
  const transfers = allTransfers.filter((t) => !linkedTransferIds.has(t.id));
  const activities = items.filter((i) => i.type === 'activity');
  const tours = items.filter((i): i is TourCartItem => i.type === 'tour');
  const tour = tours[0];
  const insurances = items.filter((i) => i.type === 'insurance');
  const hasPricedItems = items.length > 0 && grandTotal > 0;

  const includes = quoteLines.filter((l) => l.kind === 'include' && l.enabled);
  const excludes = quoteLines.filter((l) => l.kind === 'exclude' && l.enabled);
  const policies = quoteLines.filter((l) => l.kind === 'policy' && l.enabled);

  const lines: string[] = [];

  const quoteRef =
    quoteNumber !== undefined
      ? `Cotización ${formatQuoteRef(quoteNumber)}`
      : 'Cotización';
  const advisorBit = advisorName?.trim() ? ` · Asesor: ${advisorName.trim()}` : '';
  lines.push(`Fecha de cotización: ${quoteDate}`);
  if (wholesale) {
    const destBit = destTitle ? ` -${mainCityLabel(destination) || destTitle}` : '';
    const originBit = flight?.origin?.name || flight?.origin?.code;
    const routeBit =
      originBit && destTitle
        ? ` -${mainCityLabel(String(originBit)) || String(originBit).split(',')[0].trim()} → ${mainCityLabel(destination) || destTitle}`
        : destBit;
    lines.push(`🌴🏖️ *COTIZACIÓN${routeBit}*🌴🏖️`);
    if (advisorBit) lines.push(`📋 *${quoteRef}*${advisorBit}`);
  } else {
    lines.push(`📋 *${quoteRef}*${advisorBit}`);
    lines.push('');
    if (destTitle) {
      const originBit = flight?.origin?.name || flight?.origin?.code;
      const route =
        originBit
          ? `${mainCityLabel(String(originBit)) || String(originBit).split(',')[0].trim()} → ${destTitle}`
          : destTitle;
      lines.push(`🌴🏖️ *DESTINO ${route}* 🌴🏖️`);
    }
  }
  lines.push(`📅*Fecha de viaje:* ${travelDates}`);
  if (wholesale && destination) {
    lines.push(`🌎*Destino:* ${mainCityLabel(destination) || destination}`);
  }
  if (nights > 0) {
    lines.push(`🌙*Noches:* ${nights} noche${nights !== 1 ? 's' : ''}`);
  }
  if (wholesale) {
    if (hasAccommodationPlan(searchContext)) {
      const paxFromPlan = formatRoomPlanSummary(normalizeRoomPlan(searchContext?.roomPlan));
      if (paxFromPlan) lines.push(`👥*Viajeros:* ${paxFromPlan}`);
    }
  } else {
    lines.push(`👥*Viajeros:* ${formatQuotePaxBreakdown(paxBreakdown)}`);
  }
  lines.push('');

  const combo = collectComboToursFromItems(items);
  const tourLabels = collectTourLabelsFromItems(items);
  const activeIncludes = includes
    .filter((line) => {
      if (line.id === 'inc_hotel' && hotels.length === 0) return false;
      if (line.id === 'inc_air' && flights.length === 0 && tours.filter((t) => t.isBloqueo).length === 0) {
        return false;
      }
      if (line.id === 'inc_transfer' && allTransfers.length === 0) return false;
      if (line.id === 'inc_assist' && insurances.length === 0) return false;
      if (line.id === 'inc_tours' && tourLabels.length === 0) return false;
      return true;
    })
    .map((line) => {
      if (line.id === 'inc_transfer' && combo.transfers.length > 0) {
        const night = combo.transfers.some((t) => t.nightFlights);
        const short = combo.transfers[0]?.transferShort || line.text;
        return {
          ...line,
          text: night
            ? `${short} — nocturno aplica en Cartagena con vuelos después de las 18:00`
            : short,
        };
      }
      if (line.id === 'inc_tours' && tourLabels.length > 0) {
        const list =
          tourLabels.length === 1
            ? tourLabels[0]
            : tourLabels.map((t) => `• ${t}`).join('\n');
        return { ...line, text: `${line.text.replace(/:?\s*$/, '')}:\n${list}` };
      }
      return line;
    });
  // Baggage is now described from the selected airfare. Never send the old
  // generic "no incluye maleta" line because it can contradict the fare.
  const activeExcludes = excludes.filter((line) => line.id !== 'exc_bag');

  // Wholesale advisors put includes/excludes after options (see agency template).
  if (!wholesale && activeIncludes.length > 0) {
    lines.push('*TARIFA INCLUYE:*');
    for (const l of activeIncludes) lines.push(lineText(l));
    lines.push('');
  }

  if (!wholesale && activeExcludes.length > 0) {
    lines.push('*PLAN NO INCLUYE*');
    for (const l of activeExcludes) lines.push(lineText(l));
    lines.push('');
  }

  const bloqueos = tours.filter((t) => t.isBloqueo);
  if (bloqueos.length > 0) {
    lines.push('✈️ *ITINERARIO AÉREO:*');
    for (const b of bloqueos) {
      for (const row of formatBloqueoItineraryLines(b)) {
        lines.push(row);
      }
      lines.push('');
    }
    if (wholesale) {
      lines.push(
        'ℹ️ _Cupo aéreo (bloqueo). La confirmación de sillas queda sujeta a disponibilidad del proveedor._'
      );
      lines.push('');
    }
  } else if (flight) {
    lines.push('✈️ *ITINERARIO AÉREO:*');
    const ida = formatFlightLegLine(flight, 'outbound');
    const vuelta = formatFlightLegLine(flight, 'return');
    const idaBag = flightBaggageForDirection(flight, 'outbound');
    const vueltaBag = flightBaggageForDirection(flight, 'return');
    if (ida) lines.push(`🛫 *_Vuelo Ida:_* ${ida}`);
    if (idaBag.length) lines.push(`🎒 Maletas ida: ${idaBag.join(' · ')}`);
    if (vuelta) lines.push(`🛬 *_Vuelo de regreso:_* ${vuelta}`);
    if (vueltaBag.length) lines.push(`🎒 Maletas regreso: ${vueltaBag.join(' · ')}`);
    lines.push('');
  }

  if (!wholesale) {
    for (const transfer of transfers) {
      lines.push(
        `🚕 *_Traslado:_* ${transfer.linkedHotelName ? `${transfer.linkedHotelName} · ` : ''}${transfer.name}`
      );
      lines.push('');
    }

    for (const t of tours.filter((x) => !x.isBloqueo)) {
      const label = t.isCombinado ? 'Combinado' : 'Circuito';
      lines.push(`• 🗺️ *_${label}:_* ${t.name}`);
      if (t.departureDate) lines.push(`📅 ${t.departureLabel || t.departureDate}`);
      if (t.occupancyRates) {
        const r = t.occupancyRates;
        const bits: string[] = [];
        if (r.dbl) bits.push(`DBL ${Math.round(r.dbl).toLocaleString('es-CO')}`);
        if (r.tpl) bits.push(`TPL ${Math.round(r.tpl).toLocaleString('es-CO')}`);
        if (r.sgl) bits.push(`SGL ${Math.round(r.sgl).toLocaleString('es-CO')}`);
        if (bits.length) lines.push(`💰 $/pers. (${r.currency}): ${bits.join(' · ')}`);
      } else {
        lines.push(
          `💰 ${Math.round(t.pricePerPerson).toLocaleString('es-CO')} ${t.currency}/persona`
        );
      }
      if (t.priceEstimated) lines.push(`_(Total estimado; sin disponibilidad BM)_`);
      lines.push('');
    }

    for (const act of activities) {
      if (act.type === 'activity') {
        lines.push(`• 🎢 *_Actividad:_* ${act.name}`);
        if (act.pricePerPerson != null && Number.isFinite(act.pricePerPerson)) {
          lines.push(
            `💰 ${Math.round(act.pricePerPerson).toLocaleString('es-CO')} ${act.currency}/persona`
          );
        }
        lines.push('');
      }
    }

    for (const ins of insurances) {
      if (ins.type === 'insurance') {
        lines.push(`🚑 *_Asistencia:_* ${ins.name}`);
        if (ins.planLabel) lines.push(ins.planLabel);
        const shorts = ins.summaryLines?.length ? ins.summaryLines : [];
        for (const line of shorts) {
          lines.push(`• ${line}`);
        }
        lines.push('');
      }
    }
  }

  const sharedBase = items
    .filter((item) => item.type !== 'hotel' && !linkedTransferIds.has(item.id))
    .reduce((sum, item) => sum + (itemTotals[item.id] || 0), 0);
  const feesMayorRedondeo =
    input.feesMayorRedondeo != null && Number.isFinite(input.feesMayorRedondeo)
      ? Math.max(0, input.feesMayorRedondeo)
      : Math.max(0, (feesTotal || 0) - (taUnit || 0) * Math.max(1, pax));

  // Priced blocks only when there is a real total; hide empty placeholders.
  if (hasPricedItems || hotels.length > 0) {
    if (hotels.length > 0) {
      const byId = new Map(hotels.map((h) => [h.id, h]));

      const optionBlocks =
        (wholesale || hotelsAsOptions) && hotelOptionGroups && hotelOptionGroups.length > 0
          ? hotelOptionGroups
              .map((g, idx) => {
                const groupHotels = g.hotelIds
                  .map((id) => byId.get(id))
                  .filter((h): h is HotelCartItem => !!h);
                if (groupHotels.length === 0) return null;
                return { index: idx + 1, hotels: groupHotels, optionId: g.id };
              })
              .filter(
                (b): b is { index: number; hotels: HotelCartItem[]; optionId: string } => !!b
              )
          : wholesale || hotelsAsOptions
            ? hotels.map((h, idx) => ({ index: idx + 1, hotels: [h], optionId: h.id }))
            : null;

      if (optionBlocks) {
        for (const block of optionBlocks) {
          lines.push(`*OPCIÓN ${block.index}*`);
          for (const hotel of block.hotels) {
            const rate = hotel.selectedRate;
            lines.push(
              `🏨*_Nombre Hotel:_* ${hotel.hotelName}${stars(hotel.stars)}`
            );
            if (!wholesale && hotel.nights > 0) {
              lines.push(
                `🌙 *_Noches:_* ${hotel.nights} (${hotel.checkIn} → ${hotel.checkOut})`
              );
            }
            const roomLabel = displayHotelRoomType(rate.roomType);
            if (roomLabel) {
              lines.push(`🛏️ *_Tipo de Habitación:_* ${roomLabel}`);
            }
            if (!wholesale && hotel.occupancy.length > 0) {
              lines.push(`👥 *_Ocupación:_* ${occupancyLabel(hotel)}`);
            }
            if (rate.boardBasis) {
              lines.push(`🍴 *_Tipo de alimentación:_* ${displayHotelBoardBasis(rate.boardBasis)}`);
            }
            lines.push('');
          }
          if (wholesale) {
            const roundCharmNine =
              autoRoundOccupancy !== false ||
              (manualPackageRoundIds || []).includes(block.optionId);
            const sum = summarizeWholesaleOption(
              block.hotels,
              items,
              feesMayorRedondeo,
              pax,
              searchContext?.roomPlan,
              (item) => itemTotals[item.id] || 0,
              taUnit || 0,
              (item) =>
                getItemBasePrice(
                  item,
                  moneyCurrency === 'USD' ? 'USD' : 'COP',
                  trmEff,
                  trmDia
                ).price,
              {
                displayCurrency: moneyCurrency,
                effTrm: trmEff,
                trmDia,
                roundCharmNine,
              }
            );
            const combined = sum.combined;
            const hintRates: OccupancyTierRates = {
              currency: sum.currency,
              sglPp: combined.sglPp,
              dblPp: combined.dblPp,
              tplPp: combined.tplPp,
              qplPp: combined.qplPp,
              chd: combined.chd,
              childEqualsAdult: combined.childEqualsAdult,
            };
            const groupTotal = includeOccupancyTotal ? sum.groupTotal : undefined;
            appendWholesaleAgencyRates(
              lines,
              combined,
              moneyCurrency,
              searchContext?.roomPlan,
              hintRates,
              includeOccupancyTotal
                ? { includeOccupancyTotal: true, groupTotal: groupTotal ?? undefined }
                : undefined
            );
            lines.push('');
          }
          if (!wholesale) {
            const hotelsSum = block.hotels.reduce(
              (sum, h) => sum + (itemTotals[h.id] || 0),
              0
            );
            const optionTotal = sharedBase + hotelsSum + (primaryCurrency ? feesTotal : 0);
            const optionPerPerson = optionTotal / pax;
            const occHint =
              block.hotels.length === 1
                ? occupancyLabel(block.hotels[0])
                : formatQuotePaxBreakdown(paxBreakdown);
            lines.push(
              `👤 *Tarifa por persona en acomodación _${occHint}_:*  ${formatMoney(moneyCurrency, optionPerPerson)}`
            );
            lines.push(
              `💰 *Total (${formatQuotePaxBreakdown(paxBreakdown)}):*  ${formatMoney(moneyCurrency, optionTotal)}`
            );
            if (includeUsdEquiv) {
              appendMoneyEquiv(lines, moneyCurrency, optionTotal, trm);
            }
            lines.push('');
          }
        }
      } else {
        for (const hotel of hotels) {
          const rate = hotel.selectedRate;
          lines.push(
            `🏨*_Nombre Hotel:_* ${hotel.hotelName}${stars(hotel.stars)}`
          );
          if (displayHotelRoomType(rate.roomType)) {
            lines.push(`🛏️ *_Tipo de Habitación:_* ${displayHotelRoomType(rate.roomType)}`);
          }
          if (hotel.occupancy.length > 0) {
            lines.push(`👥 *_Ocupación:_* ${occupancyLabel(hotel)}`);
          }
          if (rate.boardBasis) {
            lines.push(`🍴 *_Tipo de alimentación:_* ${displayHotelBoardBasis(rate.boardBasis)}`);
          }
          lines.push('');
        }
        lines.push(
          `👤 *Tarifa por persona (${formatQuotePaxBreakdown(paxBreakdown)}):*  ${formatMoney(moneyCurrency, perPerson)}`
        );
        lines.push(
          `💰 *Total (${formatQuotePaxBreakdown(paxBreakdown)}):*  ${formatMoney(moneyCurrency, grandTotal)}`
        );
        if (includeUsdEquiv) {
          appendMoneyEquiv(lines, moneyCurrency, grandTotal, trm);
        }
        lines.push('');
      }
    } else if (hasPricedItems && !wholesale) {
      lines.push(
        `👤 *Tarifa por persona:*  ${formatMoney(moneyCurrency, perPerson)}`
      );
      lines.push(
        `💰 *Total (${formatQuotePaxBreakdown(paxBreakdown)}):*  ${formatMoney(moneyCurrency, grandTotal)}`
      );
      if (includeUsdEquiv) {
        appendMoneyEquiv(lines, moneyCurrency, grandTotal, trm);
      }
      lines.push('');
    }
  }

  if (wholesale && initialDeposit.trim()) {
    lines.push(`💰*DEPÓSITO INICIAL:* ${initialDeposit.trim()}`);
    lines.push(
      '📌 El saldo debe cancelarse en las fechas límite establecidas al momento de confirmar reserva.'
    );
    lines.push('');
  }
  if (wholesale) {
    if (activeIncludes.length > 0) {
      lines.push('*TARIFA INCLUYE:*');
      for (const l of activeIncludes) lines.push(lineText(l));
      lines.push('');
    }
    if (activeExcludes.length > 0) {
      lines.push('*PLAN NO INCLUYE*');
      for (const l of activeExcludes) lines.push(lineText(l));
      lines.push('');
    }
  }

  if (policies.length > 0) {
    lines.push('⚠️ *NOTA IMPORTANTE:*');
    policies.forEach((l, i) => {
      lines.push(`${i + 1}. ${l.text}`);
    });
  }

  return lines.join('\n').trimEnd() + '\n';
}
