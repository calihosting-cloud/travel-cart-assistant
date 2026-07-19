import {
  FlightLeg,
  FlightPriceBreakdownItem,
  FlightProduct,
  FlightSegment,
} from '../../core/types';

const CHECKOUT_MARKER = '{"modelType":"CheckoutModel"';

/**
 * Reads Despegar's flight checkout page.
 *
 * Despegar embeds the whole checkout state as an inline `var DATA = {...}`
 * script (a `CheckoutModel`). Because it is plain script text, the content
 * script can read it straight from the DOM without a main-world bridge. This
 * is far more reliable than scraping the obfuscated, dynamically-rendered DOM.
 */
export class DespegarFlightReader {
  /** True when the page contains a flight CheckoutModel (cheap, no parse). */
  static hasFlightCheckout(doc: Document): boolean {
    return Array.from(doc.querySelectorAll('script')).some((s) => {
      const text = s.textContent || '';
      return text.includes(CHECKOUT_MARKER) && text.includes('"shoppingFlow":"FLIGHT"');
    });
  }

  /** Locate and parse the inline CheckoutModel JSON, or null if absent. */
  static getCheckoutData(doc: Document): any | null {
    for (const script of Array.from(doc.querySelectorAll('script'))) {
      const text = script.textContent || '';
      const start = text.indexOf(CHECKOUT_MARKER);
      if (start === -1) continue;

      const json = extractBalancedObject(text, start);
      if (!json) continue;

      try {
        return JSON.parse(json);
      } catch {
        // keep scanning other script tags
      }
    }
    return null;
  }

  /** Parse the checkout page into a normalized FlightProduct, or null. */
  static extract(doc: Document): FlightProduct | null {
    const data = this.getCheckoutData(doc);
    if (!data) return null;
    if (data.shoppingFlow && data.shoppingFlow !== 'FLIGHT') return null;
    return mapCheckoutToFlight(data);
  }
}

/**
 * Given text and the index of a `{`, walk forward matching braces (ignoring
 * braces inside strings) and return the balanced JSON object substring.
 */
function extractBalancedObject(text: string, objStart: number): string | null {
  let depth = 0;
  let inStr = false;
  let strCh = '';
  let esc = false;

  for (let i = objStart; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === strCh) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      strCh = c;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) return text.slice(objStart, i + 1);
    }
  }
  return null;
}

function mapCheckoutToFlight(data: any): FlightProduct | null {
  const product = data?.products?.[0];
  const analytics = data?.analyticsData ?? {};
  const pricebox = data?.prices?.defaultPricebox ?? {};
  const item = data?.gtmData?.itemsDetail?.[0] ?? {};
  const flightInfo: any[] = Array.isArray(product?.flightInfo) ? product.flightInfo : [];

  if (!product && flightInfo.length === 0) return null;

  const routeType: 'oneWay' | 'roundTrip' =
    String(analytics.Flights_Route_Type || item.searchType || '').toUpperCase().includes('ROUND')
      ? 'roundTrip'
      : 'oneWay';

  const legs = flightInfo.map((leg, index) => mapLeg(leg, index));

  const currency = pricebox?.currency?.code || 'COP';
  const price = Number(pricebox?.total?.amount ?? item.totalFareLocal ?? 0);
  const priceBreakdown: FlightPriceBreakdownItem[] = Array.isArray(pricebox?.total?.breakdown)
    ? pricebox.total.breakdown.map((b: any) => ({
        code: String(b.code ?? ''),
        amount: Number(b.amount ?? 0),
        description: String(b.description ?? ''),
      }))
    : [];

  return {
    id: `flight_${data.tripId || Date.now()}`,
    type: 'flight',
    provider: 'Despegar',
    timestamp: Date.now(),
    tripId: data.tripId ?? undefined,
    title: product?.title?.title || analytics.Flights_Itinerary || 'Vuelo',
    routeType,
    origin: {
      code: analytics.Flights_Departure_Airport || item.departureAirportCode || '',
      name: item.departureCityName || analytics.Origin_City || undefined,
    },
    destination: {
      code: analytics.Flights_Arrival_Airport || item.arrivalAirportCode || '',
      name: item.arrivalCityName || analytics.Destination_City || undefined,
    },
    departureDate: analytics.CheckIn_Date || item.departureDate || undefined,
    returnDate: analytics.CheckOut_Date || item.returnDate || undefined,
    adults: toInt(analytics.Adults_Quantity ?? item.adultsQuantity),
    children: toInt(analytics.Children_Quantity ?? item.childrenQuantity ?? item.childsQuantity),
    infants: toInt(analytics.Infants_Quantity ?? item.infantsQuantity),
    paxSummary: product?.description?.productSubtitle || undefined,
    legs,
    price,
    currency,
    priceBreakdown,
    bookingUrl: data.routingPath ? absoluteUrl(data.routingPath) : undefined,
  };
}

function mapLeg(leg: any, index: number): FlightLeg {
  const label = String(leg?.dates?.from?.title || leg?.direction || (index === 0 ? 'IDA' : 'VUELTA'));
  const isReturn = /VUELTA|RETURN/i.test(label) || String(leg?.direction || '').toUpperCase() === 'VUELTA';
  const segmentsRaw: any[] = Array.isArray(leg?.route?.segments) ? leg.route.segments : [];
  const segments = segmentsRaw.map(mapSegment);

  const airlines = Array.from(
    new Set(segments.map((s) => s.airlineName).filter((n): n is string => !!n))
  );

  const scaleStops = segmentsRaw.reduce((sum, s) => sum + toInt(s?.scale?.number), 0);
  const stops = scaleStops + Math.max(0, segments.length - 1);

  return {
    direction: isReturn ? 'return' : 'outbound',
    label,
    dateLabel: leg?.dates?.fromFirstLine || undefined,
    routeDescription: leg?.route?.routeDescription || undefined,
    duration: leg?.route?.routeDuration || undefined,
    stops,
    airlines,
    segments,
  };
}

function mapSegment(seg: any): FlightSegment {
  const airline = seg?.airlinesInfo?.airlines?.[0] ?? {};
  const { flightNumber, equipment } = parseFlightDetails(seg?.flightDetails);

  return {
    airlineCode: airline.code || undefined,
    airlineName: airline.name || undefined,
    flightNumber,
    equipment,
    cabin: seg?.category?.name || undefined,
    duration: seg?.segmentDuration || undefined,
    departure: mapEndpoint(seg?.departure),
    arrival: mapEndpoint(seg?.arrival),
  };
}

function mapEndpoint(ep: any): FlightSegment['departure'] {
  return {
    airportCode: ep?.airport?.code || '',
    airportName: ep?.airport?.name || undefined,
    cityCode: ep?.city?.code || undefined,
    cityName: ep?.city?.name || undefined,
    date: ep?.date?.date || '',
    hour: ep?.hour || ep?.date?.hour || '',
  };
}

/** "Vuelo LA4316 - Airbus A320-100/200" -> { LA4316, Airbus A320-100/200 } */
function parseFlightDetails(details: unknown): { flightNumber?: string; equipment?: string } {
  if (typeof details !== 'string') return {};
  const m = details.match(/Vuelo\s+([A-Z0-9]+)\s*(?:-\s*(.*))?$/i);
  if (!m) return { equipment: details.trim() || undefined };
  return {
    flightNumber: m[1]?.trim() || undefined,
    equipment: m[2]?.trim() || undefined,
  };
}

function toInt(value: unknown): number {
  const n = parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function absoluteUrl(path: string): string {
  try {
    return new URL(path, 'https://www.despegar.com.co').toString();
  } catch {
    return path;
  }
}
