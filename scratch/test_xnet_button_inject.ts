/**
 * Reproduce the missing-button bug against pararevisar.html and verify the fix.
 * Usage: npx tsx scratch/test_xnet_button_inject.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import { XNetFlightReader, getActiveRatePanel } from '../src/engine/providers/xnet/XNetFlightReader';
import { XNetFlightUIInjector } from '../src/engine/providers/xnet/XNetFlightUIInjector';

const fixture = path.resolve('html/pararevisar.html');
if (!fs.existsSync(fixture)) {
  console.error('Missing html/pararevisar.html');
  process.exit(1);
}

const dom = new JSDOM(fs.readFileSync(fixture, 'utf8'));
const doc = dom.window.document;

const active = getActiveRatePanel(doc);
console.log('active panel:', active?.id);
console.log('hasSelectedFare:', XNetFlightReader.hasSelectedFare(doc));

const flight = XNetFlightReader.extract(doc);
console.log('extracted:', flight && {
  title: flight.title,
  price: flight.price,
  adults: flight.adults,
  legs: flight.legs.length,
});

// Simulate old bug: orphan button already in hidden tab 0
const orphan = doc.getElementById('tce-xnet-add-flight');
console.log('orphan in fixture:', !!orphan, 'parent tab approx:', orphan?.closest('[id^="tabRate_"]')?.id);

const injector = new XNetFlightUIInjector();
injector.injectButton(doc, () => undefined);

const btn = doc.getElementById('tce-xnet-add-flight');
const inActive = !!(active && btn && active.contains(btn));
console.log('button in active panel:', inActive);
console.log('orphan count:', doc.querySelectorAll('#tce-xnet-add-flight, [id="tce-xnet-add-flight"]').length);

if (!inActive || !flight) {
  console.error('ASSERT FAILED');
  process.exit(1);
}
console.log('OK');
