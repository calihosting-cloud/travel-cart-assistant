import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import { BookingMotorTransferExtractor } from '../src/engine/providers/bookingmotor/BookingMotorTransferExtractor';
import { BookingMotorTransferUIInjector } from '../src/engine/providers/bookingmotor/BookingMotorTransferUIInjector';
import { TransferCartItem } from '../src/engine/core/types';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.resolve(__dirname, '../traslados.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const match = htmlContent.match(/let\s+data\s*=\s*JSON\.parse\('(.*?)'\);/);
if (!match) {
  console.error('Could not find "let data = JSON.parse(...)" in traslados.html');
  process.exit(1);
}

const jsData = JSON.parse(match[1]);
const dom = new JSDOM(htmlContent, {
  url: 'https://reservas.grupostravel.com/es/backoffice/list-transfer/1114114126a506e034c655',
});
const document = dom.window.document;

const extractor = new BookingMotorTransferExtractor();
const products = extractor.extract(jsData, document);

console.log('==================================================');
console.log('      TRAVEL CAPTURE ENGINE - TRANSFER TEST       ');
console.log('==================================================');
console.log(`Total Transfers Extracted: ${products.length}\n`);

if (products.length === 0) {
  console.error('FAIL: No transfers extracted');
  process.exit(1);
}

const first = products[0];
console.log('Sample transfer:');
console.dir(first);

const uiInjector = new BookingMotorTransferUIInjector();
let clickedCartItem: TransferCartItem | null = null;

uiInjector.injectButtons(document, (transferId) => {
  const transfer = products.find((p) => p.transferId === transferId);
  if (!transfer) return;

  clickedCartItem = {
    type: 'transfer',
    id: `cart_item_test_${transfer.transferId}`,
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
});

const injectedButtons = document.querySelectorAll('.btn-tce-add-cart');
console.log(`\nTotal injected buttons: ${injectedButtons.length}`);
console.log('  -> (Expected: 10 transfer cards on page 1)\n');

if (injectedButtons.length !== 10) {
  console.error(`FAIL: Expected 10 buttons, got ${injectedButtons.length}`);
  process.exit(1);
}

(injectedButtons[0] as HTMLButtonElement).click();

if (clickedCartItem) {
  console.log('SUCCESS: TransferCartItem compiled from click:');
  console.dir(clickedCartItem);
  console.log('==================================================');
} else {
  console.error('FAIL: Click did not trigger CartItem compilation.');
  process.exit(1);
}
