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
    if (
      doc.querySelector(
        'trip-summary-page, .trip-summary-content, .trip-summary-block, bound-displayer-pres, flights-recap-pres, .general-trip-summary-title'
      )
    ) {
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

      const domBounds = Array.from(
        doc.querySelectorAll('trip-summary-page bound-displayer-pres, bound-displayer-pres')
      );
      const legs: FlightLeg[] = bounds.map((bound: any, index: number) =>
        mapDigitalBound(bound, index, domBounds[index])
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

      const tripBaggage = legs.flatMap((l) => l.baggageIncluded || []);
      const uniqueBaggage = tripBaggage.filter(
        (b, i, all) => all.findIndex((x) => x.toLowerCase() === b.toLowerCase()) === i
      );

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
        baggageIncluded: uniqueBaggage.length ? uniqueBaggage : readIncludedBaggage(doc),
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
      legs.push(parseAviancaBound(bounds[i], i));
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

    const tripBaggage = legs.flatMap((l) => l.baggageIncluded || []);
    const uniqueBaggage = tripBaggage.filter(
      (b, i, all) => all.findIndex((x) => x.toLowerCase() === b.toLowerCase()) === i
    );

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
      baggageIncluded: uniqueBaggage.length ? uniqueBaggage : readIncludedBaggage(doc),
      bookingUrl: doc.location?.href,
    };
  }
}

function parseAviancaBound(bound: Element, index: number): FlightLeg {
  const content = bound.querySelector('.content[data-flight], .content');
  let data: Record<string, unknown> | null = null;
  const raw = content?.getAttribute('data-flight');
  if (raw) {
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      data = null;
    }
  }

  const locations =
    bound.querySelector('.trip-summary-title .locations')?.textContent?.replace(/\s+/g, ' ').trim() ||
    '';
  const dateLabel =
    bound.querySelector('.trip-summary-title .date, time.date')?.textContent?.replace(/\s+/g, ' ').trim() ||
    '';
  const dateIso =
    bound.querySelector('.trip-summary-title time.date, time.date')?.getAttribute('datetime') ||
    parseDateFromLabel(dateLabel);
  const flightDetails = bound.querySelector('.flight-details');
  const depHour =
    flightDetails?.querySelector('.flight-details-left .hour')?.textContent?.trim() ||
    bound.querySelector('.flight-details-left .hour')?.textContent?.trim() ||
    '';
  const arrHour =
    flightDetails?.querySelector('.flight-details-right .hour')?.textContent?.trim() ||
    bound.querySelector('.flight-details-right .hour')?.textContent?.trim() ||
    '';
  const duration =
    flightDetails?.querySelector('.information')?.textContent?.replace(/\s+/g, ' ').trim() ||
    bound.querySelector('.flight-segment-detail .information')?.textContent?.replace(/\s+/g, ' ').trim() ||
    undefined;
  const stopLabel = readAviancaStopLabelFromBound(bound, flightDetails);

  const originCode =
    String(data?.origen || '') ||
    flightDetails?.querySelector('.flight-details-left .location')?.textContent?.trim() ||
    locations.split(/[-–→]/)[0]?.trim().match(/\b([A-Z]{3})\b/)?.[1] ||
    '';
  const destCode =
    String(data?.destino || '') ||
    flightDetails?.querySelector('.flight-details-right .location')?.textContent?.trim() ||
    locations.split(/[-–→]/).pop()?.trim().match(/\b([A-Z]{3})\b/)?.[1] ||
    '';

  const flightNums: string[] = Array.isArray(data?.numeroDeVuelo)
    ? (data.numeroDeVuelo as string[])
    : [];
  const primaryFlight = flightNums[0];
  const equipment = Array.isArray(data?.tipoDeAvion) ? String(data.tipoDeAvion[0] || '') : undefined;

  const segment: FlightSegment = {
    airlineCode: primaryFlight?.replace(/\d+/g, '') || 'AV',
    airlineName: 'Avianca',
    flightNumber: primaryFlight,
    equipment: equipment || undefined,
    departure: {
      airportCode: originCode,
      date: dateIso,
      hour: depHour,
    },
    arrival: {
      airportCode: destCode,
      date: dateIso,
      hour: arrHour,
    },
  };

  const stopsFromData =
    typeof data?.numeroDeEscalas === 'number' ? (data.numeroDeEscalas as number) : undefined;
  const stops =
    stopsFromData ??
    parseAviancaStopLabel(stopLabel) ??
    Math.max(0, flightNums.length - 1);

  const boundText = (bound.textContent || '').replace(/\s+/g, ' ');
  const fare =
    String(data?.tarifaSeleccionada || '') ||
    detectAviancaFareFromText(boundText) ||
    '';
  const baggageIncluded = resolveAviancaBaggage(bound, fare);

  return {
    direction: index === 0 ? 'outbound' : 'return',
    label: index === 0 ? 'IDA' : 'VUELTA',
    dateLabel,
    routeDescription: locations || `${originCode} - ${destCode}`,
    duration,
    stops,
    airlines: ['Avianca'],
    segments: [segment],
    baggageIncluded,
  };
}

