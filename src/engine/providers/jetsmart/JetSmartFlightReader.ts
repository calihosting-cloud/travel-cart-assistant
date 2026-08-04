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
    const currency =
      text(doc.querySelector('[data-test-id="sidebar-currency-switch"]')).match(
        /\b([A-Z]{3})\b/
      )?.[1] || 'COP';
    if (!(price > 0)) return null;

    const originHeader = text(doc.querySelector('[data-test-id="flight-itinerary-origin"]'));
    const destinationHeader = text(
      doc.querySelector('[data-test-id="flight-itinerary-destination"]')
    );
    const legs = readLegs(doc);
    const first = legs[0]?.segments[0];
    const outboundSegments = legs[0]?.segments || [];
    const outboundLast = outboundSegments[outboundSegments.length - 1];
    const totalPax =
      Number(
        doc
          .querySelector('[data-test-id="sidebar-pax-count--j|0"]')
          ?.getAttribute('data-test-value')
      ) ||
      parseInt(
        text(doc.querySelector('[data-test-id="flight-itinerary"]')).match(
          /(\d+)\s+pasajer/i
        )?.[1] || '0',
        10
      ) ||
      1;
    const routeType: 'oneWay' | 'roundTrip' = legs.length > 1 ? 'roundTrip' : 'oneWay';
    const baggageIncluded = Array.from(
      doc.querySelectorAll(
        '[data-test-id^="bundle-selected-container--j|"] img[alt]'
      )
    )
      .map((img) => img.getAttribute('alt')?.replace(/\s+/g, ' ').trim() || '')
      .filter((label) => /bolso|mochila|equipaje|maleta/i.test(label))
      .filter((label, index, all) => all.indexOf(label) === index);

    const selectedBundles = Array.from(
      doc.querySelectorAll('[data-test-id^="bundle-selected-container--j|"]')
    )
      .map((el) => el.getAttribute('data-test-value') || '')
      .filter(Boolean);
    const fare = Array.from(new Set(selectedBundles)).join(' / ');

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
      adults: totalPax,
      children: 0,
      infants: 0,
      paxSummary: `${totalPax} pasajero${totalPax !== 1 ? 's' : ''}`,
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

function readLegs(doc: Document): FlightLeg[] {
  const legs: FlightLeg[] = [];
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
    const segment: FlightSegment = {
      airlineCode: 'JA',
      airlineName: 'JetSMART',
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
    };
    legs.push({
      direction: journeyIndex === 0 ? 'outbound' : 'return',
      label: journeyIndex === 0 ? 'IDA' : 'VUELTA',
      dateLabel: departureDate,
      routeDescription: `${departureCode} - ${arrivalCode}`,
      stops: 0,
      airlines: ['JetSMART'],
      segments: [segment],
    });
  }
  return legs;
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
