import { SearchContext, type BriefingRoom } from '../engine/core/types';
import {
  flattenChildAges,
  roomsFromBriefing,
  summarizeRoomPlan,
  adultsForKind,
} from './roomPlan';

/**
 * Sticky trip guide: first flight search, or advisor briefing
 * (origen / destino / fechas / pax) that must not change with BM probe searches.
 */
export const TRIP_GUIDE_KEY = 'tce_trip_guide';

const STICKY_SOURCE_TYPES = new Set(['flight', 'briefing']);

export async function loadTripGuide(): Promise<SearchContext | null> {
  try {
    const result = await chrome.storage.local.get(TRIP_GUIDE_KEY);
    const stored = result[TRIP_GUIDE_KEY] as SearchContext | undefined;
    if (!stored || !STICKY_SOURCE_TYPES.has(stored.sourceType)) return null;
    return stored;
  } catch {
    return null;
  }
}

export async function saveTripGuide(ctx: SearchContext): Promise<void> {
  try {
    const sourceType =
      ctx.sourceType === 'briefing' || ctx.sourceType === 'flight'
        ? ctx.sourceType
        : 'flight';
    await chrome.storage.local.set({ [TRIP_GUIDE_KEY]: { ...ctx, sourceType } });
  } catch {
    // storage unavailable
  }
}

/** Parse DD-MM-YYYY or YYYY-MM-DD. */
export function parseTripDate(s?: string): Date | null {
  if (!s) return null;
  const dmY = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmY) return new Date(Number(dmY[3]), Number(dmY[2]) - 1, Number(dmY[1]));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

/** Nights = calendar days between ida and regreso (checkOut − checkIn). */
export function nightsFromTripDates(checkIn?: string, checkOut?: string): number {
  const from = parseTripDate(checkIn);
  const to = parseTripDate(checkOut);
  if (!from || !to) return 0;
  const diff = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  return diff > 0 ? diff : 0;
}

