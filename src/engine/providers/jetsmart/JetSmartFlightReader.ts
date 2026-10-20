import {
  FlightLeg,
  FlightProduct,
  FlightSegment,
} from '../../core/types';

export class JetSmartFlightReader {
  static hasSelectedFlight(doc: Document): boolean {
    return Boolean(
      doc.querySelector(
        '[data-test-id="sidebar-total-amount-value-with-currency-sign"], [data-test-id^="bundle-selected-container--j|"]'
      )
    );
  }

  static extract(doc: Document): FlightProduct | null {
    if (!this.hasSelectedFlight(doc)) return null;

    const totalEl = doc.querySelector(
      '[data-test-id="sidebar-total-amount-value-with-currency-sign"]'
    );
    const price = parseMoney(
      totalEl?.getAttribute('data-test-value') || totalEl?.textContent || ''
    );
    const currency = readCurrency(doc);
    if (!(price > 0)) return null;

    const originHeader = text(doc.querySelector('[data-test-id="flight-itinerary-origin"]'));
    const destinationHeader = text(
      doc.querySelector('[data-test-id="flight-itinerary-destination"]')
    );
    const legs = readLegs(doc);
    const first = legs[0]?.segments[0];
    const outboundSegments = legs[0]?.segments || [];
    const outboundLast = outboundSegments[outboundSegments.length - 1];
    const pax = readPax(doc);
    const adults = Math.max(1, pax.adults);
    const children = Math.max(0, pax.children);
    const infants = Math.max(0, pax.infants);
    const routeType: 'oneWay' | 'roundTrip' = legs.length > 1 ? 'roundTrip' : 'oneWay';
    const baggageIncluded = Array.from(
      doc.querySelectorAll(
        '[data-test-id^="bundle-selected-container--j|"] img[alt]'
      )
    )
      .map((img) => img.getAttribute('alt')?.replace(/\s+/g, ' ').trim() || '')
      .filter((label) => /bolso|mochila|equipaje|maleta/i.test(label))
      .filter((label, index, all) => all.indexOf(label) === index);

    // FullFlex / Full = all bags when alt missing
    const selectedBundles = Array.from(
      doc.querySelectorAll('[data-test-id^="bundle-selected-container--j|"]')
    )
      .map((el) => el.getAttribute('data-test-value') || '')
      .filter(Boolean);
    const fare = Array.from(new Set(selectedBundles)).join(' / ');
    if (!baggageIncluded.length && /full/i.test(fare)) {
      baggageIncluded.push('Bolso de mano', 'Equipaje de cabina', 'Equipaje en bodega');
    }

    const paxSummary = [
      `${adults} Adt`,
      children ? `${children} Chd` : '',
      infants ? `${infants} Inf` : '',
    ]
      .filter(Boolean)
      .join(' · ');

    return {
      id: `jetsmart_${Date.now()}`,
      type: 'flight',
      provider: 'JetSMART',
      timestamp: Date.now(),
      tripId: buildTripId(legs, price, currency),
      title: [originHeader, destinationHeader].filter(Boolean).join(' - ') || 'JetSMART',
      routeType,
      origin: {
        code: first?.departure.airportCode || '',
        name: originHeader.replace(/\([A-Z]{3}\)/, '').trim() || undefined,
      },
      destination: {
        code: outboundLast?.arrival.airportCode || '',
        name: destinationHeader.replace(/\([A-Z]{3}\)/, '').trim() || undefined,
      },
      departureDate: first?.departure.date || undefined,
      returnDate: legs[1]?.segments[0]?.departure.date || undefined,
      adults,
      children,
      infants,
      paxSummary,
      legs,
      price,
      currency,
      priceBreakdown: fare
        ? [{ code: 'FARE', amount: 0, description: `Tarifa ${fare}` }]
        : [],
      baggageIncluded,
      bookingUrl: doc.location?.href,
    };
  }
}

