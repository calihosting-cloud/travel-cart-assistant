import type { CartItem, HotelCartItem, SearchContext, TransferCartItem } from '../engine/core/types';

export const PENDING_HOTEL_TRANSFER_KEY = 'tce_pending_hotel_transfer';

export const BM_NEW_BOOKING_URL = 'https://reservas.grupostravel.com/es/backoffice/book/new';

export interface PendingHotelTransfer {
  hotelCartId: string;
  hotelName: string;
  checkIn?: string;
  checkOut?: string;
  totalAdults: number;
  totalChildren: number;
  childrenAges: number[];
  savedAt: number;
}

export type CartDisplayGroup =
  | { kind: 'kit'; hotel: HotelCartItem; transfers: TransferCartItem[] }
  | { kind: 'item'; item: CartItem };

export function normalizeHotelLabel(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bhotel\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function hotelNameMatches(hotelName: string, text?: string): boolean {
  const a = normalizeHotelLabel(hotelName);
  const b = normalizeHotelLabel(text || '');
  if (!a || !b) return false;
  return a === b || b.includes(a) || a.includes(b);
}

export function transferTouchesHotel(transfer: TransferCartItem, hotelName: string): boolean {
  return hotelNameMatches(hotelName, transfer.to) || hotelNameMatches(hotelName, transfer.from);
}

export function paxFromHotel(hotel: HotelCartItem): {
  totalAdults: number;
  totalChildren: number;
  childrenAges: number[];
} {
  const totalAdults = hotel.occupancy.reduce((s, o) => s + (o.adults || 0), 0);
  const totalChildren = hotel.occupancy.reduce((s, o) => s + (o.children || 0), 0);
  const childrenAges = hotel.occupancy.flatMap((o) => o.childrenAges ?? []);
  return { totalAdults, totalChildren, childrenAges };
}

export function pendingFromHotel(
  hotel: HotelCartItem,
  pax?: { totalAdults: number; totalChildren: number; childrenAges: number[] }
): PendingHotelTransfer {
  const fromHotel = paxFromHotel(hotel);
  const useGuide =
    pax && (pax.totalAdults > 0 || pax.totalChildren > 0) ? pax : fromHotel;
  return {
    hotelCartId: hotel.id,
    hotelName: hotel.hotelName,
    checkIn: hotel.checkIn,
    checkOut: hotel.checkOut,
    totalAdults: useGuide.totalAdults || fromHotel.totalAdults,
    totalChildren: useGuide.totalChildren,
    childrenAges: useGuide.childrenAges.length ? useGuide.childrenAges : fromHotel.childrenAges,
    savedAt: Date.now(),
  };
}

export function searchContextFromPending(pending: PendingHotelTransfer): SearchContext {
  return {
    sourceType: 'hotel',
    checkIn: pending.checkIn,
    checkOut: pending.checkOut,
    rooms: [
      {
        adults: pending.totalAdults,
        children: pending.totalChildren,
        childrenAges: pending.childrenAges,
      },
    ],
    totalAdults: pending.totalAdults,
    totalChildren: pending.totalChildren,
    childrenAges: pending.childrenAges,
    destinationText: pending.hotelName,
    transferHotelHint: pending.hotelName,
    pendingHotelCartId: pending.hotelCartId,
    savedAt: Date.now(),
  };
}

export async function loadPendingHotelTransfer(): Promise<PendingHotelTransfer | null> {
  try {
    const result = await chrome.storage.local.get(PENDING_HOTEL_TRANSFER_KEY);
    const raw = result[PENDING_HOTEL_TRANSFER_KEY] as PendingHotelTransfer | undefined;
    if (!raw?.hotelCartId || !raw.hotelName) return null;
    if (Date.now() - (raw.savedAt || 0) > 1000 * 60 * 60 * 12) return null;
    return raw;
  } catch {
    return null;
  }
}

export async function savePendingHotelTransfer(pending: PendingHotelTransfer): Promise<void> {
  try {
    await chrome.storage.local.set({ [PENDING_HOTEL_TRANSFER_KEY]: pending });
  } catch {
    // ignore
  }
}

export async function clearPendingHotelTransfer(): Promise<void> {
  try {
    await chrome.storage.local.remove(PENDING_HOTEL_TRANSFER_KEY);
  } catch {
    // ignore
  }
}

export function resolveLinkedHotel(
  transfer: TransferCartItem,
  hotels: HotelCartItem[],
  pending: PendingHotelTransfer | null
): HotelCartItem | undefined {
  if (transfer.linkedHotelId) {
    const byId = hotels.find((h) => h.id === transfer.linkedHotelId);
    if (byId) return byId;
  }
  const byName = hotels.find((h) => transferTouchesHotel(transfer, h.hotelName));
  if (byName) return byName;
  if (pending) {
    return hotels.find((h) => h.id === pending.hotelCartId);
  }
  return undefined;
}

export async function linkTransferToHotelKit(
  transfer: TransferCartItem,
  cartItems: CartItem[]
): Promise<TransferCartItem> {
  const hotels = cartItems.filter((i): i is HotelCartItem => i.type === 'hotel');
  const pending = await loadPendingHotelTransfer();
  const hotel = resolveLinkedHotel(transfer, hotels, pending);
  if (hotel) {
    await clearPendingHotelTransfer();
    return {
      ...transfer,
      linkedHotelId: hotel.id,
      linkedHotelName: hotel.hotelName,
    };
  }
  if (pending) await clearPendingHotelTransfer();
  return transfer;
}

export function transfersForHotel(
  hotel: HotelCartItem,
  transfers: TransferCartItem[]
): TransferCartItem[] {
  return transfers.filter(
    (t) => t.linkedHotelId === hotel.id || transferTouchesHotel(t, hotel.hotelName)
  );
}

export function groupCartItemsForDisplay(items: CartItem[]): CartDisplayGroup[] {
  const hotels = items.filter((i): i is HotelCartItem => i.type === 'hotel');
  const transfers = items.filter((i): i is TransferCartItem => i.type === 'transfer');
  const linkedIds = new Set<string>();
  for (const hotel of hotels) {
    for (const t of transfersForHotel(hotel, transfers)) linkedIds.add(t.id);
  }

  const groups: CartDisplayGroup[] = [];
  for (const item of items) {
    if (item.type === 'hotel') {
      groups.push({
        kind: 'kit',
        hotel: item,
        transfers: transfersForHotel(item, transfers),
      });
      continue;
    }
    if (item.type === 'transfer' && linkedIds.has(item.id)) continue;
    groups.push({ kind: 'item', item });
  }
  return groups;
}

export function activateBookingMotorTransferTab(doc: Document = document): boolean {
  const tab = doc.getElementById('tabtransfer');
  if (!(tab instanceof HTMLElement)) return false;
  const pane = doc.getElementById('tabtransfer-pane');
  const already =
    tab.classList.contains('active') ||
    tab.getAttribute('aria-selected') === 'true' ||
    pane?.classList.contains('active') ||
    pane?.classList.contains('show');
  if (already) return false;
  tab.click();
  return true;
}

export function isBookingMotorHost(hostname = location.hostname): boolean {
  return /grupostravel\.com$/i.test(hostname) || hostname === 'reservas.grupostravel.com';
}

export async function startHotelTransferSearch(pending: PendingHotelTransfer): Promise<void> {
  await savePendingHotelTransfer(pending);
  try {
    await chrome.storage.local.set({ tce_last_search: searchContextFromPending(pending) });
  } catch {
    // ignore
  }
}

export async function openBookingMotorTransferSearch(): Promise<void> {
  if (typeof location !== 'undefined' && isBookingMotorHost()) {
    if (activateBookingMotorTransferTab()) return;
    location.href = BM_NEW_BOOKING_URL;
    return;
  }
  try {
    await chrome.runtime.sendMessage({ type: 'TCE_OPEN_BM_TRANSFER' });
  } catch {
    // ignore
  }
}

/** Parsed GT combo transfers (TRF + tours in one product name). */
export interface ComboTransferParts {
  rawName: string;
  hasTrfInOut: boolean;
  nightFlights: boolean;
  dayFlights: boolean;
  /** Tour / excursion labels after the TRF segment. */
  tours: string[];
  /** Short transfer label for PDF/WhatsApp. */
  transferShort: string;
}

/**
 * Detects packaged transfer+tour names such as:
 * `GT- COMBO VIRAL 2: TRF IN + OUT (vuelos nocturnos) + BARU TERRESTRE o MARASÚ + City Tour…`
 * `GT - COMBO TRANSFER IN+OUT + PLAYA BLANCA+ALMUERZO+CHIVA RUMBERA Ó CITY TOUR`
 */
export function parseComboTransferName(name: string): ComboTransferParts | null {
  const raw = (name || '').replace(/\s+/g, ' ').trim();
  if (!raw) return null;
  if (!/combo|\btrf\s*in|\btransfer\s*in/i.test(raw)) return null;

  // Normalize IN+OUT / TRANSFER IN+OUT so split on "+" does not break the TRF token.
  let work = raw.replace(
    /\b(?:trf|transfer)\s*in\s*\+?\s*out\b/gi,
    'TRF IN+OUT'
  );
  const afterColon = work.includes(':') ? work.slice(work.indexOf(':') + 1).trim() : work;
  // Drop leading "GT - COMBO …" leftover when there is no colon.
  const body = afterColon
    .replace(/^gt\s*-?\s*combo\s*/i, '')
    .replace(/^transfer\s+/i, '')
    .trim();

  const parts = body
    .split(/\s*\+\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  const isTrfPart = (p: string) => /(?:trf|transfer)\s*in/i.test(p) || /^in\+?out$/i.test(p);
  const trfPart = parts.find(isTrfPart);
  const tours = parts
    .filter((p) => !isTrfPart(p))
    .map((t) => t.replace(/^gt\s*-?\s*/i, '').trim())
    .filter(Boolean);
  if (!trfPart && tours.length === 0) return null;

  const nightFlights = /nocturn/i.test(raw);
  const dayFlights = /diurn/i.test(raw);
  const hasTrfInOut = /(?:trf|transfer)\s*in\s*\+?\s*out|in\s*\+\s*out|in\+out/i.test(raw);

  let transferShort = 'Traslados aeropuerto ↔ hotel';
  if (hasTrfInOut) transferShort = 'TRF IN + OUT';
  if (nightFlights) transferShort += ' (vuelos nocturnos)';
  else if (dayFlights) transferShort += ' (vuelos diurnos)';

  return {
    rawName: raw,
    hasTrfInOut,
    nightFlights,
    dayFlights,
    tours,
    transferShort,
  };
}

export function collectComboToursFromItems(items: CartItem[]): {
  transfers: ComboTransferParts[];
  tours: string[];
} {
  const transfers: ComboTransferParts[] = [];
  const tourSet = new Set<string>();
  for (const item of items) {
    if (item.type !== 'transfer') continue;
    const parsed = parseComboTransferName(item.name);
    if (!parsed) continue;
    transfers.push(parsed);
    for (const t of parsed.tours) tourSet.add(t);
  }
  return { transfers, tours: Array.from(tourSet) };
}

/** Tour / activity names for «Tarifa incluye» (combo transfers + cart items). */
export function collectTourLabelsFromItems(items: CartItem[]): string[] {
  const combo = collectComboToursFromItems(items);
  const labels = new Set<string>(combo.tours);
  for (const item of items) {
    if (item.type === 'tour' && !item.isBloqueo && item.name?.trim()) {
      labels.add(item.name.trim());
    }
    if (item.type === 'activity' && item.name?.trim()) {
      labels.add(item.name.trim());
    }
  }
  return Array.from(labels);
}
