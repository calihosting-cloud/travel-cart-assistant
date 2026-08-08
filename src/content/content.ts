import { BookingMotorExtractor } from '../engine/providers/bookingmotor/BookingMotorExtractor';
import { BookingMotorTransferExtractor } from '../engine/providers/bookingmotor/BookingMotorTransferExtractor';
import { BookingMotorUIInjector } from '../engine/providers/bookingmotor/BookingMotorUIInjector';
import { BookingMotorTransferUIInjector } from '../engine/providers/bookingmotor/BookingMotorTransferUIInjector';
import { BookingMotorActivityDOMReader } from '../engine/providers/bookingmotor/BookingMotorActivityDOMReader';
import { BookingMotorActivityUIInjector } from '../engine/providers/bookingmotor/BookingMotorActivityUIInjector';
import { BookingMotorInsuranceDOMReader } from '../engine/providers/bookingmotor/BookingMotorInsuranceDOMReader';
import { BookingMotorInsuranceUIInjector } from '../engine/providers/bookingmotor/BookingMotorInsuranceUIInjector';
import { PageObserver } from '../engine/observer/PageObserver';
import {
  ActivityCartItem,
  FlightCartItem,
  FlightProduct,
  HotelCartItem,
  InsuranceCartItem,
  Occupancy,
  SearchContext,
  TransferCartItem,
} from '../engine/core/types';
import { CartSidebar } from '../ui/CartSidebar';
import { SearchSyncController } from './searchSync';
import { BookingMotorSearchFormSync } from '../engine/providers/bookingmotor/BookingMotorSearchFormSync';
import { DespegarFlightReader } from '../engine/providers/despegar/DespegarFlightReader';
import { DespegarFlightUIInjector } from '../engine/providers/despegar/DespegarFlightUIInjector';
import { XNetFlightReader } from '../engine/providers/xnet/XNetFlightReader';
import { XNetFlightUIInjector } from '../engine/providers/xnet/XNetFlightUIInjector';
import { AviancaFlightReader } from '../engine/providers/avianca/AviancaFlightReader';
import { AviancaFlightUIInjector } from '../engine/providers/avianca/AviancaFlightUIInjector';
import { WingoFlightReader } from '../engine/providers/wingo/WingoFlightReader';
import { WingoFlightUIInjector } from '../engine/providers/wingo/WingoFlightUIInjector';
import { JetSmartFlightReader } from '../engine/providers/jetsmart/JetSmartFlightReader';
import { JetSmartFlightUIInjector } from '../engine/providers/jetsmart/JetSmartFlightUIInjector';
import { appendAppLog } from '../shared/appLog';
import { readAdvisorNameFromDom, saveAdvisorName } from '../shared/quoteHistory';
import { loadTrm, saveTrm, todayIso, trmFromPair } from '../shared/trm';

console.log('[TCE] Travel Capture Engine Content Script Loaded.');
void appendAppLog('info', 'Content script loaded', location.hostname);

type PageType = 'hotel' | 'transfer' | 'activity' | 'insurance';

let cachedJSPayload: any = null;
let cachedAviancaDigitalData: any = null;
let cachedWingoFares: any = null;
const hotelExtractor = new BookingMotorExtractor();
const transferExtractor = new BookingMotorTransferExtractor();
const hotelUIInjector = new BookingMotorUIInjector();
const transferUIInjector = new BookingMotorTransferUIInjector();
const activityDomReader = new BookingMotorActivityDOMReader();
const activityUIInjector = new BookingMotorActivityUIInjector();
const insuranceDomReader = new BookingMotorInsuranceDOMReader();
const insuranceUIInjector = new BookingMotorInsuranceUIInjector();
const despegarUIInjector = new DespegarFlightUIInjector();
const xnetUIInjector = new XNetFlightUIInjector();
const aviancaUIInjector = new AviancaFlightUIInjector();
const wingoUIInjector = new WingoFlightUIInjector();
const jetSmartUIInjector = new JetSmartFlightUIInjector();

let cartSidebar: CartSidebar;
try {
  cartSidebar = new CartSidebar();
} catch (err) {
  console.error('[TCE] CartSidebar failed to init:', err);
  throw err;
}
const searchFormSync = new BookingMotorSearchFormSync();

function syncAdvisorFromPage(): void {
  const name = readAdvisorNameFromDom(document);
  if (name) {
    void saveAdvisorName(name);
    cartSidebar.setAdvisorName(name);
  }
}

