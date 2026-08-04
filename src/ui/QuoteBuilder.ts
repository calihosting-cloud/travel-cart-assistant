import {
  CartItem,
  FlightCartItem,
  HotelCartItem,
  SearchContext,
  TransferCartItem,
} from '../engine/core/types';
import { formatQuoteRef } from '../shared/quoteHistory';
import { QuoteLine } from '../shared/quoteConfig';

export interface QuoteBuildInput {
  items: CartItem[];
  searchContext: SearchContext | null;
  /** Items subtotal by currency (before fees). */
  subtotals: Map<string, number>;
  /** Fee total applied to primary currency (mayor valor + redondeo + TA×pax). */
  feesTotal: number;
  primaryCurrency: string;
  quoteLines: QuoteLine[];
  /** Optional override for the cotización title destination. */
  destinationOverride?: string;
  optionLabel?: string;
  quoteNumber?: number;
  advisorName?: string;
  /** COP per 1 USD — used for USD↔COP equivalents only (not shown in header). */
  trm?: number;
  /** When true, append COP↔USD equivalent lines (default off). */
  includeUsdEquiv?: boolean;
  /** Treat each hotel as an alternative combined with shared non-hotel services. */
  hotelsAsOptions?: boolean;
  /** Final line totals (after currency conversion and item adjustments), by item id. */
  itemTotals?: Record<string, number>;
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
  return currency.toUpperCase() === 'USD' ? `USD ${formatted}` : `$${formatted}`;
}

function stars(n?: number): string {
  if (!n || n <= 0) return '';
  return ' ' + '★'.repeat(Math.min(5, Math.round(n)));
}

