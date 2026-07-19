import {
  FlightLeg,
  FlightPriceBreakdownItem,
  FlightProduct,
  FlightSegment,
} from '../../core/types';

const MONTHS: Record<string, number> = {
  ene: 1,
  jan: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dic: 12,
  dec: 12,
};

/**
 * Reads the selected fare block on Scape/XNet FlightResults
 * (`#divRatesReserve` → `table.selectedFlight`).
 *
 * Unlike Despegar (inline CheckoutModel JSON), XNet keeps the chosen itinerary
 * in the DOM after the user picks outbound/return options.
 */
export class XNetFlightReader {
  static hasSelectedFare(doc: Document): boolean {
    const panel = getActiveRateRoot(doc);
    if (!panel) return false;
    return panel.querySelectorAll('table.selectedFlight tr[id^="OpcoesDeVooSel_"]').length > 0;
  }

  static extract(doc: Document): FlightProduct | null {
    const box = getActiveRateRoot(doc);
    if (!box) return null;

    const rows = Array.from(
      box.querySelectorAll('table.selectedFlight tr[id^="OpcoesDeVooSel_"]')
    ) as HTMLTableRowElement[];
    if (rows.length === 0) return null;

    const segmentsByLeg = new Map<number, FlightSegment[]>();
    const legMeta = new Map<number, { dateIso?: string; stopsHint: number }>();

    for (const row of rows) {
      const parsed = parseSelectedRow(row);
      if (!parsed) continue;
      const list = segmentsByLeg.get(parsed.legIndex) ?? [];
      list.push(parsed.segment);
      segmentsByLeg.set(parsed.legIndex, list);

      const meta = legMeta.get(parsed.legIndex) ?? { stopsHint: 0 };
      if (parsed.dateIso) meta.dateIso = parsed.dateIso;
      meta.stopsHint = Math.max(meta.stopsHint, parsed.stopsHint);
      legMeta.set(parsed.legIndex, meta);
    }

    const legIndexes = Array.from(segmentsByLeg.keys()).sort((a, b) => a - b);
    if (legIndexes.length === 0) return null;

    const legs: FlightLeg[] = legIndexes.map((legIndex, i) => {
      const segments = segmentsByLeg.get(legIndex)!;
      const meta = legMeta.get(legIndex);
      const isReturn = i > 0;
      const first = segments[0];
      const last = segments[segments.length - 1];
      const airlines = Array.from(
        new Set(segments.map((s) => s.airlineName).filter((n): n is string => !!n))
      );
      const stopsFromSegs = Math.max(0, segments.length - 1);
      const stops = Math.max(stopsFromSegs, meta?.stopsHint ?? 0);

      return {
        direction: isReturn ? 'return' : 'outbound',
        label: isReturn ? 'VUELTA' : 'IDA',
        dateLabel: first?.departure.date || meta?.dateIso,
        routeDescription: [
          first?.departure.cityName || first?.departure.airportCode,
          last?.arrival.cityName || last?.arrival.airportCode,
        ]
          .filter(Boolean)
          .join(' - '),
        duration: sumDurations(segments.map((s) => s.duration)),
        stops,
        airlines,
        segments,
      };
    });

    const outbound = legs[0];
    const inbound = legs.length > 1 ? legs[legs.length - 1] : undefined;
    const originCode = outbound?.segments[0]?.departure.airportCode || '';
    const originName = outbound?.segments[0]?.departure.cityName;
    const destSegs = outbound?.segments ?? [];
    const destLast = destSegs[destSegs.length - 1];
    const destinationCode = destLast?.arrival.airportCode || '';
    const destinationName = destLast?.arrival.cityName;

    const currency =
      textOf(box.querySelector('#CurrencyRate_0, [id^="CurrencyRate_"]')) || 'COP';
    const price = parseMoney(
      textOf(box.querySelector('#TotalPriceRate_0, [id^="TotalPriceRate_"]'))
    );
    const base = parseMoney(
      textOf(box.querySelector('#TotalBasePriceRate_0, [id^="TotalBasePriceRate_"]'))
    );
    const fee = parseMoney(
      textOf(box.querySelector('[id^="totalFeeRate_"] .price, [id^="totalFeeRate_"]'))
    );

    const priceBreakdown: FlightPriceBreakdownItem[] = [];
    if (base > 0) priceBreakdown.push({ code: 'BASE', amount: base, description: 'Tarifa base' });
    if (fee > 0) priceBreakdown.push({ code: 'FEE', amount: fee, description: 'Fee' });
    if (price > 0 && base > 0) {
      const taxes = Math.max(0, Math.round((price - base - fee) * 100) / 100);
      if (taxes > 0) {
        priceBreakdown.push({ code: 'TAX', amount: taxes, description: 'Impuestos / tasas' });
      }
    }

    const pax = readPaxCounts(box);
    const departureDate = outbound?.segments[0]?.departure.date || undefined;
    const returnDate = inbound?.segments[0]?.departure.date || undefined;
    const routeType: 'oneWay' | 'roundTrip' = legs.length > 1 ? 'roundTrip' : 'oneWay';

    const title = [originName || originCode, destinationName || destinationCode]
      .filter(Boolean)
      .join(' - ');

    const tripId = buildTripId(legs, price, currency);

    const paxParts = [
      routeType === 'roundTrip' ? 'Ida y vuelta' : 'Solo ida',
      pax.adults ? `${pax.adults} adulto${pax.adults === 1 ? '' : 's'}` : null,
      pax.children ? `${pax.children} niño${pax.children === 1 ? '' : 's'}` : null,
      pax.infants ? `${pax.infants} bebé${pax.infants === 1 ? '' : 's'}` : null,
    ].filter(Boolean);

    return {
      id: `flight_${tripId}`,
      type: 'flight',
      provider: 'XNet',
      timestamp: Date.now(),
      tripId,
      title: title || 'Vuelo',
      routeType,
      origin: { code: originCode, name: originName },
      destination: { code: destinationCode, name: destinationName },
      departureDate,
      returnDate,
      adults: pax.adults,
      children: pax.children,
      infants: pax.infants,
      paxSummary: paxParts.join(', ') || undefined,
      legs,
      price,
      currency,
      priceBreakdown,
      bookingUrl: typeof location !== 'undefined' ? location.href : undefined,
    };
  }
}