function readCurrency(doc: Document): string {
  const href = doc.location?.href || '';
  try {
    const q = new URL(href).searchParams;
    const fromUrl = (q.get('currency') || q.get('cur') || '').toUpperCase();
    if (/^[A-Z]{3}$/.test(fromUrl)) return fromUrl;
    const culture = (q.get('culture') || '').toLowerCase();
    if (culture === 'es-co') return 'COP';
    if (culture === 'es-cl') return 'CLP';
    if (culture === 'es-pe') return 'PEN';
    if (culture === 'es-ar') return 'ARS';
  } catch {
    // ignore
  }

  const stations = [
    text(doc.querySelector('[data-test-id="sidebar-departure-station-code--j|0"]')),
    text(doc.querySelector('[data-test-id="sidebar-arrival-station-code--j|0"]')),
    text(doc.querySelector('[data-test-id="sidebar-departure-station-code--j|1"]')),
    text(doc.querySelector('[data-test-id="sidebar-arrival-station-code--j|1"]')),
  ];
  const colombia = new Set([
    'BOG',
    'MDE',
    'CLO',
    'CTG',
    'ADZ',
    'SMR',
    'BAQ',
    'PEI',
    'MTR',
    'CUC',
    'BGA',
    'EOH',
    'LET',
    'VVC',
  ]);
  // Domestic/Colombia routes: prefer COP even if the saved page shows another market switch.
  if (stations.some((c) => colombia.has(c))) return 'COP';

  const switchCur = text(doc.querySelector('[data-test-id="sidebar-currency-switch"]')).match(
    /\b([A-Z]{3})\b/
  )?.[1];
  if (switchCur) return switchCur;
  return 'COP';
}

function readPax(doc: Document): { adults: number; children: number; infants: number } {
  // 1) URL query (deep-links)
  const href = doc.location?.href || '';
  try {
    const q = new URL(href).searchParams;
    const adt = Number(q.get('adt') || q.get('adults') || '');
    const chd = Number(q.get('chd') || q.get('children') || '');
    const inf = Number(q.get('inf') || q.get('infants') || '');
    if (adt > 0 || chd > 0 || inf > 0) {
      return {
        adults: Math.max(0, adt || 0),
        children: Math.max(0, chd || 0),
        infants: Math.max(0, inf || 0),
      };
    }
  } catch {
    // ignore
  }

  // 2) Sidebar cost summary — authoritative pax count for the selected trip
  const sidebarTotalPax = Number(
    doc.querySelector('[data-test-id="sidebar-pax-count--j|0"]')?.getAttribute('data-test-value') ||
      ''
  );

  // Child/infant pack lines only between journey-0 and journey-1 markers (avoid RT double-count)
  const j0 = doc.querySelector('[data-test-id="sidebar-pax-count--j|0"]');
  const j1 = doc.querySelector('[data-test-id="sidebar-pax-count--j|1"]');
  let journey0Text = '';
  if (j0) {
    const root =
      j0.closest('ac-sidebar-breakdown') ||
      j0.closest('ac-sidebar-booking') ||
      j0.parentElement?.parentElement ||
      j0.parentElement;
    const full = (root?.textContent || '').replace(/\s+/g, ' ');
    if (j1 && full.includes('pasajeros')) {
      // Take text before the second journey's "pasajeros" block when possible
      const idx = full.indexOf(
        (j1.textContent || '').replace(/\s+/g, ' ').trim()
      );
      journey0Text = idx > 0 ? full.slice(0, idx) : full;
    } else {
      journey0Text = full;
    }
  }

  const childrenFromSidebar = (journey0Text.match(/\bNiñ[oa]s?\s*-\s*Pack\b/gi) || []).length;
  const infantsFromSidebar = (journey0Text.match(/\bInfantes?\s*-\s*Pack\b/gi) || []).length;

  if (sidebarTotalPax > 0) {
    const children = Math.min(childrenFromSidebar, sidebarTotalPax);
    const infants = Math.min(infantsFromSidebar, Math.max(0, sidebarTotalPax - children));
    return {
      adults: Math.max(0, sidebarTotalPax - children - infants) || sidebarTotalPax,
      children,
      infants,
    };
  }

  // Fallback: Adulto - Pack lines in journey 0 only (never whole-page / age labels)
  const adultsFromSidebar = (journey0Text.match(/\bAdulto\s*-\s*Pack\b/gi) || []).length;
  if (adultsFromSidebar + childrenFromSidebar + infantsFromSidebar > 0) {
    return {
      adults: adultsFromSidebar || 1,
      children: childrenFromSidebar,
      infants: infantsFromSidebar,
    };
  }

  // 3) Itinerary header: "1 pasajero" / "2 pasajeros"
  const itineraryPax = parseInt(
    text(doc.querySelector('[data-test-id="flight-itinerary"]')).match(/(\d+)\s+pasajer/i)?.[1] ||
      '0',
    10
  );
  if (itineraryPax > 0) {
    return { adults: itineraryPax, children: 0, infants: 0 };
  }

  return { adults: 1, children: 0, infants: 0 };
}