function readAviancaStopLabelFromBound(
  bound: Element,
  flightDetails?: Element | null
): string {
  const fromDetails =
    flightDetails?.querySelector('.flight-detail')?.textContent?.replace(/\s+/g, ' ').trim() ||
    '';
  if (fromDetails) return fromDetails;
  const fromBound = bound.querySelector('.flight-detail')?.textContent?.replace(/\s+/g, ' ').trim() || '';
  if (fromBound) return fromBound;
  const texts = Array.from(bound.querySelectorAll('.flight-detail'))
    .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return texts[0] || '';
}

function parseAviancaStopLabel(label: string): number | undefined {
  if (!label) return undefined;
  if (/directo/i.test(label)) return 0;
  const m = label.match(/(\d+)\s*parada/i);
  if (m) return Number(m[1]) || 1;
  return /parada|escala|stop|correspondance/i.test(label) ? 1 : undefined;
}

function readAviancaStopsFromDom(root?: ParentNode | null): number | undefined {
  if (!root) return undefined;
  const bound =
    root instanceof Element
      ? root
      : root instanceof Document
        ? root.documentElement
        : null;
  if (!bound) return undefined;
  const flightDetails = root.querySelector?.('.flight-details') ?? null;
  return parseAviancaStopLabel(readAviancaStopLabelFromBound(bound, flightDetails));
}

function parseDateFromLabel(label: string): string {
  const m = label.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const es = label.match(/(\d{1,2})\s+[A-Za-zÁÉÍÓÚáéíóúñ]+,?\s+(\d{4})/);
  if (es) {
    // dateLabel often lacks parseable month in ES — leave empty unless datetime attr present
  }
  const timeEl = label.match(/\d{4}-\d{2}-\d{2}/);
  return timeEl?.[0] || '';
}

function detectAviancaFareFromText(text: string): string | undefined {
  // Prefer fare pill next to price: "Classic COP 917.770"
  const nearPrice = text.match(/\b(Basic|Light|Classic|Flex|Business)\b(?=\s*COP)/i);
  if (nearPrice) return nearPrice[1].toUpperCase();
  const any = text.match(/\b(Basic|Light|Classic|Flex|Business)\b/i);
  return any ? any[1].toUpperCase() : undefined;
}

function baggageForAviancaFare(fare?: string): string[] {
  const f = (fare || 'BASIC').toUpperCase();
  const personal = '1 artículo personal (bolso)';
  const hand = '1 equipaje de mano (10kg)';
  const checked = '1 equipaje de bodega (23kg)';
  if (f.includes('FLEX') || f.includes('CLASSIC')) return [personal, hand, checked];
  if (f.includes('LIGHT')) return [personal, hand];
  return [personal];
}

