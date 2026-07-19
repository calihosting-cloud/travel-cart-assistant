import { BookingMotorExtractor } from '../engine/providers/bookingmotor/BookingMotorExtractor';
import { BookingMotorTransferExtractor } from '../engine/providers/bookingmotor/BookingMotorTransferExtractor';
import { BookingMotorUIInjector } from '../engine/providers/bookingmotor/BookingMotorUIInjector';
import { BookingMotorTransferUIInjector } from '../engine/providers/bookingmotor/BookingMotorTransferUIInjector';
import { PageObserver } from '../engine/observer/PageObserver';
import { FlightCartItem, FlightProduct, HotelCartItem, Occupancy, SearchContext, TransferCartItem } from '../engine/core/types';
import { CartSidebar } from '../ui/CartSidebar';
import { SearchSyncController } from './searchSync';
import { BookingMotorSearchFormSync } from '../engine/providers/bookingmotor/BookingMotorSearchFormSync';
import { DespegarFlightReader } from '../engine/providers/despegar/DespegarFlightReader';
import { DespegarFlightUIInjector } from '../engine/providers/despegar/DespegarFlightUIInjector';
import { XNetFlightReader } from '../engine/providers/xnet/XNetFlightReader';
import { XNetFlightUIInjector } from '../engine/providers/xnet/XNetFlightUIInjector';

console.log('[TCE] Travel Capture Engine Content Script Loaded.');

type PageType = 'hotel' | 'transfer';

let cachedJSPayload: any = null;
const hotelExtractor = new BookingMotorExtractor();
const transferExtractor = new BookingMotorTransferExtractor();
const hotelUIInjector = new BookingMotorUIInjector();
const transferUIInjector = new BookingMotorTransferUIInjector();
const despegarUIInjector = new DespegarFlightUIInjector();
const xnetUIInjector = new XNetFlightUIInjector();

let cartSidebar: CartSidebar;
try {
  cartSidebar = new CartSidebar();
} catch (err) {
  console.error('[TCE] CartSidebar failed to init:', err);
  throw err;
}
const searchFormSync = new BookingMotorSearchFormSync();

function computeNights(checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) return 0;
  const parse = (d: string): number | null => {
    const m = d.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    return m ? Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
  };
  const a = parse(checkIn);
  const b = parse(checkOut);
  if (a === null || b === null) return 0;
  const diff = Math.round((b - a) / 86_400_000);
  return diff > 0 ? diff : 0;
}

/**
 * Dates/nights/occupancy come from window.data. If the bridge didn't deliver it
 * (0 nights or empty occupancy), fall back to reading the hotel search form from
 * the DOM, which holds the real values even on results pages.
 */
function resolveHotelSearchFields(hotel: {
  checkIn: string;
  checkOut: string;
  nights: number;
  occupancy: Occupancy[];
}): { checkIn: string; checkOut: string; nights: number; occupancy: Occupancy[] } {
  let { checkIn, checkOut, nights, occupancy } = hotel;

  const occEmpty =
    !occupancy ||
    occupancy.length === 0 ||
    occupancy.every((o) => o.adults === 0 && o.children === 0);

  if (!checkIn || !checkOut || !nights || occEmpty) {
    const form = searchFormSync.getForm(document, 'hotel');
    if (form) {
      const ctx = searchFormSync.capture(form, 'hotel');
      if (!checkIn && ctx.checkIn) checkIn = ctx.checkIn;
      if (!checkOut && ctx.checkOut) checkOut = ctx.checkOut;
      if (!nights && ctx.nights) nights = ctx.nights;
      if (occEmpty && ctx.rooms.length > 0) {
        occupancy = ctx.rooms.map((r) => ({
          adults: r.adults,
          children: r.children,
          childrenAges: r.childrenAges,
        }));
      }
    }
  }

  if (!nights) nights = computeNights(checkIn, checkOut);

  return { checkIn, checkOut, nights, occupancy };
}

