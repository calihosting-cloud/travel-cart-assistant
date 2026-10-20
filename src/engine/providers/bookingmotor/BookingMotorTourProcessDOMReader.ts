import { DOMReader, DOMTourOccupancyRates, DOMTourQuoteData, DOMTourRoomSelection } from '../../core/DOMReader';

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const ROOM_LABELS: Record<string, string> = {
  SGL: 'Individual',
  DBL: 'Doble',
  TPL: 'Triple',
  QDP: 'Cuádruple',
  QUAD: 'Cuádruple',
};

/**
 * Reads the configured quote on BookingMotor `/tour-process/` (Pasos 1–4):
 * departure date (`#dateOutput`), room mix + ages, and Paso 4 total.
 */
export class BookingMotorTourProcessDOMReader extends DOMReader<DOMTourQuoteData> {
  extractAll(container: Document | HTMLElement): DOMTourQuoteData[] {
    const quote = this.extractQuote(container);
    return quote ? [quote] : [];
  }

  extractQuote(container: Document | HTMLElement): DOMTourQuoteData | null {
    const root = container.ownerDocument || (container as Document);
    const doc = root.documentElement ? (root as Document) : document;

    if (!doc.querySelector('.bm-book-process, #bodyContainer.bm-content-tour')) {
      return null;
    }

    const name =
      doc.querySelector('h1.product-name, h1.title-tours, h1')?.textContent?.replace(/\s+/g, ' ').trim() ||
      '';
    if (!name) return null;

    const tourId = this.extractTourId(doc);
    if (!tourId) return null;

    const isBloqueo = /bloqueo/i.test(name);
    const isCombinado = /combinado/i.test(name);

    const departureLabel =
      doc.querySelector('#dateOutput')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const departureDate =
      this.parseSpanishDateToDdMmYyyy(departureLabel) ||
      this.parseItineraryDayToDdMmYyyy(this.firstItineraryDay(doc)) ||
      '';
    if (!departureDate) return null;

    const occupancyRates = this.parseOccupancyRates(doc);
    const rooms = this.parseRooms(doc, occupancyRates);
    const ages = this.parseAges(doc);
    const { adults, children, infants, payingPax } = this.classifyAges(ages, rooms);
    if (payingPax < 1 && rooms.every((r) => r.rooms === 0)) return null;

    const totalParsed = this.parseTotal(doc);
    let price = totalParsed.price;
    let currency = totalParsed.currency;
    let priceEstimated = false;

    if (!(price > 0) && occupancyRates) {
      const estimated = this.estimateTotalFromRates(rooms, occupancyRates);
      if (estimated.price > 0) {
        price = estimated.price;
        currency = occupancyRates.currency || currency;
        priceEstimated = true;
      }
    }

    if (!(price > 0)) return null;

    const effectivePaying =
      payingPax > 0 ? payingPax : rooms.reduce((s, r) => s + r.rooms * r.paxPerRoom, 0);
    if (effectivePaying < 1) return null;

    const pricePerPerson = this.resolvePricePerPerson(
      price,
      effectivePaying,
      occupancyRates,
      isCombinado,
      isBloqueo
    );

    const days = this.parseDays(doc);
    const nights = days && days > 0 ? days - 1 : undefined;
    const returnDate =
      this.parseItineraryDayToDdMmYyyy(this.lastItineraryDay(doc)) ||
      (days && days > 1 ? this.addDaysDdMmYyyy(departureDate, days - 1) : departureDate);
    const returnLabel = returnDate
      ? this.formatSpanishLongFromDdMmYyyy(returnDate) || undefined
      : undefined;

    const route = this.parseRouteFromName(name, isCombinado);
    const roomsSummary = rooms
      .filter((r) => r.rooms > 0)
      .map((r) => `${r.rooms} ${r.code}`)
      .join(' + ');
    const baggageNote = this.parseBaggageNote(doc);

    return {
      tourId,
      name,
      isBloqueo,
      isCombinado,
      originCity: route.origin,
      destinationCity: route.destination,
      departureDate,
      returnDate: returnDate || undefined,
      departureLabel: departureLabel || undefined,
      returnLabel,
      days,
      nights,
      adults: adults || effectivePaying,
      children,
      infants,
      payingPax: effectivePaying,
      roomsSummary: roomsSummary || undefined,
      rooms,
      // Bloqueo: keep Individual (sgl) as $/pp; DBL/TPL/QDP cells are room totals — omit those.
      occupancyRates: isBloqueo
        ? occupancyRates?.sgl
          ? { currency: occupancyRates.currency, sgl: occupancyRates.sgl }
          : undefined
        : occupancyRates,
      price,
      pricePerPerson,
      currency,
      priceEstimated: priceEstimated || undefined,
      category: this.parseCategory(doc),
      baggageNote,
      bookingUrl: typeof location !== 'undefined' ? location.href : undefined,
    };
  }

