import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'url';
import { DespegarFlightReader } from '../src/engine/providers/despegar/DespegarFlightReader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.resolve(__dirname, '../html/Despegar.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(htmlContent, {
  url: 'https://www.despegar.com.co/checkout/PRda5560757e8041c2bdde316f89b1405529733282/form/pivot',
});
const document = dom.window.document;

console.log('==================================================');
console.log('       TRAVEL CAPTURE ENGINE - FLIGHT TEST        ');
console.log('==================================================');

if (!DespegarFlightReader.hasFlightCheckout(document)) {
  console.error('FAIL: hasFlightCheckout returned false');
  process.exit(1);
}

const flight = DespegarFlightReader.extract(document);
if (!flight) {
  console.error('FAIL: extract returned null');
  process.exit(1);
}

console.dir(flight, { depth: null });

const checks: Array<[string, boolean]> = [
  ['title = "Medellín - San Andrés"', flight.title === 'Medellín - San Andrés'],
  ['routeType = roundTrip', flight.routeType === 'roundTrip'],
  ['currency = COP', flight.currency === 'COP'],
  ['price = 4073900', flight.price === 4073900],
  ['adults = 2', flight.adults === 2],
  ['children = 1', flight.children === 1],
  ['infants = 0', flight.infants === 0],
  ['origin.code = MDE', flight.origin.code === 'MDE'],
  ['destination.code = ADZ', flight.destination.code === 'ADZ'],
  ['2 legs', flight.legs.length === 2],
  ['leg[0] outbound', flight.legs[0]?.direction === 'outbound'],
  ['leg[0] flight LA4316', flight.legs[0]?.segments[0]?.flightNumber === 'LA4316'],
  ['leg[0] directo', flight.legs[0]?.stops === 0],
  ['leg[1] return', flight.legs[1]?.direction === 'return'],
  ['leg[1] flight LA4317', flight.legs[1]?.segments[0]?.flightNumber === 'LA4317'],
  ['priceBreakdown has items', flight.priceBreakdown.length >= 1],
];

console.log('\n--- Assertions ---');
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (!ok) failed++;
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed.`);
  process.exit(1);
}

console.log('\nSUCCESS: All flight parser assertions passed.');
console.log('==================================================');