/**
 * Same window.data fallback for transfers: if passengers came out as 0, read
 * them (and dates) from the transfer search form in the DOM.
 */
function resolveTransferSearchFields(transfer: {
  checkIn: string;
  adults: number;
  children: number;
  childrenAges: number[];
}): { checkIn: string; adults: number; children: number; childrenAges: number[] } {
  let { checkIn, adults, children, childrenAges } = transfer;

  if (!checkIn || (adults === 0 && children === 0)) {
    const form = searchFormSync.getForm(document, 'transfer');
    if (form) {
      const ctx = searchFormSync.capture(form, 'transfer');
      if (!checkIn && ctx.checkIn) checkIn = ctx.checkIn;
      if (adults === 0 && children === 0) {
        adults = ctx.totalAdults;
        children = ctx.totalChildren;
        childrenAges = ctx.childrenAges;
      }
    }
  }

  return { checkIn, adults, children, childrenAges };
}

function detectPageType(): PageType | null {
  if (document.querySelector('#list-hotel-items')) return 'hotel';
  if (document.querySelector('#list-transfer-items')) return 'transfer';
  return null;
}

function injectBridge() {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('bridge.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
    console.log('[TCE] Main World Bridge injected.');
  } catch (err) {
    console.error('[TCE] Failed to inject Main World Bridge script:', err);
  }
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  const msg = event.data;
  if (msg && msg.source === 'tce-bridge' && msg.type === 'TCE_BRIDGE_DATA') {
    cachedJSPayload = msg.payload;
    console.log('[TCE] JS search context payload cached.');
    runExtractionAndInjection();
  }
});

function handleAddHotelToCart(hotelId: string, rateIndex?: number) {
  if (rateIndex === undefined) return;
  console.log(`[TCE] Add-to-cart clicked for Hotel ID: ${hotelId}, Rate Index: ${rateIndex}`);

  try {
    const products = hotelExtractor.extract(cachedJSPayload, document);
    const hotel = products.find((p) => p.hotelId === hotelId);
    if (!hotel) {
      console.warn(`[TCE] Hotel product with ID ${hotelId} not found.`);
      return;
    }

    const rate = hotel.rates[rateIndex];
    if (!rate) {
      console.warn(`[TCE] Room rate at index ${rateIndex} not found for Hotel ID ${hotelId}.`);
      return;
    }

    const resolved = resolveHotelSearchFields(hotel);

    const cartItem: HotelCartItem = {
      type: 'hotel',
      id: `cart_item_${hotel.hotelId}_${rateIndex}_${Date.now()}`,
      hotelId: hotel.hotelId,
      hotelName: hotel.name,
      stars: hotel.stars,
      address: hotel.address,
      imageUrl: hotel.imageUrl,
      checkIn: resolved.checkIn,
      checkOut: resolved.checkOut,
      nights: resolved.nights,
      occupancy: resolved.occupancy,
      selectedRate: rate,
      addedAt: Date.now(),
    };

    logCartItem(cartItem);
    cartSidebar.addItem(cartItem);
  } catch (err) {
    console.error('[TCE] Failed to compile hotel CartItem:', err);
  }
}

function handleAddTransferToCart(transferId: string) {
  console.log(`[TCE] Add-to-cart clicked for Transfer ID: ${transferId}`);

  try {
    const products = transferExtractor.extract(cachedJSPayload, document);
    const transfer = products.find((p) => p.transferId === transferId);
    if (!transfer) {
      console.warn(`[TCE] Transfer product with ID ${transferId} not found.`);
      return;
    }

    const resolved = resolveTransferSearchFields(transfer);

    const cartItem: TransferCartItem = {
      type: 'transfer',
      id: `cart_item_${transfer.transferId}_${Date.now()}`,
      transferId: transfer.transferId,
      name: transfer.name,
      vehicleDescription: transfer.vehicleDescription,
      transferType: transfer.transferType,
      from: transfer.from,
      to: transfer.to,
      tripType: transfer.tripType,
      checkIn: resolved.checkIn,
      checkInTime: transfer.checkInTime,
      checkOut: transfer.checkOut,
      checkOutTime: transfer.checkOutTime,
      adults: resolved.adults,
      children: resolved.children,
      legs: transfer.legs,
      price: transfer.price,
      currency: transfer.currency,
      supplierName: transfer.supplierName,
      imageUrl: transfer.imageUrl,
      bookingUrl: transfer.bookingUrl,
      addedAt: Date.now(),
    };

    logCartItem(cartItem);
    cartSidebar.addItem(cartItem);
  } catch (err) {
    console.error('[TCE] Failed to compile transfer CartItem:', err);
  }
}