async function maybeUpdateTrmFromUsdCop(cop?: number, usd?: number): Promise<void> {
  if (!cop || !usd) return;
  const rate = trmFromPair(cop, usd);
  if (!rate) return;
  const existing = await loadTrm();
  // Prefer official api (dolar-colombia.com) or advisor manual for today.
  if (existing && existing.date === todayIso() && (existing.source === 'api' || existing.source === 'manual')) {
    return;
  }
  await saveTrm({ rate, date: todayIso(), source: 'page', updatedAt: Date.now() });
  cartSidebar.setTrm(rate);
}
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
  if (document.querySelector('#list-activity-items, .list-results.list-activity')) return 'activity';
  if (document.querySelector('#list-insurance-items, .bm-insurance-list')) return 'insurance';
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
  if (msg && msg.source === 'tce-avianca' && msg.type === 'TCE_AVIANCA_DIGITAL_DATA') {
    cachedAviancaDigitalData = msg.payload;
    console.log('[TCE] Avianca digitalData cached.');
  }
  if (msg && msg.source === 'tce-wingo' && msg.type === 'TCE_WINGO_FARES') {
    cachedWingoFares = msg.payload;
    console.log('[TCE] Wingo fares payload cached.');
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
      bookingUrl: rate.bookingUrl,
      sourceUrl: typeof location !== 'undefined' ? location.href : undefined,
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
      sourceUrl: typeof location !== 'undefined' ? location.href : undefined,
      addedAt: Date.now(),
    };

    logCartItem(cartItem);
    cartSidebar.addItem(cartItem);
  } catch (err) {
    console.error('[TCE] Failed to compile transfer CartItem:', err);
  }
}

function handleAddActivityToCart(activityId: string, optionIndex?: number): void {
  console.log(
    `[TCE] Add-to-cart clicked for Activity ID: ${activityId}, option: ${optionIndex ?? 'n/a'}`
  );
  try {
    const products = activityDomReader.extractAll(document);
    const matches = products.filter((p) => p.activityId === activityId);
    const activity =
      optionIndex !== undefined && matches[optionIndex]
        ? matches[optionIndex]
        : matches[0] || products.find((p) => p.activityId === activityId);
    if (!activity) {
      console.warn(`[TCE] Activity ${activityId} not found.`);
      return;
    }

    const form = searchFormSync.getForm(document, 'activity');
    const ctx = form ? searchFormSync.capture(form, 'activity') : null;
    void maybeUpdateTrmFromUsdCop(activity.price, activity.priceUsd);

    const cartItem: ActivityCartItem = {
      type: 'activity',
      id: `cart_item_activity_${activity.activityId}_${Date.now()}`,
      activityId: activity.activityId,
      name: activity.name,
      description: activity.description,
      checkIn: ctx?.checkIn || '',
      checkOut: ctx?.checkOut,
      adults: ctx?.totalAdults || 0,
      children: ctx?.totalChildren || 0,
      price: activity.price,
      currency: activity.currency,
      priceUsd: activity.priceUsd,
      supplierName: activity.supplierName,
      imageUrl: activity.imageUrl,
      bookingUrl: activity.bookingUrl,
      sourceUrl: typeof location !== 'undefined' ? location.href : undefined,
      addedAt: Date.now(),
    };

    if (ctx) cartSidebar.setSearchContext(ctx);
    logCartItem(cartItem);
    void appendAppLog('info', `Actividad agregada: ${activity.name}`);
    cartSidebar.addItem(cartItem);
  } catch (err) {
    console.error('[TCE] Failed to compile activity CartItem:', err);
    void appendAppLog('error', 'Error agregando actividad');
  }
}

