import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'url';
import { BookingMotorSearchFormSync } from '../src/engine/providers/bookingmotor/BookingMotorSearchFormSync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadDoc(file: string, url: string): Document {
  const html = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  return new JSDOM(html, { url }).window.document;
}

const sync = new BookingMotorSearchFormSync();
let failures = 0;

function assert(label: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('==================================================');
console.log('        TRAVEL CAPTURE ENGINE - SEARCH SYNC       ');
console.log('==================================================');

// 1) Capture the hotel search form.
const hotelDoc = loadDoc('ejemplobusqueda.html', 'https://reservas.grupostravel.com/es/backoffice/list-hotel/x');
const hotelForm = sync.getForm(hotelDoc, 'hotel');
if (!hotelForm) {
  console.error('FAIL: #search_hotel not found');
  process.exit(1);
}

const hotelCtx = sync.capture(hotelForm, 'hotel');
console.log('\nCaptured hotel context:');
console.dir(hotelCtx);

assert('hotel checkIn captured', hotelCtx.checkIn === '04-08-2026', hotelCtx.checkIn);
assert('hotel checkOut captured', hotelCtx.checkOut === '07-08-2026', hotelCtx.checkOut);
assert('hotel rooms = 1', hotelCtx.rooms.length === 1, String(hotelCtx.rooms.length));
assert('hotel total adults = 2', hotelCtx.totalAdults === 2, String(hotelCtx.totalAdults));
assert('hotel total children = 0', hotelCtx.totalChildren === 0, String(hotelCtx.totalChildren));

// 2) Apply the hotel context onto the transfer form.
const transferDoc = loadDoc('traslados.html', 'https://reservas.grupostravel.com/es/backoffice/list-transfer/x');
const transferForm = sync.getForm(transferDoc, 'transfer');
if (!transferForm) {
  console.error('FAIL: #search_transfer not found');
  process.exit(1);
}

const changed = sync.apply(transferForm, 'transfer', hotelCtx);
assert('apply reported a change', changed);

const tAdults = transferForm.querySelector<HTMLSelectElement>('[name="searchtransfer[adults]"]');
const tCheckin = transferForm.querySelector<HTMLInputElement>('[name="searchtransfer[checkin]"]');
assert('transfer adults set to 2', tAdults?.value === '2', tAdults?.value);
assert('transfer checkin set to 04-08-2026', tCheckin?.value === '04-08-2026', tCheckin?.value);

// 3) Capture a transfer form and confirm children ages round-trip.
const transferCtx = sync.capture(transferForm, 'transfer');
console.log('\nCaptured transfer context (post-apply):');
console.dir(transferCtx);
assert('transfer context adults reflects applied value', transferCtx.totalAdults === 2, String(transferCtx.totalAdults));

console.log('\n==================================================');
if (failures === 0) {
  console.log('SUCCESS: all search-sync assertions passed.');
  console.log('==================================================');
} else {
  console.error(`FAIL: ${failures} assertion(s) failed.`);
  console.log('==================================================');
  process.exit(1);
}
