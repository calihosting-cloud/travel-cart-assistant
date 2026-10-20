import {
  FlightLeg,
  FlightProduct,
  FlightSegment,
} from '../../core/types';

/**
 * Arajet booking (`www.arajet.com/.../booking?origin=&destination=&from=&to=&adt=&chd=&inf=&currency=`).
 * Reads query params + selected fare chips in the DOM (Basic / Comfort / Extra).
 */
export class ArajetFlightReader {
  static hasBookingPage(doc: Document): boolean {
    const href = doc.location?.href || '';
    if (/arajet\.com/i.test(href) && /\/booking/i.test(href)) return true;
    const text = (doc.body?.innerText || '').slice(0, 4000);
    return /Selecciona Vuelo|VER TARIFAS|MEJOR VALOR|fare-card/i.test(text);
  }

  /** At least one outbound (or return) fare chosen — shows EDITAR + brand price. */
  static hasSelectedFare(doc: Document): boolean {
    const text = bodyText(doc);
    if (/(Basic|Comfort|Extra)\s*\$[\d.,]+/i.test(text) && /EDITAR/i.test(text)) {
      return true;
    }
    const step = Number(new URL(doc.location?.href || 'https://local/').searchParams.get('step') || 0);
    return step >= 3;
  }

  static extract(doc: Document): FlightProduct | null {
    const href = doc.location?.href || '';
    const url = safeUrl(href);
    const q = url?.searchParams;
    const originCode = (q?.get('origin') || q?.get('Origin') || '').toUpperCase();
    const destCode = (
      q?.get('destination') ||
      q?.get('dest') ||
      q?.get('Destination') ||
      ''
    ).toUpperCase();
    const from = q?.get('from') || q?.get('From') || '';
    const to = q?.get('to') || q?.get('To') || '';
    const adults = Number(q?.get('adt') || q?.get('adults') || 1) || 1;
    const children = Number(q?.get('chd') || q?.get('children') || 0) || 0;
    const infants = Number(q?.get('inf') || q?.get('infants') || 0) || 0;
    const currency = (q?.get('currency') || q?.get('Currency') || 'USD').toUpperCase();

    if (!originCode || !destCode) return null;

    const text = bodyText(doc);
    const booking = readBookingSession(doc);
    const selected = readSelectedFares(text);
    const price = selected.reduce((sum, s) => sum + s.price, 0);
    if (!(price > 0)) return null;

    const routeType: 'oneWay' | 'roundTrip' =
      to && to !== '0' && !/^0$/.test(to) ? 'roundTrip' : 'oneWay';

    const brands = Array.from(new Set(selected.map((s) => s.brand)));

    const legs = buildLegs({
      doc,
      text,
      originCode,
      destCode,
      from,
      to,
      routeType,
      selected,
      booking,
    });

    const tripBaggage = legs.flatMap((l) => l.baggageIncluded || []);
    const uniqueBaggage = tripBaggage.filter(
      (b, i, all) => all.findIndex((x) => x.toLowerCase() === b.toLowerCase()) === i
    );

    const paxParts = [
      `${adults} Adt`,
      children ? `${children} Chd` : '',
      infants ? `${infants} Inf` : '',
    ].filter(Boolean);

    const title = `${originCode} – ${destCode} · Arajet${brands.length ? ` · ${brands.join('/')}` : ''}`;

    return {
      id: `arajet_${Date.now()}`,
      type: 'flight',
      provider: 'Arajet',
      timestamp: Date.now(),
      tripId: buildTripId(originCode, destCode, from, to, adults, children, infants, currency, price),
      title,
      routeType,
      origin: { code: originCode },
      destination: { code: destCode },
      departureDate: from || undefined,
      returnDate: routeType === 'roundTrip' ? to || undefined : undefined,
      adults,
      children,
      infants,
      paxSummary: paxParts.join(' · '),
      legs,
      price,
      currency,
      priceBreakdown: selected.map((s) => ({
        code: s.brand.toUpperCase(),
        amount: s.price,
        description: `${s.direction === 'outbound' ? 'Ida' : 'Vuelta'} ${s.brand}${s.flight ? ` ${s.flight}` : ''}`,
      })),
      baggageIncluded: uniqueBaggage.length ? uniqueBaggage : undefined,
      bookingUrl: href,
    };
  }
}