function readLegs(doc: Document): FlightLeg[] {
  const legs: FlightLeg[] = [];
  const urlFlights = readFlightKeysFromUrl(doc);
  for (const journeyIndex of [0, 1]) {
    const departureCode = text(
      doc.querySelector(`[data-test-id="sidebar-departure-station-code--j|${journeyIndex}"]`)
    );
    const arrivalCode = text(
      doc.querySelector(`[data-test-id="sidebar-arrival-station-code--j|${journeyIndex}"]`)
    );
    if (!departureCode || !arrivalCode) continue;

    const departureTime = text(
      doc.querySelector(`[data-test-id="sidebar-departure-time--j|${journeyIndex}"]`)
    );
    const arrivalTime = text(
      doc.querySelector(`[data-test-id="sidebar-arrival-time--j|${journeyIndex}"]`)
    );
    const selectedFare = Array.from(
      doc.querySelectorAll<HTMLElement>(
        `[data-test-id^="flight-smart-fee--j|${journeyIndex}"], [data-test-id^="flight-club-fee--j|${journeyIndex}"]`
      )
    ).find(
      (el) => el.classList.contains('bg-n-blue') || el.classList.contains('bg-n-orange')
    );
    const departureDateTime = selectedFare?.getAttribute('data-departure') || '';
    const arrivalDateTime = selectedFare?.getAttribute('data-arrival') || '';
    const departureDate = departureDateTime.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || '';

    const flightKeys = urlFlights[journeyIndex] || [];
    const stopsFromUrl = Math.max(0, flightKeys.length - 1);
    const scaleHint =
      text(doc.querySelector(`[data-test-id="flight-scale--j|${journeyIndex}"]`)) ||
      text(doc.querySelector(`[data-test-id="sidebar-scale--j|${journeyIndex}"]`)) ||
      readSelectedOptionScaleLabel(doc, journeyIndex);
    let stops = stopsFromUrl;
    if (/con escala/i.test(scaleHint)) {
      const m = scaleHint.match(/(\d+)\s*escala/i);
      stops = Math.max(stops, m ? Number(m[1]) || 1 : 1);
    } else if (/vuelo directo|directo/i.test(scaleHint) && flightKeys.length <= 1) {
      stops = 0;
    }

    const segments: FlightSegment[] =
      flightKeys.length > 1
        ? flightKeys.map((key, segIdx) => ({
            airlineCode: 'JA',
            airlineName: 'JetSMART',
            flightNumber: `JA${key}`,
            departure: {
              airportCode: segIdx === 0 ? departureCode : '',
              date: departureDate,
              hour: segIdx === 0 ? departureTime || timePart(departureDateTime) : '',
            },
            arrival: {
              airportCode: segIdx === flightKeys.length - 1 ? arrivalCode : '',
              date:
                segIdx === flightKeys.length - 1
                  ? arrivalDateTime.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || departureDate
                  : departureDate,
              hour:
                segIdx === flightKeys.length - 1
                  ? arrivalTime || timePart(arrivalDateTime)
                  : '',
            },
          }))
        : [
            {
              airlineCode: 'JA',
              airlineName: 'JetSMART',
              flightNumber: flightKeys[0] ? `JA${flightKeys[0]}` : undefined,
              departure: {
                airportCode: departureCode,
                date: departureDate,
                hour: departureTime || timePart(departureDateTime),
              },
              arrival: {
                airportCode: arrivalCode,
                date: arrivalDateTime.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || departureDate,
                hour: arrivalTime || timePart(arrivalDateTime),
              },
            },
          ];

    const bundleEl = doc.querySelector(
      `[data-test-id="bundle-selected-container--j|${journeyIndex}"]`
    );
    const legBaggage = bundleEl
      ? Array.from(bundleEl.querySelectorAll('img[alt]'))
          .map((img) => img.getAttribute('alt')?.replace(/\s+/g, ' ').trim() || '')
          .filter((label) => /bolso|mochila|equipaje|maleta/i.test(label))
          .filter((label, idx, all) => all.indexOf(label) === idx)
      : [];
    // Fallback by bundle name in URL/data-test-value when icons missing
    const bundleName =
      bundleEl?.getAttribute('data-test-value') ||
      readBundleFromUrl(doc, journeyIndex) ||
      '';
    const baggageIncluded =
      legBaggage.length > 0
        ? legBaggage
        : baggageForJetSmartBundle(bundleName);

    legs.push({
      direction: journeyIndex === 0 ? 'outbound' : 'return',
      label: journeyIndex === 0 ? 'IDA' : 'VUELTA',
      dateLabel: departureDate,
      routeDescription: `${departureCode} - ${arrivalCode}`,
      stops,
      airlines: ['JetSMART'],
      segments,
      baggageIncluded,
    });
  }
  return legs;
}