function resolveAviancaBaggage(
  root: ParentNode | undefined,
  fare?: string
): string[] | undefined {
  const explicitFare = (fare || '').trim();
  // Prefer fare family when known — page text often mixes ida + regreso.
  if (explicitFare) {
    const mapped = baggageForAviancaFare(explicitFare);
    if (mapped.length) return mapped;
  }
  if (root instanceof Element) {
    const fromDom = readIncludedBaggage(root);
    if (fromDom.length) return fromDom;
    const fareFromBound = detectAviancaFareFromText(
      (root.textContent || '').replace(/\s+/g, ' ')
    );
    if (fareFromBound) return baggageForAviancaFare(fareFromBound);
  }
  return undefined;
}

function readIncludedBaggage(root: ParentNode | Document): string[] {
  const text =
    'body' in root && root.body
      ? root.body.innerText || ''
      : (root as Element).textContent || '';
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

function mapDigitalBound(bound: any, index: number, root?: ParentNode): FlightLeg {
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
  const stopsFromData =
    typeof bound?.numeroDeEscalas === 'number' ? bound.numeroDeEscalas : undefined;
  const stopsFromDom = readAviancaStopsFromDom(root);
  const stops =
    stopsFromData ??
    stopsFromDom ??
    Math.max(0, segments.length - 1);
  return {
    direction: index === 0 ? 'outbound' : 'return',
    label: index === 0 ? 'IDA' : 'VUELTA',
    dateLabel: first?.departure.date,
    routeDescription: `${first?.departure.airportCode || ''} - ${last?.arrival.airportCode || ''}`,
    stops,
    airlines: ['Avianca'],
    segments,
    baggageIncluded: resolveAviancaBaggage(
      root,
      bound?.fareFamily || bound?.tarifaSeleccionada || bound?.selectedFare
    ),
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

  // Prefer explicit trip total before partial fare / sticky snippets
  const body = doc.body?.innerText || doc.body?.textContent || '';
  const totalMatch =
    body.match(/Total\s+de\s+tu\s+reserva\s*:?\s*(COP|USD|EUR)?\s*\$?\s*([\d.]+)/i) ||
    body.match(/Total\s*:?\s*(COP|USD|EUR)\s*\$?\s*([\d.]+)/i);
  if (totalMatch) {
    const cur = (totalMatch[1] || 'COP').toUpperCase();
    const n = Number(totalMatch[2].replace(/\./g, '').replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0) return { price: n, currency: cur };
  }

  // Sum Classic/Flex/Light leg prices when shown as "Classic COP 917.770"
  const legPrices = [
    ...body.matchAll(/\b(?:Basic|Light|Classic|Flex|Business)\s+(COP|USD|EUR)\s*([\d.]+)/gi),
  ].map((m) => ({
    currency: m[1].toUpperCase(),
    price: Number(m[2].replace(/\./g, '').replace(/,/g, '')) || 0,
  }));
  // Deduplicate near-identical pairs (mobile+desktop duplicates)
  const uniqueLegs: Array<{ currency: string; price: number }> = [];
  for (const row of legPrices) {
    if (!(row.price > 0)) continue;
    if (uniqueLegs.some((u) => u.price === row.price && u.currency === row.currency)) continue;
    uniqueLegs.push(row);
  }
  if (uniqueLegs.length >= 1) {
    const currency = uniqueLegs[0].currency;
    const price = uniqueLegs.reduce((s, r) => s + r.price, 0);
    if (price > 0) return { price, currency };
  }

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

  // Last resort: largest COP amount on page (avoids picking a single-leg fare)
  const amounts = [...body.matchAll(/\b(COP|USD|EUR)\s*\$?\s*([\d.]+)/gi)].map((m) => ({
    currency: m[1].toUpperCase(),
    price: Number(m[2].replace(/\./g, '').replace(/,/g, '')) || 0,
  }));
  const best = amounts.filter((a) => a.price > 0).sort((a, b) => b.price - a.price)[0];
  if (best) return best;
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