function isoToDdMmYyyy(iso?: string): string | undefined {
  if (!iso) return undefined;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}

function nightsBetweenIso(checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) return 0;
  const a = Date.parse(checkIn);
  const b = Date.parse(checkOut);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  const diff = Math.round((b - a) / 86_400_000);
  return diff > 0 ? diff : 0;
}

function applyFlightSearchSummary(flight: {
  title: string;
  origin: { code: string; name?: string };
  destination: { code: string; name?: string };
  departureDate?: string;
  returnDate?: string;
  adults: number;
  children: number;
}): void {
  const destinationText =
    flight.title ||
    [flight.origin.name || flight.origin.code, flight.destination.name || flight.destination.code]
      .filter(Boolean)
      .join(' → ');

  // In-memory only: writing `tce_last_search` here used to wipe the hotel→transfer
  // sync context that BookingMotor relies on.
  const ctx: SearchContext = {
    sourceType: 'flight',
    checkIn: isoToDdMmYyyy(flight.departureDate),
    checkOut: isoToDdMmYyyy(flight.returnDate),
    nights: nightsBetweenIso(flight.departureDate, flight.returnDate),
    rooms: [],
    totalAdults: flight.adults,
    totalChildren: flight.children,
    childrenAges: [],
    destinationText,
    savedAt: Date.now(),
  };
  cartSidebar.setSearchContext(ctx);
}

function pushFlightToCart(flight: FlightProduct, sourceLabel: string): void {
  console.log(`[TCE] Add-to-cart clicked for ${sourceLabel} flight.`);

  if (cartSidebar.hasFlightTrip(flight.tripId)) {
    console.log('[TCE] Flight already in cart (same tripId). Skipping duplicate.');
    throw new Error('ALREADY_IN_CART');
  }

  const cartItem: FlightCartItem = {
    type: 'flight',
    id: `cart_item_${flight.tripId || flight.id}_${Date.now()}`,
    provider: flight.provider,
    tripId: flight.tripId,
    title: flight.title,
    routeType: flight.routeType,
    origin: flight.origin,
    destination: flight.destination,
    departureDate: flight.departureDate,
    returnDate: flight.returnDate,
    adults: flight.adults,
    children: flight.children,
    infants: flight.infants,
    paxSummary: flight.paxSummary,
    legs: flight.legs,
    price: flight.price,
    currency: flight.currency,
    priceBreakdown: flight.priceBreakdown,
    bookingUrl: flight.bookingUrl,
    addedAt: Date.now(),
  };

  logCartItem(cartItem);
  void cartSidebar.addItem(cartItem);
  applyFlightSearchSummary(flight);
}

function handleAddFlightToCart(): void {
  const flight = DespegarFlightReader.extract(document);
  if (!flight) {
    console.warn('[TCE] Could not read Despegar flight checkout data.');
    throw new Error('No flight checkout data found');
  }
  pushFlightToCart(flight, 'Despegar');
}

function handleAddXNetFlightToCart(): void {
  const flight = XNetFlightReader.extract(document);
  if (!flight) {
    console.warn('[TCE] Could not read XNet selected fare.');
    throw new Error('No XNet selected fare found');
  }
  pushFlightToCart(flight, 'XNet');
}