/** `flight1=5477|5414` → two segment keys ⇒ 1 stop. */
function readFlightKeysFromUrl(doc: Document): string[][] {
  try {
    const q = new URL(doc.location?.href || '').searchParams;
    return [0, 1].map((i) => {
      const raw = q.get(`flight${i + 1}`) || '';
      return raw
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);
    });
  } catch {
    return [[], []];
  }
}

function readBundleFromUrl(doc: Document, journeyIndex: number): string {
  try {
    return new URL(doc.location?.href || '').searchParams.get(`bundle${journeyIndex + 1}`) || '';
  } catch {
    return '';
  }
}

function baggageForJetSmartBundle(bundle: string): string[] | undefined {
  const b = bundle.toLowerCase();
  if (!b) return undefined;
  if (/full|fullflex|club/i.test(b)) {
    return ['Bolso o mochila pequeña', 'Equipaje de mano', 'Equipaje de bodega'];
  }
  if (/smart/i.test(b)) {
    return ['Bolso o mochila pequeña', 'Equipaje de mano'];
  }
  if (/essential|light|basic/i.test(b)) {
    return ['Bolso o mochila pequeña'];
  }
  return undefined;
}

function readSelectedOptionScaleLabel(doc: Document, journeyIndex: number): string {
  const bundle = doc.querySelector(`[data-test-id="bundle-selected-container--j|${journeyIndex}"]`);
  if (!bundle) return '';
  const root =
    bundle.closest('[data-test-id^="flight-fee-option--j|"]')?.parentElement ||
    bundle.closest('.w-full') ||
    bundle.parentElement?.parentElement;
  const info = root?.querySelector(`[data-test-id^="flight-flight-info-content--j|${journeyIndex}"]`);
  const id = info?.getAttribute('data-test-id') || '';
  const optMatch = id.match(/-i\|(\d+)/);
  if (!optMatch) return '';
  const listItem = doc.querySelector(
    `[data-test-id="flight-fee-option--j|${journeyIndex}-i|${optMatch[1]}"]`
  );
  return listItem?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function parseMoney(raw: string): number {
  const cleaned = raw.replace(/[^\d.,-]/g, '');
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

function text(el: Element | null): string {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim();
}

function timePart(value: string): string {
  return value.match(/\s(\d{2}:\d{2})/)?.[1] || '';
}

function buildTripId(legs: FlightLeg[], price: number, currency: string): string {
  const route = legs
    .map((leg) => {
      const segment = leg.segments[0];
      return `${segment?.departure.airportCode}${segment?.arrival.airportCode}_${segment?.departure.date}_${segment?.departure.hour}`;
    })
    .join('__');
  return `jetsmart_${route}_${currency}_${price}`.replace(/[^a-zA-Z0-9._-]/g, '_');
}