interface SelectedFare {
  brand: 'Basic' | 'Comfort' | 'Extra';
  price: number;
  direction: 'outbound' | 'return';
  flight?: string;
}

function readSelectedFares(text: string): SelectedFare[] {
  const out: SelectedFare[] = [];
  // Chunks like: "Vuelo # DM1501 Extra $353.04 EDITAR"
  const re =
    /(?:Vuelo\s*#\s*)?(DM\d+|BUS\s*\d+)?\s*(Basic|Comfort|Extra)\s*\$([\d.,]+)\s*EDITAR/gi;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(text)) !== null) {
    const price = parseMoney(m[3]);
    if (!(price > 0)) continue;
    out.push({
      brand: capitalizeBrand(m[2]),
      price,
      direction: idx === 0 ? 'outbound' : 'return',
      flight: m[1] ? m[1].replace(/\s+/g, '') : undefined,
    });
    idx += 1;
  }
  if (out.length) return out;

  // Fallback: first brand+$ before "Selecciona Vuelo De Regreso" / after selection strip
  const simple = [...text.matchAll(/(Basic|Comfort|Extra)\s*\$([\d.,]+)/gi)];
  for (let i = 0; i < simple.length && i < 2; i++) {
    const price = parseMoney(simple[i][2]);
    if (!(price > 0)) continue;
    // Skip "Desde $X" list prices — those sit next to VER TARIFAS without EDITAR
    const around = text.slice(Math.max(0, simple[i].index! - 40), simple[i].index! + 60);
    if (/Desde\s*\$/i.test(around) && !/EDITAR/i.test(around)) continue;
    out.push({
      brand: capitalizeBrand(simple[i][1]),
      price,
      direction: out.length === 0 ? 'outbound' : 'return',
    });
  }
  return out;
}

type ArajetBrand = SelectedFare['brand'];

interface ArajetBookingSession {
  origin?: ArajetSelectedItinerary;
  return?: ArajetSelectedItinerary;
}

interface ArajetSelectedItinerary {
  stops?: Array<{ type?: string; iata?: string; duration?: number }>;
  legs?: ArajetBookingLeg[];
  journeyDuration?: number | string;
}

interface ArajetBookingLeg {
  designator?: string;
  originIATA?: string;
  destinationIATA?: string;
  origin?: string;
  destination?: string;
  departureDate?: string;
  arrivalDate?: string;
  departureTime?: string;
  arrivalTime?: string;
  operator?: string;
  equipmentCode?: string;
  flightDuration?: number;
}

function readBookingSession(doc: Document): ArajetBookingSession | null {
  try {
    const win = doc.defaultView as (Window & { sessionStorage?: Storage }) | null;
    const raw = win?.sessionStorage?.getItem('booking');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const flights = parsed?.flights || {};
    return {
      origin: flights.origin?.selectedFlight || undefined,
      return: flights.return?.selectedFlight || undefined,
    };
  } catch {
    return null;
  }
}

