import {
  FlightLeg,
  FlightPriceBreakdownItem,
  FlightProduct,
  FlightSegment,
} from '../../core/types';

/**
 * Avianca trip-summary page (`/av/booking/trip?cartId=…`).
 *
 * Prefer `digitalData` (main world, via postMessage from an injected probe).
 * Fall back to DOM: `bound-displayer-pres`, trip-summary titles, prices.
 */
export class AviancaFlightReader {
  static hasTripSummary(doc: Document): boolean {
    if (doc.querySelector('trip-summary-page, .trip-summary-content, bound-displayer-pres')) {
      return true;
    }
    const cro = doc.documentElement.getAttribute('cro-pag') || '';
    if (cro.includes('availability-nbfconf')) return true;
    return /\/av\/booking\/trip/i.test(doc.location?.href || '');
  }

  static extractCartId(doc: Document = document): string | undefined {
    try {
      const u = new URL(doc.location.href);
      return u.searchParams.get('cartId') || undefined;
    } catch {
      return undefined;
    }
  }

  /** Build product from digitalData payload (main-world object). */
  static fromDigitalData(digitalData: any, doc: Document = document): FlightProduct | null {
    try {
      const bounds =
        digitalData?.product?.[0]?.productInfo?.productDetails?.flightTicket?.bound;
      if (!Array.isArray(bounds) || bounds.length === 0) return null;

      const legs: FlightLeg[] = bounds.map((bound: any, index: number) =>
        mapDigitalBound(bound, index)
      );

      const first = legs[0];
      const last = legs[legs.length - 1];
      const originCode = first?.segments[0]?.departure.airportCode || '';
      const destCode =
        (legs.length > 1
          ? first?.segments[first.segments.length - 1]?.arrival.airportCode
          : last?.segments[last.segments.length - 1]?.arrival.airportCode) || '';

      // Prefer trip total from price box / DOM when present
      const { price, currency } = readTotalPrice(doc, bounds);

      const pax = readPax(digitalData, doc);
      const cartId = this.extractCartId(doc);
      const routeType: 'oneWay' | 'roundTrip' = legs.length > 1 ? 'roundTrip' : 'oneWay';

      const departureDate = isoDate(
        bounds[0]?.segment?.[0]?.departure?.dateTime ||
          bounds[0]?.segment?.[0]?.departure?.date
      );
      const returnDate =
        legs.length > 1
          ? isoDate(
              bounds[1]?.segment?.[0]?.departure?.dateTime ||
                bounds[1]?.segment?.[0]?.departure?.date
            )
          : undefined;

      const title =
        readLocationsTitle(doc) ||
        `${originCode} - ${destCode}`;

      return {
        id: `avianca_${cartId || Date.now()}`,
        type: 'flight',
        provider: 'Avianca',
        timestamp: Date.now(),
        tripId: cartId,
        title,
        routeType,
        origin: { code: originCode },
        destination: { code: destCode },
        departureDate,
        returnDate,
        adults: pax.adults,
        children: pax.children,
        infants: pax.infants,
        paxSummary: pax.summary,
        legs,
        price,
        currency,
        priceBreakdown: buildBreakdown(bounds, currency),
        baggageIncluded: readIncludedBaggage(doc),
        bookingUrl: doc.location?.href,
      };
    } catch (err) {
      console.warn('[TCE] Avianca fromDigitalData failed:', err);
      return null;
    }
  }

  /** DOM-only fallback when digitalData is missing. */
  static fromDom(doc: Document): FlightProduct | null {
    const bounds = Array.from(
      doc.querySelectorAll('trip-summary-page bound-displayer-pres, bound-displayer-pres')
    );
    if (bounds.length === 0 && !this.hasTripSummary(doc)) return null;

    const legs: FlightLeg[] = [];
    for (let i = 0; i < bounds.length; i++) {
      const bound = bounds[i];
      const content = bound.querySelector('.content[data-flight], .content');
      let data: any = null;
      const raw = content?.getAttribute('data-flight');
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = null;
        }
      }

      const locations =
        bound.querySelector('.trip-summary-title .locations')?.textContent?.replace(/\s+/g, ' ').trim() ||
        '';
      const dateLabel =
        bound.querySelector('.trip-summary-title .date')?.textContent?.replace(/\s+/g, ' ').trim() ||
        '';
      const depHour =
        bound.querySelector('.flight-details-left .hour')?.textContent?.trim() || '';
      const arrHour =
        bound.querySelector('.flight-details-right .hour')?.textContent?.trim() || '';
      const duration =
        bound.querySelector('.flight-segment-detail .information')?.textContent?.replace(/\s+/g, ' ').trim() ||
        undefined;

