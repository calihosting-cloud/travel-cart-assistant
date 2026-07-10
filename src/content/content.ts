import { BookingMotorExtractor } from '../engine/providers/bookingmotor/BookingMotorExtractor';
import { BookingMotorTransferExtractor } from '../engine/providers/bookingmotor/BookingMotorTransferExtractor';
import { BookingMotorUIInjector } from '../engine/providers/bookingmotor/BookingMotorUIInjector';
import { BookingMotorTransferUIInjector } from '../engine/providers/bookingmotor/BookingMotorTransferUIInjector';
import { PageObserver } from '../engine/observer/PageObserver';
import { HotelCartItem, TransferCartItem } from '../engine/core/types';
import { CartSidebar } from '../ui/CartSidebar';

console.log('[TCE] Travel Capture Engine Content Script Loaded.');

type PageType = 'hotel' | 'transfer';

let cachedJSPayload: any = null;
const hotelExtractor = new BookingMotorExtractor();
const transferExtractor = new BookingMotorTransferExtractor();
const hotelUIInjector = new BookingMotorUIInjector();
const transferUIInjector = new BookingMotorTransferUIInjector();
const cartSidebar = new CartSidebar();

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

    const cartItem: HotelCartItem = {
      type: 'hotel',
      id: `cart_item_${hotel.hotelId}_${rateIndex}_${Date.now()}`,
      hotelId: hotel.hotelId,
      hotelName: hotel.name,
      stars: hotel.stars,
      address: hotel.address,
      imageUrl: hotel.imageUrl,
      checkIn: hotel.checkIn,
      checkOut: hotel.checkOut,
      nights: hotel.nights,
      occupancy: hotel.occupancy,
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
      checkIn: transfer.checkIn,
      checkInTime: transfer.checkInTime,
      checkOut: transfer.checkOut,
      checkOutTime: transfer.checkOutTime,
      adults: transfer.adults,
      children: transfer.children,
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

function logCartItem(item: HotelCartItem | TransferCartItem) {
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

const observer = new PageObserver('#content', () => {
  const pageType = detectPageType();
  if (!pageType) return;

  console.log(`[TCE] Mutation observed (${pageType}). Re-injecting & re-extracting...`);
  window.postMessage({ type: 'TCE_REQUEST_DATA' }, '*');
  runExtractionAndInjection();
});

injectBridge();
observer.start();
