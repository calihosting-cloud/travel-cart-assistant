import {
  FlightLeg,
  FlightPriceBreakdownItem,
  FlightProduct,
  FlightSegment,
} from '../../core/types';

/**
 * Wingo booking search / "Vuelos" step:
 *   https://booking.wingo.com/es/search/CLO/BOG/2026-07-29/2026-08-12/2/1/1/0/COP/0/0
 *
 * Prefers URL params + DOM total/summary (`w-header`, `w-org-summary-detail-to-pay`,
 * `w-org-travel-card`). Optional: cached fares JSON from gateway.wingo.com.
 */
export interface WingoUrlSearch {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  currency: string;
}

export class WingoFlightReader {
  static hasSearchPage(doc: Document): boolean {
    const href = doc.location?.href || '';
    if (/booking\.wingo\.com\/[^/]+\/search\//i.test(href)) return true;
    if (doc.querySelector('w-org-travel-card, w-org-summary-detail-to-pay, main-layout w-header')) {
      return true;
    }
    const text = doc.body?.innerText || '';
    return /Vuelo de ida/i.test(text) && /wingo/i.test(doc.title || text);
  }

  static parseSearchUrl(href: string = location.href): WingoUrlSearch | null {
    // /es/search/CLO/BOG/2026-07-29/2026-08-12/2/1/1/0/COP/0/0
    const m = href.match(
      /\/search\/([A-Z]{3})\/([A-Z]{3})\/(\d{4}-\d{2}-\d{2})\/(\d{4}-\d{2}-\d{2}|0)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/([A-Z]{3})/i
    );
    if (!m) return null;
    const returnDate = m[4] === '0' ? undefined : m[4];
    return {
      origin: m[1].toUpperCase(),
      destination: m[2].toUpperCase(),
      departDate: m[3],
      returnDate,
      adults: Number(m[5]) || 0,
      children: Number(m[6]) || 0,
      infants: Number(m[7]) || 0,
      currency: m[9].toUpperCase(),
    };
  }

  static extract(doc: Document, faresPayload?: any): FlightProduct | null {
    const fromUrl = this.parseSearchUrl(doc.location?.href || '');
    const total = readTotal(doc);
    const currency = fromUrl?.currency || total.currency || 'COP';
    const price = total.price;

    const origin = fromUrl?.origin || readCityCode(doc, 'origin') || '';
    const destination = fromUrl?.destination || readCityCode(doc, 'dest') || '';
    const fromDom = readPaxFromDom(doc);
    const adults = fromUrl?.adults ?? fromDom.adults ?? 0;
    const children = fromUrl?.children ?? fromDom.children ?? 0;
    const infants = fromUrl?.infants ?? fromDom.infants ?? 0;

    const legs = readLegsFromDom(doc, origin, destination, fromUrl);
    const routeType: 'oneWay' | 'roundTrip' =
      fromUrl?.returnDate || legs.length > 1 ? 'roundTrip' : 'oneWay';

    const title =
      readRouteTitle(doc) ||
      (origin && destination ? `${origin} - ${destination}` : 'Wingo');

    const breakdown = readBreakdown(doc, currency);
    const tripKey = [
      origin,
      destination,
      fromUrl?.departDate || '',
      fromUrl?.returnDate || '',
      adults,
      children,
      infants,
      price,
    ].join('_');

    // Enrich airport names from fares API if present
    let originName: string | undefined;
    let destName: string | undefined;
    if (faresPayload?.routeInformation) {
      for (const r of faresPayload.routeInformation) {
        if (r.code === origin) originName = r.cityName || r.airportName;
        if (r.code === destination) destName = r.cityName || r.airportName;
      }
    }

    const paxParts: string[] = [];
    if (adults) paxParts.push(`${adults} adulto${adults !== 1 ? 's' : ''}`);
    if (children) paxParts.push(`${children} niño${children !== 1 ? 's' : ''}`);
    if (infants) paxParts.push(`${infants} bebé${infants !== 1 ? 's' : ''}`);

    return {
      id: `wingo_${tripKey}`,
      type: 'flight',
      provider: 'Wingo',
      timestamp: Date.now(),
      tripId: tripKey,
      title,
      routeType,
      origin: { code: origin, name: originName },
      destination: { code: destination, name: destName },
      departureDate: fromUrl?.departDate,
      returnDate: fromUrl?.returnDate,
      adults,
      children,
      infants,
      paxSummary: paxParts.join(', ') || undefined,
      legs,
      price,
      currency,
      priceBreakdown: breakdown,
      baggageIncluded: readIncludedBaggage(doc),
      bookingUrl: doc.location?.href,
    };
  }
}

function readIncludedBaggage(doc: Document): string[] {
  const root = doc.querySelector('w-org-summary-detail-flight');
  if (!root) return [];

  const included: string[] = [];
  const rows = Array.from(root.querySelectorAll('.flex.justify-between.items-center'));
  for (const row of rows) {
    const text = (row.textContent || '').replace(/\s+/g, ' ').trim();
    if (!/\bIncluido\b/i.test(text)) continue;

    const service = row.querySelector('w-mo-service-title');
    const serviceText = (service?.textContent || text)
      .replace(/\s+/g, ' ')
      .replace(/\b\d+\s+Incluido\b.*$/i, '')
      .trim();
    if (!/morral|cartera|artículo personal|equipaje|maleta/i.test(serviceText)) continue;
    if (serviceText && !included.includes(serviceText)) included.push(serviceText);
  }
  return included;
}

function readTotal(doc: Document): { price: number; currency: string } {
  // Prefer the purchase total bar; body/header scans can pick weaker matches.
  const nodes = [
    ...doc.querySelectorAll(
      'w-mo-total-purchase, w-org-summary-detail-to-pay, w-header, .bg-purple, .font-prices'
    ),
  ];
  for (const el of nodes) {
    const text = el.textContent?.replace(/\s+/g, ' ') || '';
    const m = text.match(/Total:\s*\$?\s*([\d.,]+)\s*(COP|USD)?/i);
    if (m) {
      const price = parseAmount(m[1]);
      if (price > 0) return { price, currency: (m[2] || 'COP').toUpperCase() };
    }
  }
  const body = doc.body?.innerText || '';
  const all = [...body.matchAll(/Total:\s*\$?\s*([\d.,]+)\s*(COP|USD)?/gi)];
  for (const m of all) {
    const price = parseAmount(m[1]);
    if (price > 0) return { price, currency: (m[2] || 'COP').toUpperCase() };
  }
  return { price: 0, currency: 'COP' };
}

function readBreakdown(doc: Document, currency: string): FlightPriceBreakdownItem[] {
  const items: FlightPriceBreakdownItem[] = [];
  const block = doc.querySelector('w-org-summary-detail-to-pay') || doc.body;
  if (!block) return items;
  const text = block.textContent || '';
  const pairs: Array<[RegExp, string, string]> = [
    [/Adultos?\s*(\d+)?\s*\$?\s*([\d.,]+)\s*COP/i, 'ADT', 'Adultos'],
    [/Niñ[oa]s?\s*(\d+)?\s*\$?\s*([\d.,]+)\s*COP/i, 'CHD', 'Niño'],
    [/Infantes?\s*(\d+)?\s*\$?\s*([\d.,]+)\s*COP/i, 'INF', 'Infante'],
    [/Tarifa Administrativa\s*\$?\s*([\d.,]+)\s*COP/i, 'ADM', 'Tarifa administrativa'],
    [/Impuestos[^$]*\$?\s*([\d.,]+)\s*COP/i, 'TAX', 'Impuestos'],
  ];
  for (const [re, code, desc] of pairs) {
    const m = text.match(re);
    if (!m) continue;
    const amount = parseAmount(m[m.length - 1]);
    if (Number.isFinite(amount)) {
      items.push({ code, amount, description: desc });
    }
  }
  return items;
}

function readLegsFromDom(
  doc: Document,
  origin: string,
  destination: string,
  fromUrl: WingoUrlSearch | null
): FlightLeg[] {
  const cards = Array.from(doc.querySelectorAll('w-org-travel-card'));
  const legs: FlightLeg[] = [];

  if (cards.length > 0) {
    cards.forEach((card, index) => {
      const text = card.textContent?.replace(/\s+/g, ' ').trim() || '';
      const flightNum = text.match(/P5\s*\d+/i)?.[0]?.replace(/\s+/g, ' ') || undefined;
      const times = [...text.matchAll(/(\d{1,2}:\d{2}\s*(?:a\.m\.|p\.m\.|am|pm)?)/gi)].map(
        (x) => x[1]
      );
      const duration = text.match(/(\d+h\s*\d+m|\d+h)/i)?.[1];
      const isReturn =
        /vuelta|regreso/i.test(text) ||
        (index === 1 && Boolean(fromUrl?.returnDate));

      const depCode = isReturn ? destination : origin;
      const arrCode = isReturn ? origin : destination;

      const segment: FlightSegment = {
        airlineCode: 'P5',
        airlineName: 'Wingo',
        flightNumber: flightNum,
        duration,
        departure: {
          airportCode: depCode,
          date: isReturn ? fromUrl?.returnDate || '' : fromUrl?.departDate || '',
          hour: times[0] || '',
        },
        arrival: {
          airportCode: arrCode,
          date: isReturn ? fromUrl?.returnDate || '' : fromUrl?.departDate || '',
          hour: times[1] || '',
        },
      };

      legs.push({
        direction: isReturn ? 'return' : 'outbound',
        label: isReturn ? 'VUELTA' : 'IDA',
        dateLabel: isReturn ? fromUrl?.returnDate : fromUrl?.departDate,
        routeDescription: `${depCode} - ${arrCode}`,
        duration,
        stops: /Directo/i.test(text) ? 0 : 1,
        airlines: ['Wingo'],
        segments: [segment],
      });
    });
    return legs;
  }

  // Fallback: synthesize legs from URL when cards not yet selected
  if (fromUrl) {
    legs.push({
      direction: 'outbound',
      label: 'IDA',
      dateLabel: fromUrl.departDate,
      routeDescription: `${fromUrl.origin} - ${fromUrl.destination}`,
      stops: 0,
      airlines: ['Wingo'],
      segments: [
        {
          airlineCode: 'P5',
          airlineName: 'Wingo',
          departure: {
            airportCode: fromUrl.origin,
            date: fromUrl.departDate,
            hour: '',
          },
          arrival: {
            airportCode: fromUrl.destination,
            date: fromUrl.departDate,
            hour: '',
          },
        },
      ],
    });
    if (fromUrl.returnDate) {
      legs.push({
        direction: 'return',
        label: 'VUELTA',
        dateLabel: fromUrl.returnDate,
        routeDescription: `${fromUrl.destination} - ${fromUrl.origin}`,
        stops: 0,
        airlines: ['Wingo'],
        segments: [
          {
            airlineCode: 'P5',
            airlineName: 'Wingo',
            departure: {
              airportCode: fromUrl.destination,
              date: fromUrl.returnDate,
              hour: '',
            },
            arrival: {
              airportCode: fromUrl.origin,
              date: fromUrl.returnDate,
              hour: '',
            },
          },
        ],
      });
    }
  }
  return legs;
}

function readRouteTitle(doc: Document): string {
  const text = doc.body?.innerText || '';
  const m = text.match(/De\s+([^\n]+?)\s+a\s+([^\n,]+)/i);
  if (m) return `${m[1].trim()} - ${m[2].trim()}`;
  return '';
}

function readCityCode(doc: Document, which: 'origin' | 'dest'): string {
  const href = doc.location?.href || '';
  const parsed = WingoFlightReader.parseSearchUrl(href);
  if (parsed) return which === 'origin' ? parsed.origin : parsed.destination;
  return '';
}

/**
 * Passengers step (`/booking/passengers`) has no /search/... pax counts in the URL.
 * Prefer the payment summary (`Adultos 10`) over passenger-form labels (`Adulto 1`),
 * which the old body-wide `/Adultos?/` regex falsely treated as 1 adult.
 */
function readPaxFromDom(doc: Document): {
  adults: number | null;
  children: number | null;
  infants: number | null;
} {
  const summary =
    doc.querySelector('w-org-summary-detail-to-pay') ||
    doc.querySelector('w-org-summary-detail-purchase');
  const summaryText = (summary?.textContent || '').replace(/\s+/g, ' ');

  let adults = maxMatch(summaryText, /Adultos\s+(\d+)/gi);
  let children = maxMatch(summaryText, /Niñ(?:o|a|os|as)\s+(\d+)/gi);
  let infants = maxMatch(summaryText, /Infantes\s+(\d+)/gi);

  if (adults == null) {
    const forms = doc.querySelectorAll('w-adult-form').length;
    if (forms > 0) adults = forms;
  }
  if (children == null) {
    const forms = doc.querySelectorAll('w-child-form, w-children-form').length;
    if (forms > 0) children = forms;
  }
  if (infants == null) {
    const forms = doc.querySelectorAll('w-infant-form, w-infants-form').length;
    if (forms > 0) infants = forms;
  }

  if (adults == null) {
    const travelers = maxMatch(
      (doc.querySelector('w-org-summary-detail-purchase')?.textContent || '').replace(
        /\s+/g,
        ' '
      ),
      /Viajeros\s+(\d+)/gi
    );
    if (travelers != null) adults = travelers;
  }

  return { adults, children, infants };
}

/** Largest capture group across all matches; avoids `Adulto 1` beating `Adultos 10`. */
function maxMatch(text: string, re: RegExp): number | null {
  if (!text) return null;
  let best: number | null = null;
  for (const m of text.matchAll(re)) {
    const n = Number(m[1]);
    if (!Number.isFinite(n)) continue;
    best = best == null ? n : Math.max(best, n);
  }
  return best;
}

function parseAmount(raw: string): number {
  // Colombian: 634,200 or 634.200
  const cleaned = raw.replace(/\./g, '').replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