/** YYYY-MM-DD today in the local timezone (for `<input type="date" min>`). */
export function isoDateToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD for `<input type="date">` from DD-MM-YYYY. */
export function toIsoDateInput(ddMmYyyy?: string): string {
  if (!ddMmYyyy) return '';
  const m = ddMmYyyy.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

/** DD-MM-YYYY from `<input type="date">` value. */
export function fromIsoDateInput(iso?: string): string | undefined {
  if (!iso) return undefined;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}

/** Build / update a briefing-style sticky guide from explicit trip fields. */
export function buildTripBriefing(input: {
  originText?: string;
  destinationText?: string;
  checkIn?: string;
  checkOut?: string;
  adults: number;
  children: number;
  childrenAges?: number[];
  roomPlan?: BriefingRoom[];
  previous?: SearchContext | null;
}): SearchContext {
  const plan = roomsFromBriefing(input.roomPlan, input.adults, input.children, input.childrenAges);
  const summed = summarizeRoomPlan(plan);
  const adults = summed.adults;
  const children = summed.children;
  const fromPlan = flattenChildAges(plan);
  const childrenAges = (
    fromPlan.length > 0
      ? fromPlan
      : (input.childrenAges || [])
          .map((a) => Number(a))
          .filter((a) => Number.isFinite(a) && a >= 0)
  ).slice(0, children);
  const prev = input.previous;
  const checkIn = input.checkIn || prev?.checkIn;
  const checkOut = input.checkOut || prev?.checkOut;
  const nights = nightsFromTripDates(checkIn, checkOut) || prev?.nights;
  return {
    sourceType: 'briefing',
    originText: input.originText?.trim() || prev?.originText,
    destinationText: input.destinationText?.trim() || prev?.destinationText,
    destinationPinned: prev?.destinationPinned,
    checkIn,
    checkOut,
    nights,
    rooms: plan.map((r) => ({
      adults: adultsForKind(r.kind),
      children: r.children || 0,
      childrenAges: (r.childrenAges || []).slice(0, r.children || 0),
    })),
    totalAdults: adults,
    totalChildren: children,
    childrenAges,
    roomPlan: plan,
    nationality: prev?.nationality,
    savedAt: Date.now(),
  };
}

/** Pax from Guardar viaje / formulario — never from a BM occupancy probe. */
export function paxFromBriefingContext(
  ctx: SearchContext | null | undefined
): { adults: number; children: number; infants: number } | null {
  if (!ctx) return null;
  if (ctx.roomPlan && ctx.roomPlan.length > 0) {
    const sum = summarizeRoomPlan(ctx.roomPlan);
    if (sum.adults + sum.children > 0) {
      return { adults: sum.adults, children: sum.children, infants: 0 };
    }
  }
  const sticky = ctx.sourceType === 'briefing' || ctx.sourceType === 'flight';
  if (sticky && ctx.totalAdults + ctx.totalChildren > 0) {
    return {
      adults: ctx.totalAdults,
      children: ctx.totalChildren,
      infants: 0,
    };
  }
  return null;
}

/** Keep dest/fechas del header; los viajeros salen del briefing (no de tce_last_search). */
export function overlayBriefingPax(
  header: SearchContext | null,
  briefing: SearchContext | null
): SearchContext | null {
  const pax = paxFromBriefingContext(briefing) || paxFromBriefingContext(header);
  if (!pax) {
    if (!header) return null;
    if (header.sourceType === 'briefing' || header.sourceType === 'flight') return header;
    return {
      ...header,
      totalAdults: 0,
      totalChildren: 0,
      roomPlan: undefined,
    };
  }
  const base = header || briefing;
  if (!base) return null;
  return {
    ...base,
    sourceType: briefing?.sourceType === 'flight' ? 'flight' : 'briefing',
    totalAdults: pax.adults,
    totalChildren: pax.children,
    roomPlan: briefing?.roomPlan || header?.roomPlan,
    rooms: (briefing?.rooms?.length ? briefing.rooms : header?.rooms) || base.rooms || [],
    childrenAges:
      (briefing?.childrenAges?.length ? briefing.childrenAges : header?.childrenAges) ||
      base.childrenAges ||
      [],
  };
}

export async function clearTripGuide(): Promise<void> {
  try {
    await chrome.storage.local.remove(TRIP_GUIDE_KEY);
  } catch {
    // storage unavailable
  }
}

/** Briefing mínimo para cotizar: destino + ida + regreso + al menos 1 pax. */
export function isTripBriefingComplete(ctx: SearchContext | null | undefined): boolean {
  return briefingMissingForQuote(ctx).length === 0;
}

/** Dates + pax (destino se copia de Hoteles BM; no bloquea Guardar viaje). */
export function briefingMissingFields(ctx: SearchContext | null | undefined): string[] {
  const missing: string[] = [];
  if (!ctx?.checkIn) missing.push('fecha de ida');
  else {
    const inIso = toIsoDateInput(ctx.checkIn);
    if (inIso && inIso < isoDateToday()) missing.push('fecha de ida (no anterior a hoy)');
  }
  if (!ctx?.checkOut) missing.push('fecha de regreso');
  if ((ctx?.totalAdults || 0) + (ctx?.totalChildren || 0) <= 0) missing.push('pasajeros');
  return missing;
}

/** WhatsApp / PDF: hace falta el destino exacto de BM. */
export function briefingMissingForQuote(ctx: SearchContext | null | undefined): string[] {
  const missing = briefingMissingFields(ctx);
  if (!ctx?.destinationText?.trim()) missing.push('destino (búscalo en Hoteles BM)');
  return missing;
}

/**
 * Snapshot for historial / WhatsApp: prefer sticky briefing, fill gaps from cart items
 * (flight/hotel) so probe occupancy in BM does not erase the real trip profile.
 */
export function enrichSearchContextFromItems(
  base: SearchContext | null,
  items: Array<{
    type: string;
    origin?: { code: string; name?: string };
    destination?: { code: string; name?: string };
    originCity?: string;
    destinationCity?: string;
    departureDate?: string;
    returnDate?: string;
    adults?: number;
    children?: number;
    infants?: number;
    payingPax?: number;
    checkIn?: string;
    checkOut?: string;
    nights?: number;
    occupancy?: Array<{ adults: number; children: number; childrenAges?: number[] }>;
    hotelName?: string;
    address?: string;
  }>
): SearchContext | null {
  const flight = items.find((i) => i.type === 'flight');
  const hotel = items.find((i) => i.type === 'hotel');
  const tour = items.find((i) => i.type === 'tour');

  const isoToDdMm = (iso?: string): string | undefined => {
    if (!iso) return undefined;
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
  };

  const originText =
    base?.originText?.trim() ||
    flight?.origin?.name?.trim() ||
    flight?.origin?.code?.trim() ||
    tour?.originCity?.trim() ||
    undefined;

  const destinationText =
    base?.destinationText?.trim() ||
    flight?.destination?.name?.trim() ||
    flight?.destination?.code?.trim() ||
    tour?.destinationCity?.trim() ||
    undefined;

  const checkIn =
    base?.checkIn ||
    hotel?.checkIn ||
    tour?.departureDate ||
    isoToDdMm(flight?.departureDate) ||
    undefined;
  const checkOut =
    base?.checkOut ||
    hotel?.checkOut ||
    tour?.returnDate ||
    isoToDdMm(flight?.returnDate) ||
    undefined;

  let totalAdults = base?.totalAdults ?? 0;
  let totalChildren = base?.totalChildren ?? 0;
  let childrenAges = base?.childrenAges ?? [];

  if (totalAdults + totalChildren <= 0 && flight) {
    totalAdults = flight.adults || 0;
    totalChildren = flight.children || 0;
  }
  if (totalAdults + totalChildren <= 0 && tour) {
    totalAdults = tour.adults || tour.payingPax || 0;
    totalChildren = tour.children || 0;
  }
  if (totalAdults + totalChildren <= 0 && hotel?.occupancy?.length) {
    totalAdults = hotel.occupancy.reduce((s, o) => s + o.adults, 0);
    totalChildren = hotel.occupancy.reduce((s, o) => s + o.children, 0);
    childrenAges = hotel.occupancy.flatMap((o) => o.childrenAges ?? []);
  }

  if (!originText && !destinationText && !checkIn && !base) return null;

  const nights =
    nightsFromTripDates(checkIn, checkOut) ||
    base?.nights ||
    hotel?.nights ||
    tour?.nights ||
    undefined;

  return {
    sourceType:
      base?.sourceType === 'briefing' || base?.sourceType === 'flight'
        ? base.sourceType
        : 'briefing',
    originText,
    destinationText,
    checkIn,
    checkOut,
    nights,
    rooms:
      base?.rooms?.length
        ? base.rooms
        : [
            {
              adults: Math.max(1, totalAdults || 1),
              children: totalChildren,
              childrenAges,
            },
          ],
    totalAdults,
    totalChildren,
    childrenAges,
    roomPlan: base?.roomPlan,
    nationality: base?.nationality,
    savedAt: Date.now(),
  };
}

type TripFactItem = {
  type: string;
  addedAt?: number;
  isBloqueo?: boolean;
  origin?: { code: string; name?: string };
  destination?: { code: string; name?: string };
  originCity?: string;
  destinationCity?: string;
  departureDate?: string;
  returnDate?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  hotelName?: string;
  address?: string;
};

function isoToDdMm(iso?: string): string | undefined {
  if (!iso) return undefined;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}

function factsFromAirOrHotel(item: TripFactItem): {
  originText?: string;
  destinationText?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  sourceType: 'flight' | 'briefing';
} {
  if (item.type === 'flight') {
    const checkIn = isoToDdMm(item.departureDate);
    const checkOut = isoToDdMm(item.returnDate) || checkIn;
    return {
      originText: item.origin?.name?.trim() || item.origin?.code?.trim(),
      destinationText: item.destination?.name?.trim() || item.destination?.code?.trim(),
      checkIn,
      checkOut,
      nights: nightsFromTripDates(checkIn, checkOut),
      sourceType: 'flight',
    };
  }
  return {
    checkIn: item.checkIn,
    checkOut: item.checkOut,
    nights: nightsFromTripDates(item.checkIn, item.checkOut) || item.nights,
    sourceType: 'briefing',
  };
}

/**
 * Mayorista: origen/destino/fechas desde búsquedas (BM ciudad, vuelo, bloqueo).
 * Destino nunca es el nombre del hotel. No pisa lo ya guardado en la guía.
 */
export function mergeFirstTripFacts(
  prev: SearchContext | null,
  items: TripFactItem[]
): SearchContext | null {
  const sorted = items
    .filter((i) => i.type === 'flight' || i.type === 'hotel' || i.type === 'tour')
    .slice()
    .sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
  if (sorted.length === 0) return prev;

  const flight = sorted.find((i) => i.type === 'flight');
  const tour = sorted.find((i) => i.type === 'tour');
  const dated = sorted[0];

  const originFromItems =
    flight?.origin?.name?.trim() ||
    flight?.origin?.code?.trim() ||
    tour?.originCity?.trim();

  const destFromItems =
    flight?.destination?.name?.trim() ||
    flight?.destination?.code?.trim() ||
    tour?.destinationCity?.trim();

  const originText = prev?.originText?.trim() || originFromItems;
  const destinationText = prev?.destinationText?.trim() || destFromItems;

  let checkIn = prev?.checkIn;
  let checkOut = prev?.checkOut;
  let sourceType: SearchContext['sourceType'] =
    prev?.sourceType === 'flight' || prev?.sourceType === 'briefing'
      ? prev.sourceType
      : 'briefing';

  if (dated.type === 'flight') {
    const facts = factsFromAirOrHotel(dated);
    checkIn = checkIn || facts.checkIn;
    checkOut = checkOut || facts.checkOut;
    if (!prev?.sourceType || prev.sourceType !== 'briefing') sourceType = 'flight';
  } else if (dated.type === 'hotel') {
    checkIn = checkIn || dated.checkIn;
    checkOut = checkOut || dated.checkOut;
  } else if (dated.type === 'tour') {
    checkIn = checkIn || dated.departureDate;
    checkOut = checkOut || dated.returnDate;
    if (!prev?.sourceType && dated.isBloqueo) sourceType = 'flight';
  }

  const nights =
    nightsFromTripDates(checkIn, checkOut) ||
    prev?.nights ||
    (dated.type === 'hotel' ? dated.nights : undefined);

  if (!originText && !destinationText && !checkIn && !prev) return prev;

  const next: SearchContext = {
    sourceType,
    originText,
    destinationText,
    destinationPinned: prev?.destinationPinned,
    checkIn,
    checkOut,
    nights,
    rooms: prev?.rooms?.length ? prev.rooms : [{ adults: 1, children: 0, childrenAges: [] }],
    totalAdults: prev?.totalAdults ?? 0,
    totalChildren: prev?.totalChildren ?? 0,
    childrenAges: prev?.childrenAges ?? [],
    roomPlan: prev?.roomPlan,
    nationality: prev?.nationality,
    savedAt: Date.now(),
  };

  const same =
    (prev?.originText || '') === (next.originText || '') &&
    (prev?.destinationText || '') === (next.destinationText || '') &&
    (prev?.checkIn || '') === (next.checkIn || '') &&
    (prev?.checkOut || '') === (next.checkOut || '') &&
    (prev?.nights || 0) === (next.nights || 0);
  if (same && prev) return prev;
  return next;
}

export function applyRoomPlanToGuide(
  prev: SearchContext | null,
  roomPlan: BriefingRoom[]
): SearchContext {
  const summed = summarizeRoomPlan(roomPlan);
  const childrenAges = flattenChildAges(roomPlan);
  const rooms = roomPlan.map((r) => ({
    adults: adultsForKind(r.kind),
    children: r.children || 0,
    childrenAges: (r.childrenAges || []).slice(0, r.children || 0),
  }));
  return {
    sourceType: prev?.sourceType === 'flight' ? 'flight' : 'briefing',
    originText: prev?.originText,
    destinationText: prev?.destinationText,
    checkIn: prev?.checkIn,
    checkOut: prev?.checkOut,
    nights: nightsFromTripDates(prev?.checkIn, prev?.checkOut) || prev?.nights,
    rooms: rooms.length ? rooms : [{ adults: 1, children: 0, childrenAges: [] }],
    totalAdults: summed.adults,
    totalChildren: summed.children,
    childrenAges,
    roomPlan,
    nationality: prev?.nationality,
    savedAt: Date.now(),
  };
}