function logCartItem(item: HotelCartItem | TransferCartItem | FlightCartItem) {
  console.log('==================================================');
  console.log('         [TCE] PRODUCT ADDED TO CART              ');
  console.log('==================================================');
  console.dir(item);
  console.log('==================================================');
}

function runExtractionAndInjection() {
  const pageType = detectPageType();
  if (!pageType) {
    console.log('[TCE] No supported search results container found. Skipping.');
    return;
  }

  console.log(`[TCE] Executing extraction and UI injection (${pageType})...`);

  if (pageType === 'hotel') {
    try {
      const products = hotelExtractor.extract(cachedJSPayload, document);
      console.log(`[TCE] Extracted ${products.length} hotel products.`);
    } catch (err) {
      console.error('[TCE] Hotel extraction error:', err);
    }

    try {
      hotelUIInjector.injectButtons(document, handleAddHotelToCart);
    } catch (err) {
      console.error('[TCE] Hotel button injection error:', err);
    }
    return;
  }

  try {
    const products = transferExtractor.extract(cachedJSPayload, document);
    console.log(`[TCE] Extracted ${products.length} transfer products.`);
  } catch (err) {
    console.error('[TCE] Transfer extraction error:', err);
  }

  try {
    transferUIInjector.injectButtons(document, handleAddTransferToCart);
  } catch (err) {
    console.error('[TCE] Transfer button injection error:', err);
  }
}

function isDespegarHost(): boolean {
  return /(^|\.)despegar\./i.test(location.hostname);
}

function isXNetHost(): boolean {
  if (/(^|\.)xnet\.travel$/i.test(location.hostname)) return true;
  // Offline fixtures (file://) and mirrors that keep the same DOM.
  return !!document.querySelector('#divRatesReserve table.selectedFlight, #divRatesReserve #tabs-tarif');
}

function initDespegar(): void {
  console.log('[TCE] Despegar host detected. Watching for flight checkout...');

  const tryInject = () => {
    if (!DespegarFlightReader.hasFlightCheckout(document)) return;
    try {
      despegarUIInjector.injectButton(document, handleAddFlightToCart);
    } catch (err) {
      console.error('[TCE] Despegar button injection error:', err);
    }
  };

  tryInject();

  // Despegar is an SPA: the checkout renders/updates after load, so keep
  // watching the body until the CheckoutModel script is present.
  const obs = new MutationObserver(() => tryInject());
  if (document.body) {
    obs.observe(document.body, { childList: true, subtree: true });
  }
}

function initXNet(): void {
  console.log('[TCE] XNet/Scape host detected. Watching for selected fare...');

  let debounceTimer: number | undefined;
  const tryInject = () => {
    if (!XNetFlightReader.hasSelectedFare(document)) return;
    try {
      xnetUIInjector.injectButton(document, handleAddXNetFlightToCart);
    } catch (err) {
      console.error('[TCE] XNet button injection error:', err);
    }
  };

  const scheduleInject = () => {
    if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(tryInject, 200);
  };

  tryInject();

  // Observe body: #divRatesReserve is often replaced when picking ida/vuelta,
  // which would detach an observer bound only to that node.
  const obs = new MutationObserver(scheduleInject);
  if (document.body) {
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'aria-hidden', 'class'] });
  }
}

function initBookingMotor(): void {
  const observer = new PageObserver('#content', () => {
    const pageType = detectPageType();
    if (!pageType) return;

    console.log(`[TCE] Mutation observed (${pageType}). Re-injecting & re-extracting...`);
    window.postMessage({ type: 'TCE_REQUEST_DATA' }, '*');
    runExtractionAndInjection();
  });

  injectBridge();
  observer.start();

  const searchSync = new SearchSyncController();
  void searchSync.init();
}

if (isDespegarHost()) {
  initDespegar();
} else if (isXNetHost()) {
  initXNet();
} else {
  initBookingMotor();
}
