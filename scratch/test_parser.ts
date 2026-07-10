import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import { BookingMotorExtractor } from '../src/engine/providers/bookingmotor/BookingMotorExtractor';
import { BookingMotorUIInjector } from '../src/engine/providers/bookingmotor/BookingMotorUIInjector';
import { HotelCartItem } from '../src/engine/core/types';
import { fileURLToPath } from 'url';

// Resolve __dirname under ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Read HTML file
const htmlPath = path.resolve(__dirname, '../ejemplobusqueda.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 2. Extract JSON data string using regex
const match = htmlContent.match(/let\s+data\s*=\s*JSON\.parse\('(.*?)'\);/);
if (!match) {
  console.error('Could not find "let data = JSON.parse(...)" in HTML');
  process.exit(1);
}

const jsonStr = match[1];
const jsData = JSON.parse(jsonStr);

// 3. Create JSDOM context
const dom = new JSDOM(htmlContent, {
  url: 'https://reservas.grupostravel.com/es/backoffice/list-hotel/1114055546a505d571159e',
});
const document = dom.window.document;

// 4. Run extractor
const extractor = new BookingMotorExtractor();
const products = extractor.extract(jsData, document);

console.log('==================================================');
console.log('         TRAVEL CAPTURE ENGINE - TEST RUN         ');
console.log('==================================================');
console.log(`Total Hotels Extracted: ${products.length}\n`);

// 5. Test UI Injector
console.log('==================================================');
console.log('         TESTING UI INJECTION FLOW                 ');
console.log('==================================================');

const uiInjector = new BookingMotorUIInjector();
let clickedCartItem: HotelCartItem | null = null;

// Inject buttons and bind local click listener
uiInjector.injectButtons(document, (hotelId, rateIndex) => {
  console.log(`\n[Test Click Event] Captured click for Hotel: ${hotelId}, Rate Index: ${rateIndex}`);
  
  const hotel = products.find((p) => p.hotelId === hotelId);
  if (!hotel) {
    console.error(`Hotel ID ${hotelId} not found in products!`);
    return;
  }

  const rate = hotel.rates[rateIndex];
  if (!rate) {
    console.error(`Rate index ${rateIndex} not found for Hotel ID ${hotelId}!`);
    return;
  }

  clickedCartItem = {
    type: 'hotel',
    id: `cart_item_test_${hotel.hotelId}_${rateIndex}`,
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
});

// Count total injected buttons
const injectedButtons = document.querySelectorAll('.btn-tce-add-cart');
console.log(`Total injected buttons in DOM: ${injectedButtons.length}`);
console.log('  -> (Expected: 46 total buttons: 23 desktop & 23 mobile rows)\n');

if (injectedButtons.length === 0) {
  console.error('Error: No buttons were injected!');
  process.exit(1);
}

// Simulate click on the first injected button (Desktop button of Hotel #1, Rate #1)
const firstBtn = injectedButtons[0] as HTMLButtonElement;
console.log('Simulating mouse click on first "+ 🛒" button...');
firstBtn.click();

if (clickedCartItem) {
  console.log('\nSUCCESS: CartItem compiled correctly from click event:');
  console.dir(clickedCartItem);
  console.log('==================================================');
} else {
  console.error('FAIL: Click did not trigger CartItem compilation.');
  process.exit(1);
}
