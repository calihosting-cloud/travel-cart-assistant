import {
  ActivityCartItem,
  CartItem,
  FlightCartItem,
  HotelCartItem,
  InsuranceCartItem,
  TourCartItem,
  TransferCartItem,
} from '../engine/core/types';
import { compareOptionTotals, formatCartPrice, getItemBasePrice } from '../shared/cartEngine';
import { formatAdvisorQuoteRef } from '../shared/quoteHistory';
import {
  occupancyRatesStatus,
  displayHotelBoardBasis,
  displayHotelRoomType,
  packageTierPrices,
  wholesaleServiceShares,
  optionKitPersonRates,
  wholesaleFeePax,
  sumPackageTier,
  occupancyTierAgencyLabel,
  summarizeWholesaleOption,
  type OccupancyTierRates,
} from '../shared/occupancyRates';
import { nightsFromTripDates, paxFromBriefingContext } from '../shared/tripGuide';
import {
  formatQuoteDate,
  formatFlightLegLine,
  flightBaggageForDirection,
  QuoteBuildInput,
  resolveQuotePaxBreakdown,
  formatQuotePaxBreakdown,
  quotePayingPax,
} from './QuoteBuilder';
import {
  transfersForHotel,
  collectComboToursFromItems,
  collectTourLabelsFromItems,
  parseComboTransferName,
} from '../shared/hotelTransferKit';
import { formatBloqueoItineraryLines } from '../shared/tourBloqueo';
import {
  wholesaleTotalFromPlan,
  formatRoomPlanSummary,
  formatWholesaleClientTotalLead,
  normalizeRoomPlan,
  formatBriefingPaxCompact,
  hasAccommodationPlan,
  type BriefingRoom,
} from '../shared/roomPlan';
import { mainCityLabel } from '../shared/mainCity';
import { airlineCodesFromFlights, resolveAirlineLogos, flightPrimaryAirlineCode } from '../shared/airlineLogos';
import { DEFAULT_QUOTE_MODE } from '../shared/quoteMode';