function handleAddInsuranceToCart(insuranceId: string): void {
  console.log(`[TCE] Add-to-cart clicked for Insurance ID: ${insuranceId}`);
  try {
    const products = insuranceDomReader.extractAll(document);
    const insurance = products.find((p) => p.insuranceId === insuranceId);
    if (!insurance) {
      console.warn(`[TCE] Insurance ${insuranceId} not found.`);
      return;
    }

    const form = searchFormSync.getForm(document, 'insurance');
    const ctx = form ? searchFormSync.capture(form, 'insurance') : null;
    void maybeUpdateTrmFromUsdCop(insurance.price, insurance.priceUsd);

    const cartItem: InsuranceCartItem = {
      type: 'insurance',
      id: `cart_item_insurance_${insurance.insuranceId}_${Date.now()}`,
      insuranceId: insurance.insuranceId,
      name: insurance.name,
      planLabel: insurance.planLabel,
      checkIn: ctx?.checkIn || '',
      checkOut: ctx?.checkOut,
      passengers: (ctx?.totalAdults || 0) + (ctx?.totalChildren || 0) || 1,
      price: insurance.price,
      currency: insurance.currency,
      priceUsd: insurance.priceUsd,
      supplierName: insurance.supplierName,
      imageUrl: insurance.imageUrl,
      bookingUrl: insurance.bookingUrl,
      sourceUrl: typeof location !== 'undefined' ? location.href : undefined,
      addedAt: Date.now(),
    };

    if (ctx) cartSidebar.setSearchContext(ctx);
    logCartItem(cartItem);
    void appendAppLog('info', `Seguro agregado: ${insurance.name}`);
    cartSidebar.addItem(cartItem);
  } catch (err) {
    console.error('[TCE] Failed to compile insurance CartItem:', err);
    void appendAppLog('error', 'Error agregando seguro');
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
  infants?: number;
}): void {
  const originText = flight.origin.name || flight.origin.code || undefined;
  const destinationText =
    flight.destination.name ||
    flight.destination.code ||
    flight.title ||
    undefined;

  // Sticky trip guide for ANY airline (first flight wins). Keeps BM
  // `tce_last_search` untouched so hotel→transfer sync stays intact; SearchSync
  // reads trip guide as fallback to prefill hotel dates/pax after a flight-first flow.
  const ctx: SearchContext = {
    sourceType: 'flight',
    checkIn: isoToDdMmYyyy(flight.departureDate),
    checkOut: isoToDdMmYyyy(flight.returnDate),
    nights: nightsBetweenIso(flight.departureDate, flight.returnDate),
    rooms: [
      {
        adults: flight.adults,
        children: flight.children,
        childrenAges: [],
      },
    ],
    totalAdults: flight.adults,
    totalChildren: flight.children,
    childrenAges: [],
    originText,
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
    baggageIncluded: flight.baggageIncluded,
    bookingUrl: flight.bookingUrl,
    sourceUrl: typeof location !== 'undefined' ? location.href : flight.bookingUrl,
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

function handleAddAviancaFlightToCart(): void {
  const flight =
    AviancaFlightReader.fromDigitalData(cachedAviancaDigitalData, document) ||
    AviancaFlightReader.fromDom(document);
  if (!flight) {
    console.warn('[TCE] Could not read Avianca trip summary.');
    throw new Error('No Avianca trip data found');
  }
  pushFlightToCart(flight, 'Avianca');
}

function handleAddWingoFlightToCart(): void {
  const flight = WingoFlightReader.extract(document, cachedWingoFares);
  if (!flight) {
    console.warn('[TCE] Could not read Wingo search/summary.');
    throw new Error('No Wingo flight data found');
  }
  if (!flight.price || flight.price <= 0) {
    console.warn('[TCE] Wingo total is 0 — select outbound + return first.');
    throw new Error('NO_TOTAL');
  }
  pushFlightToCart(flight, 'Wingo');
}

function handleAddJetSmartFlightToCart(): void {
  const flight = JetSmartFlightReader.extract(document);
  if (!flight) {
    console.warn('[TCE] Could not read JetSMART selected flight.');
    throw new Error('No JetSMART flight data found');
  }
  pushFlightToCart(flight, 'JetSMART');
}

function injectWingoFaresProbe(): void {
  try {
    const script = document.createElement('script');
    script.textContent = `
      (function () {
        if (window.__tceWingoFetchHooked) return;
        window.__tceWingoFetchHooked = true;
        var orig = window.fetch;
        window.fetch = function () {
          return orig.apply(this, arguments).then(function (res) {
            try {
              var url = (res && res.url) || '';
              if (/gateway\\.wingo\\.com\\/routes-api\\/fares/i.test(url)) {
                res.clone().json().then(function (body) {
                  window.postMessage({
                    source: 'tce-wingo',
                    type: 'TCE_WINGO_FARES',
                    payload: body
                  }, '*');
                }).catch(function () {});
              }
            } catch (e) {}
            return res;
          });
        };
      })();
    `;
    (document.documentElement || document.head).appendChild(script);
    script.remove();
  } catch (err) {
    console.warn('[TCE] Wingo fares probe failed:', err);
  }
}

function injectAviancaDigitalDataProbe(): void {
  try {
    const script = document.createElement('script');
    script.textContent = `
      (function () {
        function send() {
          try {
            if (typeof digitalData !== 'undefined' && digitalData) {
              window.postMessage({
                source: 'tce-avianca',
                type: 'TCE_AVIANCA_DIGITAL_DATA',
                payload: digitalData
              }, '*');
            }
          } catch (e) {}
        }
        send();
        var n = 0;
        var t = setInterval(function () {
          send();
          if (++n >= 20) clearInterval(t);
        }, 1000);
      })();
    `;
    (document.documentElement || document.head).appendChild(script);
    script.remove();
  } catch (err) {
    console.warn('[TCE] Avianca digitalData probe failed:', err);
  }
}

function logCartItem(
  item: HotelCartItem | TransferCartItem | FlightCartItem | ActivityCartItem | InsuranceCartItem
) {
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

  syncAdvisorFromPage();
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

  if (pageType === 'transfer') {
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
    return;
  }

  if (pageType === 'activity') {
    try {
      const products = activityDomReader.extractAll(document);
      console.log(`[TCE] Extracted ${products.length} activity products.`);
      const withUsd = products.find((p) => p.priceUsd && p.currency === 'COP');
      if (withUsd) void maybeUpdateTrmFromUsdCop(withUsd.price, withUsd.priceUsd);
    } catch (err) {
      console.error('[TCE] Activity extraction error:', err);
    }

    try {
      activityUIInjector.injectButtons(document, handleAddActivityToCart);
    } catch (err) {
      console.error('[TCE] Activity button injection error:', err);
    }
    return;
  }

  try {
    const products = insuranceDomReader.extractAll(document);
    console.log(`[TCE] Extracted ${products.length} insurance products.`);
  } catch (err) {
    console.error('[TCE] Insurance extraction error:', err);
  }

  try {
    insuranceUIInjector.injectButtons(document, handleAddInsuranceToCart);
  } catch (err) {
    console.error('[TCE] Insurance button injection error:', err);
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

function isAviancaHost(): boolean {
  if (/(^|\.)avianca\.com$/i.test(location.hostname)) return true;
  return !!document.querySelector(
    'trip-summary-page, bound-displayer-pres, .trip-summary-content'
  );
}

function isWingoHost(): boolean {
  if (/(^|\.)wingo\.com$/i.test(location.hostname)) return true;
  return !!document.querySelector('w-org-travel-card, w-org-summary-detail-to-pay, main-layout w-header');
}

function isJetSmartHost(): boolean {
  if (/(^|\.)jetsmart\.com$/i.test(location.hostname)) return true;
  return !!document.querySelector(
    '[data-test-id="sidebar-total-amount-value-with-currency-sign"], [data-test-id^="bundle-selected-container--j|"]'
  );
}

function initJetSmart(): void {
  console.log('[TCE] JetSMART host detected. Watching selected flight…');
  const tryInject = () => {
    if (!JetSmartFlightReader.hasSelectedFlight(document)) return;
    jetSmartUIInjector.injectButton(document, handleAddJetSmartFlightToCart);
  };
  tryInject();
  const observer = new MutationObserver(tryInject);
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
}

function initWingo(): void {
  console.log('[TCE] Wingo host detected. Watching search / Tus vuelos…', location.href);
  injectWingoFaresProbe();

  let debounceTimer: number | undefined;
  const tryInject = () => {
    // injectButton hides itself on the search form; only mounts beside Total.
    try {
      wingoUIInjector.injectButton(document, handleAddWingoFlightToCart);
    } catch (err) {
      console.error('[TCE] Wingo button injection error:', err);
    }
  };

  const scheduleInject = () => {
    if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(tryInject, 150);
  };

  tryInject();
  // Retry a few times: Angular boots after document_end.
  [500, 1500, 3000, 6000].forEach((ms) => window.setTimeout(tryInject, ms));

  const obs = new MutationObserver(scheduleInject);
  const root = document.body || document.documentElement;
  if (root) {
    obs.observe(root, { childList: true, subtree: true });
  }
}

function initAvianca(): void {
  console.log('[TCE] Avianca host detected. Watching for trip summary…');
  injectAviancaDigitalDataProbe();

  let debounceTimer: number | undefined;
  const tryInject = () => {
    if (!AviancaFlightReader.hasTripSummary(document)) return;
    injectAviancaDigitalDataProbe();
    try {
      aviancaUIInjector.injectButton(document, handleAddAviancaFlightToCart);
    } catch (err) {
      console.error('[TCE] Avianca button injection error:', err);
    }
  };

  const scheduleInject = () => {
    if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(tryInject, 250);
  };

  tryInject();
  const obs = new MutationObserver(scheduleInject);
  if (document.body) {
    obs.observe(document.body, { childList: true, subtree: true });
  }
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
} else if (isAviancaHost()) {
  initAvianca();
} else if (isWingoHost()) {
  initWingo();
} else if (isJetSmartHost()) {
  initJetSmart();
} else {
  initBookingMotor();
}