  private extractTourId(doc: Document): string | null {
    const win = doc.defaultView;
    const path =
      (win && 'location' in win ? win.location?.pathname : '') ||
      (typeof location !== 'undefined' ? location.pathname : '');
    const fromPath = path.match(/\/tour-process\/[^/]+\/([^/?#]+)/i);
    if (fromPath?.[1]) return fromPath[1];

    const detail = doc.querySelector(
      'a[href*="/backoffice/tour/"][href$=".html"], a[href*="tour/"][href$=".html"]'
    ) as HTMLAnchorElement | null;
    const fromHref = detail?.href?.match(/-([a-z0-9]+)\.html/i);
    return fromHref?.[1] || null;
  }

  private parseRooms(
    doc: Document,
    rates?: DOMTourOccupancyRates | null
  ): DOMTourRoomSelection[] {
    const out: DOMTourRoomSelection[] = [];
    const selects = doc.querySelectorAll<HTMLSelectElement>('select[id^="roomSelected-"]');
    for (const sel of selects) {
      const code = (sel.getAttribute('code') || sel.id.replace(/^roomSelected-/i, '')).toUpperCase();
      const paxPerRoom = Number(sel.getAttribute('numpax')) || this.defaultPaxForCode(code);
      const rooms = Number(sel.value) || 0;
      const pricePerPerson = this.rateForCode(rates, code);
      out.push({
        code,
        label: ROOM_LABELS[code] || code,
        rooms,
        paxPerRoom,
        pricePerPerson,
      });
    }
    return out;
  }

  private rateForCode(rates: DOMTourOccupancyRates | null | undefined, code: string): number | undefined {
    if (!rates) return undefined;
    const key = code.toLowerCase();
    if (key === 'sgl') return rates.sgl;
    if (key === 'dbl') return rates.dbl;
    if (key === 'tpl') return rates.tpl;
    if (key === 'qdp' || key === 'quad') return rates.qdp;
    return undefined;
  }

  /**
   * Paso 2 price row: cells aligned with thead (Individual / Doble / Triple / …).
   * BM labels them “Precios por Persona”.
   */
  private parseOccupancyRates(doc: Document): DOMTourOccupancyRates | undefined {
    const table = Array.from(doc.querySelectorAll('table')).find((t) =>
      t.querySelector('select[id^="roomSelected-"]')
    );
    if (!table) return undefined;

    const heads = Array.from(table.querySelectorAll('thead th')).map((th) =>
      th.textContent?.replace(/\s+/g, ' ').trim().toLowerCase()
    );
    const priceRow = table.querySelector('tbody tr.bg-white, tbody tr');
    if (!priceRow || heads.length === 0) return undefined;

    const cells = Array.from(priceRow.children);
    const rates: DOMTourOccupancyRates = { currency: 'USD' };
    let found = false;

    for (let i = 0; i < heads.length && i < cells.length; i++) {
      const head = heads[i] || '';
      const text = cells[i].textContent?.replace(/\s+/g, ' ').trim() || '';
      const m = text.match(/([A-Z]{3})\s*([\d.,]+)/i);
      if (!m) continue;
      const currency = m[1].toUpperCase();
      const amount = this.parseAmount(m[2]);
      if (!(amount > 0)) continue;
      rates.currency = currency;
      found = true;
      if (/individual|single|sgl/.test(head)) rates.sgl = amount;
      else if (/doble|double|dbl/.test(head)) rates.dbl = amount;
      else if (/triple|tpl/.test(head)) rates.tpl = amount;
      else if (/quadruple|cu[aá]druple|qdp|quad/.test(head)) rates.qdp = amount;
    }

    return found ? rates : undefined;
  }

  private estimateTotalFromRates(
    rooms: DOMTourRoomSelection[],
    rates: DOMTourOccupancyRates
  ): { price: number } {
    let price = 0;
    for (const room of rooms) {
      if (room.rooms <= 0) continue;
      const pp = room.pricePerPerson ?? this.rateForCode(rates, room.code);
      if (!(pp && pp > 0)) continue;
      price += room.rooms * room.paxPerRoom * pp;
    }
    return { price };
  }

  private resolvePricePerPerson(
    total: number,
    payingPax: number,
    rates: DOMTourOccupancyRates | undefined,
    isCombinado: boolean,
    isBloqueo = false
  ): number {
    // Seat block: Individual from paso 2 is the true $/persona (not total÷rooms pax).
    if (isBloqueo) {
      if (rates?.sgl && rates.sgl > 0) return rates.sgl;
      return payingPax > 0 ? total / payingPax : total;
    }
    if (!isCombinado) {
      return payingPax > 0 ? total / payingPax : total;
    }
    if (rates) {
      if (rates.dbl && rates.dbl > 0) return rates.dbl;
      if (rates.tpl && rates.tpl > 0) return rates.tpl;
      if (rates.sgl && rates.sgl > 0) return rates.sgl;
      if (rates.qdp && rates.qdp > 0) return rates.qdp;
    }
    return payingPax > 0 ? total / payingPax : total;
  }

  private defaultPaxForCode(code: string): number {
    if (code === 'SGL') return 1;
    if (code === 'DBL') return 2;
    if (code === 'TPL') return 3;
    if (code === 'QDP' || code === 'QUAD') return 4;
    return 1;
  }

  private parseAges(doc: Document): number[] {
    const inputs = doc.querySelectorAll<HTMLInputElement>('input.form-control.age, input[name*="[age]"]');
    const ages: number[] = [];
    for (const input of inputs) {
      const n = Number(String(input.value).replace(',', '.'));
      if (Number.isFinite(n) && n >= 0) ages.push(n);
    }
    return ages;
  }

  private classifyAges(
    ages: number[],
    rooms: DOMTourRoomSelection[]
  ): { adults: number; children: number; infants: number; payingPax: number } {
    let adults = 0;
    let children = 0;
    let infants = 0;

    if (ages.length > 0) {
      for (const age of ages) {
        if (age < 2) infants++;
        else if (age < 12) children++;
        else adults++;
      }
    } else {
      const seats = rooms.reduce((sum, r) => sum + r.rooms * r.paxPerRoom, 0);
      adults = seats;
    }

    const payingPax = adults + children;
    return { adults, children, infants, payingPax: Math.max(0, payingPax) };
  }

  private parseTotal(doc: Document): { price: number; currency: string } {
    const bodyText = doc.body?.innerText || '';
    const currencyMatch = bodyText.match(/precio de su viaje es en\s*\(([A-Z]{3})\)/i);
    let currency = (currencyMatch?.[1] || 'COP').toUpperCase();

    const detail = doc.querySelector('#quotationDetail');
    if (detail) {
      const rows = Array.from(detail.querySelectorAll('tr'));
      for (const row of rows) {
        const label = row.querySelector('td')?.textContent?.replace(/\s+/g, ' ').trim() || '';
        if (!/^Total/i.test(label)) continue;
        const curInLabel = label.match(/\(([A-Z]{3})\)/i);
        if (curInLabel) currency = curInLabel[1].toUpperCase();
        const amountCell = row.querySelectorAll('td')[1];
        const raw = amountCell?.textContent?.replace(/\s+/g, ' ').trim() || '';
        const price = this.parseAmount(raw);
        if (price > 0) return { price, currency };
      }
    }

    const fallback = bodyText.match(/Total\s*(?:\([A-Z]{3}\))?\s*([\d.,]+)/i);
    return { price: fallback ? this.parseAmount(fallback[1]) : 0, currency };
  }

  private parseAmount(raw: string): number {
    const cleaned = raw.replace(/[^\d.,]/g, '');
    if (!cleaned) return 0;
    // BM uses 6,489,546.94 (comma thousands, dot decimal) or 1620824
    if (cleaned.includes('.') && cleaned.includes(',')) {
      return parseFloat(cleaned.replace(/,/g, '')) || 0;
    }
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      const parts = cleaned.split(',');
      if (parts[parts.length - 1].length === 2) {
        return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
      }
      return parseFloat(cleaned.replace(/,/g, '')) || 0;
    }
    return parseFloat(cleaned) || 0;
  }

  private parseDays(doc: Document): number | undefined {
    const top = doc.querySelector('#tourDataBlock, .top-info')?.textContent || '';
    const m = top.match(/(\d+)\s*d[ií]as?/i);
    if (m) return Number(m[1]);
    const body = doc.body?.innerText || '';
    const m2 = body.match(/(\d+)\s*d[ií]as?/i);
    return m2 ? Number(m2[1]) : undefined;
  }

  private parseCategory(doc: Document): string | undefined {
    const panel = doc.querySelector('.panel.panel-process.panel-selected') as HTMLElement | null;
    const text = panel?.innerText?.replace(/\s+/g, ' ') || '';
    const m = text.match(/Categor[ií]a\s+(.+?)\s+Estado/i);
    return m?.[1]?.trim() || undefined;
  }

  /** Personal item / cabin bag from BM category options (bloqueo). */
  private parseBaggageNote(doc: Document): string | undefined {
    const selected = doc.querySelector(
      '#dateOutBlock.panel-selected, .panel.panel-process.panel-selected'
    ) as HTMLElement | null;
    const scope = selected || doc;
    const opt =
      scope.querySelector('select option:checked') ||
      scope.querySelector('select option[selected]') ||
      doc.querySelector('#dateOutBlock select option:checked') ||
      doc.querySelector('#dateOutBlock select option[selected]');
    const fromOpt = (opt?.textContent || '').replace(/\s+/g, ' ').trim();
    if (/art[ií]culo\s+personal|maleta|kg|cabin|carry/i.test(fromOpt)) {
      return fromOpt;
    }
    const cat = this.parseCategory(doc);
    if (cat && /art[ií]culo\s+personal|maleta|kg/i.test(cat)) return cat.trim();
    // Fallback: first personal-item option on the page (typical bloqueo fare).
    const any = Array.from(doc.querySelectorAll('option')).find((o) =>
      /art[ií]culo\s+personal/i.test(o.textContent || '')
    );
    const t = (any?.textContent || '').replace(/\s+/g, ' ').trim();
    return t || undefined;
  }

  private formatSpanishLongFromDdMmYyyy(ddMmYyyy: string): string | null {
    const m = ddMmYyyy.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    const weekdays = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return `${weekdays[d.getDay()]}, ${day} ${months[month - 1]} ${year}`;
  }

  private firstItineraryDay(doc: Document): string {
    const days = Array.from(doc.querySelectorAll('h5'))
      .map((h) => h.textContent?.replace(/\s+/g, ' ').trim() || '')
      .filter((t) => /^Dia\s*\d/i.test(t));
    return days[0] || '';
  }

  private lastItineraryDay(doc: Document): string {
    const days = Array.from(doc.querySelectorAll('h5'))
      .map((h) => h.textContent?.replace(/\s+/g, ' ').trim() || '')
      .filter((t) => /^Dia\s*\d/i.test(t));
    return days[days.length - 1] || '';
  }

  private stripAccents(s: string): string {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /** "Jueves, 1 octubre 2026" → DD-MM-YYYY */
  parseSpanishDateToDdMmYyyy(label: string): string | null {
    const m = label.match(/(\d{1,2})\s+([a-záéíóúñ]+)\s+(\d{4})/i);
    if (!m) return null;
    const day = Number(m[1]);
    const month = MONTHS[this.stripAccents(m[2].toLowerCase())];
    const year = Number(m[3]);
    if (!month || !(day >= 1 && day <= 31)) return null;
    return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
  }

  /** "Dia 1, jue. 1 oct. 2026: ..." → DD-MM-YYYY */
  parseItineraryDayToDdMmYyyy(label: string): string | null {
    const m = label.match(/(\d{1,2})\s+([a-záéíóúñ]{3})\.?\s+(\d{4})/i);
    if (!m) return null;
    const abbr = this.stripAccents(m[2].toLowerCase());
    const monthEntry = Object.entries(MONTHS).find(([name]) => name.startsWith(abbr));
    if (!monthEntry) return null;
    const day = Number(m[1]);
    const month = monthEntry[1];
    const year = Number(m[3]);
    return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
  }

  private addDaysDdMmYyyy(ddMmYyyy: string, days: number): string | null {
    const m = ddMmYyyy.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) return null;
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    d.setDate(d.getDate() + days);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  }

  private parseRouteFromName(
    name: string,
    isCombinado = false
  ): { origin?: string; destination?: string } {
    if (isCombinado) {
      // "COMBINADO … RIU … PANAMÁ" → destination city hint
      if (/panam/i.test(name)) return { destination: 'Panamá' };
      if (/cartagena/i.test(name)) return { destination: 'Cartagena' };
      if (/san\s*andr/i.test(name)) return { destination: 'San Andrés' };
      if (/canc[uú]n/i.test(name)) return { destination: 'Cancún' };
      if (/aruba/i.test(name)) return { destination: 'Aruba' };
      if (/punt[ao]\s*cana/i.test(name)) return { destination: 'Punta Cana' };
      return {};
    }

    let rest = name
      .replace(/^BLOQUEO\s+/i, '')
      .replace(/\s*-\s*\d+\s*NOCHES?\s*$/i, '')
      .trim();
    rest = rest.replace(/^(JETSMART|WINGO|AVIANCA|ARAJET|LATAM|TURKISH)\s*/i, '').trim();
    rest = rest.replace(/^-\s*/, '').trim();

    const parts = rest
      .split(/\s*-\s*/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return { origin: this.titleCase(parts[0]), destination: this.titleCase(parts[parts.length - 1]) };
    }
    return {};
  }

  private titleCase(s: string): string {
    return s
      .toLowerCase()
      .split(/\s+/)
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  }
}