      const originCode =
        data?.origen ||
        locations.split(/[-–→]/)[0]?.trim().match(/\b([A-Z]{3})\b/)?.[1] ||
        '';
      const destCode =
        data?.destino ||
        locations.split(/[-–→]/).pop()?.trim().match(/\b([A-Z]{3})\b/)?.[1] ||
        '';

      const flightNums: string[] = Array.isArray(data?.numeroDeVuelo)
        ? data.numeroDeVuelo
        : [];
      const segments: FlightSegment[] = (flightNums.length ? flightNums : ['AV']).map(
        (num: string, segIdx: number) => ({
          airlineCode: String(num).replace(/\d+/g, '') || 'AV',
          airlineName: 'Avianca',
          flightNumber: String(num),
          equipment: Array.isArray(data?.tipoDeAvion) ? data.tipoDeAvion[segIdx] : undefined,
          departure: {
            airportCode: segIdx === 0 ? originCode : '',
            date: '',
            hour: segIdx === 0 ? depHour : '',
          },
          arrival: {
            airportCode: segIdx === flightNums.length - 1 || flightNums.length === 0 ? destCode : '',
            date: '',
            hour: segIdx === flightNums.length - 1 || flightNums.length === 0 ? arrHour : '',
          },
        })
      );

      legs.push({
        direction: i === 0 ? 'outbound' : 'return',
        label: i === 0 ? 'IDA' : 'VUELTA',
        dateLabel,
        routeDescription: locations || `${originCode} - ${destCode}`,
        duration,
        stops: typeof data?.numeroDeEscalas === 'number' ? data.numeroDeEscalas : Math.max(0, segments.length - 1),
        airlines: ['Avianca'],
        segments,
      });
    }

    if (legs.length === 0) {
      // Minimal stub so the button can still add something useful from URL/title
      const cartId = this.extractCartId(doc);
      const { price, currency } = readTotalPrice(doc, []);
      const title = readLocationsTitle(doc) || 'Avianca';
      const pax = readPax(null, doc);
      return {
        id: `avianca_${cartId || Date.now()}`,
        type: 'flight',
        provider: 'Avianca',
        timestamp: Date.now(),
        tripId: cartId,
        title,
        routeType: 'roundTrip',
        origin: { code: '' },
        destination: { code: '' },
        adults: pax.adults,
        children: pax.children,
        infants: pax.infants,
        paxSummary: pax.summary,
        legs: [],
        price,
        currency,
        priceBreakdown: [],
        baggageIncluded: readIncludedBaggage(doc),
        bookingUrl: doc.location?.href,
      };
    }

    const { price, currency } = readTotalPrice(doc, []);
    const cartId = this.extractCartId(doc);
    const originCode = legs[0]?.segments[0]?.departure.airportCode || '';
    const destSeg = legs[0]?.segments[legs[0].segments.length - 1];
    const destCode = destSeg?.arrival.airportCode || '';
    const pax = readPax(null, doc);

    return {
      id: `avianca_${cartId || Date.now()}`,
      type: 'flight',
      provider: 'Avianca',
      timestamp: Date.now(),
      tripId: cartId,
      title: readLocationsTitle(doc) || `${originCode} - ${destCode}`,
      routeType: legs.length > 1 ? 'roundTrip' : 'oneWay',
      origin: { code: originCode },
      destination: { code: destCode },
      adults: pax.adults,
      children: pax.children,
      infants: pax.infants,
      paxSummary: pax.summary,
      legs,
      price,
      currency,
      priceBreakdown: [],
      baggageIncluded: readIncludedBaggage(doc),
      bookingUrl: doc.location?.href,
    };
  }
}

function readIncludedBaggage(doc: Document): string[] {
  const text = doc.body?.innerText || '';
  if (!text) return [];

  const patterns = [
    /\b1\s+artículo personal(?:\s*\([^)\n]+\))?/gi,
    /\b1\s+equipaje de mano(?:\s*\([^)\n]+\))?/gi,
    /\b1\s+equipaje de cabina(?:\s*\([^)\n]+\))?/gi,
    /\b1\s+equipaje de bodega(?:\s*\([^)\n]+\))?/gi,
    /\b1\s+maleta de bodega(?:\s*\([^)\n]+\))?/gi,
  ];
  const values: string[] = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[0].replace(/\s+/g, ' ').trim();
      if (value && !values.some((v) => v.toLowerCase() === value.toLowerCase())) {
        values.push(value);
      }
    }
  }
  return values;
}