/** chrome.storage.local key for the HTML handed to the print tab. */
export const QUOTE_PDF_HTML_KEY = 'tce_quote_pdf_html';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseDdMmYyyy(s?: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function parseIsoDate(s?: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatDayMonth(d: Date, withYear = false): string {
  const base = `${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`;
  return withYear ? `${base} de ${d.getFullYear()}` : base;
}

/** e.g. "19 al 23 de octubre de 2026". */
function formatTravelDates(from?: Date | null, to?: Date | null): string {
  if (!from) return '';
  if (!to) return formatDayMonth(from, true);
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${from.getDate()} al ${to.getDate()} de ${MONTHS_ES[from.getMonth()]} de ${from.getFullYear()}`;
  }
  if (from.getFullYear() === to.getFullYear()) {
    return `${from.getDate()} de ${MONTHS_ES[from.getMonth()]} al ${to.getDate()} de ${MONTHS_ES[to.getMonth()]} de ${from.getFullYear()}`;
  }
  return `${formatDayMonth(from, true)} al ${formatDayMonth(to, true)}`;
}

function resolveDestination(input: QuoteBuildInput): string {
  if (input.destinationOverride?.trim()) {
    return mainCityLabel(input.destinationOverride) || input.destinationOverride.trim();
  }
  const ctx = input.searchContext;
  if (ctx?.destinationText?.trim()) {
    const city = mainCityLabel(ctx.destinationText);
    if (city) return city;
  }
  const tour = input.items.find((i): i is TourCartItem => i.type === 'tour');
  if (tour?.destinationCity) return mainCityLabel(tour.destinationCity) || tour.destinationCity;
  const flight = input.items.find((i): i is FlightCartItem => i.type === 'flight');
  if (flight) {
    const name = flight.destination.name || flight.destination.code || flight.title;
    return mainCityLabel(name) || name;
  }
  return '';
}

function resolveOrigin(input: QuoteBuildInput): string {
  const flight = input.items.find((i): i is FlightCartItem => i.type === 'flight');
  if (flight) {
    const fromLeg = flight.legs.find((l) => l.direction === 'outbound');
    const city = fromLeg?.segments[0]?.departure?.cityName;
    if (city?.trim()) return mainCityLabel(city) || city.trim();
    if (flight.origin?.name?.trim()) return mainCityLabel(flight.origin.name) || flight.origin.name.trim();
    if (flight.origin?.code) return flight.origin.code;
  }
  const tour = input.items.find((i): i is TourCartItem => i.type === 'tour');
  if (tour?.originCity?.trim()) return mainCityLabel(tour.originCity) || tour.originCity.trim();
  return '';
}

function shortPlace(s: string): string {
  return mainCityLabel(s) || (s.split(',')[0] || s).trim();
}

function isIataCode(s: string): boolean {
  return /^[A-Z]{3}$/.test(s.trim());
}

/** City names for PDF title — prefer briefing text over airport codes (BOG/CTG). */
function resolveTitleRoute(input: QuoteBuildInput): string {
  const ctx = input.searchContext;
  const flight = input.items.find((i): i is FlightCartItem => i.type === 'flight');

  let origin =
    mainCityLabel(ctx?.originText) ||
    resolveOrigin(input);
  let dest =
    mainCityLabel(ctx?.destinationText) ||
    resolveDestination(input);

  if (flight) {
    const outLeg = flight.legs.find((l) => l.direction === 'outbound');
    const segOrigin = outLeg?.segments[0]?.departure?.cityName;
    const segDest = outLeg?.segments[outLeg.segments.length - 1]?.arrival?.cityName;
    if (isIataCode(origin) && segOrigin?.trim()) origin = mainCityLabel(segOrigin) || segOrigin.trim();
    if (isIataCode(dest) && segDest?.trim()) dest = mainCityLabel(segDest) || segDest.trim();
    if (isIataCode(origin) && flight.origin?.name?.trim()) {
      origin = mainCityLabel(flight.origin.name) || flight.origin.name.trim();
    }
    if (isIataCode(dest) && flight.destination?.name?.trim()) {
      dest = mainCityLabel(flight.destination.name) || flight.destination.name.trim();
    }
  }

  if (origin && dest) return `${origin} ${dest}`;
  return dest || origin || '';
}

function buildPdfHeadline(
  input: QuoteBuildInput,
  travelDates: string,
  nights: number
): string {
  const route = resolveTitleRoute(input);
  const bits: string[] = [route || 'Cotización'];
  bits.push(`Viaje: ${travelDates}`);
  if (nights > 0) bits.push(`${nights} noche${nights !== 1 ? 's' : ''}`);
  if (hasAccommodationPlan(input.searchContext)) {
    const pax = formatBriefingPaxCompact(input.searchContext);
    if (pax) bits.push(pax);
  }
  return bits.join(' · ');
}

function resolveDateRange(input: QuoteBuildInput): { from: Date | null; to: Date | null } {
  const ctx = input.searchContext;
  const fromCtx = parseDdMmYyyy(ctx?.checkIn);
  const toCtx = parseDdMmYyyy(ctx?.checkOut);
  if (fromCtx) return { from: fromCtx, to: toCtx };

  const hotel = input.items.find((i): i is HotelCartItem => i.type === 'hotel');
  if (hotel) {
    return { from: parseDdMmYyyy(hotel.checkIn), to: parseDdMmYyyy(hotel.checkOut) };
  }
  const tour = input.items.find((i): i is TourCartItem => i.type === 'tour');
  if (tour) {
    return {
      from: parseDdMmYyyy(tour.departureDate),
      to: parseDdMmYyyy(tour.returnDate) || parseDdMmYyyy(tour.departureDate),
    };
  }
  const flight = input.items.find((i): i is FlightCartItem => i.type === 'flight');
  if (flight) {
    return {
      from: parseIsoDate(flight.departureDate),
      to: parseIsoDate(flight.returnDate) || parseIsoDate(flight.departureDate),
    };
  }
  return { from: null, to: null };
}

function starsLabel(n?: number): string {
  if (!n || n <= 0) return '';
  return ` (${n}★)`;
}

function occupancyLabel(hotel: HotelCartItem): string {
  const adults = hotel.occupancy.reduce((s, o) => s + (o.adults || 0), 0);
  const children = hotel.occupancy.reduce((s, o) => s + (o.children || 0), 0);
  return `Adultos ${adults}, Niños ${children}`;
}

function flightLegLine(flight: FlightCartItem, direction: 'outbound' | 'return'): string {
  return formatFlightLegLine(flight, direction);
}

type HotelColumn = {
  index: number;
  label: string;
  hotels: HotelCartItem[];
  /** Compare-option id when hotelsAsOptions / wholesale groups. */
  optionId?: string;
  total?: number;
  perPerson?: number;
  /** Wholesale package tier prices (shared services pp + hotel tier). */
  sglPp?: number;
  dblPp?: number;
  tplPp?: number;
  qplPp?: number;
  chd?: number;
  childEqualsAdult?: boolean;
  currency?: string;
  /** Mix total without flights/bloqueos — commission base. */
  commissionableGroupTotal?: number;
};

function resolvePayingPax(input: QuoteBuildInput): number {
  const fromBrief = paxFromBriefingContext(input.searchContext);
  if (fromBrief) return Math.max(1, fromBrief.adults + fromBrief.children);
  for (const item of input.items) {
    if (item.type === 'flight') {
      const n = item.adults + item.children;
      if (n > 0) return n;
    }
  }
  if (input.quoteMode !== 'wholesale') {
    for (const item of input.items) {
      if (item.type === 'hotel') {
        const n = item.occupancy.reduce((s, o) => s + o.adults + o.children, 0);
        if (n > 0) return n;
      }
    }
  }
  return 1;
}

function linkedTransferIdSet(items: CartItem[]): Set<string> {
  const hotels = items.filter((i): i is HotelCartItem => i.type === 'hotel');
  const transfers = items.filter((i): i is TransferCartItem => i.type === 'transfer');
  const ids = new Set<string>();
  for (const hotel of hotels) {
    for (const t of transfersForHotel(hotel, transfers)) ids.add(t.id);
  }
  return ids;
}

function wholesaleSharesForColumn(
  input: QuoteBuildInput,
  hotels: HotelCartItem[]
): { adultShare: number; childShare: number } {
  const itemTotals = input.itemTotals || {};
  const linePrice = (item: CartItem) => itemTotals[item.id] || 0;
  const pax = resolvePayingPax(input);
  const taUnit = input.taUnit || 0;
  const feesMayorRedondeo =
    input.quoteMode === 'wholesale'
      ? 0
      : Math.max(0, (input.feesTotal || 0) - taUnit * pax);
  const feePax = wholesaleFeePax(pax, input.searchContext?.roomPlan);
  const shared = wholesaleServiceShares(
    hotels,
    input.items,
    linePrice,
    feesMayorRedondeo,
    feePax,
    taUnit
  );
  const kit = optionKitPersonRates(hotels, input.items, linePrice);
  return { adultShare: shared.adultShare + kit.adult, childShare: shared.childShare + kit.child };
}

function buildHotelColumns(input: QuoteBuildInput): HotelColumn[] {
  const hotels = input.items.filter((i): i is HotelCartItem => i.type === 'hotel');
  const byId = new Map(hotels.map((h) => [h.id, h]));
  const currency = input.primaryCurrency || 'COP';
  const wholesale = input.quoteMode === 'wholesale';
  const asOptions = wholesale || input.hotelsAsOptions;

  const attachWholesale = (col: HotelColumn): HotelColumn => {
    if (!wholesale || col.hotels.length === 0) return col;
    const itemTotals = input.itemTotals || {};
    const linePrice = (item: CartItem) => itemTotals[item.id] || 0;
    const pax = resolvePayingPax(input);
    const taUnit = input.taUnit || 0;
    const effTrm = input.trmEff && input.trmEff > 0
      ? input.trmEff
      : input.trmDia && input.trmDia > 0
        ? input.trmDia
        : input.trm && input.trm > 0
          ? input.trm
          : 0;
    const trmDia =
      input.trmDia && input.trmDia > 0
        ? input.trmDia
        : input.trm && input.trm > 0
          ? input.trm
          : undefined;
    const displayCur = (currency === 'USD' ? 'USD' : 'COP') as 'USD' | 'COP';
    const baseLinePrice = (item: CartItem) =>
      getItemBasePrice(item, displayCur, effTrm, trmDia).price;
    const optionId = col.optionId || col.hotels[0]?.id;
    const roundCharmNine =
      input.autoRoundOccupancy !== false ||
      (!!optionId && (input.manualPackageRoundIds || []).includes(optionId));
    const feesMayorRedondeo =
      input.feesMayorRedondeo != null && Number.isFinite(input.feesMayorRedondeo)
        ? Math.max(0, input.feesMayorRedondeo)
        : Math.max(0, (input.feesTotal || 0) - taUnit * Math.max(1, pax));
    const sum = summarizeWholesaleOption(
      col.hotels,
      input.items,
      feesMayorRedondeo,
      pax,
      input.searchContext?.roomPlan,
      linePrice,
      taUnit,
      baseLinePrice,
      { displayCurrency: currency, effTrm, trmDia, roundCharmNine }
    );
    return {
      ...col,
      sglPp: sum.combined.sglPp,
      dblPp: sum.combined.dblPp,
      tplPp: sum.combined.tplPp,
      qplPp: sum.combined.qplPp,
      chd: sum.combined.chd,
      childEqualsAdult: sum.combined.childEqualsAdult,
      currency: sum.currency || currency,
      commissionableGroupTotal: sum.commissionableGroupTotal,
    };
  };

  if (asOptions && input.hotelOptionGroups && input.hotelOptionGroups.length > 0) {
    const opts = compareOptionTotals(
      input.items,
      input.hotelOptionGroups,
      input.feesTotal,
      currency === 'USD' ? 'USD' : 'COP',
      input.trmEff && input.trmEff > 0
        ? input.trmEff
        : input.trmDia && input.trmDia > 0
          ? input.trmDia
          : input.trm && input.trm > 0
            ? input.trm
            : 0
    );
    const cols: HotelColumn[] = [];
    input.hotelOptionGroups.forEach((g, idx) => {
      const groupHotels = g.hotelIds
        .map((id) => byId.get(id))
        .filter((h): h is HotelCartItem => !!h);
      if (groupHotels.length === 0) return;
      const opt = opts[idx];
      cols.push(
        attachWholesale({
          index: idx + 1,
          label: `Opción ${idx + 1}`,
          hotels: groupHotels,
          optionId: g.id,
          total: wholesale ? undefined : opt?.total,
          perPerson: wholesale ? undefined : opt?.perPerson,
        })
      );
    });
    return cols;
  }

  if (asOptions) {
    return hotels.map((h, idx) =>
      attachWholesale({
        index: idx + 1,
        label: `Opción ${idx + 1}`,
        hotels: [h],
        optionId: h.id,
      })
    );
  }

  return hotels.map((h, idx) => ({
    index: idx + 1,
    label: hotels.length > 1 ? `Hotel ${idx + 1}` : 'Hotel',
    hotels: [h],
  }));
}

function mapBounds(points: Array<{ lat: number; lng: number }>): {
  centerLat: number;
  centerLng: number;
  latSpan: number;
  lngSpan: number;
} {
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  const latSpan = Math.max((maxLat - minLat) * 1.6, 0.04);
  const lngSpan = Math.max((maxLng - minLng) * 1.6, 0.04);
  return {
    centerLat: (minLat + maxLat) / 2,
    centerLng: (minLng + maxLng) / 2,
    latSpan,
    lngSpan,
  };
}

/**
 * Fill missing hotel lat/lng from BookingMotor hidden inputs on the current page
 * (`#latitud_{id}` / `#longitude_{id}`). Safe no-op outside BM / without DOM.
 */
export function enrichHotelCoordsFromDom(items: CartItem[]): CartItem[] {
  if (typeof document === 'undefined' || !document.querySelector) return items;
  return items.map((item) => {
    if (item.type !== 'hotel') return item;
    if (
      typeof item.latitude === 'number' &&
      typeof item.longitude === 'number' &&
      Number.isFinite(item.latitude) &&
      Number.isFinite(item.longitude)
    ) {
      return item;
    }
    const latEl = document.querySelector(`#latitud_${item.hotelId}`) as HTMLInputElement | null;
    const lngEl = document.querySelector(`#longitude_${item.hotelId}`) as HTMLInputElement | null;
    const latitude = latEl?.value ? Number(latEl.value) : NaN;
    const longitude = lngEl?.value ? Number(lngEl.value) : NaN;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return item;
    return { ...item, latitude, longitude };
  });
}

/**
 * Static map with numbered pins via Yandex Static Maps (free PNG URL).
 * Why Yandex (not BM Google / OSM.de): see docs/CONTEXT.md → Export PDF.
 * Note: Yandex query uses lon,lat (not lat,lon).
 */
export function buildStaticMapUrl(
  points: Array<{ lat: number; lng: number; label: number }>
): string | null {
  if (points.length === 0) return null;
  const pt = points
    .map((p) => {
      const n = Math.min(Math.max(p.label, 1), 99);
      return `${p.lng},${p.lat},pm2rdm${n}`;
    })
    .join('~');
  const base = `https://static-maps.yandex.ru/1.x/?lang=es_ES&size=650,450&l=map&pt=${pt}`;
  if (points.length === 1) {
    return `${base}&ll=${points[0].lng},${points[0].lat}&z=14`;
  }
  const b = mapBounds(points);
  return `${base}&ll=${b.centerLng},${b.centerLat}&spn=${b.lngSpan},${b.latSpan}`;
}

async function fetchMapAsDataUrl(url: string, timeoutMs = 4000): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function collectMapPoints(
  columns: HotelColumn[]
): Array<{ lat: number; lng: number; label: number }> {
  const points: Array<{ lat: number; lng: number; label: number }> = [];
  const seen = new Set<string>();
  for (const col of columns) {
    for (const h of col.hotels) {
      if (
        typeof h.latitude !== 'number' ||
        typeof h.longitude !== 'number' ||
        !Number.isFinite(h.latitude) ||
        !Number.isFinite(h.longitude)
      ) {
        continue;
      }
      const key = `${h.latitude.toFixed(5)},${h.longitude.toFixed(5)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      points.push({ lat: h.latitude, lng: h.longitude, label: col.index });
    }
  }
  return points;
}

/** SVG fallback map (always printable even if the raster CDN fails). */
function buildSvgMap(points: Array<{ lat: number; lng: number; label: number }>): string {
  const w = 900;
  const h = 360;
  const pad = 36;
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  const latSpan = Math.max(maxLat - minLat, 0.01);
  const lngSpan = Math.max(maxLng - minLng, 0.01);
  const toX = (lng: number) => pad + ((lng - minLng) / lngSpan) * (w - pad * 2);
  const toY = (lat: number) => pad + ((maxLat - lat) / latSpan) * (h - pad * 2);

  const pins = points
    .map((p) => {
      const x = toX(p.lng);
      const y = toY(p.lat);
      return `
        <g>
          <circle cx="${x}" cy="${y}" r="14" fill="#dc2626" stroke="#fff" stroke-width="2"/>
          <text x="${x}" y="${y + 4}" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" font-family="Segoe UI,sans-serif">${p.label}</text>
        </g>`;
    })
    .join('');

  return `
    <svg class="map-svg" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mapa de hoteles">
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#bae6fd"/>
          <stop offset="100%" stop-color="#7dd3fc"/>
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#sea)"/>
      <rect x="24" y="24" width="${w - 48}" height="${h - 48}" rx="18" fill="#ecfdf5" fill-opacity="0.55" stroke="#94a3b8" stroke-dasharray="6 4"/>
      ${pins}
    </svg>`;
}

function renderWholesaleRates(col: HotelColumn): string {
  const cur = col.currency || 'COP';
  const status = occupancyRatesStatus(
    col.hotels[0]?.occupancyRates as OccupancyTierRates | undefined
  );
  const rows: string[] = [];
  if (col.sglPp != null) {
    rows.push(
      `<div class="tier-row"><span>Tarifa pp ${occupancyTierAgencyLabel('sgl')}</span><strong>${escapeHtml(formatCartPrice(cur, col.sglPp))}</strong></div>`
    );
  }
  if (col.dblPp != null) {
    rows.push(
      `<div class="tier-row"><span>Tarifa pp ${occupancyTierAgencyLabel('dbl')}</span><strong>${escapeHtml(formatCartPrice(cur, col.dblPp))}</strong></div>`
    );
  }
  if (col.tplPp != null) {
    rows.push(
      `<div class="tier-row"><span>Tarifa pp ${occupancyTierAgencyLabel('tpl')}</span><strong>${escapeHtml(formatCartPrice(cur, col.tplPp))}</strong></div>`
    );
  }
  if (col.qplPp != null) {
    rows.push(
      `<div class="tier-row"><span>Tarifa pp ${occupancyTierAgencyLabel('qpl')}</span><strong>${escapeHtml(formatCartPrice(cur, col.qplPp))}</strong></div>`
    );
  }
  if (col.childEqualsAdult) {
    rows.push(`<div class="tier-note">Tarifa pp NIÑO = tarifa adulto</div>`);
  } else if (col.chd != null) {
    rows.push(
      `<div class="tier-row"><span>Tarifa pp ${occupancyTierAgencyLabel('chd')}</span><strong>${escapeHtml(formatCartPrice(cur, col.chd))}</strong></div>`
    );
  }
  if (!status.hasSgl && !status.hasDbl && col.sglPp == null && col.dblPp == null) {
    rows.push(`<div class="tier-note warn">Falta tarifa SGL o DBL</div>`);
  }
  if (rows.length === 0) return '';
  return `<div class="tier-box">${rows.join('')}</div>`;
}

function renderThumb(imageUrl?: string, fallback = '📦', alt = ''): string {
  if (imageUrl?.trim()) {
    return `<div class="svc-thumb"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt)}" /></div>`;
  }
  return `<div class="svc-thumb svc-thumb--emoji">${fallback}</div>`;
}

function renderAirlineThumb(logoUrl: string | undefined, code?: string): string {
  if (logoUrl) {
    return `<div class="svc-thumb"><img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(code || 'Aerolínea')}" /></div>`;
  }
  return `<div class="svc-thumb svc-thumb--emoji">✈</div>`;
}

function renderBloqueoBlockBody(tour: TourCartItem): string {
  const rows = formatBloqueoItineraryLines(tour);
  if (rows.length === 0) return `<div class="air-leg-meta">${escapeHtml(tour.name)}</div>`;
  const [title, ...rest] = rows;
  return `
    <div class="air-leg">
      <div class="air-leg-dir">Bloqueo</div>
      <div class="air-leg-main">
        <div class="air-leg-route">${escapeHtml(title)}</div>
        ${rest.map((r) => `<div class="air-leg-meta">${escapeHtml(r)}</div>`).join('')}
      </div>
    </div>`;
}

function renderProductBlock(label: string, thumbHtml: string, bodyHtml: string): string {
  return `
    <article class="svc-block">
      <div class="svc-block-head">
        ${thumbHtml}
        <div class="svc-block-title">${escapeHtml(label)}</div>
      </div>
      <div class="svc-block-body">${bodyHtml}</div>
    </article>`;
}

function enrichIncludeLines(
  input: QuoteBuildInput,
  hotels: HotelCartItem[],
  flights: FlightCartItem[],
  tours: TourCartItem[]
) {
  const combo = collectComboToursFromItems(input.items);
  const tourLabels = collectTourLabelsFromItems(input.items);
  const transfers = input.items.filter((i) => i.type === 'transfer');
  const insurances = input.items.filter((i) => i.type === 'insurance');
  const includes = input.quoteLines
    .filter((l) => l.kind === 'include' && l.enabled)
    .filter((l) => {
      if (l.id === 'inc_hotel' && hotels.length === 0) return false;
      if (l.id === 'inc_air' && flights.length === 0 && tours.filter((t) => t.isBloqueo).length === 0) {
        return false;
      }
      if (l.id === 'inc_transfer' && transfers.length === 0) return false;
      if (l.id === 'inc_assist' && insurances.length === 0) return false;
      if (l.id === 'inc_tours' && tourLabels.length === 0) return false;
      return true;
    })
    .map((l) => {
      if (l.id === 'inc_transfer' && combo.transfers.length > 0) {
        const night = combo.transfers.some((t) => t.nightFlights);
        const short = combo.transfers[0]?.transferShort || l.text;
        return {
          ...l,
          text: night
            ? `${short} — nocturno aplica en Cartagena con vuelos después de las 18:00`
            : short,
        };
      }
      if (l.id === 'inc_tours' && tourLabels.length > 0) {
        const list =
          tourLabels.length === 1
            ? tourLabels[0]
            : tourLabels.map((t) => `• ${t}`).join('\n');
        return { ...l, text: `${l.text.replace(/:?\s*$/, '')}:\n${list}` };
      }
      return l;
    });
  const excludes = input.quoteLines.filter(
    (l) => l.kind === 'exclude' && l.enabled && l.id !== 'exc_bag'
  );
  const policies = input.quoteLines.filter((l) => l.kind === 'policy' && l.enabled);
  return { includes, excludes, policies };
}

function renderIncludesColumns(
  input: QuoteBuildInput,
  hotels: HotelCartItem[],
  flights: FlightCartItem[],
  tours: TourCartItem[]
): string {
  const { includes, excludes, policies } = enrichIncludeLines(input, hotels, flights, tours);
  const col = (title: string, lines: typeof includes) => {
    if (lines.length === 0) return '';
    return `
      <article class="lines-col hotel-col">
        <h3>${escapeHtml(title)}</h3>
        <ul>${lines
          .map((l) => {
            const raw = (l.emoji ? l.emoji + ' ' : '') + l.text;
            return `<li>${escapeHtml(raw).replace(/\n/g, '<br>')}</li>`;
          })
          .join('')}</ul>
      </article>`;
  };
  const includesHtml = col('Tarifa incluye', includes);
  const excludesHtml = col('Plan no incluye', excludes);
  const notesHtml = col('Notas', policies);
  if (!includesHtml && !excludesHtml && !notesHtml) return '';
  return `<section class="section lines-grid">${includesHtml}${excludesHtml}${notesHtml}</section>`;
}

function optionHeadHtml(label: string, hotelName?: string): string {
  const hotel = hotelName?.trim();
  return `
    <div class="opt-head">
      <span class="opt-label">${escapeHtml(label)}</span>
      ${hotel ? `<span class="opt-hotel">${escapeHtml(hotel)}</span>` : ''}
    </div>`;
}

function renderTariffsSection(
  columns: HotelColumn[],
  currency: string,
  itemTotals: Record<string, number>,
  wholesale: boolean
): string {
  if (columns.length === 0) return '';
  const cards = columns
    .map((col) => {
      if (wholesale) {
        const rates = renderWholesaleRates(col);
        if (!rates) return '';
        const name = col.hotels[0]?.hotelName;
        return `
          <article class="hotel-col tariff-col">
            ${optionHeadHtml(col.label, name)}
            ${rates}
          </article>`;
      }
      const hotel = col.hotels[0];
      if (!hotel) return '';
      const price = itemTotals[hotel.id] ?? hotel.selectedRate.price;
      return `
        <article class="hotel-col tariff-col">
          ${optionHeadHtml(col.label, hotel.hotelName)}
          <div class="hotel-price">Desde ${escapeHtml(formatCartPrice(currency, price))}</div>
          ${
            col.total != null
              ? `<div class="option-total">Total opción: <strong>${escapeHtml(formatCartPrice(currency, col.total))}</strong></div>`
              : ''
          }
        </article>`;
    })
    .filter(Boolean);
  if (!cards.length) return '';
  return `<section class="section"><h2>Tarifas</h2><div class="hotel-grid">${cards.join('')}</div></section>`;
}

function renderFlightBlockBody(flight: FlightCartItem): string {
  const legs = (['outbound', 'return'] as const)
    .map((dir) => {
      const leg = flight.legs.find((l) => l.direction === dir);
      if (!leg) return '';
      const first = leg.segments[0];
      const last = leg.segments[leg.segments.length - 1];
      const airline =
        leg.airlines[0] || first?.airlineName || first?.airlineCode || flight.provider;
      const num = first?.flightNumber || '';
      const stops =
        leg.stops === 0
          ? 'Directo'
          : leg.stops != null
            ? `${leg.stops} escala${leg.stops !== 1 ? 's' : ''}`
            : '';
      const bag = flightBaggageForDirection(flight, dir);
      const route =
        first && last
          ? `${first.departure.airportCode} ${first.departure.hour || ''} → ${last.arrival.airportCode} ${last.arrival.hour || ''}`.trim()
          : leg.routeDescription || flightLegLine(flight, dir);
      return `
        <div class="air-leg">
          <div class="air-leg-dir">${dir === 'outbound' ? 'Ida' : 'Regreso'}</div>
          <div class="air-leg-main">
            <div class="air-leg-route">${escapeHtml(route)}</div>
            <div class="air-leg-meta">${escapeHtml(
              [airline && num ? `${airline} ${num}` : airline || num, leg.dateLabel, stops]
                .filter(Boolean)
                .join(' · ')
            )}</div>
            ${
              bag.length
                ? `<div class="air-leg-bag">Maletas: ${escapeHtml(bag.join(' · '))}</div>`
                : ''
            }
          </div>
        </div>`;
    })
    .filter(Boolean)
    .join('');
  // Maletas solo en ida/regreso (arriba); no repetir bloque al final.
  return legs || `<div class="air-leg-meta">${escapeHtml(flight.title)}</div>`;
}

function renderAccommodationBlock(hotels: HotelCartItem[], wholesale: boolean): string {
  if (hotels.length === 0) return '';
  const blocks = hotels
    .map((hotel) => {
      const rate = hotel.selectedRate;
      const roomLabel = displayHotelRoomType(rate.roomType);
      return `
        <div class="acc-item">
          ${
            hotel.imageUrl
              ? `<img class="acc-img" src="${escapeHtml(hotel.imageUrl)}" alt="" />`
              : `<div class="acc-img acc-img--empty">🏨</div>`
          }
          <div class="acc-body">
            <div class="acc-name">${escapeHtml(hotel.hotelName)}${escapeHtml(starsLabel(hotel.stars))}</div>
            ${roomLabel ? `<div class="acc-line">${escapeHtml(roomLabel)}</div>` : ''}
            ${rate.boardBasis ? `<div class="acc-line muted">🍴 ${escapeHtml(displayHotelBoardBasis(rate.boardBasis))}</div>` : ''}
            ${
              !wholesale && hotel.nights > 0
                ? `<div class="acc-line muted">${hotel.nights} noche${hotel.nights !== 1 ? 's' : ''}</div>`
                : ''
            }
          </div>
        </div>`;
    })
    .join('');
  return renderProductBlock('Alojamiento', renderThumb(undefined, '🏨'), blocks);
}

function renderTransferBlocks(
  transfers: TransferCartItem[],
  currency: string,
  itemTotals: Record<string, number>,
  wholesale: boolean
): string {
  if (transfers.length === 0) return '';
  return transfers
    .map((t) => {
      const combo = parseComboTransferName(t.name);
      const label = combo
        ? [combo.transferShort, ...combo.tours].filter(Boolean).join(' · ')
        : t.linkedHotelName
          ? `${t.linkedHotelName} · ${t.name}`
          : t.name;
      const priceBit = wholesale
        ? ''
        : `<div class="svc-line muted">${escapeHtml(formatCartPrice(currency, itemTotals[t.id] ?? t.price))}</div>`;
      return renderProductBlock(
        'Traslado',
        renderThumb(t.imageUrl, '🚕', label),
        `<div class="svc-line">${escapeHtml(label)}</div>${priceBit}`
      );
    })
    .join('');
}

function renderTourBlocks(
  tours: TourCartItem[],
  activities: ActivityCartItem[],
  currency: string,
  itemTotals: Record<string, number>,
  wholesale: boolean
): string {
  const blocks: string[] = [];
  for (const tour of tours.filter((t) => !t.isBloqueo)) {
    const kind = tour.isCombinado ? 'Combinado' : 'Circuito';
    const priceBit = wholesale
      ? ''
      : `<div class="svc-line muted">${escapeHtml(formatCartPrice(currency, itemTotals[tour.id] ?? tour.price))}</div>`;
    blocks.push(
      renderProductBlock(
        'Tour',
        renderThumb(undefined, '🗺', tour.name),
        `<div class="svc-line">• ${escapeHtml(kind)}: ${escapeHtml(tour.name)}</div>${priceBit}`
      )
    );
  }
  for (const act of activities) {
    const priceBit = wholesale
      ? ''
      : `<div class="svc-line muted">${escapeHtml(formatCartPrice(currency, itemTotals[act.id] ?? act.price))}</div>`;
    blocks.push(
      renderProductBlock(
        'Tour',
        renderThumb(act.imageUrl, '🎢', act.name),
        `<div class="svc-line">• ${escapeHtml(act.name)}</div>${priceBit}`
      )
    );
  }
  return blocks.join('');
}

function renderInsuranceBlocks(
  insurances: InsuranceCartItem[],
  wholesale: boolean,
  includeAnnex: boolean
): string {
  if (insurances.length === 0) return '';
  return insurances
    .map((ins) => {
      const intro = (ins.summaryLines || []).slice(0, 4);
      const introHtml = intro.length
        ? `<ul class="ins-intro">${intro.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`
        : '';
      const detailNote =
        includeAnnex && ins.coverageLines?.length
          ? `<div class="svc-line muted">Detalle completo en anexo.</div>`
          : '';
      return renderProductBlock(
        'Asistencia',
        renderThumb(ins.imageUrl, '🚑', ins.name),
        `<div class="svc-line">${escapeHtml(ins.name)}</div>${
          ins.planLabel ? `<div class="svc-line muted">${escapeHtml(ins.planLabel)}</div>` : ''
        }${introHtml}${detailNote}`
      );
    })
    .join('');
}

function renderOptionServicesGrid(
  input: QuoteBuildInput,
  columns: HotelColumn[],
  currency: string,
  itemTotals: Record<string, number>,
  wholesale: boolean,
  logos: Record<string, string>
): string {
  const flights = input.items.filter((i): i is FlightCartItem => i.type === 'flight');
  const allTransfers = input.items.filter((i): i is TransferCartItem => i.type === 'transfer');
  const tours = input.items.filter((i): i is TourCartItem => i.type === 'tour');
  const activities = input.items.filter((i): i is ActivityCartItem => i.type === 'activity');
  const insurances = input.items.filter((i): i is InsuranceCartItem => i.type === 'insurance');

  const cols =
    columns.length > 0
      ? columns
      : [{ index: 1, label: 'Opción 1', hotels: [] as HotelCartItem[] }];

  const grid = cols
    .map((col) => {
      const colTransfers: TransferCartItem[] = [];
      for (const hotel of col.hotels) {
        for (const t of transfersForHotel(hotel, allTransfers)) {
          if (!colTransfers.some((x) => x.id === t.id)) colTransfers.push(t);
        }
      }

      const blocks: string[] = [];
      for (const flight of flights) {
        const code = flightPrimaryAirlineCode(flight);
        blocks.push(
          renderProductBlock(
            'Vuelo',
            renderAirlineThumb(code ? logos[code] : undefined, code),
            renderFlightBlockBody(flight)
          )
        );
      }
      for (const bloqueo of tours.filter((t) => t.isBloqueo)) {
        const airlineHint = (bloqueo.name.match(
          /\b(JETSMART|WINGO|AVIANCA|ARAJET|LATAM)\b/i
        ) || [])[1];
        const code =
          airlineHint?.toUpperCase() === 'JETSMART'
            ? 'JA'
            : airlineHint?.toUpperCase() === 'WINGO'
              ? 'P5'
              : airlineHint?.toUpperCase() === 'AVIANCA'
                ? 'AV'
                : airlineHint?.toUpperCase() === 'ARAJET'
                  ? 'DM'
                  : airlineHint?.toUpperCase() === 'LATAM'
                    ? 'LA'
                    : undefined;
        blocks.push(
          renderProductBlock(
            'Vuelo',
            renderAirlineThumb(code ? logos[code] : undefined, code),
            renderBloqueoBlockBody(bloqueo)
          )
        );
      }
      const acc = renderAccommodationBlock(col.hotels, wholesale);
      if (acc) blocks.push(acc);
      const trf = renderTransferBlocks(colTransfers, currency, itemTotals, wholesale);
      if (trf) blocks.push(trf);
      const tourBlocks = renderTourBlocks(tours, activities, currency, itemTotals, wholesale);
      if (tourBlocks) blocks.push(tourBlocks);
      const insBlocks = renderInsuranceBlocks(
        insurances,
        wholesale,
        input.includePdfInsuranceAnnex !== false
      );
      if (insBlocks) blocks.push(insBlocks);

      if (blocks.length === 0) return '';
      return `
        <article class="hotel-col option-services-col">
          <h3 class="option-services-title">${escapeHtml(col.label)}</h3>
          <div class="option-services">${blocks.join('')}</div>
        </article>`;
    })
    .filter(Boolean);

  if (!grid.length) return '';
  return `<section class="section"><h2>Servicios</h2><div class="hotel-grid">${grid.join('')}</div></section>`;
}

function renderVerticalTotals(
  input: QuoteBuildInput,
  columns: HotelColumn[],
  currency: string,
  wholesale: boolean
): string {
  const quoteMode = input.quoteMode || DEFAULT_QUOTE_MODE;
  const paxBreakdown = resolveQuotePaxBreakdown(input.items, input.searchContext, quoteMode);
  const paying = quotePayingPax(paxBreakdown);
  const paxLabel = formatQuotePaxBreakdown(paxBreakdown);

  const cards: string[] = [];

  if (wholesale) {
    const showBoldTotal = input.includeOccupancyTotal === true;
    const clientLead = formatWholesaleClientTotalLead(input.searchContext?.roomPlan, {
      adults: input.searchContext?.totalAdults,
      children: input.searchContext?.totalChildren,
    });
    for (const col of columns) {
      const rates = renderWholesaleRates(col);
      const groupTotal = wholesaleTotalFromPlan(input.searchContext?.roomPlan, col);
      if (!rates && !(showBoldTotal && groupTotal != null)) continue;
      const hotelName = col.hotels[0]?.hotelName;
      const grandLine =
        showBoldTotal && groupTotal != null
          ? `<div class="total-amount">${escapeHtml(
              clientLead
                ? `${clientLead} = ${formatCartPrice(col.currency || currency, groupTotal)}`
                : formatCartPrice(col.currency || currency, groupTotal)
            )}</div>`
          : '';
      cards.push(`
        <article class="hotel-col tariff-col total-col">
          ${optionHeadHtml(col.label, hotelName)}
          ${rates}
          ${grandLine}
        </article>`);
    }
  } else if (!wholesale && columns.some((c) => c.total != null)) {
    for (const col of columns) {
      if (col.total == null) continue;
      cards.push(`
        <article class="hotel-col tariff-col total-col">
          ${optionHeadHtml(col.label, col.hotels[0]?.hotelName)}
          <div class="total-amount">${escapeHtml(formatCartPrice(currency, col.total))}${
            col.perPerson != null
              ? ` <span class="muted">(${escapeHtml(formatCartPrice(currency, col.perPerson))}/pax)</span>`
              : ''
          }</div>
        </article>`);
    }
  } else if (!wholesale) {
    const itemsTotal = input.subtotals.get(currency) || 0;
    const grandTotal = itemsTotal + input.feesTotal;
    cards.push(`
      <article class="hotel-col tariff-col total-col">
        <h3 class="tariff-opt">Total cotización</h3>
        <div class="total-line">${escapeHtml(paxLabel)} (${paying})</div>
        <div class="total-amount">${escapeHtml(formatCartPrice(currency, grandTotal))}</div>
      </article>`);
  }

  if (!cards.length) return '';
  return `<section class="section"><h2>Totales</h2><div class="hotel-grid">${cards.join('')}</div></section>`;
}

function renderInsuranceAnnex(items: CartItem[]): string {
  const insurances = items.filter((i): i is InsuranceCartItem => i.type === 'insurance');
  const blocks = insurances
    .map((ins) => {
      const lines = ins.coverageLines?.length ? ins.coverageLines : ins.summaryLines || [];
      if (lines.length === 0) return '';
      return `
        <article class="annex-plan">
          <h3>${escapeHtml(ins.name)}</h3>
          ${ins.planLabel ? `<p class="muted">${escapeHtml(ins.planLabel)}</p>` : ''}
          <ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
        </article>`;
    })
    .filter(Boolean);
  if (blocks.length === 0) return '';
  return `
    <section class="annex">
      <h2>Anexo — coberturas de asistencia</h2>
      <p class="muted">Detalle del plan (BookingMotor). No forma parte del resumen de la cotización.</p>
      ${blocks.join('')}
    </section>`;
}

/**
 * Builds a print-ready HTML cotización.
 * Order: título → mapa → incluye/no incluye → tarifas → servicios → totales → depósito.
 */
export function buildQuotePdfHtml(
  input: QuoteBuildInput,
  mapImageSrc?: string | null
): string {
  const currency = input.primaryCurrency || 'COP';
  const itemTotals = input.itemTotals || {};
  const wholesale = input.quoteMode === 'wholesale';
  const destination = resolveDestination(input);
  const { from, to } = resolveDateRange(input);
  const travelDates = formatTravelDates(from, to) || 'por confirmar';
  const hotels = input.items.filter((i): i is HotelCartItem => i.type === 'hotel');
  const tours = input.items.filter((i): i is TourCartItem => i.type === 'tour');
  const nights =
    nightsFromTripDates(input.searchContext?.checkIn, input.searchContext?.checkOut) ||
    input.searchContext?.nights ||
    hotels[0]?.nights ||
    tours[0]?.nights ||
    0;
  const createdAt = formatQuoteDate();
  const agency = input.agencyName?.trim() || 'Agencia de viajes';
  const quoteCode =
    input.quoteNumber != null && input.quoteNumber > 0
      ? formatAdvisorQuoteRef(input.advisorName, input.quoteNumber)
      : '';
  const quoteCenterHtml = quoteCode
    ? `<div class="brand-quote">COTIZACIÓN ${escapeHtml(quoteCode)}</div>`
    : `<div class="brand-quote">COTIZACIÓN</div>`;
  const flights = input.items.filter((i): i is FlightCartItem => i.type === 'flight');
  const columns = buildHotelColumns(input);
  const mapPoints = collectMapPoints(columns);
  const logos = input.airlineLogos || {};

  const mapUrl =
    mapImageSrc === undefined ? buildStaticMapUrl(mapPoints) : mapImageSrc;
  const mapLegend =
    mapPoints.length > 0
      ? `<div class="map-legend">${columns
          .map((c) => {
            const h = c.hotels[0];
            return h ? `<span><strong>${c.index}</strong> ${escapeHtml(h.hotelName)}</span>` : '';
          })
          .filter(Boolean)
          .join(' · ')}</div>`
      : '';

  const origin = resolveOrigin(input);
  const headline = buildPdfHeadline(input, travelDates, nights);

  const depositText = (input.initialDeposit || '').trim();
  const depositHtml =
    wholesale && depositText
      ? `<section class="deposit">
        <div class="deposit-title">Depósito inicial</div>
        <div class="deposit-value">${escapeHtml(depositText)}</div>
        <div class="deposit-note">El saldo debe cancelarse en las fechas límite establecidas al momento de confirmar reserva.</div>
      </section>`
      : '';

  const mapHtml =
    mapUrl || mapPoints.length > 0
      ? `<div class="map-wrap">
          ${mapUrl ? `<img class="map-raster" src="${escapeHtml(mapUrl)}" alt="Mapa de hoteles" />` : buildSvgMap(mapPoints)}
          ${mapLegend}
        </div>`
      : hotels.length > 0
        ? `<div class="map-missing">Mapa no disponible — abre la lista de hoteles en BookingMotor (o vuelve a agregarlos) para capturar ubicación y regenera el PDF.</div>`
        : '';

  const includesHtml = renderIncludesColumns(input, hotels, flights, tours);
  const tariffsHtml = renderTariffsSection(columns, currency, itemTotals, wholesale);
  const servicesHtml = renderOptionServicesGrid(
    input,
    columns,
    currency,
    itemTotals,
    wholesale,
    logos
  );
  const verticalTotalsHtml = renderVerticalTotals(input, columns, currency, wholesale);
  const annexHtml =
    input.includePdfInsuranceAnnex !== false ? renderInsuranceAnnex(input.items) : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(headline || 'Cotización')} — PDF</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      color: #0f172a;
      font-size: 11px;
      line-height: 1.35;
      background: #fff;
    }
    .sheet { max-width: 900px; margin: 0 auto; }
    .toolbar {
      display: flex; gap: 8px; align-items: center;
      padding: 10px 0 14px; border-bottom: 1px solid #e2e8f0; margin-bottom: 14px;
    }
    .toolbar button {
      border: none; background: #0369a1; color: #fff;
      border-radius: 8px; padding: 8px 14px; font-weight: 600; cursor: pointer;
    }
    .toolbar .hint { color: #64748b; font-size: 12px; }
    @media print { .toolbar { display: none; } }
    .brand {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }
    .brand-left { min-width: 0; }
    .brand-name { font-size: 18px; font-weight: 800; color: #0369a1; letter-spacing: 0.02em; }
    .brand-quote {
      text-align: center; font-size: 14px; font-weight: 800;
      color: #0f172a; letter-spacing: 0.04em; padding-top: 2px;
      white-space: nowrap;
    }
    .brand-sub { color: #64748b; font-size: 11px; }
    .meta { text-align: right; justify-self: end; }
    .meta strong { display: block; font-size: 13px; }
    .opt-head {
      display: flex; justify-content: space-between; align-items: baseline;
      gap: 8px; margin: 0 0 8px;
    }
    .opt-label {
      font-size: 12px; font-weight: 800; color: #0f172a; white-space: nowrap; flex-shrink: 0;
    }
    .opt-hotel {
      font-size: 12px; font-weight: 800; color: #0f172a; text-align: right; line-height: 1.3;
    }
    h1 { font-size: 15px; margin: 0 0 14px; color: #0f172a; line-height: 1.45; font-weight: 800; }
    .trip-card {
      margin: 0 0 14px;
      padding: 0;
      max-width: 420px;
    }
    .trip-card .hotel-badge { font-size: 10px; }
    .trip-card-body { padding: 28px 14px 12px; }
    .trip-route {
      margin: 0 0 6px; font-size: 15px; font-weight: 800; color: #0f172a;
    }
    .trip-meta {
      display: flex; flex-wrap: wrap; gap: 8px 14px;
      color: #475569; font-size: 11px;
    }
    .map-wrap { margin: 0 0 14px; }
    .map-wrap img.map-raster,
    .map-wrap img {
      width: 100%; max-height: 240px; object-fit: contain;
      border-radius: 8px; border: 1px solid #e2e8f0; display: block;
      background: #e0f2fe;
    }
    .map-svg {
      width: 100%; height: auto; max-height: 280px;
      border-radius: 8px; border: 1px solid #e2e8f0; display: block;
      background: #e0f2fe;
    }
    .map-legend { margin-top: 6px; color: #475569; font-size: 10px; }
    .map-missing {
      padding: 18px; text-align: center; color: #64748b;
      border: 1px dashed #cbd5e1; border-radius: 8px; margin-bottom: 14px;
    }
    .lines-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }
    .lines-col {
      position: relative;
      padding: 28px 12px 12px;
    }
    .lines-col h3 {
      margin: 0 0 8px; font-size: 12px; color: #0369a1;
    }
    .lines-col ul { margin: 0; padding-left: 16px; font-size: 10px; line-height: 1.45; }
    .lines-col li { margin: 3px 0; }
    .tariff-col { padding: 12px; }
    .tariff-opt { margin: 0 0 4px; font-size: 12px; }
    .tariff-hotel { margin: 0 0 8px; font-size: 10px; }
    .option-services-col { padding: 12px 10px 10px; }
    .option-services-title { margin: 0 0 8px; font-size: 12px; font-weight: 800; }
    .option-services { display: grid; gap: 8px; }
    .svc-block {
      border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fff;
    }
    .svc-block-head {
      display: flex; gap: 8px; align-items: center;
      padding: 8px; background: #f8fafc; border-bottom: 1px solid #eef2f7;
    }
    .svc-block-title { font-weight: 700; font-size: 11px; }
    .svc-block-body { padding: 8px 10px; font-size: 10px; }
    .svc-thumb {
      width: 40px; height: 40px; flex-shrink: 0;
      border-radius: 6px; overflow: hidden; background: #f1f5f9;
      display: flex; align-items: center; justify-content: center;
    }
    .svc-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .svc-thumb--emoji { font-size: 18px; }
    .acc-item { display: flex; gap: 8px; margin-bottom: 8px; }
    .acc-item:last-child { margin-bottom: 0; }
    .acc-img {
      width: 52px; height: 52px; object-fit: cover; border-radius: 6px; flex-shrink: 0;
      background: #f1f5f9;
    }
    .acc-img--empty {
      display: flex; align-items: center; justify-content: center; font-size: 20px;
    }
    .acc-name { font-weight: 700; font-size: 11px; margin-bottom: 2px; }
    .acc-line { margin: 1px 0; }
    .ins-intro { margin: 4px 0 0; padding-left: 14px; font-size: 9px; color: #475569; }
    .totals-vertical { display: grid; gap: 10px; }
    .total-card {
      border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; background: #f8fafc;
    }
    .total-card h3 { margin: 0 0 6px; font-size: 13px; color: #0369a1; }
    .total-line { margin: 4px 0; font-size: 11px; }
    .total-amount {
      margin: 8px 10px 10px; font-size: 18px; font-weight: 800; color: #0f172a;
    }
    .total-commission {
      margin: 0 10px 10px; font-size: 12px; font-weight: 700; color: #334155;
    }
    .total-col .tier-box { margin-top: 6px; }
    .total-col .total-line { margin: 4px 10px; font-size: 10px; color: #334155; font-weight: 600; }
    .hotel-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }
    .hotel-col {
      position: relative;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      background: #fff;
      page-break-inside: avoid;
    }
    .hotel-badge {
      position: absolute; top: 8px; left: 8px; z-index: 1;
      width: 22px; height: 22px; border-radius: 50%;
      background: #0f172a; color: #fff; font-weight: 700;
      display: flex; align-items: center; justify-content: center; font-size: 11px;
    }
    .hotel-img { width: 100%; height: 110px; object-fit: cover; display: block; background: #f1f5f9; }
    .hotel-img--empty {
      display: flex; align-items: center; justify-content: center;
      color: #94a3b8; font-size: 11px;
    }
    .hotel-name { margin: 8px 10px 2px; font-size: 12px; }
    .hotel-addr, .extra-hotel { margin: 0 10px 6px; color: #64748b; font-size: 10px; }
    .room-block { margin: 0 10px 8px; padding-top: 6px; border-top: 1px solid #f1f5f9; }
    .room-line { margin: 2px 0; }
    .muted { color: #64748b; }
    .hotel-price { margin: 0 10px 8px; font-weight: 700; font-size: 12px; color: #0369a1; }
    .option-total {
      margin: 0 10px 10px; padding: 6px 8px; background: #f0f9ff;
      border-radius: 6px; font-size: 10px;
    }
    .per-pax { color: #64748b; font-weight: 500; }
    .tier-box {
      margin: 0 10px 10px; padding: 8px; background: #fff7ed;
      border: 1px solid #fed7aa; border-radius: 8px;
    }
    .tier-row {
      display: flex; justify-content: space-between; gap: 8px;
      margin: 3px 0; font-size: 11px;
    }
    .tier-row strong { color: #9a3412; white-space: nowrap; }
    .tier-note { margin-top: 4px; font-size: 10px; color: #9a3412; }
    .tier-note.warn { color: #b45309; font-weight: 600; }
    .section { margin: 0 0 16px; page-break-inside: avoid; }
    .section h2 { font-size: 13px; margin: 0 0 8px; border-bottom: 2px solid #0369a1; padding-bottom: 4px; }
    .svc-list { display: grid; gap: 8px; }
    .svc { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; }
    .svc-title { font-weight: 700; margin-bottom: 2px; }
    .svc-line { margin: 1px 0; }
    .totals {
      background: #0f172a; color: #fff; border-radius: 10px;
      padding: 12px 14px; margin-bottom: 14px;
    }
    .totals .row { display: flex; justify-content: space-between; gap: 12px; margin: 3px 0; }
    .totals .grand { font-size: 14px; font-weight: 800; margin-top: 6px; padding-top: 6px; border-top: 1px solid #334155; }
    .deposit {
      margin: 0 0 14px; padding: 12px 14px;
      border: 1px solid #fed7aa; border-radius: 10px; background: #fff7ed;
    }
    .deposit-title {
      font-size: 11px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.04em; color: #9a3412; margin-bottom: 4px;
    }
    .deposit-value { font-size: 13px; font-weight: 700; color: #0f172a; }
    .deposit-note { margin-top: 6px; font-size: 10px; color: #9a3412; }
    .lines-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .lines-with-air {
      grid-template-columns: 1fr 1fr 1.15fr;
      grid-template-rows: auto auto;
      align-items: start;
    }
    .lines-with-air .lines-notes {
      grid-column: 3;
      grid-row: 1 / span 2;
    }
    .lines-with-air .air-itinerary {
      grid-column: 1 / span 2;
      grid-row: 2;
    }
    .lines-with-air:not(:has(.lines-notes)) {
      grid-template-columns: 1fr 1fr;
    }
    .lines-block h3 { margin: 0 0 4px; font-size: 12px; }
    .lines-block ul { margin: 0; padding-left: 16px; font-size: 11px; line-height: 1.4; }
    .air-itinerary {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: linear-gradient(180deg, #f8fafc 0%, #fff 70%);
      padding: 10px 12px;
      min-height: 88px;
    }
    .air-itinerary h3 {
      margin: 0 0 8px; font-size: 12px; color: #0369a1;
      letter-spacing: 0.02em;
    }
    .air-card { display: grid; gap: 8px; }
    .air-leg {
      display: grid;
      grid-template-columns: 64px 1fr;
      gap: 8px;
      padding: 6px 0;
      border-top: 1px solid #eef2f7;
    }
    .air-leg:first-of-type { border-top: 0; padding-top: 0; }
    .air-leg-dir {
      font-size: 10px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.04em; color: #0f172a;
      padding-top: 2px;
    }
    .air-leg-route { font-size: 12px; font-weight: 700; color: #0f172a; }
    .air-leg-meta { font-size: 10px; color: #64748b; margin-top: 2px; }
    .air-leg-bag { font-size: 10px; color: #334155; margin-top: 3px; font-weight: 600; }
    .flight-baggage {
      margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1;
    }
    @media print {
      html, body {
        width: 100%; margin: 0; padding: 0;
        background: #fff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .sheet { max-width: none; width: 100%; padding: 0; }
      .hotel-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      .lines-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
      .hotel-col, .svc-block, .total-card, .lines-col, .tariff-col, .option-services-col {
        break-inside: avoid; page-break-inside: avoid;
      }
      .map-wrap img, .map-svg { max-height: 200px !important; }
      .svc-block-head, .tier-box, .total-card, .deposit, .lines-col {
        background: #f8fafc !important;
        border: 1px solid #cbd5e1 !important;
      }
      .hotel-badge {
        background: #0f172a !important;
        color: #fff !important;
      }
      .air-leg-bag, .flight-baggage { color: #0f172a !important; }
    }
    .kit-block { margin: 0 10px 8px; padding: 6px 8px; background: #f8fafc; border-radius: 6px; }
    .kit-line { font-size: 10px; margin: 4px 0; }
    .col-svcs { margin: 0 10px 8px; padding: 6px 8px; background: #f1f5f9; border-radius: 6px; }
    .col-svc { font-size: 9px; color: #334155; margin: 2px 0; line-height: 1.35; }
    .col-svc-note { font-size: 8px; color: #64748b; margin-bottom: 4px; font-style: italic; }
    .hotel-block { margin-bottom: 8px; }
    .hotel-block .hotel-img { margin-bottom: 4px; }
    .footer { margin-top: 18px; color: #94a3b8; font-size: 9px; text-align: center; }
    .annex {
      page-break-before: always;
      margin-top: 24px;
      padding-top: 8px;
    }
    .annex h2 { font-size: 14px; margin: 0 0 6px; border-bottom: 2px solid #0369a1; padding-bottom: 4px; }
    .annex-plan { margin: 12px 0 18px; }
    .annex-plan h3 { font-size: 12px; margin: 0 0 4px; }
    .annex-plan ul { margin: 6px 0 0; padding-left: 16px; font-size: 10px; line-height: 1.45; }
    .annex-plan li { margin: 2px 0; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="toolbar">
      <button type="button" id="tce-pdf-print">Imprimir / Guardar PDF</button>
      <span class="hint">En el diálogo de impresión elige «Guardar como PDF».</span>
    </div>
    <header class="brand">
      <div class="brand-left">
        <div class="brand-name">${escapeHtml(agency)}</div>
      </div>
      ${quoteCenterHtml}
      <div class="meta">
        <strong>Fecha de creación</strong>
        <div>${escapeHtml(createdAt)}</div>
      </div>
    </header>
    <h1>${escapeHtml(headline)}</h1>
    ${mapHtml}
    ${includesHtml}
    ${tariffsHtml}
    ${servicesHtml}
    ${verticalTotalsHtml}
    ${depositHtml}
    ${annexHtml}
  </div>
</body>
</html>`;
}

/** Opens a print tab with the cotización HTML (user saves as PDF). */
export async function openQuotePdfPrint(
  input: QuoteBuildInput
): Promise<{ ok: boolean; reason?: string }> {
  if (!input.items.length) {
    return { ok: false, reason: 'El carrito está vacío.' };
  }
  const enrichedInput: QuoteBuildInput = {
    ...input,
    items: enrichHotelCoordsFromDom(input.items),
  };
  const columns = buildHotelColumns(enrichedInput);
  const mapPoints = collectMapPoints(columns);
  const flights = enrichedInput.items.filter((i): i is FlightCartItem => i.type === 'flight');
  const airlineLogos = await resolveAirlineLogos(airlineCodesFromFlights(flights));
  let mapImageSrc: string | null | undefined = undefined;
  if (mapPoints.length > 0) {
    const mapHttpUrl = buildStaticMapUrl(mapPoints);
    mapImageSrc = mapHttpUrl ? await fetchMapAsDataUrl(mapHttpUrl) : null;
  }
  const html = buildQuotePdfHtml({ ...enrichedInput, airlineLogos }, mapImageSrc);
  try {
    await chrome.storage.local.set({ [QUOTE_PDF_HTML_KEY]: html });
  } catch (e) {
    return { ok: false, reason: 'No se pudo guardar la cotización para el PDF.' };
  }

  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'TCE_OPEN_QUOTE_PDF' }, (response) => {
        const err = chrome.runtime.lastError;
        if (err || !response?.ok) {
          resolve({
            ok: false,
            reason:
              err?.message ||
              response?.error ||
              'No se pudo abrir la pestaña del PDF.',
          });
          return;
        }
        resolve({ ok: true });
      });
    } catch (e) {
      resolve({
        ok: false,
        reason: e instanceof Error ? e.message : 'No se pudo abrir el PDF.',
      });
    }
  });
}