function getActiveRateRoot(doc: Document): HTMLElement | null {
  return getActiveRatePanel(doc);
}

/**
 * Active tariff panel under #tabs-tarif. XNet duplicates tables/buttons per tab
 * with the same ids; callers must scope queries to this panel.
 */
export function getActiveRatePanel(doc: Document): HTMLElement | null {
  const box = doc.querySelector('#divRatesReserve') as HTMLElement | null;
  if (!box || box.style.display === 'none') return null;

  const panels = Array.from(box.querySelectorAll<HTMLElement>('[id^="tabRate_"]')).filter((el) =>
    /^tabRate_\d+$/.test(el.id)
  );

  if (panels.length === 0) return box;

  const active =
    panels.find((p) => p.getAttribute('aria-hidden') === 'false') ||
    panels.find((p) => {
      if (p.style.display === 'none') return false;
      return p.offsetParent !== null || p.getClientRects().length > 0;
    });

  return active || panels[0] || box;
}

function parseSelectedRow(row: HTMLTableRowElement): {
  legIndex: number;
  dateIso?: string;
  stopsHint: number;
  segment: FlightSegment;
} | null {
  const id = row.id || '';
  // OpcoesDeVooSel_{tab}_{leg}_..._{YYYYMMDD}_{seg}
  const idMatch = id.match(/^OpcoesDeVooSel_(\d+)_(\d+)_.*?_(\d{8})_(\d+)$/);
  const legIndex = idMatch ? Number(idMatch[2]) : 0;
  const dateFromId = idMatch ? isoFromYyyymmdd(idMatch[3]) : undefined;

  const cells = Array.from(row.querySelectorAll(':scope > td'));
  if (cells.length < 4) return null;

  const flightCell = cells[0];
  const depCell = cells[1];
  const arrCell = cells[2];
  const durationCell = cells[3];
  const equipmentCell = cells[4];
  const stopsCell = cells[5];
  const classCell = cells[8];

  const airlineFromTitle =
    flightCell.getAttribute('title')?.match(/Operado por\s+([A-Z0-9]+)\s*\/\s*(.+)/i) || null;
  const airlineCode =
    airlineFromTitle?.[1] ||
    airlineCodeFromImg(flightCell.querySelector('img')?.getAttribute('src')) ||
    undefined;
  const airlineName = airlineFromTitle?.[2]?.trim() || airlineCode;
  const flightNumRaw = (flightCell.textContent || '').replace(/\s+/g, ' ').trim();
  const flightNumber = flightNumRaw
    ? airlineCode && !flightNumRaw.startsWith(airlineCode)
      ? `${airlineCode}${flightNumRaw}`
      : flightNumRaw
    : undefined;

  const dep = parseEndpointCell(depCell, dateFromId);
  const arr = parseEndpointCell(arrCell, dateFromId);
  const cabinRaw = (classCell?.innerHTML || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const cabin = cabinRaw.replace(/\s+/g, ' ').trim() || undefined;
  const stopsHint = parseStops(stopsCell?.textContent || '');

  return {
    legIndex,
    dateIso: dateFromId || dep.date || undefined,
    stopsHint,
    segment: {
      airlineCode,
      airlineName,
      flightNumber,
      equipment: (equipmentCell?.textContent || '').trim() || undefined,
      cabin,
      duration: (durationCell?.textContent || '').replace(/\s+/g, '').trim() || undefined,
      departure: dep,
      arrival: arr,
    },
  };
}

function parseEndpointCell(
  cell: Element | undefined,
  fallbackDate?: string
): FlightSegment['departure'] {
  if (!cell) {
    return { airportCode: '', date: fallbackDate || '', hour: '' };
  }
  const strong = cell.querySelector('strong');
  const title = strong?.getAttribute('title') || '';
  // "José María Cordova / Medellín"
  const titleParts = title.split('/').map((s) => s.trim());
  const cityName =
    titleParts.length > 1 ? titleParts[titleParts.length - 1] : strong?.childNodes[0]?.textContent?.trim();

  const codeMatch = (strong?.innerHTML || cell.innerHTML).match(/<br\s*\/?>\s*([A-Z]{3})\b/i);
  const airportCode =
    codeMatch?.[1]?.toUpperCase() ||
    (strong?.textContent || '').match(/\b([A-Z]{3})\b/)?.[1] ||
    '';

  const dateLabel = cell.querySelector('.date')?.textContent?.trim() || '';
  const hour = cell.querySelector('.time')?.textContent?.trim() || '';
  const date = parseSpanishDateLabel(dateLabel, fallbackDate) || fallbackDate || '';

  return {
    airportCode,
    airportName: titleParts[0] || undefined,
    cityName: cityName || undefined,
    date,
    hour,
  };
}

function parseSpanishDateLabel(label: string, fallbackIso?: string): string | undefined {
  // "Jue, 16 Jul" or "Jue, 16 Jul 2026"
  const m = label.match(/(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]{3,})(?:\s+(\d{4}))?/);
  if (!m) return fallbackIso;
  const day = Number(m[1]);
  const monKey = m[2]
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .slice(0, 3)
    .toLowerCase();
  const month = MONTHS[monKey];
  if (!month) return fallbackIso;
  const year = m[3]
    ? Number(m[3])
    : fallbackIso
      ? Number(fallbackIso.slice(0, 4))
      : new Date().getFullYear();
  return `${year}-${pad(month)}-${pad(day)}`;
}