function roomCapacityLabel(adults: number, children: number): string {
  const n = adults + children;
  if (n <= 1) return 'SENCILLA';
  if (n === 2) return 'DOBLE';
  if (n === 3) return 'TRIPLE';
  if (n === 4) return 'CUÁDRUPLE';
  return `${n} PERSONAS`;
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

interface PaxBreakdown {
  adults: number;
  children: number;
  infants: number;
}

function resolvePaxBreakdown(items: CartItem[], ctx: SearchContext | null): PaxBreakdown {
  const candidates: PaxBreakdown[] = [];
  const flight = items.find((i): i is FlightCartItem => i.type === 'flight');
  if (flight && flight.adults + flight.children + flight.infants > 0) {
    candidates.push({
      adults: flight.adults,
      children: flight.children,
      infants: flight.infants,
    });
  }

  const hotel = items.find((i): i is HotelCartItem => i.type === 'hotel');
  if (hotel) {
    const adults = hotel.occupancy.reduce((s, o) => s + o.adults, 0);
    const children = hotel.occupancy.reduce((s, o) => s + o.children, 0);
    if (adults + children > 0) candidates.push({ adults, children, infants: 0 });
  }

  const activity = items.find((i) => i.type === 'activity');
  if (activity && activity.type === 'activity' && activity.adults + activity.children > 0) {
    candidates.push({ adults: activity.adults, children: activity.children, infants: 0 });
  }

  const insurance = items.find((i) => i.type === 'insurance');
  if (insurance && insurance.type === 'insurance' && insurance.passengers > 0) {
    candidates.push({ adults: insurance.passengers, children: 0, infants: 0 });
  }

  const transfer = items.find((i): i is TransferCartItem => i.type === 'transfer');
  if (transfer && transfer.adults + transfer.children > 0) {
    candidates.push({ adults: transfer.adults, children: transfer.children, infants: 0 });
  }

  if (ctx && ctx.totalAdults + ctx.totalChildren > 0) {
    candidates.push({ adults: ctx.totalAdults, children: ctx.totalChildren, infants: 0 });
  }

  return (
    candidates.sort(
      (a, b) =>
        b.adults + b.children + b.infants - (a.adults + a.children + a.infants)
    )[0] || { adults: 1, children: 0, infants: 0 }
  );
}

/** Paying pax for per-person rate (adults + children; infants excluded). */
function payingPax(pax: PaxBreakdown): number {
  return Math.max(1, pax.adults + pax.children);
}

function formatPaxBreakdown(pax: PaxBreakdown): string {
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

  if (from && to) {
    const diff = Math.round((to.getTime() - from.getTime()) / 86_400_000);
    if (diff > 0) return diff;
  }

  return 0;
}

function resolveDestination(items: CartItem[], ctx: SearchContext | null, override?: string): string {
  if (override?.trim()) return override.trim();
  if (ctx?.destinationText?.trim()) return ctx.destinationText.trim();
  const flight = items.find((i): i is FlightCartItem => i.type === 'flight');
  if (flight) {
    return flight.destination.name || flight.destination.code || flight.title;
  }
  const hotel = items.find((i): i is HotelCartItem => i.type === 'hotel');
  if (hotel?.hotelName) return hotel.hotelName;
  if (hotel?.address) return hotel.address;
  return '';
}

/** "Cartagena, Bolívar, Colombia" → "CARTAGENA" */
function formatDestHeadline(destination: string): string {
  const primary = destination.split(',')[0]?.trim() || destination;
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
    itemTotals = {},
  } = input;

  const destination = resolveDestination(items, searchContext, destinationOverride);
  const destTitle = destination ? formatDestHeadline(destination) : '';
  const { from, to } = resolveDateRange(items, searchContext);
  const travelDates = formatTravelDates(from, to) || 'por confirmar';
  const nights = resolveNights(items, searchContext, from, to);
  const quoteDate = formatQuoteDate();

  const itemsTotal = subtotals.get(primaryCurrency) || 0;
  const grandTotal = itemsTotal + (primaryCurrency ? feesTotal : 0);
  const paxBreakdown = resolvePaxBreakdown(items, searchContext);
  const pax = payingPax(paxBreakdown);
  const perPerson = grandTotal / pax;
  const moneyCurrency = primaryCurrency || 'COP';

  const hotels = items.filter((i): i is HotelCartItem => i.type === 'hotel');
  const flights = items.filter((i): i is FlightCartItem => i.type === 'flight');
  const flight = flights[0];
  const transfers = items.filter((i): i is TransferCartItem => i.type === 'transfer');
  const activities = items.filter((i) => i.type === 'activity');
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
  lines.push(`📋 *${quoteRef}*${advisorBit}`);
  lines.push('');
  if (destTitle) {
    lines.push(`🌴🏖️ *DESTINO ${destTitle}* 🌴🏖️`);
  }
  lines.push(`📅*Fecha de viaje:* ${travelDates}`);
  if (nights > 0) {
    lines.push(`🌙*Noches:* ${nights} noche${nights !== 1 ? 's' : ''}`);
  }
  lines.push(`👥*Viajeros:* ${formatPaxBreakdown(paxBreakdown)}`);
  lines.push('');

  const activeIncludes = includes.filter((line) => {
    if (line.id === 'inc_hotel' && hotels.length === 0) return false;
    if (line.id === 'inc_air' && flights.length === 0) return false;
    return true;
  });
  // Baggage is now described from the selected airfare. Never send the old
  // generic "no incluye maleta" line because it can contradict the fare.
  const activeExcludes = excludes.filter((line) => line.id !== 'exc_bag');

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

  if (flight) {
    lines.push('✈️ *ITINERARIO AÉREO:*');
    const ida = formatFlightLegLine(flight, 'outbound');
    const vuelta = formatFlightLegLine(flight, 'return');
    if (ida) lines.push(`🛫 *_Vuelo Ida:_* ${ida}`);
    if (vuelta) lines.push(`🛬 *_Vuelo de regreso:_* ${vuelta}`);
    if (flight.baggageIncluded?.length) {
      lines.push(`🎒 *_Equipaje incluido:_* ${flight.baggageIncluded.join(' · ')}`);
    }
    lines.push('');
  }

  for (const transfer of transfers) {
    lines.push(`🚕 *_Traslado:_* ${transfer.name}`);
    lines.push('');
  }

  for (const act of activities) {
    if (act.type === 'activity') {
      lines.push(`🎢 *_Actividad:_* ${act.name}`);
      lines.push('');
    }
  }

  for (const ins of insurances) {
    if (ins.type === 'insurance') {
      lines.push(`🚑 *_Asistencia:_* ${ins.name}`);
      lines.push('');
    }
  }

  // Priced blocks only when there is a real total; hide empty placeholders.
  if (hasPricedItems || hotels.length > 0) {
    if (hotels.length > 0) {
      const sharedTotal = items
        .filter((item) => item.type !== 'hotel')
        .reduce((sum, item) => sum + (itemTotals[item.id] || 0), 0);
      hotels.forEach((hotel, idx) => {
        const label =
          hotelsAsOptions || hotels.length > 1 ? `OPCIÓN ${idx + 1}` : optionLabel;
        const rate = hotel.selectedRate;
        if (hotelsAsOptions) lines.push(`*${label}*`);
        lines.push(
          `🏨*_Nombre Hotel:_* ${hotel.hotelName}${stars(hotel.stars)}`
        );
        if (rate.roomType) {
          lines.push(`🛏️ *_Tipo de Habitación:_* ${rate.roomType}`);
        }
        if (hotel.occupancy.length > 0) {
          lines.push(`👥 *_Ocupación:_* ${occupancyLabel(hotel)}`);
        }
        if (rate.boardBasis) {
          lines.push(`🍴 *_Tipo de alimentación:_* ${rate.boardBasis}`);
        }
        lines.push('');
        if (hotelsAsOptions) {
          const optionTotal =
            sharedTotal + (itemTotals[hotel.id] || 0) + (primaryCurrency ? feesTotal : 0);
          const optionPerPerson = optionTotal / pax;
          lines.push(
            `👤 *Tarifa por persona en acomodación _${occupancyLabel(hotel)}_:*  ${formatMoney(moneyCurrency || rate.currency, optionPerPerson)}`
          );
          lines.push(
            `💰 *Total (${formatPaxBreakdown(paxBreakdown)}):*  ${formatMoney(moneyCurrency || rate.currency, optionTotal)}`
          );
          if (includeUsdEquiv) {
            appendMoneyEquiv(lines, moneyCurrency || rate.currency, optionTotal, trm);
          }
        }
        lines.push('');
      });
      if (!hotelsAsOptions) {
        lines.push(
          `👤 *Tarifa por persona (${formatPaxBreakdown(paxBreakdown)}):*  ${formatMoney(moneyCurrency, perPerson)}`
        );
        lines.push(
          `💰 *Total (${formatPaxBreakdown(paxBreakdown)}):*  ${formatMoney(moneyCurrency, grandTotal)}`
        );
        if (includeUsdEquiv) {
          appendMoneyEquiv(lines, moneyCurrency, grandTotal, trm);
        }
        lines.push('');
      }
    } else if (hasPricedItems) {
      lines.push(
        `👤 *Tarifa por persona:*  ${formatMoney(moneyCurrency, perPerson)}`
      );
      lines.push(
        `💰 *Total (${formatPaxBreakdown(paxBreakdown)}):*  ${formatMoney(moneyCurrency, grandTotal)}`
      );
      if (includeUsdEquiv) {
        appendMoneyEquiv(lines, moneyCurrency, grandTotal, trm);
      }
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