function buildLegs(args: {
  doc: Document;
  text: string;
  originCode: string;
  destCode: string;
  from: string;
  to: string;
  routeType: 'oneWay' | 'roundTrip';
  selected: SelectedFare[];
  booking: ArajetBookingSession | null;
}): FlightLeg[] {
  const { doc, text, originCode, destCode, from, to, routeType, selected, booking } = args;
  const legs: FlightLeg[] = [];

  const outFare = selected.find((s) => s.direction === 'outbound');
  const retFare = selected.find((s) => s.direction === 'return');

  legs.push(
    makeLeg({
      direction: 'outbound',
      label: 'IDA',
      fromCode: originCode,
      toCode: destCode,
      date: from,
      flightNumber: outFare?.flight,
      brand: outFare?.brand,
      stops: stopsFromBooking(booking?.origin, doc, text, 'outbound', outFare?.flight),
      itinerary: booking?.origin,
    })
  );
  if (routeType === 'roundTrip') {
    legs.push(
      makeLeg({
        direction: 'return',
        label: 'VUELTA',
        fromCode: destCode,
        toCode: originCode,
        date: to,
        flightNumber: retFare?.flight,
        brand: retFare?.brand,
        stops: stopsFromBooking(booking?.return, doc, text, 'return', retFare?.flight),
        itinerary: booking?.return,
      })
    );
  }
  return legs;
}

function stopsFromBooking(
  itinerary: ArajetSelectedItinerary | undefined,
  doc: Document,
  text: string,
  direction: 'outbound' | 'return',
  flightNumber?: string
): number {
  if (itinerary?.stops?.length) return itinerary.stops.length;
  if (itinerary?.legs?.length) return Math.max(0, itinerary.legs.length - 1);
  return parseArajetStops(doc, text, direction, flightNumber);
}

function makeLeg(args: {
  direction: 'outbound' | 'return';
  label: string;
  fromCode: string;
  toCode: string;
  date: string;
  flightNumber?: string;
  brand?: ArajetBrand;
  stops?: number;
  itinerary?: ArajetSelectedItinerary;
}): FlightLeg {
  const { direction, label, fromCode, toCode, date, flightNumber, brand, stops, itinerary } = args;
  const segments = segmentsFromBooking(itinerary, fromCode, toCode, date, flightNumber);
  return {
    direction,
    label,
    dateLabel: date,
    routeDescription: `${fromCode} - ${toCode}`,
    duration: formatJourneyDuration(itinerary?.journeyDuration),
    stops: stops ?? Math.max(0, segments.length - 1),
    airlines: ['Arajet'],
    segments,
    baggageIncluded: brand ? baggageForBrand(brand) : undefined,
  };
}

function segmentsFromBooking(
  itinerary: ArajetSelectedItinerary | undefined,
  fromCode: string,
  toCode: string,
  date: string,
  flightNumber?: string
): FlightSegment[] {
  const legs = itinerary?.legs;
  if (Array.isArray(legs) && legs.length > 0) {
    return legs.map((leg) => {
      const designator = (leg.designator || '').replace(/\s+/g, '');
      const airlineCode = designator.replace(/\d+/g, '') || 'DM';
      return {
        airlineCode,
        airlineName: leg.operator || 'Arajet',
        flightNumber: designator || undefined,
        equipment: leg.equipmentCode || undefined,
        duration: leg.flightDuration ? `${Math.floor(leg.flightDuration / 60)}h ${leg.flightDuration % 60}m` : undefined,
        departure: {
          airportCode: leg.originIATA || fromCode,
          cityName: leg.origin,
          date: toIsoDate(leg.departureDate) || date || '',
          hour: normalizeTime(leg.departureTime),
        },
        arrival: {
          airportCode: leg.destinationIATA || toCode,
          cityName: leg.destination,
          date: toIsoDate(leg.arrivalDate) || date || '',
          hour: normalizeTime(leg.arrivalTime),
        },
      };
    });
  }

  return [
    {
      airlineCode: 'DM',
      airlineName: 'Arajet',
      flightNumber: flightNumber || undefined,
      departure: {
        airportCode: fromCode,
        date: date || '',
        hour: '',
      },
      arrival: {
        airportCode: toCode,
        date: date || '',
        hour: '',
      },
    },
  ];
}

function formatJourneyDuration(raw?: number | string): string | undefined {
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'string' && /h|m/i.test(raw)) return raw;
  const mins = Number(raw);
  if (!Number.isFinite(mins) || mins <= 0) return undefined;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function toIsoDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const m = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : undefined;
}