function isoFromYyyymmdd(s: string): string | undefined {
  if (!/^\d{8}$/.test(s)) return undefined;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function airlineCodeFromImg(src: string | null | undefined): string | undefined {
  if (!src) return undefined;
  const m = src.match(/\/([a-z0-9]{2})\.png/i);
  return m?.[1]?.toUpperCase();
}

function parseStops(text: string): number {
  const m = text.replace(/\s+/g, ' ').trim().match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

function readPaxCounts(root: Element): { adults: number; children: number; infants: number } {
  let adults = 0;
  let children = 0;
  let infants = 0;

  for (const td of Array.from(root.querySelectorAll('td[title^="PTC:"]'))) {
    const ptc = (td.getAttribute('title') || '').replace(/^PTC:\s*/i, '').toUpperCase();
    const qtyTd = td.parentElement?.querySelectorAll('td')[1];
    const qty = parseInt(qtyTd?.textContent?.trim() || '0', 10) || 0;
    if (ptc === 'ADT') adults += qty;
    else if (ptc === 'CHD' || ptc === 'CNN') children += qty;
    else if (ptc === 'INF' || ptc === 'INFT') infants += qty;
  }

  if (adults === 0 && children === 0 && infants === 0) {
    adults = 1;
  }
  return { adults, children, infants };
}

function buildTripId(legs: FlightLeg[], price: number, currency: string): string {
  const parts = legs.flatMap((leg) =>
    leg.segments.map(
      (s) =>
        `${s.flightNumber || 'XX'}_${s.departure.airportCode}${s.arrival.airportCode}_${s.departure.date}_${s.departure.hour}`
    )
  );
  return `xnet_${parts.join('__')}_${currency}_${price}`.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function parseMoney(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return 0;
  // "1,135,200.00" (US/CO thousands) vs "1.135.200,00"
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')) {
      return Number(cleaned.replace(/,/g, '')) || 0;
    }
    return Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (cleaned.includes(',')) {
    // either thousands or decimal
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      return Number(parts[0].replace(/\./g, '') + '.' + parts[1]) || 0;
    }
    return Number(cleaned.replace(/,/g, '')) || 0;
  }
  return Number(cleaned) || 0;
}

function textOf(el: Element | null): string {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function sumDurations(parts: Array<string | undefined>): string | undefined {
  let totalMin = 0;
  let any = false;
  for (const p of parts) {
    if (!p) continue;
    const m = p.match(/(?:(\d+)\s*h)?\s*:?\s*(\d+)\s*m?/i) || p.match(/(\d+)h:?(\d+)m?/i);
    if (!m) continue;
    any = true;
    totalMin += (Number(m[1] || 0) || 0) * 60 + (Number(m[2] || 0) || 0);
  }
  if (!any) return undefined;
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return `${h}h:${String(min).padStart(2, '0')}m`;
}
