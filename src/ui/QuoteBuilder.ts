import {
  CartItem,
  FlightCartItem,
  HotelCartItem,
  SearchContext,
  TransferCartItem,
} from '../engine/core/types';
import { QuoteLine } from '../shared/quoteConfig';

export interface QuoteBuildInput {
  items: CartItem[];
  searchContext: SearchContext | null;
  /** Items subtotal by currency (before fees). */
  subtotals: Map<string, number>;
  /** Fee total applied to primary currency (mayor valor cobrado). */
  feesTotal: number;
  primaryCurrency: string;
  quoteLines: QuoteLine[];
  /** Optional override for the cotización title destination. */
  destinationOverride?: string;
  optionLabel?: string;
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

function formatDayMonth(d: Date): string {
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
}

function formatTravelDates(from?: Date | null, to?: Date | null): string {
  if (!from) return '';
  if (!to) return formatDayMonth(from);
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${from.getDate()} al ${to.getDate()} ${MONTHS_ES[from.getMonth()]}`;
  }
  return `${formatDayMonth(from)} al ${formatDayMonth(to)}`;
}

function formatMoney(currency: string, amount: number): string {
  const formatted = amount.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `$${formatted}`;
}

function stars(n?: number): string {
  if (!n || n <= 0) return '';
  return ' ' + '★'.repeat(Math.min(5, Math.round(n)));
}

function occupancyLabel(hotel: HotelCartItem): string {
  const adults = hotel.occupancy.reduce((s, o) => s + o.adults, 0);
  const rooms = hotel.occupancy.length || 1;
  const perRoom = adults / rooms;
  if (perRoom <= 1.1) return 'SENCILLA';
  if (perRoom <= 2.1) return 'DOBLE';
  if (perRoom <= 3.1) return 'TRIPLE';
  return 'MÚLTIPLE';
}

function totalPax(items: CartItem[], ctx: SearchContext | null): number {
  if (ctx && ctx.totalAdults + ctx.totalChildren > 0) {
    return Math.max(1, ctx.totalAdults + ctx.totalChildren);
  }
  for (const item of items) {
    if (item.type === 'flight') {
      const n = item.adults + item.children + item.infants;
      if (n > 0) return n;
    }
    if (item.type === 'hotel') {
      const n = item.occupancy.reduce((s, o) => s + o.adults + o.children, 0);
      if (n > 0) return n;
    }
    if (item.type === 'transfer') {
      const n = item.adults + item.children;
      if (n > 0) return n;
    }
  }
  return 1;
}

function resolveDestination(items: CartItem[], ctx: SearchContext | null, override?: string): string {
  if (override?.trim()) return override.trim();
  if (ctx?.destinationText?.trim()) return ctx.destinationText.trim();
  const flight = items.find((i): i is FlightCartItem => i.type === 'flight');
  if (flight) {
    return flight.destination.name || flight.destination.code || flight.title;
  }
  const hotel = items.find((i): i is HotelCartItem => i.type === 'hotel');
  if (hotel?.address) return hotel.address;
  return 'destino';
}

function resolveDateRange(items: CartItem[], ctx: SearchContext | null): { from: Date | null; to: Date | null } {
  const fromCtx = parseDdMmYyyy(ctx?.checkIn);
  const toCtx = parseDdMmYyyy(ctx?.checkOut);
  if (fromCtx) return { from: fromCtx, to: toCtx };

  const hotel = items.find((i): i is HotelCartItem => i.type === 'hotel');
  if (hotel) {
    return { from: parseDdMmYyyy(hotel.checkIn), to: parseDdMmYyyy(hotel.checkOut) };
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

function formatFlightLegLine(flight: FlightCartItem, direction: 'outbound' | 'return'): string {
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
  ].filter(Boolean);
  return parts.join(' · ');
}

function lineText(line: QuoteLine): string {
  const emoji = line.emoji ? `${line.emoji} ` : '';
  return `${emoji}${line.text}`.trim();
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
  } = input;

  const destination = resolveDestination(items, searchContext, destinationOverride);
  const destTitle = destination.toLowerCase();
  const { from, to } = resolveDateRange(items, searchContext);
  const travelDates = formatTravelDates(from, to) || 'por confirmar';
  const quoteDate = formatQuoteDate();

  const itemsTotal = subtotals.get(primaryCurrency) || 0;
  const grandTotal = itemsTotal + (primaryCurrency ? feesTotal : 0);
  const pax = totalPax(items, searchContext);
  const perPerson = grandTotal / pax;

  const hotels = items.filter((i): i is HotelCartItem => i.type === 'hotel');
  const flights = items.filter((i): i is FlightCartItem => i.type === 'flight');
  const flight = flights[0];

  const includes = quoteLines.filter((l) => l.kind === 'include' && l.enabled);
  const excludes = quoteLines.filter((l) => l.kind === 'exclude' && l.enabled);
  const policies = quoteLines.filter((l) => l.kind === 'policy' && l.enabled);

  const lines: string[] = [];

  lines.push(`Fecha de cotización: ${quoteDate}`);
  lines.push('');
  lines.push(`🌴🏖️ *COTIZACIÓN -${destTitle}*🌴🏖️`);
  lines.push(`📅*Fecha de viaje:* ${travelDates}`);
  lines.push(`🌎*Destino:* ${destTitle}`);
  lines.push('');

  lines.push('✈️ *ITINERARIO AÉREO:*');
  if (flight) {
    const ida = formatFlightLegLine(flight, 'outbound');
    const vuelta = formatFlightLegLine(flight, 'return');
    lines.push(`🛫 *_Vuelo Ida:_* ${ida}`);
    lines.push(`🛬 *_Vuelo de regreso:_* ${vuelta}`);
    lines.push('🎒 *_Equipaje cotizado:_* ');
  } else {
    lines.push('🛫 *_Vuelo Ida:_* ');
    lines.push('🛬 *_Vuelo de regreso:_* ');
    lines.push('🎒 *_Equipaje cotizado:_* ');
  }
  lines.push('');
  lines.push('ℹ️ _Vuelos comerciales. La aerolínea se confirma al realizar la reserva._');
  lines.push('');

  if (hotels.length === 0) {
    lines.push(`*${optionLabel}*`);
    lines.push('🏨*_Nombre Hotel:_* por confirmar');
    lines.push('🛏️ *_Tipo de Habitación:_* ');
    lines.push('🍴 *_Tipo de alimentación:_* ');
    lines.push('');
  } else {
    hotels.forEach((hotel, idx) => {
      const label = hotels.length === 1 ? optionLabel : `OPCIÓN ${idx + 1}`;
      const rate = hotel.selectedRate;
      lines.push(`*${label}*`);
      lines.push(
        `🏨*_Nombre Hotel:_* ${hotel.hotelName}${stars(hotel.stars)}`
      );
      lines.push(`🛏️ *_Tipo de Habitación:_* ${rate.roomType || ''}`);
      lines.push(`🍴 *_Tipo de alimentación:_* ${rate.boardBasis || ''}`);
      lines.push('');
      lines.push(
        `👥 *Tarifa por persona en acomodación _${occupancyLabel(hotel)}_:*  ${formatMoney(primaryCurrency || rate.currency, perPerson)}`
      );
      lines.push('');
    });
  }

  if (hotels.length === 0) {
    lines.push(
      `👥 *Tarifa por persona:*  ${formatMoney(primaryCurrency || 'COP', perPerson)}`
    );
    lines.push('');
  }

  lines.push('💰*DEPÓSITO INICIAL:* ');
  lines.push(
    '📌 El saldo debe cancelarse en las fechas límite establecidas al momento de confirmar reserva.'
  );
  lines.push('');

  if (includes.length > 0) {
    lines.push('*TARIFA INCLUYE:*');
    for (const l of includes) lines.push(lineText(l));
    lines.push('');
  }

  if (excludes.length > 0) {
    lines.push('*PLAN NO INCLUYE*');
    for (const l of excludes) lines.push(lineText(l));
    lines.push('');
  }

  if (policies.length > 0) {
    lines.push('⚠️ *NOTA IMPORTANTE:*');
    policies.forEach((l, i) => {
      lines.push(`${i + 1}. ${l.text}`);
    });
  }

  return lines.join('\n').trimEnd() + '\n';
}