function normalizeTime(raw?: string): string {
  if (!raw) return '';
  const m = String(raw).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return String(raw).trim();
  let h = Number(m[1]);
  const min = m[2];
  const ampm = (m[3] || '').toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${min}`;
}

function baggageForBrand(brand: ArajetBrand): string[] {
  switch (brand) {
    case 'Extra':
      return ['Artículo personal', 'Equipaje en cabina 12 kg', 'Equipaje en bodega 23 kg'];
    case 'Comfort':
      return ['Artículo personal', 'Equipaje en bodega 23 kg'];
    default:
      return ['Artículo personal'];
  }
}

function parseArajetStops(
  doc: Document,
  text: string,
  direction: 'outbound' | 'return',
  flightNumber?: string
): number {
  if (direction === 'return' && !flightNumber) return 0;
  const chunk = sliceDirectionText(text, direction, flightNumber);
  const stopMatch = chunk.match(/(\d+)\s*(?:escala|parada|stop)/i);
  if (stopMatch) return Math.max(0, Number(stopMatch[1]) || 0);
  if (/conexi[oó]n|con escala/i.test(chunk)) return 1;

  const cards = Array.from(
    doc.querySelectorAll('[class*="fare-card"], bound-displayer-pres, [class*="flight-card"]')
  );
  for (const card of cards) {
    const cardText = (card.textContent || '').replace(/\s+/g, ' ');
    if (flightNumber && !cardText.includes(flightNumber)) continue;
    const cardStop = cardText.match(/(\d+)\s*(?:escala|parada)/i);
    if (cardStop) return Math.max(0, Number(cardStop[1]) || 1);
    if (/conexi[oó]n|con escala/i.test(cardText)) return 1;
  }
  return 0;
}

function sliceDirectionText(
  text: string,
  direction: 'outbound' | 'return',
  flightNumber?: string
): string {
  const outboundEnd = text.search(
    /Selecciona\s+Vuelo\s+De\s+Regreso|Vuelo\s+de\s+regreso|Selecciona\s+tu\s+vuelo\s+de\s+vuelta/i
  );
  const outbound = outboundEnd > 0 ? text.slice(0, outboundEnd) : text;
  const chunk = direction === 'outbound' ? outbound : text.slice(outboundEnd > 0 ? outboundEnd : 0);
  if (!flightNumber) return chunk;
  const idx = chunk.indexOf(flightNumber);
  if (idx < 0) return chunk;
  return chunk.slice(Math.max(0, idx - 120), idx + 180);
}

function capitalizeBrand(raw: string): 'Basic' | 'Comfort' | 'Extra' {
  const t = raw.toLowerCase();
  if (t === 'comfort') return 'Comfort';
  if (t === 'extra') return 'Extra';
  return 'Basic';
}

function parseMoney(raw: string): number {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return 0;
  if (cleaned.includes('.') && cleaned.includes(',')) {
    return cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
      ? Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0
      : Number(cleaned.replace(/,/g, '')) || 0;
  }
  const separator = cleaned.includes('.') ? '.' : cleaned.includes(',') ? ',' : '';
  if (!separator) return Number(cleaned) || 0;
  const parts = cleaned.split(separator);
  if (parts.length === 2 && parts[1].length <= 2) {
    return Number(`${parts[0]}.${parts[1]}`) || 0;
  }
  return Number(parts.join('')) || 0;
}

function bodyText(doc: Document): string {
  return (doc.body?.innerText || doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
}

function safeUrl(href: string): URL | null {
  try {
    return new URL(href);
  } catch {
    return null;
  }
}

function buildTripId(
  origin: string,
  dest: string,
  from: string,
  to: string,
  adt: number,
  chd: number,
  inf: number,
  currency: string,
  price: number
): string {
  return `arajet_${origin}_${dest}_${from}_${to || '0'}_${adt}_${chd}_${inf}_${currency}_${price}`.replace(
    /[^a-zA-Z0-9._-]/g,
    '_'
  );
}