function mapDigitalBound(bound: any, index: number): FlightLeg {
  const segmentsRaw: any[] = Array.isArray(bound.segment) ? bound.segment : [];
  const segments: FlightSegment[] = segmentsRaw.map((seg) => ({
    airlineCode: seg.marketingAirlineCode || 'AV',
    airlineName: 'Avianca',
    flightNumber: `${seg.marketingAirlineCode || 'AV'}${seg.marketingFlightNumber || ''}`,
    equipment: seg.aircraftCode,
    departure: {
      airportCode: seg.departure?.airportCode || seg.departure?.locationCode || '',
      date: isoDate(seg.departure?.dateTime || seg.departure?.date) || '',
      hour: timeFrom(seg.departure?.dateTime || seg.departure?.time || ''),
    },
    arrival: {
      airportCode: seg.arrival?.airportCode || seg.arrival?.locationCode || '',
      date: isoDate(seg.arrival?.dateTime || seg.arrival?.date) || '',
      hour: timeFrom(seg.arrival?.dateTime || seg.arrival?.time || ''),
    },
  }));

  const first = segments[0];
  const last = segments[segments.length - 1];
  return {
    direction: index === 0 ? 'outbound' : 'return',
    label: index === 0 ? 'IDA' : 'VUELTA',
    dateLabel: first?.departure.date,
    routeDescription: `${first?.departure.airportCode || ''} - ${last?.arrival.airportCode || ''}`,
    stops: Math.max(0, segments.length - 1),
    airlines: ['Avianca'],
    segments,
  };
}

function readTotalPrice(doc: Document, bounds: any[]): { price: number; currency: string } {
  // Sum per-traveller amounts from digitalData bounds when available
  let sum = 0;
  let currency = 'COP';
  for (const b of bounds) {
    const amt = Number(b?.price?.pricePerTravellerType?.[0]?.totalPrice?.amount);
    const cur = b?.price?.pricePerTravellerType?.[0]?.totalPrice?.currency;
    if (Number.isFinite(amt)) sum += amt;
    if (cur) currency = String(cur);
  }
  if (sum > 0) return { price: sum, currency };

  // DOM: look for sticky price / resume
  const candidates = [
    '.resume-mobile-price',
    '.price-section .price',
    '.sticky-container .price',
    '[class*="total"] .price',
    '.economic-fare-footer-card',
  ];
  for (const sel of candidates) {
    const el = doc.querySelector(sel);
    const text = el?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const parsed = parseMoney(text);
    if (parsed) return parsed;
  }

  // Last resort: scan body for COP amounts
  const body = doc.body?.innerText || '';
  const m = body.match(/COP\s*\$?\s*([\d.]+)/i) || body.match(/\$\s*([\d.]+)/);
  if (m) {
    const n = Number(m[1].replace(/\./g, '').replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0) return { price: n, currency: 'COP' };
  }
  return { price: 0, currency: 'COP' };
}

function parseMoney(text: string): { price: number; currency: string } | null {
  const m =
    text.match(/(COP|USD|EUR)\s*\$?\s*([\d.,]+)/i) ||
    text.match(/\$\s*([\d.,]+)/);
  if (!m) return null;
  const currency = m[2] && /[A-Z]{3}/i.test(m[1]) ? m[1].toUpperCase() : 'COP';
  const raw = (m[2] || m[1]).replace(/\./g, '').replace(/,/g, '');
  const price = Number(raw);
  if (!Number.isFinite(price) || price <= 0) return null;
  return { price, currency };
}

