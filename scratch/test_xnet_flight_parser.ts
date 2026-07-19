/**
 * Smoke-test XNetFlightReader against the live capture fixture.
 * Usage: npx tsx scratch/test_xnet_flight_parser.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import { XNetFlightReader } from '../src/engine/providers/xnet/XNetFlightReader';

const fixturePath = path.resolve('santur_vuelo_seleccionado.html');
const fallbackPath = path.resolve(
  'scraper/captures/20260715-192753_scape-flights/page.html'
);

const htmlPath = fs.existsSync(fixturePath) ? fixturePath : fallbackPath;

if (!fs.existsSync(htmlPath)) {
  console.error('Fixture missing:', fixturePath);
  process.exit(1);
}

console.log('Using fixture:', path.basename(htmlPath));
const html = fs.readFileSync(htmlPath, 'utf8');
const dom = new JSDOM(html);
const doc = dom.window.document;

console.log('hasSelectedFare:', XNetFlightReader.hasSelectedFare(doc));
const flight = XNetFlightReader.extract(doc);
if (!flight) {
  console.error('extract() returned null');
  process.exit(1);
}

console.log(JSON.stringify({
  provider: flight.provider,
  title: flight.title,
  routeType: flight.routeType,
  origin: flight.origin,
  destination: flight.destination,
  departureDate: flight.departureDate,
  returnDate: flight.returnDate,
  adults: flight.adults,
  children: flight.children,
  infants: flight.infants,
  price: flight.price,
  currency: flight.currency,
  priceBreakdown: flight.priceBreakdown,
  legs: flight.legs.map((l) => ({
    label: l.label,
    route: l.routeDescription,
    stops: l.stops,
    segments: l.segments.map((s) => ({
      flightNumber: s.flightNumber,
      from: `${s.departure.airportCode} ${s.departure.hour}`,
      to: `${s.arrival.airportCode} ${s.arrival.hour}`,
      date: s.departure.date,
      cabin: s.cabin,
    })),
  })),
  tripId: flight.tripId,
}, null, 2));

const ok =
  flight.provider === 'XNet' &&
  flight.price > 0 &&
  flight.currency === 'COP' &&
  flight.routeType === 'roundTrip' &&
  flight.legs.length === 2 &&
  !!flight.origin.code &&
  !!flight.destination.code &&
  flight.adults >= 1 &&
  flight.legs.every((l) => l.segments.length >= 1);

if (!ok) {
  console.error('ASSERT FAILED');
  process.exit(1);
}
console.log('OK');