function readLocationsTitle(doc: Document): string {
  const els = doc.querySelectorAll('.trip-summary-title .locations');
  const parts = Array.from(els)
    .map((e) => e.textContent?.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return parts.join(' · ');
}

function readPax(
  digitalData: any,
  doc: Document
): { adults: number; children: number; infants: number; summary?: string } {
  let adults = 0;
  let youngs = 0;
  let children = 0;
  let infants = 0;

  // Prefer Avianca trip-summary chip — includes Adultos / Jóvenes / Niños / Bebés.
  // Example: "2 Adultos, 1 Joven, 1 Niño, 1 Bebé"
  const infoNodes = Array.from(doc.querySelectorAll('.passenger-info'));
  const infoText = infoNodes.map((el) => el.textContent || '').join(' | ').trim();
  if (infoText) {
    adults = matchCount(infoText, /adult/i);
    youngs = matchCount(infoText, /j[oó]ven|young/i);
    children = matchCount(infoText, /niñ|child|menor/i);
    infants = matchCount(infoText, /beb|infant|infante/i);
  }

  // digitalData paths (only if DOM chip missing).
  if (!adults && !youngs && !children && !infants) {
    const candidates: unknown[] = [
      digitalData?.product?.[0]?.productInfo,
      digitalData?.product?.[0]?.productInfo?.productDetails,
      digitalData?.page?.attributes,
      digitalData?.page?.pageInfo,
      digitalData?.transaction?.[0]?.transactionTotal,
    ];
    for (const raw of candidates) {
      if (!raw || typeof raw !== 'object') continue;
      const s = raw as Record<string, unknown>;
      const a = Number(
        s.adults ?? s.numberOfAdults ?? s.nbAdults ?? s.adt ?? s.ADT ?? 0
      );
      const y = Number(
        s.youngs ?? s.numberOfYoungs ?? s.nbYoungs ?? s.youth ?? s.tng ?? 0
      );
      const c = Number(
        s.children ?? s.numberOfChildren ?? s.nbChildren ?? s.chd ?? s.CHD ?? 0
      );
      const i = Number(
        s.infants ?? s.numberOfInfants ?? s.nbInfants ?? s.inf ?? s.INF ?? 0
      );
      if (a + y + c + i > 0) {
        adults = a;
        youngs = y;
        children = c;
        infants = i;
        break;
      }
    }
  }

  // URL params (avail/trip sometimes keep nbAdults=…).
  if (!adults && !youngs && !children && !infants) {
    try {
      const params = new URL(doc.location.href).searchParams;
      adults = Number(params.get('nbAdults') || params.get('adults') || 0);
      youngs = Number(params.get('nbYoungs') || params.get('youngs') || 0);
      children = Number(params.get('nbChildren') || params.get('children') || 0);
      infants = Number(params.get('nbInfants') || params.get('infants') || 0);
    } catch {
      // ignore
    }
  }

  // Full-page text fallback (prefer textContent — innerText is empty in jsdom / some fixtures).
  if (!adults && !youngs && !children && !infants) {
    const text = doc.body?.innerText || doc.body?.textContent || '';
    adults = matchCount(text, /adult/i);
    youngs = matchCount(text, /j[oó]ven|young/i);
    children = matchCount(text, /niñ|child|menor/i);
    infants = matchCount(text, /beb|infant|infante/i);
  }

  // Last resort: "N Pasajeros" total → treat as adults when no breakdown found.
  if (!adults && !youngs && !children && !infants) {
    const text = doc.body?.innerText || doc.body?.textContent || '';
    const total = matchCount(text, /pasajer/i);
    if (total > 0) adults = total;
  }

  // Avianca "jóvenes" pay TA like other pax; store with children in the cart model.
  const childrenIncludingYoungs = children + youngs;

  const parts: string[] = [];
  if (adults) parts.push(`${adults} adulto${adults !== 1 ? 's' : ''}`);
  if (youngs) parts.push(`${youngs} joven${youngs !== 1 ? 'es' : ''}`);
  if (children) parts.push(`${children} niño${children !== 1 ? 's' : ''}`);
  if (infants) parts.push(`${infants} bebé${infants !== 1 ? 's' : ''}`);
  return {
    adults,
    children: childrenIncludingYoungs,
    infants,
    summary: parts.join(', ') || undefined,
  };
}

/** First `N <label>` count in text (e.g. "5 Adultos", "1 Joven", "2 Niños"). */
function matchCount(text: string, label: RegExp): number {
  // Allow accented letters after the stem (Bebé, Niños, Jóvenes).
  const re = new RegExp(`(\\d+)\\s*(?:${label.source})[\\wáéíóúüñ]*`, 'i');
  const m = text.match(re);
  return m ? Number(m[1]) || 0 : 0;
}

function buildBreakdown(bounds: any[], currency: string): FlightPriceBreakdownItem[] {
  const items: FlightPriceBreakdownItem[] = [];
  bounds.forEach((b, i) => {
    const amt = Number(b?.price?.pricePerTravellerType?.[0]?.totalPrice?.amount);
    if (!Number.isFinite(amt)) return;
    items.push({
      code: i === 0 ? 'OUT' : 'RET',
      amount: amt,
      description: i === 0 ? 'Ida (por pax)' : 'Vuelta (por pax)',
    });
  });
  return items;
}

function isoDate(v?: string): string | undefined {
  if (!v) return undefined;
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : undefined;
}

function timeFrom(v: string): string {
  const m = String(v).match(/T(\d{2}:\d{2})/) || String(v).match(/^(\d{2}:\d{2})/);
  return m ? m[1] : '';
}
