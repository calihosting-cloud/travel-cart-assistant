import type { CartItem, FlightCartItem, HotelCartItem, SearchContext } from '../engine/core/types';
import {
  groupCartItemsForDisplay,
  openBookingMotorTransferSearch,
  pendingFromHotel,
  startHotelTransferSearch,
} from '../shared/hotelTransferKit';
import {
  buildWhatsAppQuote,
  buildCommissionApproxWhatsApp,
  formatFlightLegLine,
  type QuoteBuildInput,
} from '../ui/QuoteBuilder';
import { openQuotePdfPrint } from '../ui/QuotePdf';
import {
  FEE_DEFINITIONS,
  MAYOR_VALOR_ID,
  REDONDEO_ID,
  applyTaType,
  compareOptionTotals,
  compareOptionSubtotals,
  computeRoundingExcessCop,
  copAmountToDisplay,
  defaultFees,
  displayAmountToCop,
  formatCartPrice,
  formatServiceItemTotal,
  formatValorOriginalDual,
  getEffectiveTrm,
  getFeesTotalDisplay,
  getItemBasePrice,
  getItemLineTotal,
  getItemNativePrice,
  getPrimaryCurrency,
  getTaPaxCount,
  cartNeedsTaFee,
  taFeeHintForItems,
  getTaTotal,
  charmNineExcess,
  getTotalsByCurrency,
  headerSearchContext,
  itemTotalsMap,
  suggestTaFromItems,
} from '../shared/cartEngine';
import { computeDashboardStats } from '../shared/dashboardStats';
import {
  defaultQuoteLines,
  loadQuoteLines,
  newQuoteLineId,
  normalizeQuoteLines,
  QUOTE_LINES_KEY,
  QuoteLine,
  QuoteLineKind,
  saveQuoteLines,
} from '../shared/quoteConfig';
import { appendAppLog } from '../shared/appLog';
import {
  AGENCY_KEY,
  CLIENT_KEY,
  INITIAL_DEPOSIT_KEY,
  PDF_INSURANCE_ANNEX_KEY,
  OCCUPANCY_TOTAL_OPEN_KEY,
  COMMISSION_APPROX_OPEN_KEY,
  COMMISSION_APPROX_KIND_KEY,
  ACCOMMODATION_CONFIRMED_KEY,
  HISTORY_KEY,
  HistoryEntry,
  PENDING_QUOTE_KEY,
  USD_EQUIV_KEY,
  SHOW_TRM_IN_QUOTE_KEY,
  AUTO_ROUND_OCCUPANCY_KEY,
  MANUAL_PACKAGE_ROUND_IDS_KEY,
  commitQuoteNumber,
  formatQuoteRef,
  freezeHistoryPayload,
  loadAdvisorName,
  loadAgencyName,
  loadClientName,
  loadInitialDeposit,
  loadPdfInsuranceAnnex,
  loadHistory,
  loadIncludeUsdEquiv,
  loadShowTrmInQuote,
  loadAutoRoundOccupancy,
  loadManualPackageRoundIds,
  loadPendingQuoteNumber,
  peekNextQuoteNumber,
  saveAgencyName,
  saveClientName,
  saveInitialDeposit,
  savePdfInsuranceAnnex,
  saveOccupancyTotalOpen,
  saveCommissionApproxOpen,
  saveCommissionApproxKind,
  loadCommissionApproxOpen,
  loadCommissionApproxKind,
  saveAccommodationConfirmed,
  loadAccommodationConfirmed,
  saveIncludeUsdEquiv,
  saveShowTrmInQuote,
  saveAutoRoundOccupancy,
  saveManualPackageRoundIds,
  signalBmClearMarks,
  savePendingQuoteNumber,
  upsertHistory,
  buildHistoryEntry,
  scheduleHistoryDraft,
  downloadHistoryBackup,
  importHistoryJson,
  type HistoryBuildParams,
} from '../shared/quoteHistory';
import {
  quoteCoverageChipOk,
  quoteCoverageChipText,
  quoteCoverageFromItems,
} from '../shared/quoteCoverage';
import {
  quoteWholesaleWarnings,
  clearDismissedWarnings,
  dismissWarning,
  loadDismissedWarnings,
  activeQuoteWarnings,
  renderWarningsBellHtml,
  renderWarningsPanelHtml,
  DISMISSED_WARNINGS_KEY,
} from '../shared/quoteWarnings';
import type { QuoteWarning } from '../shared/quoteWarnings';
import {
  buildWholesaleOptionBreakdown,
  renderWholesaleBreakdownTable,
} from '../shared/wholesaleBreakdown';
import {
  HotelCompareOptionGroup,
  HOTEL_COMPARE_GROUPS_KEY,
  HOTELS_AS_OPTIONS_KEY,
  loadHotelCompareGroups,
  loadHotelsAsOptions,
  newHotelCompareGroupId,
  saveHotelCompareGroups,
  saveHotelsAsOptions,
} from '../shared/quoteOptions';
import {
  defaultTaConfig,
  defaultTaSelection,
  loadTaConfig,
  loadTaSelection,
  normalizeTaConfig,
  normalizeTaSelection,
  saveTaConfig,
  saveTaSelection,
  TA_CONFIG_KEY,
  TA_SELECTION_KEY,
  TaConfig,
  TaSelection,
  TaType,
  taTypeLabel,
} from '../shared/taConfig';
import {
  DEFAULT_TRM_SUPLEMENTO,
  DISPLAY_CURRENCY_KEY,
  DisplayCurrency,
  loadDisplayCurrency,
  loadTrm,
  loadTrmSuplemento,
  DEFAULT_TRM_SOURCE,
  getTrmReferencePage,
  loadTrmSource,
  normalizeDisplayCurrency,
  normalizeTrmSource,
  normalizeTrmSuplemento,
  saveDisplayCurrency,
  saveTrm,
  saveTrmSource,
  saveTrmSuplemento,
  todayIso,
  TRM_KEY,
  TRM_SOURCE_KEY,
  TRM_SOURCES,
  TRM_SUPLEMENTO_KEY,
  TrmSourceId,
  TrmState,
  formatTrmRate,
  trmInputValue,
} from '../shared/trm';
import {
  clearTripGuide,
  loadTripGuide,
  TRIP_GUIDE_KEY,
  briefingMissingFields,
  briefingMissingForQuote,
  buildTripBriefing,
  enrichSearchContextFromItems,
  fromIsoDateInput,
  isTripBriefingComplete,
  mergeFirstTripFacts,
  applyRoomPlanToGuide,
  nightsFromTripDates,
  overlayBriefingPax,
  saveTripGuide,
  toIsoDateInput,
  isoDateToday,
} from '../shared/tripGuide';
import {
  QUOTE_MODE_KEY,
  DEFAULT_QUOTE_MODE,
  loadQuoteMode,
  normalizeQuoteMode,
  saveQuoteMode,
  type QuoteMode,
} from '../shared/quoteMode';
import {
  displayHotelBoardBasis,
  displayHotelRoomType,
  formatOccupancyBaselineGuide,
  formatOccupancyCurrentGuide,
  wholesaleTierWithOriginal,
  accommodationMixBreakdown,
  occupancyHintOptsFromPlan,
  occupancyMissingHint,
  occupancyRatesToCurrency,
  coerceOccupancyRateCurrency,
  sanitizeOccupancyRates,
  repairHotelOccupancyInItems,
  approxCommissionAmount,
  summarizeWholesaleOption,
  serviceItemBreakdownPax,
  type CommissionApproxKind,
  packageRoundUpliftEntries,
  charmNineOccupancyRates,
  ensureOccupancyBaseline,
  restoreOccupancyFromBaseline,
  applyMayorValorToOccupancyRates,
  applyAutoRoundToHotelItems,
  occupancyTierUpliftFromBaseline,
  type OccupancyTierRates,
  type MayorValorByTier,
  type OccupancyTierCode,
} from '../shared/occupancyRates';
import {
  addOriginCity,
  BM_DESTINATIONS_KEY,
  destDatalistHtml,
  loadBmDestinations,
  loadOriginCities,
  ORIGIN_CITIES_KEY,
  originDatalistHtml,
  removeOriginCity,
} from '../shared/originCities';
import {
  flattenChildAges,
  mutateRoomPlan,
  readRoomPlanFromRoot,
  roomPlanHtml,
  roomsFromBriefing,
  serializeRoomPlan,
  summarizeRoomPlan,
  formatBriefingPaxCompact,
  formatWholesaleClientTotalLead,
  hasAccommodationPlan,
} from '../shared/roomPlan';

const STORAGE_KEY = 'tce_cart_items';
const SEARCH_KEY = 'tce_last_search';
const FEES_KEY = 'tce_fees';

let lines: QuoteLine[] = [];
let taConfig: TaConfig = defaultTaConfig();
let taSelection: TaSelection = defaultTaSelection();
let trmSuplemento = DEFAULT_TRM_SUPLEMENTO;
let trmSource: TrmSourceId = DEFAULT_TRM_SOURCE;
let displayCurrency: DisplayCurrency = 'COP';
let items: CartItem[] = [];
let fees: Record<string, number> = defaultFees();
let clientName = '';
let initialDeposit = '';
let pdfInsuranceAnnex = true;
let agencyName = '';
let advisorName = '';
let searchContext: SearchContext | null = null;
let tripGuide: SearchContext | null = null;
let history: HistoryEntry[] = [];
let trmRate = 0;
let includeUsdEquiv = false;
let showTrmInQuote = false;
let hotelsAsOptions = false;
let quoteMode: QuoteMode = DEFAULT_QUOTE_MODE;
let occupancyTotalOpen = false;
let commissionApproxOpen = false;
let commissionApproxKind: CommissionApproxKind | null = null;
/** Mayorista: chip Acomodación verde tras tocar el mix. */
let accommodationConfirmed = false;
let autoRoundOccupancy = true;
let manualPackageRoundIds: string[] = [];
let dismissedWarnings: string[] = [];
let warningsPanelOpen = false;
let originCities: string[] = [];
let bmDestinations: string[] = [];
let hotelOptionGroups: HotelCompareOptionGroup[] = [];
let pendingQuoteNumber: number | null = null;
let quoteCopyStatus: 'idle' | 'ok' | 'err' = 'idle';
let quoteStatusMessage = '';
let suppressFeeRerender = false;
let suppressItemAdjRerender = false;
let lastLocalCartWriteAt = 0;
let lastLocalFeesWriteAt = 0;
/** After Nueva búsqueda, ignore BM re-writing tce_last_search briefly. */
let ignoreSearchUntil = 0;
/** Avoid treating programmatic select updates as a user switch to minorista. */
let applyingQuoteMode = false;

function isLocalStorageEcho(writtenAt: number, windowMs = 150): boolean {
  return writtenAt > 0 && Date.now() - writtenAt < windowMs;
}

function effTrm(): number {
  return getEffectiveTrm(trmRate, trmSuplemento);
}

function trmDiaOpt(): number | undefined {
  return trmRate > 0 ? trmRate : undefined;
}

function syncAutoRoundOccupancy(): boolean {
  const fx = {
    effTrm: effTrm(),
    trmDia: trmDiaOpt(),
    displayCurrency,
  };
  let changed = false;
  const repaired = repairHotelOccupancyInItems(items, fx);
  if (repaired.changed) {
    items = repaired.items;
    changed = true;
  }
  const { items: next, changed: stripped } = applyAutoRoundToHotelItems(
    items,
    autoRoundOccupancy,
    displayCurrency,
    fx.effTrm,
    fx.trmDia
  );
  if (stripped) {
    items = next;
    changed = true;
  }
  return changed;
}

function shouldRoundPackage(optionId?: string): boolean {
  if (autoRoundOccupancy) return true;
  if (!optionId) return false;
  return manualPackageRoundIds.includes(optionId);
}

async function setManualPackageRound(optionId: string, on: boolean): Promise<void> {
  const set = new Set(manualPackageRoundIds);
  if (on) set.add(optionId);
  else set.delete(optionId);
  manualPackageRoundIds = [...set];
  await saveManualPackageRoundIds(manualPackageRoundIds);
}

async function setAutoRoundOccupancy(on: boolean): Promise<void> {
  if (on === autoRoundOccupancy) return;
  autoRoundOccupancy = on;
  await saveAutoRoundOccupancy(on);
  if (on) {
    manualPackageRoundIds = [];
    await saveManualPackageRoundIds([]);
  }
  if (syncAutoRoundOccupancy()) await saveItems();
  renderAccommodationPanel();
  renderCompareBlock();
  renderProductos();
  renderTotal();
  void showQuotePreview();
}

function setupTabs(): void {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const id = (tab as HTMLElement).dataset.tab;
      if (id) selectTab(id);
    });
  });
}

function selectTab(id: string): void {
  document.querySelectorAll('.tab').forEach((t) => {
    const active = (t as HTMLElement).dataset.tab === id;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('.panel').forEach((p) => {
    p.classList.toggle('active', p.id === `panel-${id}`);
  });
  if (id === 'whatsapp') void showQuotePreview();
  if (id === 'productos') {
    renderProductos();
  }
  if (id === 'total') {
    renderTotal();
  }
  if (id === 'acomodacion') {
    renderAccommodationPanel();
  }
  if (id === 'historial') {
    renderHistorial();
  }
}

/** Same tab visibility rules as the cart sidebar (minus Dashboard/Config). */
function syncWorkspaceTabsVisibility(): void {
  const hasItems = items.length > 0;
  const tabTotal = document.getElementById('tab-total') as HTMLButtonElement | null;
  const tabWa = document.getElementById('tab-whatsapp') as HTMLButtonElement | null;
  const tabAcc = document.getElementById('tab-acomodacion') as HTMLButtonElement | null;
  if (tabTotal) tabTotal.hidden = !hasItems;
  if (tabWa) tabWa.hidden = !hasItems;
  if (tabAcc) tabAcc.hidden = quoteMode !== 'wholesale';

  const active = document.querySelector('.tab.active') as HTMLElement | null;
  const activeId = active?.dataset.tab;
  if (
    activeId === 'total' ||
    activeId === 'whatsapp' ||
    activeId === 'acomodacion'
  ) {
    if (
      (activeId === 'total' || activeId === 'whatsapp') && !hasItems
    ) {
      selectTab('productos');
    } else if (activeId === 'acomodacion' && quoteMode !== 'wholesale') {
      selectTab('productos');
    }
  }
}

function formatPaxLabel(): string {
  const ctx = headerSearchContext(tripGuide, searchContext, items);
  const flight = items.find((i): i is FlightCartItem => i.type === 'flight');
  let adults = ctx?.totalAdults ?? 0;
  let children = ctx?.totalChildren ?? 0;
  let infants = flight?.infants ?? 0;
  if (adults + children === 0) {
    adults = getTaPaxCount(items, tripGuide || readBriefingDraft(), searchContext);
  }
  const ages = (ctx?.childrenAges || []).filter((a) => typeof a === 'number' && a >= 0);
  const parts: string[] = [];
  if (adults > 0) parts.push(`${adults} adulto${adults !== 1 ? 's' : ''}`);
  if (children > 0) {
    const agesHint = ages.length > 0 ? ` (${ages.join(', ')})` : '';
    parts.push(`${children} niño${children !== 1 ? 's' : ''}${agesHint}`);
  }
  if (infants > 0) parts.push(`${infants} bebé${infants !== 1 ? 's' : ''}`);
  return parts.length ? parts.join(' · ') : 'Sin pasajeros';
}

function formatRouteLabel(): string {
  const ctx =
    items.length === 0
      ? tripGuide
      : headerSearchContext(tripGuide, searchContext, items);
  if (!ctx) return 'Sin ruta';
  const bits = [
    ctx.originText,
    ctx.destinationText,
    ctx.checkIn && ctx.checkOut ? `${ctx.checkIn} → ${ctx.checkOut}` : ctx.checkIn,
    ctx.nights && ctx.nights > 0 ? `${ctx.nights}n` : '',
  ].filter(Boolean);
  return bits.join(' · ') || 'Sin ruta';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function flightItemDetailsHtml(item: FlightCartItem): string {
  const legs = item.legs
    .map((leg) => {
      const dir = leg.direction === 'return' ? 'Vuelta' : 'Ida';
      const line = formatFlightLegLine(item, leg.direction);
      const bag = leg.baggageIncluded?.length
        ? ` · Maletas: ${leg.baggageIncluded.join(' · ')}`
        : '';
      return line
        ? `<p class="item-flight-leg"><strong>${escapeHtml(dir)}:</strong> ${escapeHtml(line)}${escapeHtml(bag)}</p>`
        : '';
    })
    .filter(Boolean)
    .join('');
  const trm = effTrm();
  const lineTotal = getItemLineTotal(item, displayCurrency, trm, trmDiaOpt());
  const { pax, breakdown } = serviceBreakdownPax(item);
  const totalLabel = formatServiceItemTotal(lineTotal.currency, lineTotal.price, pax, breakdown);
  const valor = `<div class="item-flight-valor item-line-total" data-item-id="${escapeAttr(item.id)}"><strong>${escapeHtml(totalLabel)}</strong></div>`;
  return legs || valor ? `<div class="item-flight">${legs}${valor}</div>` : '';
}

function serviceBreakdownPax(item?: CartItem): { pax: number; breakdown: boolean } {
  return serviceItemBreakdownPax(item, tripGuide || searchContext);
}

function itemTitle(item: CartItem): string {
  switch (item.type) {
    case 'hotel':
      return item.hotelName;
    case 'flight':
      return item.title || `${item.origin.code} → ${item.destination.code}`;
    case 'transfer':
      return item.linkedHotelName ? `${item.linkedHotelName} · ${item.name}` : item.name;
    case 'activity':
      return item.name;
    case 'tour':
      return item.name;
    case 'insurance':
      return item.name;
    default:
      return 'Ítem';
  }
}

function itemMeta(item: CartItem): string {
  switch (item.type) {
    case 'hotel': {
      const rate = item.selectedRate;
      const bits = [
        `${item.checkIn} → ${item.checkOut}`,
        `${item.nights}n`,
        displayHotelRoomType(rate.roomType),
        displayHotelBoardBasis(rate.boardBasis),
      ].filter(Boolean);
      return bits.join(' · ');
    }
    case 'flight':
      return `${item.provider}${item.paxSummary ? ` · ${item.paxSummary}` : ''}`;
    case 'transfer': {
      const hotel = item.linkedHotelName ? `${item.linkedHotelName} · ` : '';
      return `${hotel}${item.from} → ${item.to}${item.supplierName ? ` · ${item.supplierName}` : ''}`;
    }
    case 'activity':
      return `${item.supplierName || 'Actividad'}${item.checkIn ? ` · ${item.checkIn}` : ''}`;
    case 'tour': {
      const route =
        item.originCity && item.destinationCity
          ? `${item.originCity} → ${item.destinationCity}`
          : item.destinationCity || '';
      const pp = `${formatCartPrice(item.currency, item.pricePerPerson)}/pers.`;
      const kind = item.isBloqueo ? 'Bloqueo' : item.isCombinado ? 'Combinado' : 'Circuito';
      return [kind, route, item.departureDate, pp].filter(Boolean).join(' · ');
    }
    case 'insurance': {
      const bits = [item.supplierName || 'Asistencia', item.planLabel];
      if (item.summaryLines?.length) bits.push(item.summaryLines.slice(0, 2).join(' · '));
      return bits.filter(Boolean).join(' · ');
    }
    default:
      return '';
  }
}

function getItemSourceUrl(item: CartItem): string | undefined {
  if (item.sourceUrl) return item.sourceUrl;
  if ('bookingUrl' in item && item.bookingUrl) return item.bookingUrl;
  if (item.type === 'hotel' && item.selectedRate.bookingUrl) {
    return item.selectedRate.bookingUrl;
  }
  return undefined;
}

function renderItemOpenLink(item: CartItem): string {
  const url = getItemSourceUrl(item);
  if (!url) return '';
  return `<a class="item-open" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer"
    title="Abrir búsqueda / página de origen" aria-label="Abrir búsqueda">↗</a>`;
}

function setSyncOk(ok: boolean): void {
  const pill = document.getElementById('sync-pill');
  if (!pill) return;
  pill.textContent = ok ? 'Sync OK' : 'Sync…';
  pill.classList.toggle('pill--warn', !ok);
}

function renderHeader(): void {
  const agencyEl = document.getElementById('header-agency') as HTMLInputElement | null;
  const clientEl = document.getElementById('header-client') as HTMLInputElement | null;
  const itemsEl = document.getElementById('meta-items');
  const routeEl = document.getElementById('meta-route');
  const paxEl = document.getElementById('header-pax');
  const trmInput = document.getElementById('header-trm-input') as HTMLInputElement | null;
  const trmSupInput = document.getElementById('header-trm-sup') as HTMLInputElement | null;
  const trmEff = document.getElementById('header-trm-eff');
  const compareEl = document.getElementById('hotels-as-options') as HTMLInputElement | null;
  const addOptBtn = document.getElementById('btn-add-option');
  const modeEl = document.getElementById('quote-mode') as HTMLSelectElement | null;

  if (agencyEl && document.activeElement !== agencyEl) agencyEl.value = agencyName;
  if (clientEl && document.activeElement !== clientEl) clientEl.value = clientName;
  if (itemsEl) {
    itemsEl.textContent = `${items.length} producto${items.length !== 1 ? 's' : ''}`;
  }
  if (routeEl) routeEl.textContent = formatRouteLabel();
  const coverageEl = document.getElementById('quote-coverage');
  const warnBellSlot = document.getElementById('warnings-bell-slot');
  const warnPanelEl = document.getElementById('warnings-panel');
  const wholesaleWarns: QuoteWarning[] =
    quoteMode === 'wholesale'
      ? quoteWholesaleWarnings(items, hotelOptionGroups, {
          roomPlan: tripGuide?.roomPlan,
          displayCurrency,
          effTrm: effTrm(),
          trmDia: trmDiaOpt(),
          occupancyTotalOpen,
          autoRoundOccupancy,
          tripCheckIn: tripGuide?.checkIn,
          tripCheckOut: tripGuide?.checkOut,
          tripAdults: tripGuide?.totalAdults,
          tripChildren: tripGuide?.totalChildren,
        })
      : [];
  const activeWarns = activeQuoteWarnings(wholesaleWarns, dismissedWarnings);
  if (activeWarns.length === 0) warningsPanelOpen = false;
  if (coverageEl) {
    const chips = quoteCoverageFromItems(items, {
      quoteMode,
      accommodationConfirmed,
      roomPlan: tripGuide?.roomPlan,
      totalAdults: tripGuide?.totalAdults,
      totalChildren: tripGuide?.totalChildren,
      childrenAges: tripGuide?.childrenAges,
    })
      .map((chip) => {
        const ok = quoteCoverageChipOk(chip);
        const title =
          chip.kind === 'accommodation'
            ? ok
              ? 'Acomodación revisada'
              : 'Revisa o ajusta Acomodación (por defecto 2A en DBL)'
            : ok
              ? 'Incluido en la cotización'
              : 'Aún no agregado';
        return `<span class="coverage-chip ${ok ? 'coverage-chip--ok' : 'coverage-chip--miss'}" title="${title}">${escapeHtml(quoteCoverageChipText(chip))}</span>`;
      })
      .join('');
    coverageEl.innerHTML = chips;
  }
  if (warnBellSlot) {
    warnBellSlot.innerHTML = renderWarningsBellHtml(
      activeWarns.length,
      warningsPanelOpen
    );
  }
  if (warnPanelEl) {
    warnPanelEl.innerHTML = renderWarningsPanelHtml(
      wholesaleWarns,
      dismissedWarnings,
      escapeHtml,
      warningsPanelOpen
    );
  }
  if (paxEl) paxEl.textContent = formatPaxLabel();
  if (trmInput && document.activeElement !== trmInput) {
    trmInput.value = trmInputValue(trmRate);
  }
  if (trmSupInput && document.activeElement !== trmSupInput) {
    trmSupInput.value = String(Math.round(trmSuplemento));
  }
  if (trmEff) {
    const trm = effTrm();
    trmEff.textContent =
      trmRate > 0
        ? `usada ${formatTrmRate(trm)} (+${Math.round(trmSuplemento).toLocaleString('es-CO')})`
        : 'sin TRM';
    trmEff.title = `TRM usada = día + suplemento · ${getTrmReferencePage(trmSource)}`;
  }
  const trmRefreshBtn = document.querySelector(
    '.trm-refresh[data-action="refresh-trm"]'
  ) as HTMLButtonElement | null;
  if (trmRefreshBtn) {
    trmRefreshBtn.title = `Actualizar desde ${TRM_SOURCES[trmSource].label}`;
  }
  if (trmInput) {
    trmInput.title = `TRM del día (${TRM_SOURCES[trmSource].label})`;
  }
  if (modeEl && document.activeElement !== modeEl && modeEl.value !== quoteMode) {
    applyingQuoteMode = true;
    modeEl.value = quoteMode;
    applyingQuoteMode = false;
  }
  if (compareEl) compareEl.checked = hotelsAsOptions || quoteMode === 'wholesale';
  if (addOptBtn) addOptBtn.hidden = !(hotelsAsOptions || quoteMode === 'wholesale');

  document.querySelectorAll('.currency-btn').forEach((btn) => {
    const cur = (btn as HTMLElement).dataset.displayCurrency as DisplayCurrency;
    btn.classList.toggle('currency-btn--active', cur === displayCurrency);
    if (cur === 'USD') {
      (btn as HTMLButtonElement).disabled = !(effTrm() > 0);
    }
  });
}

function renderDashboard(): void {
  const stats = computeDashboardStats(history);
  const grid = document.getElementById('dash-stats');
  if (grid) {
    grid.innerHTML = [
      { label: 'Hoy', value: String(stats.today), sub: 'cotizaciones' },
      { label: 'Ayer', value: String(stats.yesterday), sub: 'cotizaciones' },
      { label: '7 días', value: String(stats.week), sub: 'cotizaciones' },
      { label: '30 días', value: String(stats.month), sub: 'cotizaciones' },
      {
        label: 'Ticket prom.',
        value: stats.avgTicketCop > 0 ? formatCartPrice('COP', stats.avgTicketCop) : '—',
        sub: 'COP · historial',
      },
      {
        label: 'Total mes',
        value: stats.totalQuotedCop > 0 ? formatCartPrice('COP', stats.totalQuotedCop) : '—',
        sub: 'suma COP en 30 días',
      },
    ]
      .map(
        (s) => `
        <div class="stat-card">
          <div class="label">${s.label}</div>
          <div class="value">${s.value}</div>
          <div class="sub">${s.sub}</div>
        </div>`
      )
      .join('');
  }

  const destUl = document.getElementById('dash-destinos');
  if (destUl) {
    destUl.innerHTML =
      stats.topDestinations.length === 0
        ? '<li><span>Sin datos aún</span></li>'
        : stats.topDestinations
            .map(
              (d) =>
                `<li><span>${escapeHtml(d.name)}</span><strong>${d.count}</strong></li>`
            )
            .join('');
  }

  const recentUl = document.getElementById('dash-recent');
  if (recentUl) {
    recentUl.innerHTML =
      stats.recent.length === 0
        ? '<li><span>Sin cotizaciones guardadas</span></li>'
        : stats.recent
            .map((h) => {
              const ref = formatQuoteRef(h.quoteNumber);
              const dest = h.destination || h.searchContext?.destinationText || '—';
              const total =
                typeof h.grandTotal === 'number'
                  ? formatCartPrice(h.primaryCurrency || 'COP', h.grandTotal)
                  : '—';
              return `<li><span>${escapeHtml(ref)} · ${escapeHtml(dest)}</span><strong>${escapeHtml(total)}</strong></li>`;
            })
            .join('');
  }
}

function hotelOptionChips(hotelId: string): string {
  if (!hotelsAsOptions || hotelOptionGroups.length === 0) return '';
  const chips = hotelOptionGroups
    .map((g, i) => {
      const on = g.hotelIds.includes(hotelId);
      return `<button type="button" class="opt-chip${on ? ' opt-chip--on' : ''}"
        data-action="toggle-hotel-option" data-option-id="${escapeAttr(g.id)}"
        data-hotel-id="${escapeAttr(hotelId)}">Opción ${i + 1}</button>`;
    })
    .join('');
  return `<div class="opt-chips">${chips}</div>`;
}

function feesMayorRedondeoDisplay(): number {
  const mayor = copAmountToDisplay(fees[MAYOR_VALOR_ID] || 0, displayCurrency, effTrm());
  const redondeo = copAmountToDisplay(fees[REDONDEO_ID] || 0, displayCurrency, effTrm());
  if (quoteMode === 'wholesale') return mayor + redondeo;
  return getFeesTotalDisplay(fees, 0, displayCurrency, effTrm());
}

function markAccommodationConfirmed(): void {
  if (accommodationConfirmed) return;
  accommodationConfirmed = true;
  void saveAccommodationConfirmed(true);
}

function wholesalePriceFns(): {
  linePrice: (item: CartItem) => number;
  baseLinePrice: (item: CartItem) => number;
} {
  return {
    linePrice: (item) => getItemLineTotal(item, displayCurrency, effTrm(), trmDiaOpt()).price,
    baseLinePrice: (item) => getItemBasePrice(item, displayCurrency, effTrm(), trmDiaOpt()).price,
  };
}

function taUnitDisplay(): number {
  if (!cartNeedsTaFee(items)) return 0;
  return copAmountToDisplay(taSelection.unitCop || 0, displayCurrency, effTrm());
}

function hotelsInOption(optionId: string): HotelCartItem[] {
  const g = hotelOptionGroups.find((o) => o.id === optionId);
  if (!g) return [];
  return g.hotelIds
    .map((id) => items.find((it) => it.id === id && it.type === 'hotel'))
    .filter((h): h is HotelCartItem => !!h);
}

function renderCompareOptionAdjControls(optionId: string, hotels: HotelCartItem[]): string {
  if (quoteMode !== 'wholesale' || hotels.length === 0) return '';
  const step = displayCurrency === 'USD' ? '0.01' : '100';
  const roundLabel = displayCurrency === 'COP' ? '…9.000' : '…9';
  const present = new Set<OccupancyTierCode>();
  for (const h of hotels) {
    for (const t of wholesaleTierWithOriginal(h.occupancyRates as OccupancyTierRates)) {
      present.add(t.tier);
    }
  }
  if (present.size === 0) return '';
  const current = formatOccupancyCurrentGuide(hotels[0]?.occupancyRates as OccupancyTierRates);
  const sonda = formatOccupancyBaselineGuide(hotels[0]?.occupancyRates as OccupancyTierRates);
  const guideHtml =
    sonda || current
      ? `<p class="item-occ-hint">${
          sonda ? `<strong>Sonda:</strong> ${escapeHtml(sonda)}` : ''
        }${
          current && current !== sonda
            ? `${sonda ? '<br>' : ''}<span class="item-occ-sonda">Hotel + mayor: ${escapeHtml(current)}</span>`
            : !sonda && current
              ? `<strong>Hotel:</strong> ${escapeHtml(current)}`
              : ''
        }</p>`
      : '';
  const tierRow = (tier: OccupancyTierCode, label: string) => {
    if (!present.has(tier)) return '';
    return `
    <div class="item-adj-row">
      <label>Mayor ${label}</label>
      <input type="number" min="0" step="${step}" class="option-mayor-input"
        data-option-id="${escapeAttr(optionId)}" data-occ-tier="${tier}" value=""
        title="Se suma solo a tarifa hotel pp ${label}" placeholder="0" />
    </div>`;
  };
  const autoOn = autoRoundOccupancy;
  return `
    <div class="compare-adj" data-option-id="${escapeAttr(optionId)}">
      <p class="item-occ-hint">Mayor valor por acomodación (${displayCurrency})</p>
      ${tierRow('sgl', 'SGL')}
      ${tierRow('dbl', 'DBL')}
      ${tierRow('tpl', 'TPL')}
      ${tierRow('qpl', 'QPL')}
      ${tierRow('chd', 'CHD')}
      <div class="item-adj-row item-adj-row--btns">
        <button type="button" class="btn-mini btn-auto-round${autoOn ? ' is-on' : ''}" data-action="toggle-auto-round"
          title="${
            autoOn
              ? 'Redondeo automático activo: Tarifa pp (paquete) termina en …9'
              : 'Redondeo automático off: solo al pulsar Redondeo en Tarifa pp'
          }">Red. Automático</button>
        <button type="button" class="btn-mini" data-action="round-option"
          data-option-id="${escapeAttr(optionId)}" title="Redondear Tarifa pp de esta opción a ${roundLabel}">Redondeo ${roundLabel}</button>
        <button type="button" class="btn-mini" data-action="restore-option-rates"
          data-option-id="${escapeAttr(optionId)}" title="Volver a valores de sonda BM">Restablecer</button>
      </div>
      ${guideHtml}
    </div>`;
}

function applyOptionMayorValor(optionId: string, bumps: MayorValorByTier): void {
  const any = (['sgl', 'dbl', 'tpl', 'qpl', 'chd'] as const).some(
    (k) => bumps[k] != null && bumps[k]! > 0
  );
  if (!any) return;
  const hotels = hotelsInOption(optionId);
  if (hotels.length === 0) return;
  const trm = effTrm();
  items = items.map((item) => {
    if (item.type !== 'hotel' || !hotels.some((h) => h.id === item.id) || !item.occupancyRates) {
      return item;
    }
    const next = applyMayorValorToOccupancyRates(
      item.occupancyRates as OccupancyTierRates,
      bumps,
      displayCurrency,
      trm,
      trmDiaOpt()
    );
    if (!next) return item;
    return { ...item, occupancyRates: next, mayorValor: 0, redondeo: 0 };
  });
  syncAutoRoundOccupancy();
  void saveItems().then(() => {
    renderCompareBlock();
    renderProductos();
    renderAccommodationPanel();
    void showQuotePreview();
  });
}

function roundOptionOccupancyRates(optionId: string): void {
  void setManualPackageRound(optionId, true).then(() => {
    renderCompareBlock();
    renderProductos();
    renderAccommodationPanel();
    renderTotal();
    void showQuotePreview();
  });
}

function restoreOptionOccupancyRates(optionId: string): void {
  const hotels = hotelsInOption(optionId);
  if (hotels.length === 0) return;
  items = items.map((item) => {
    if (item.type !== 'hotel' || !hotels.some((h) => h.id === item.id) || !item.occupancyRates) {
      return item;
    }
    const restored = restoreOccupancyFromBaseline(item.occupancyRates as OccupancyTierRates);
    if (!restored) return item;
    return { ...item, occupancyRates: restored, mayorValor: 0, redondeo: 0 };
  });
  void setManualPackageRound(optionId, false).then(async () => {
    syncAutoRoundOccupancy();
    await saveItems();
    renderCompareBlock();
    renderProductos();
    renderAccommodationPanel();
    void showQuotePreview();
  });
}

function compareSharedServicesHtml(): string {
  const rows: string[] = [];
  for (const item of items) {
    if (item.type === 'hotel') continue;
    if (item.type === 'flight') {
      const airline =
        item.legs?.[0]?.airlines?.[0] ||
        item.legs?.[0]?.segments?.[0]?.airlineName ||
        item.provider;
      const bits = [
        airline,
        item.origin?.code || item.origin?.name,
        item.destination?.code || item.destination?.name,
      ].filter(Boolean);
      rows.push(`<div class="compare-svc">✈️ ${escapeHtml(bits.join(' · ') || item.title || 'Vuelo')}</div>`);
    } else if (item.type === 'transfer') {
      rows.push(`<div class="compare-svc">🚕 ${escapeHtml(item.name)}</div>`);
    } else if (item.type === 'insurance') {
      rows.push(`<div class="compare-svc">🚑 ${escapeHtml(item.name)}</div>`);
    } else if (item.type === 'activity') {
      rows.push(`<div class="compare-svc">🎢 ${escapeHtml(item.name)}</div>`);
    } else if (item.type === 'tour') {
      const label = item.isBloqueo ? 'Bloqueo' : item.isCombinado ? 'Combinado' : 'Tour';
      rows.push(`<div class="compare-svc">🗺️ ${escapeHtml(label)}: ${escapeHtml(item.name)}</div>`);
    }
  }
  if (rows.length === 0) return '';
  return `<div class="compare-svcs">${rows.join('')}</div>`;
}

function renderCompareBlock(): void {
  const block = document.getElementById('compare-block');
  if (!block) return;
  if (!hotelsAsOptions || hotelOptionGroups.length === 0) {
    block.hidden = true;
    block.innerHTML = '';
    return;
  }
  block.hidden = false;
  const trm = effTrm();
  const pax = getTaPaxCount(items, tripGuide || readBriefingDraft(), searchContext);
  const taTotalCop = getTaTotal(taSelection, pax, items);
  const feesTotal = getFeesTotalDisplay(fees, taTotalCop, displayCurrency, trm);
  const opts = compareOptionTotals(items, hotelOptionGroups, feesTotal, displayCurrency, trm);
  const sharedServices = compareSharedServicesHtml();
  block.innerHTML = `
    <div class="compare-columns">
      ${hotelOptionGroups
        .map((g, i) => {
          const priced = opts.find((o) => o.id === g.id);
          const hotels = g.hotelIds
            .map((id) => items.find((it) => it.id === id && it.type === 'hotel'))
            .filter((h): h is HotelCartItem => !!h);
          const names =
            hotels.length === 0
              ? `<div class="hint">Sin hoteles — marca Opción ${i + 1}</div>`
              : hotels
                  .map((h) => {
                    const board = displayHotelBoardBasis(h.selectedRate.boardBasis);
                    const room = displayHotelRoomType(h.selectedRate.roomType);
                    const extra = [room, board].filter(Boolean).join(' · ');
                    const thumb = h.imageUrl
                      ? `<img class="compare-thumb" src="${escapeAttr(h.imageUrl)}" alt="" loading="lazy" />`
                      : '';
                    return `<div class="compare-hotel">${thumb}<div><strong>${escapeHtml(h.hotelName)}</strong>${
                      extra ? `<div class="hint">${escapeHtml(extra)}</div>` : ''
                    }</div></div>`;
                  })
                  .join('');
          const wholesaleBlock =
            quoteMode === 'wholesale' && hotels.length > 0
              ? (() => {
                  const { linePrice, baseLinePrice } = wholesalePriceFns();
                  const sum = summarizeWholesaleOption(
                    hotels,
                    items,
                    feesMayorRedondeoDisplay(),
                    Math.max(1, pax),
                    tripGuide?.roomPlan,
                    linePrice,
                    taUnitDisplay(),
                    baseLinePrice,
                    {
                      displayCurrency,
                      effTrm: effTrm(),
                      trmDia: trmDiaOpt(),
                      roundCharmNine: shouldRoundPackage(g.id),
                    }
                  );
                  const lines = sum.personLines
                    .map((line) => `<div class="total-row total-row--sub compare-tier"><span>${escapeHtml(line)}</span></div>`)
                    .join('');
                  const adj = renderCompareOptionAdjControls(g.id, hotels);
                  const miss = sum.missingHint
                    ? `<div class="hint">${escapeHtml(sum.missingHint)}</div>`
                    : '';
                  const tot =
                    occupancyTotalOpen && sum.groupTotal != null
                      ? `<div class="total-row total-row--grand"><span>Total según acomodación${sum.mixLabel ? ` (${escapeHtml(sum.mixLabel)})` : ''}</span><span>${escapeHtml(formatCartPrice(sum.currency, sum.groupTotal))}</span></div>`
                      : '';
                  return `${lines}${adj}${miss}${tot}`;
                })()
              : priced
                ? `<div class="total-row total-row--sub"><span>Por pax</span><strong>${escapeHtml(formatCartPrice(displayCurrency, priced.perPerson))}</strong></div>
                   <div class="total-row total-row--grand"><span>Total</span><span>${escapeHtml(formatCartPrice(displayCurrency, priced.total))}</span></div>`
                : '';
          return `
          <div class="compare-col">
            <div class="compare-col-head">
              <span>Opción ${i + 1}</span>
              ${
                hotelOptionGroups.length > 1
                  ? `<button type="button" class="btn-mini" data-action="remove-hotel-option" data-option-id="${escapeAttr(g.id)}">✕</button>`
                  : ''
              }
            </div>
            ${sharedServices}
            ${names}
            ${wholesaleBlock}
          </div>`;
        })
        .join('')}
    </div>`;
}

function itemAdjustmentsHtml(
  item: CartItem,
  opts?: { hideMayor?: boolean; hideTotal?: boolean }
): string {
  const trm = effTrm();
  const mayor = copAmountToDisplay(Math.max(0, Number(item.mayorValor) || 0), displayCurrency, trm);
  const redondeo = copAmountToDisplay(Math.max(0, Number(item.redondeo) || 0), displayCurrency, trm);
  const line = getItemLineTotal(item, displayCurrency, trm, trmDiaOpt());
  const native = getItemNativePrice(item);
  const id = escapeAttr(item.id);
  const step = displayCurrency === 'USD' ? '0.01' : '100';
  const roundLabel = '…9';
  const valorOriginal = formatValorOriginalDual(native.price, native.currency, trm);
  const { pax, breakdown } = serviceBreakdownPax(item);
  const totalLabel = formatServiceItemTotal(line.currency, line.price, pax, breakdown);
  const totalBlock =
    opts?.hideTotal || item.type === 'flight'
      ? ''
      : `<div class="item-line-total" data-item-id="${id}"><strong>${escapeHtml(totalLabel)}</strong></div>`;
  const mayorRow = opts?.hideMayor
    ? ''
    : `
      <div class="item-adj-row">
        <label for="item-mayor-${id}">Mayor valor (${displayCurrency})</label>
        <input id="item-mayor-${id}" class="item-adj-input" type="number" min="0" step="${step}"
          data-item-id="${id}" data-adj="mayorValor" value="${mayor}" />
      </div>`;
  return `
    <div class="item-adj">
      ${mayorRow}
      <div class="item-adj-row">
        <span class="item-adj-label">
          <label for="item-redondeo-${id}">Redondeo (${displayCurrency})</label>
          <button type="button" class="btn-mini" data-action="round-item" data-id="${id}"
            title="Redondear tarifas de acomodación SGL/DBL/TPL/CHD a …9">${roundLabel}</button>
        </span>
        <input id="item-redondeo-${id}" class="item-adj-input" type="number" min="0" step="${step}"
          data-item-id="${id}" data-adj="redondeo" value="${redondeo}" />
      </div>
      <div class="item-adj-row">
        <button type="button" class="btn-mini" data-action="restore-item-adj" data-item-id="${id}"
          title="Quitar mayor valor y redondeo">Restablecer</button>
      </div>
      <div class="item-adj-base">${escapeHtml(valorOriginal)}</div>
      ${totalBlock}
    </div>`;
}

function hotelRatesForDisplay(item: HotelCartItem): OccupancyTierRates | undefined {
  const raw = item.occupancyRates as OccupancyTierRates | undefined;
  if (!raw) return undefined;
  const fx = { effTrm: effTrm(), trmDia: trmDiaOpt(), displayCurrency };
  const coerced = sanitizeOccupancyRates(raw, fx);
  const converted = occupancyRatesToCurrency(coerced, displayCurrency, fx.effTrm, fx.trmDia);
  if (converted && (converted.currency || '').toUpperCase() === displayCurrency) return converted;
  return coerced;
}

function hotelWholesaleBreakdownHtml(item: HotelCartItem): string {
  if (quoteMode !== 'wholesale') return '';
  const rates = hotelRatesForDisplay(item);
  if (!rates) return '';
  const tiers = wholesaleTierWithOriginal(rates);
  const hasPlan = hasAccommodationPlan(tripGuide);
  const mix = hasPlan
    ? accommodationMixBreakdown(tripGuide?.roomPlan, rates)
    : { lines: [] as Array<{ code: string; count: number; total: number }>, subtotal: undefined };
  const mixByCode = new Map(mix.lines.map((l) => [l.code, l]));
  const codeForTier = (tier: string) =>
    tier === 'sgl'
      ? 'SGL'
      : tier === 'dbl'
        ? 'DBL'
        : tier === 'tpl'
          ? 'TPL'
          : tier === 'qpl'
            ? 'QPL'
            : 'CHD';
  const step = displayCurrency === 'USD' ? '0.01' : '100';
  const showTierMayor = !hotelsAsOptions;
  const parts: string[] = [];
  for (const t of tiers) {
    const cur = formatCartPrice(t.currency, t.current);
    if (t.original != null) {
      const delta = t.current - t.original;
      const deltaLabel =
        delta === 0
          ? ''
          : ` ${delta > 0 ? '+' : ''}${escapeHtml(formatCartPrice(t.currency, delta))} → `;
      parts.push(
        `<p class="item-occ-tier">Tarifa pp ${escapeHtml(t.label)}: ${escapeHtml(formatCartPrice(t.currency, t.original))}${deltaLabel}<strong>${escapeHtml(cur)}</strong></p>`
      );
    } else {
      parts.push(
        `<p class="item-occ-tier">Tarifa pp ${escapeHtml(t.label)}: <strong>${escapeHtml(cur)}</strong></p>`
      );
    }
    if (showTierMayor) {
      parts.push(`
        <div class="tier-mayor-row">
          <label>Mayor valor ${escapeHtml(codeForTier(t.tier))} (${displayCurrency})</label>
          <input type="number" min="0" step="${step}" class="tier-mayor-input"
            data-item-id="${escapeAttr(item.id)}" data-occ-tier="${t.tier}"
            value="" placeholder="0" title="Se suma solo a esta acomodación" />
        </div>`);
    }
    const mixLine = mixByCode.get(codeForTier(t.tier));
    if (mixLine) {
      parts.push(
        `<p class="item-occ-mix">${escapeHtml(mixLine.code)} x ${mixLine.count} = <strong>${escapeHtml(formatCartPrice(rates?.currency || 'COP', mixLine.total))}</strong></p>`
      );
      mixByCode.delete(codeForTier(t.tier));
    }
  }
  if (rates?.childEqualsAdult) {
    parts.push(`<p class="item-occ-tier">Tarifa pp NIÑO = tarifa adulto</p>`);
  }
  for (const l of mixByCode.values()) {
    parts.push(
      `<p class="item-occ-mix">${escapeHtml(l.code)} x ${l.count} = <strong>${escapeHtml(formatCartPrice(rates?.currency || 'COP', l.total))}</strong></p>`
    );
  }
  if (hasPlan && mix.subtotal != null) {
    parts.push(
      `<p class="item-occ-subtotal">Subtotal acomodación: <strong>${escapeHtml(formatCartPrice(rates?.currency || 'COP', mix.subtotal))}</strong></p>`
    );
  }
  if (parts.length === 0) return '';
  return `<div class="item-occ-values">${parts.join('')}</div>`;
}

function hotelOccupancyEditors(item: HotelCartItem): string {
  if (quoteMode !== 'wholesale') return '';
  const rates = hotelRatesForDisplay(item) || ({
    currency: item.selectedRate.currency || 'COP',
  } as OccupancyTierRates);
  const missHint = occupancyMissingHint(rates, occupancyHintOptsFromPlan(tripGuide?.roomPlan));
  const valuesHtml = hotelWholesaleBreakdownHtml(item);
  const missing = missHint
    ? `<p class="item-occ-hint">${escapeHtml(missHint)}</p>`
    : '';
  const baselineGuide = formatOccupancyBaselineGuide(rates);
  const resetRow = `<div class="item-occ-reset-row">
        <button type="button" class="btn-mini" data-action="restore-occ-rates" data-item-id="${escapeAttr(item.id)}"
          title="Volver a tarifas originales (antes de mayor valor / …9)">Restablecer</button>
        ${
          baselineGuide
            ? `<span class="item-occ-reset-guide">${escapeHtml(baselineGuide)}</span>`
            : ''
        }
      </div>`;
  return `
    <div class="item-occ-box" data-item-id="${escapeAttr(item.id)}">
      ${valuesHtml}
      ${missing}
      ${resetRow}
      <label class="item-occ-child-eq">
        <input type="checkbox" class="item-occ-child-eq-check" data-item-id="${escapeAttr(item.id)}"
          ${rates.childEqualsAdult ? 'checked' : ''} />
        Niño = adulto (sin CHD)
      </label>
      ${hotelsAsOptions ? '' : itemAdjustmentsHtml(item, { hideMayor: true })}
    </div>
  `;
}

function renderBriefingForm(): void {
  const g = tripGuide;
  const tripFields = document.getElementById('briefing-trip-fields');
  const roomsBlock = document.getElementById('briefing-rooms');
  const saveBtn = document.getElementById('btn-save-briefing');
  const datesBlock = document.querySelector('.briefing-dates') as HTMLElement | null;
  if (tripFields) tripFields.hidden = false;
  if (roomsBlock) roomsBlock.hidden = quoteMode === 'wholesale';
  if (datesBlock) datesBlock.hidden = quoteMode === 'wholesale';
  if (saveBtn) {
    saveBtn.hidden = false;
    saveBtn.textContent = quoteMode === 'wholesale' ? 'Guardar origen' : 'Guardar viaje';
  }

  const setVal = (id: string, value: string) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el || document.activeElement === el) return;
    // Date pickers often blur the input; don't clobber unsaved edits.
    if (
      (id === 'brief-in' || id === 'brief-out' || id === 'brief-origin' || id === 'brief-dest') &&
      el.value &&
      el.value !== value &&
      briefingNeedsSave()
    ) {
      return;
    }
    el.value = value;
  };
  const setReadonly = (id: string, value: string) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el || document.activeElement === el) return;
    el.value = value;
    el.readOnly = quoteMode === 'wholesale';
  };
  if (quoteMode === 'wholesale') {
    const ctx = enrichSearchContextFromItems(tripGuide, items) || tripGuide;
    setVal('brief-origin', g?.originText || ctx?.originText || '');
    const destEl = document.getElementById('brief-dest') as HTMLInputElement | null;
    if (destEl && document.activeElement !== destEl) {
      destEl.value = g?.destinationText || ctx?.destinationText || '';
      destEl.readOnly = !!g?.destinationPinned;
    }
  } else {
    setVal('brief-origin', g?.originText || '');
    setVal('brief-dest', g?.destinationText || '');
    const destEl = document.getElementById('brief-dest') as HTMLInputElement | null;
    if (destEl) destEl.readOnly = !!g?.destinationPinned;
    setVal('brief-in', toIsoDateInput(g?.checkIn));
    setVal('brief-out', toIsoDateInput(g?.checkOut));
    applyBriefingDateMins();
    const wrap = document.getElementById('brief-room-wrap');
    if (wrap) {
      wrap.innerHTML = roomPlanHtml(
        roomsFromBriefing(g?.roomPlan, g?.totalAdults ?? 2, g?.totalChildren ?? 0, g?.childrenAges)
      );
    }
  }
  syncDestPinButton();
  const originList = document.getElementById('origin-cities-list');
  if (originList) originList.outerHTML = originDatalistHtml(originCities, 'origin-cities-list');
  const destList = document.getElementById('bm-dests-list');
  if (destList) destList.outerHTML = destDatalistHtml(bmDestinations, 'bm-dests-list');
  refreshBriefNights();
  const roomsHint = document.getElementById('briefing-rooms-hint');
  if (roomsHint) roomsHint.hidden = true;
  const note = document.getElementById('briefing-note');
  if (note) {
    if (quoteMode === 'wholesale') {
      note.hidden = true;
      note.textContent = '';
      refreshBriefingSaveButton();
      return;
    }
    const missing = briefingMissingFields(g);
    if (missing.length > 0) {
      note.hidden = false;
      note.className = 'briefing-note briefing-note--warn';
      note.innerHTML = `Completa y <strong>Guardar viaje</strong> (faltan: ${escapeHtml(missing.join(', '))}).`;
    } else if (g && !g.destinationText?.trim()) {
      note.hidden = false;
      note.className = 'briefing-note briefing-note--warn';
      note.innerHTML =
        `Viaje guardado. Destino: escríbelo en <strong>Hoteles BM</strong> (fechas y pax se copian al Guardar). Luego busca o vuelve a Guardar viaje.`;
    } else if (!g) {
      note.hidden = false;
      note.className = 'briefing-note';
      note.textContent = 'Llena fechas y quién viaja, luego Guardar viaje. Nueva búsqueda limpia este formulario.';
    } else {
      note.hidden = true;
      note.textContent = '';
    }
  }
  refreshBriefingSaveButton();
}

function applyBriefingDateMins(): void {
  const today = isoDateToday();
  const inEl = document.getElementById('brief-in') as HTMLInputElement | null;
  const outEl = document.getElementById('brief-out') as HTMLInputElement | null;
  if (inEl) inEl.min = today;
  if (outEl) outEl.min = inEl?.value && inEl.value > today ? inEl.value : today;
}

function refreshBriefNights(): void {
  const el = document.getElementById('brief-nights');
  if (!el) return;
  if (quoteMode === 'wholesale') {
    const ctx = enrichSearchContextFromItems(tripGuide, items) || tripGuide;
    const n = nightsFromTripDates(ctx?.checkIn, ctx?.checkOut) || ctx?.nights || 0;
    el.textContent = n > 0 ? String(n) : '—';
    return;
  }
  const checkIn = (document.getElementById('brief-in') as HTMLInputElement | null)?.value;
  const checkOut = (document.getElementById('brief-out') as HTMLInputElement | null)?.value;
  const n = nightsFromTripDates(checkIn, checkOut);
  el.textContent = n > 0 ? String(n) : '—';
}

function quoteSearchContext(): SearchContext | null {
  return overlayBriefingPax(
    enrichSearchContextFromItems(headerSearchContext(tripGuide, searchContext, items), items),
    tripGuide || readBriefingDraft()
  );
}

function readBriefingDraft(): SearchContext {
  if (quoteMode === 'wholesale') {
    return (
      tripGuide ||
      buildTripBriefing({
        originText: '',
        destinationText: '',
        checkIn: '',
        checkOut: '',
        adults: 0,
        children: 0,
        childrenAges: [],
        roomPlan: [],
        previous: null,
      })
    );
  }
  const origin = (document.getElementById('brief-origin') as HTMLInputElement | null)?.value;
  const dest = (document.getElementById('brief-dest') as HTMLInputElement | null)?.value;
  const checkIn = (document.getElementById('brief-in') as HTMLInputElement | null)?.value;
  const checkOut = (document.getElementById('brief-out') as HTMLInputElement | null)?.value;
  const roomPlan = readRoomPlanFromRoot(document);
  return buildTripBriefing({
    originText: origin,
    destinationText: dest,
    checkIn: fromIsoDateInput(checkIn),
    checkOut: fromIsoDateInput(checkOut),
    adults: 0,
    children: 0,
    childrenAges: flattenChildAges(roomPlan),
    roomPlan,
    previous: tripGuide,
  });
}

function briefingNeedsSave(): boolean {
  if (quoteMode === 'wholesale') return false;
  const draft = readBriefingDraft();
  if (briefingMissingFields(draft).length > 0) return true;
  const g = tripGuide;
  if (!g) return true;
  const norm = (s?: string) => (s || '').trim();
  return (
    norm(g.originText) !== norm(draft.originText) ||
    norm(g.destinationText) !== norm(draft.destinationText) ||
    norm(g.checkIn) !== norm(draft.checkIn) ||
    norm(g.checkOut) !== norm(draft.checkOut) ||
    (g.totalAdults || 0) !== (draft.totalAdults || 0) ||
    (g.totalChildren || 0) !== (draft.totalChildren || 0) ||
    serializeRoomPlan(g.roomPlan || []) !== serializeRoomPlan(draft.roomPlan || []) ||
    (g.childrenAges || []).join(',') !== (draft.childrenAges || []).join(',')
  );
}

function refreshBriefingSaveButton(): void {
  const btn = document.getElementById('btn-save-briefing');
  if (!btn) return;
  btn.classList.toggle('btn-save-need', briefingNeedsSave());
}

function bindBriefingDirty(): void {
  const card = document.getElementById('briefing-card');
  card?.addEventListener('input', () => {
    applyBriefingDateMins();
    refreshBriefNights();
    refreshBriefingSaveButton();
  });
  card?.addEventListener('change', () => {
    applyBriefingDateMins();
    refreshBriefNights();
    refreshBriefingSaveButton();
  });
  card?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
    const action = btn?.dataset.action || '';
    if (!action.startsWith('room-') || !btn) return;
    e.preventDefault();
    const row = btn.closest('[data-room-idx]') as HTMLElement | null;
    const idx = Number(row?.dataset.roomIdx || '0');
    const next = mutateRoomPlan(readRoomPlanFromRoot(document), action, idx);
    const wrap = document.getElementById('brief-room-wrap');
    if (wrap) wrap.innerHTML = roomPlanHtml(next);
    refreshBriefingSaveButton();
  });
}

function fillOriginCitiesForm(): void {
  const list = document.getElementById('origin-cities-config');
  if (!list) return;
  list.innerHTML = originCities
    .map(
      (c) => `
      <div class="line-row" data-city="${escapeAttr(c)}">
        <input type="text" value="${escapeAttr(c)}" readonly />
        <button type="button" class="btn-del" data-action="delete-origin-city" title="Quitar">✕</button>
      </div>`
    )
    .join('');
}

function bindOriginCitiesForm(): void {
  document.getElementById('form-add-origin')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const name = String(fd.get('city') || '').trim();
    if (!name) return;
    void addOriginCity(name).then((next) => {
      originCities = next;
      fillOriginCitiesForm();
      renderBriefingForm();
      form.reset();
    });
  });
  document.getElementById('origin-cities-config')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-action="delete-origin-city"]');
    if (!btn) return;
    const row = (btn as HTMLElement).closest('[data-city]') as HTMLElement | null;
    const city = row?.dataset.city;
    if (!city) return;
    void removeOriginCity(city).then((next) => {
      originCities = next;
      fillOriginCitiesForm();
      renderBriefingForm();
    });
  });
}

function syncDestPinButton(): void {
  const btn = document.getElementById('btn-dest-pin');
  if (!btn) return;
  const pinned = !!tripGuide?.destinationPinned;
  btn.classList.toggle('dest-pin--on', pinned);
  btn.textContent = pinned ? 'Fijado' : 'Fijar';
  btn.title = pinned
    ? 'Destino fijado — clic para permitir cambios'
    : 'Fijar destino — no lo cambien otras búsquedas';
}

async function toggleDestinationPinFromPanel(): Promise<void> {
  const destEl = document.getElementById('brief-dest') as HTMLInputElement | null;
  const dest = (destEl?.value || tripGuide?.destinationText || '').trim();
  const pinned = !tripGuide?.destinationPinned;
  if (pinned && !dest) {
    window.alert('Escribe o busca un destino antes de fijarlo.');
    return;
  }
  tripGuide = buildTripBriefing({
    originText: tripGuide?.originText,
    destinationText: dest || tripGuide?.destinationText,
    checkIn: tripGuide?.checkIn,
    checkOut: tripGuide?.checkOut,
    adults: tripGuide?.totalAdults ?? 0,
    children: tripGuide?.totalChildren ?? 0,
    childrenAges: tripGuide?.childrenAges || [],
    roomPlan: tripGuide?.roomPlan,
    previous: tripGuide,
  });
  tripGuide.destinationPinned = pinned;
  tripGuide.destinationText = dest || tripGuide.destinationText;
  await saveTripGuide(tripGuide);
  renderBriefingForm();
  renderHeader();
}

async function saveBriefingFromPanel(): Promise<void> {
  const origin = (document.getElementById('brief-origin') as HTMLInputElement | null)?.value;
  const dest = (document.getElementById('brief-dest') as HTMLInputElement | null)?.value;
  const checkIn = (document.getElementById('brief-in') as HTMLInputElement | null)?.value;
  const checkOut = (document.getElementById('brief-out') as HTMLInputElement | null)?.value;
  const roomPlan = readRoomPlanFromRoot(document);

  if (quoteMode === 'wholesale') {
    tripGuide = buildTripBriefing({
      originText: origin,
      destinationText: dest || tripGuide?.destinationText,
      checkIn: tripGuide?.checkIn,
      checkOut: tripGuide?.checkOut,
      adults: 0,
      children: 0,
      childrenAges: tripGuide?.childrenAges || [],
      roomPlan: tripGuide?.roomPlan,
      previous: tripGuide,
    });
    await saveTripGuide(tripGuide);
    if (origin?.trim()) originCities = await addOriginCity(origin);
    renderHeader();
    renderBriefingForm();
    fillOriginCitiesForm();
    return;
  }

  const today = isoDateToday();
  const inIso = checkIn && checkIn < today ? today : checkIn;
  const outIso =
    checkOut && inIso && checkOut < inIso ? inIso : checkOut && checkOut < today ? today : checkOut;

  tripGuide = buildTripBriefing({
    originText: origin,
    destinationText: dest,
    checkIn: fromIsoDateInput(inIso) || tripGuide?.checkIn,
    checkOut: fromIsoDateInput(outIso) || tripGuide?.checkOut,
    adults: 0,
    children: 0,
    childrenAges: flattenChildAges(roomPlan),
    roomPlan,
    previous: tripGuide,
  });
  await saveTripGuide(tripGuide);
  if (origin?.trim()) originCities = await addOriginCity(origin);
  renderHeader();
  renderBriefingForm();
  fillOriginCitiesForm();
}

function updateHotelOccupancyField(
  itemId: string,
  field: 'sglPp' | 'dblPp' | 'tplPp' | 'chd',
  value: number | undefined
): void {
  items = items.map((item) => {
    if (item.type !== 'hotel' || item.id !== itemId) return item;
    const base: OccupancyTierRates = ensureOccupancyBaseline({
      ...(item.occupancyRates || {
        currency: item.selectedRate.currency || 'COP',
      }),
    });
    if (value == null || !Number.isFinite(value)) delete base[field];
    else base[field] = Math.round(value);
    return { ...item, occupancyRates: base };
  });
  syncAutoRoundOccupancy();
  void saveItems();
}

function setHotelChildEqualsAdult(itemId: string, equals: boolean): void {
  items = items.map((item) => {
    if (item.type !== 'hotel' || item.id !== itemId) return item;
    const base: OccupancyTierRates = {
      ...ensureOccupancyBaseline({
        ...(item.occupancyRates || {
          currency: item.selectedRate.currency || 'COP',
        }),
      }),
      childEqualsAdult: equals,
    };
    if (equals) delete base.chd;
    return { ...item, occupancyRates: base };
  });
  syncAutoRoundOccupancy();
  void saveItems().then(() => {
    renderProductos();
    void showQuotePreview();
  });
}

function restoreHotelOccupancyRates(itemId: string): void {
  items = items.map((item) => {
    if (item.type !== 'hotel' || item.id !== itemId || !item.occupancyRates) return item;
    const restored = restoreOccupancyFromBaseline(item.occupancyRates as OccupancyTierRates);
    if (!restored) return { ...item, mayorValor: 0, redondeo: 0 };
    return { ...item, occupancyRates: restored, mayorValor: 0, redondeo: 0 };
  });
  void saveItems().then(() => {
    renderProductos();
    renderAccommodationPanel();
    void showQuotePreview();
  });
}

function restoreItemAdjustments(itemId: string): void {
  items = items.map((item) =>
    item.id === itemId ? { ...item, mayorValor: 0, redondeo: 0 } : item
  );
  void saveItems().then(() => {
    renderProductos();
    renderTotal();
    void showQuotePreview();
  });
}

function itemShortLabel(item: CartItem): string {
  if (item.type === 'hotel') return item.hotelName;
  if (item.type === 'flight') return item.title || 'Vuelo';
  if (item.type === 'transfer') return item.name || 'Traslado';
  if (item.type === 'activity') return item.name || 'Actividad';
  if (item.type === 'tour') return item.name || 'Circuito';
  if (item.type === 'insurance') return item.name || 'Seguro';
  return 'Ítem';
}

function renderPackageRoundTotalRows(primary: string): string[] {
  if (quoteMode !== 'wholesale') return [];
  const rows: string[] = [];
  const byId = new Map(
    items.filter((i): i is HotelCartItem => i.type === 'hotel').map((h) => [h.id, h])
  );
  if (byId.size === 0) return rows;
  const groups =
    hotelOptionGroups.length > 0
      ? hotelOptionGroups
      : [{ id: 'all', hotelIds: [...byId.keys()] }];
  const pax = Math.max(1, getTaPaxCount(items, tripGuide || readBriefingDraft(), searchContext));
  const { linePrice, baseLinePrice } = wholesalePriceFns();
  const multi = groups.filter((g) => g.hotelIds.some((id) => byId.has(id))).length > 1;
  groups.forEach((g, i) => {
    if (!shouldRoundPackage(g.id)) return;
    const hotels = g.hotelIds.map((id) => byId.get(id)).filter((h): h is HotelCartItem => !!h);
    if (hotels.length === 0) return;
    const sum = summarizeWholesaleOption(
      hotels,
      items,
      feesMayorRedondeoDisplay(),
      pax,
      tripGuide?.roomPlan,
      linePrice,
      taUnitDisplay(),
      baseLinePrice,
      {
        displayCurrency,
        effTrm: effTrm(),
        trmDia: trmDiaOpt(),
        roundCharmNine: true,
      }
    );
    const optSuffix = multi ? ` · Opción ${i + 1}` : '';
    for (const e of packageRoundUpliftEntries(sum.roundUplift)) {
      rows.push(`
        <div class="total-row total-row--sub">
          <span>Redondeo …9 ${escapeHtml(e.label)}${escapeHtml(optSuffix)}</span>
          <span>${escapeHtml(formatCartPrice(sum.currency || primary, e.amount))}</span>
        </div>`);
    }
  });
  return rows;
}

function renderItemAdjTotalRows(primary: string, trm: number): string[] {
  const rows: string[] = [];
  for (const item of items) {
    const mayor = copAmountToDisplay(Math.max(0, Number(item.mayorValor) || 0), displayCurrency, trm);
    const redondeo = copAmountToDisplay(Math.max(0, Number(item.redondeo) || 0), displayCurrency, trm);
    const label = itemShortLabel(item);
    if (mayor > 0) {
      rows.push(`
        <div class="total-row total-row--sub">
          <span>Mayor valor · ${escapeHtml(label)}</span>
          <span>${escapeHtml(formatCartPrice(primary, mayor))}</span>
        </div>`);
    }
    if (redondeo > 0) {
      rows.push(`
        <div class="total-row total-row--sub">
          <span>Redondeo · ${escapeHtml(label)}</span>
          <span>${escapeHtml(formatCartPrice(primary, redondeo))}</span>
        </div>`);
    }
    if (quoteMode !== 'wholesale' && item.type === 'hotel' && item.occupancyRates) {
      const coerced = coerceOccupancyRateCurrency(item.occupancyRates as OccupancyTierRates);
      const converted = occupancyRatesToCurrency(coerced, displayCurrency, trm, trmDiaOpt());
      const rates =
        converted && (converted.currency || '').toUpperCase() === displayCurrency
          ? converted
          : coerced;
      for (const u of occupancyTierUpliftFromBaseline(rates)) {
        if (!(u.uplift > 0)) continue;
        rows.push(`
          <div class="total-row total-row--sub">
            <span>Mayor/ajuste ${escapeHtml(u.label)} · ${escapeHtml(label)}</span>
            <span>${escapeHtml(formatCartPrice(u.currency || primary, u.uplift))}</span>
          </div>`);
      }
    }
  }
  return rows;
}

function renderCostBreakdownRows(primary: string, trm: number): string[] {
  const rows: string[] = [];
  const hasPlan = hasAccommodationPlan(tripGuide);
  rows.push(`
    <div class="total-row total-row--head">
      <span>Desglose de costos</span>
      <span></span>
    </div>`);
  for (const item of items) {
    if (item.type === 'hotel') continue;
    const line = getItemLineTotal(item, displayCurrency, trm, trmDiaOpt());
    const { pax, breakdown } = serviceBreakdownPax(item);
    const label = itemShortLabel(item);
    const detail =
      breakdown && pax > 0
        ? formatServiceItemTotal(line.currency, line.price, pax, true)
        : formatCartPrice(line.currency, line.price);
    rows.push(`
      <div class="total-row total-row--sub">
        <span>${escapeHtml(label)}</span>
        <span>${escapeHtml(detail.replace(/^Total ítem:\s*/, ''))}</span>
      </div>`);
  }
  for (const hotel of items.filter((i): i is HotelCartItem => i.type === 'hotel')) {
    const rates = hotelRatesForDisplay(hotel);
    if (!rates) continue;
    rows.push(`
      <div class="total-row total-row--sub total-row--hotel">
        <span>🏨 ${escapeHtml(hotel.hotelName)}</span>
        <span></span>
      </div>`);
    for (const t of wholesaleTierWithOriginal(rates)) {
      rows.push(`
        <div class="total-row total-row--sub">
          <span>Tarifa pp ${escapeHtml(t.label)}</span>
          <span>${escapeHtml(formatCartPrice(t.currency, t.current))}</span>
        </div>`);
    }
    if (hasPlan) {
      const mix = accommodationMixBreakdown(tripGuide?.roomPlan, rates);
      for (const l of mix.lines) {
        rows.push(`
          <div class="total-row total-row--sub">
            <span>${escapeHtml(l.code)} x ${l.count}</span>
            <span>${escapeHtml(formatCartPrice(rates.currency || primary, l.total))}</span>
          </div>`);
      }
      if (mix.subtotal != null) {
        rows.push(`
          <div class="total-row total-row--sub">
            <span>Subtotal acomodación · ${escapeHtml(hotel.hotelName)}</span>
            <span>${escapeHtml(formatCartPrice(rates.currency || primary, mix.subtotal))}</span>
          </div>`);
      }
    }
  }
  return rows;
}

function applyHotelTierMayorValor(
  itemId: string,
  tier: OccupancyTierCode,
  mayorDisplay: number
): void {
  if (!(mayorDisplay > 0)) return;
  const item = items.find((i) => i.id === itemId);
  if (!item || item.type !== 'hotel' || !item.occupancyRates) return;
  const next = applyMayorValorToOccupancyRates(
    item.occupancyRates as OccupancyTierRates,
    { [tier]: mayorDisplay },
    displayCurrency,
    effTrm(),
    trmDiaOpt()
  );
  if (!next) return;
  items = items.map((i) =>
    i.id === itemId ? { ...i, occupancyRates: next, mayorValor: 0 } : i
  );
  syncAutoRoundOccupancy();
  void saveItems().then(() => {
    renderProductos();
    renderTotal();
    renderAccommodationPanel();
    void showQuotePreview();
  });
}

function applyHotelMayorValorToRates(itemId: string): void {
  const item = items.find((i) => i.id === itemId);
  if (!item || item.type !== 'hotel' || !item.occupancyRates) return;
  const mayorDisplay = copAmountToDisplay(
    Math.max(0, Number(item.mayorValor) || 0),
    displayCurrency,
    effTrm()
  );
  if (!(mayorDisplay > 0)) return;
  const next = applyMayorValorToOccupancyRates(
    item.occupancyRates as OccupancyTierRates,
    mayorDisplay,
    displayCurrency,
    effTrm(),
    trmDiaOpt()
  );
  if (!next) return;
  items = items.map((i) =>
    i.id === itemId ? { ...i, occupancyRates: next, mayorValor: 0 } : i
  );
  syncAutoRoundOccupancy();
  void saveItems().then(() => {
    renderProductos();
    renderAccommodationPanel();
    void showQuotePreview();
  });
}

function renderProductos(): void {
  const list = document.getElementById('productos-list');
  const clearBtn = document.getElementById('btn-clear-cart') as HTMLButtonElement | null;
  if (clearBtn) {
    clearBtn.disabled = items.length === 0 && !tripGuide && !searchContext;
  }
  if (!list) return;
  const savedScroll = list.scrollTop;
  if (items.length === 0) {
    list.innerHTML = tripGuide
      ? '<div class="empty">Carrito vacío. El formulario de arriba aún tiene un viaje guardado. Pulsa <strong>Nueva búsqueda</strong> para empezar de cero.</div>'
      : '<div class="empty">Carrito vacío. Agrega productos desde BookingMotor u otras OTAs con el lateral.</div>';
    renderCompareBlock();
    return;
  }
  if (suppressItemAdjRerender) {
    // Update only totals/chips outside focused inputs — skip full list rebuild
    renderCompareBlock();
    return;
  }
  const trm = effTrm();
  list.innerHTML = groupCartItemsForDisplay(items)
    .map((group) => {
      if (group.kind === 'item') return renderProductoArticle(group.item, trm);
      return `<div class="kit-block">
        <p class="kit-label">Kit · ${escapeHtml(group.hotel.hotelName)}</p>
        ${renderProductoArticle(group.hotel, trm)}
        ${group.transfers.map((t) => renderProductoArticle(t, trm)).join('')}
      </div>`;
    })
    .join('');
  list.scrollTop = savedScroll;
  renderCompareBlock();
}

function renderProductoArticle(item: CartItem, trm: number): string {
  const line = getItemLineTotal(item, displayCurrency, trm, trmDiaOpt());
  const chips = item.type === 'hotel' ? hotelOptionChips(item.id) : '';
  const occ = item.type === 'hotel' ? hotelOccupancyEditors(item) : '';
  const board =
    item.type === 'hotel' && item.selectedRate.boardBasis
      ? `<p class="item-board">🍴 ${escapeHtml(displayHotelBoardBasis(item.selectedRate.boardBasis))}</p>`
      : '';
  const flightDetails = item.type === 'flight' ? flightItemDetailsHtml(item) : '';
  const transferBtn =
    item.type === 'hotel'
      ? `<button type="button" class="btn-kit-transfer" data-action="search-hotel-transfer" data-id="${escapeAttr(item.id)}" title="Abre Traslados en BookingMotor con este hotel en Hasta">🚐 Traslado</button>`
      : '';
  const hideHotelAdj = quoteMode === 'wholesale' && item.type === 'hotel';
  const hotelTotalHtml =
    item.type === 'hotel'
      ? (() => {
          const { pax, breakdown } = serviceBreakdownPax(item);
          return `<div class="item-line-total" data-item-id="${escapeAttr(item.id)}"><strong>${escapeHtml(
            formatServiceItemTotal(line.currency, line.price, pax, breakdown)
          )}</strong></div>`;
        })()
      : '';
  return `
        <article class="item-row item-row--rich${item.type === 'transfer' && item.linkedHotelId ? ' item-row--kit-transfer' : ''}" data-id="${escapeAttr(item.id)}">
          <span class="item-type">${escapeHtml(item.type)}</span>
          <div class="item-body">
            <div class="item-top">
              <div>
                <div class="item-title-row">
                  <h3 class="item-title">${escapeHtml(itemTitle(item))}</h3>
                  ${transferBtn}
                  ${renderItemOpenLink(item)}
                </div>
                <p class="item-meta">${escapeHtml(itemMeta(item))}</p>
                ${flightDetails}
                ${board}
                ${occ}
                ${chips}
                ${hotelTotalHtml}
              </div>
              ${item.type === 'hotel' ? '' : `<div class="item-price">${escapeHtml(formatCartPrice(line.currency, line.price))}</div>`}
            </div>
            ${
              hideHotelAdj
                ? ''
                : item.type === 'hotel'
                  ? itemAdjustmentsHtml(item, { hideTotal: true })
                  : itemAdjustmentsHtml(item)
            }
          </div>
        </article>`;
}

async function buildHistoryParams(): Promise<HistoryBuildParams | null> {
  if (items.length === 0) return null;
  const quoteNumber = await ensurePendingQuoteNumber();
  const trm = effTrm();
  const subtotals = getTotalsByCurrency(items, displayCurrency, trm, trmDiaOpt());
  const primaryCurrency = getPrimaryCurrency(subtotals, displayCurrency) || 'COP';
  const itemsTotal = subtotals.get(primaryCurrency) || 0;
  const pax = getTaPaxCount(items, tripGuide || readBriefingDraft(), searchContext);
  const taTotalCop = getTaTotal(taSelection, pax, items);
  const feesTotal = getFeesTotalDisplay(fees, taTotalCop, displayCurrency, trm);
  const ctx = quoteSearchContext();
  return {
    quoteNumber,
    advisorName,
    clientName: clientName.trim() || undefined,
    agencyName: agencyName.trim() || undefined,
    destination: ctx?.destinationText,
    searchContext: ctx,
    items,
    fees,
    taTotal: taTotalCop || undefined,
    taSelection,
    trm: trmRate > 0 ? trmRate : undefined,
    trmSuplemento,
    initialDeposit: initialDeposit.trim() || undefined,
    grandTotal: itemsTotal + feesTotal,
    primaryCurrency,
    displayCurrency,
    quoteMode,
    hotelsAsOptions,
    hotelOptionGroups,
    occupancyTotalOpen,
    commissionApproxOpen,
    commissionApproxKind: commissionApproxKind || undefined,
    autoRoundOccupancy,
    showTrmInQuote,
    includeUsdEquiv,
    quoteLines: lines,
  };
}

function scheduleHistoryDraftSync(): void {
  void buildHistoryParams().then((params) => {
    if (params) scheduleHistoryDraft(params);
  });
}

async function saveItems(): Promise<void> {
  lastLocalCartWriteAt = Date.now();
  lockWholesaleTripFacts();
  await chrome.storage.local.set({ [STORAGE_KEY]: items });
  scheduleHistoryDraftSync();
}

function lockWholesaleTripFacts(): void {
  if (quoteMode !== 'wholesale') return;
  const next = mergeFirstTripFacts(tripGuide, items);
  if (!next || next === tripGuide) return;
  tripGuide = next;
  void saveTripGuide(next);
}

async function resetQuoteWorkspace(archiveReason: string): Promise<void> {
  const hasItems = items.length > 0;
  const hasTrip = Boolean(tripGuide) || Boolean(searchContext);
  if (!hasItems && !hasTrip) return;
  if (hasItems) {
    if (
      !confirm(
        '¿Vaciar el carrito? Se guardará en el historial si hay productos. También se limpia el formulario del viaje.'
      )
    ) {
      return;
    }
    await archiveCurrentCart(archiveReason);
  } else if (
    !confirm('¿Nueva búsqueda? Se limpia origen, destino, fechas y pasajeros. El carrito ya está vacío.')
  ) {
    return;
  }
  items = [];
  searchContext = null;
  tripGuide = null;
  fees = defaultFees();
  pendingQuoteNumber = null;
  clientName = '';
  initialDeposit = '';
  taSelection = applyTaType(taConfig, 'nacional_rt', effTrm());
  hotelOptionGroups = [];
  ignoreSearchUntil = Date.now() + 4000;
  await saveItems();
  try {
    await chrome.storage.local.remove(SEARCH_KEY);
  } catch {
    // ignore
  }
  await clearTripGuide();
  await saveFees();
  await savePendingQuoteNumber(null);
  await saveClientName('');
  await saveInitialDeposit('');
  occupancyTotalOpen = false;
  void saveOccupancyTotalOpen(false);
  commissionApproxOpen = false;
  commissionApproxKind = null;
  void saveCommissionApproxOpen(false);
  void saveCommissionApproxKind(null);
  accommodationConfirmed = false;
  void saveAccommodationConfirmed(false);
  void saveTaSelection(taSelection);
  void saveHotelCompareGroups([]);
  void clearDismissedWarnings();
  dismissedWarnings = [];
  warningsPanelOpen = false;
  refreshViews();
}

async function clearCartFromPanel(): Promise<void> {
  await resetQuoteWorkspace('Vaciar carrito');
}

async function startNewSearchFromPanel(): Promise<void> {
  await resetQuoteWorkspace('Nueva búsqueda');
  agencyName = '';
  trmSuplemento = DEFAULT_TRM_SUPLEMENTO;
  await saveAgencyName('');
  await saveTrmSuplemento(0);
  void signalBmClearMarks();
  void clearDismissedWarnings();
  dismissedWarnings = [];
  warningsPanelOpen = false;
  fillTrmSuplementoForm();
  refreshViews();
}

async function applyItemRounding(itemId: string): Promise<void> {
  const item = items.find((i) => i.id === itemId);
  if (!item) return;
  const trm = effTrm();

  if (item.type === 'hotel' && item.occupancyRates) {
    const rounded = charmNineOccupancyRates(
      item.occupancyRates as OccupancyTierRates,
      displayCurrency,
      trm,
      trmDiaOpt()
    );
    items = items.map((i) =>
      i.id === itemId
        ? { ...i, occupancyRates: rounded, redondeo: 0 }
        : i
    );
    await saveItems();
    renderProductos();
    renderTotal();
    renderAccommodationPanel();
    return;
  }

  const base = getItemBasePrice(item, displayCurrency, trm, trmDiaOpt());
  const mayor = copAmountToDisplay(Math.max(0, Number(item.mayorValor) || 0), displayCurrency, trm);
  const beforeRound = base.price + mayor;
  const excessDisplay = charmNineExcess(beforeRound, displayCurrency);
  items = items.map((i) =>
    i.id === itemId
      ? { ...i, redondeo: displayAmountToCop(excessDisplay, displayCurrency, trm) }
      : i
  );
  await saveItems();
  renderProductos();
  renderTotal();
}

function renderOccupancyTotalPanel(): string {
  const rooms = roomsFromBriefing(
    tripGuide?.roomPlan,
    tripGuide?.totalAdults || 2,
    tripGuide?.totalChildren || 0,
    tripGuide?.childrenAges
  );
  const { adults, children } = summarizeRoomPlan(rooms);
  const paxLabel =
    children > 0
      ? `${adults} adulto${adults !== 1 ? 's' : ''} + ${children} niño${children !== 1 ? 's' : ''}`
      : `${adults} adulto${adults !== 1 ? 's' : ''}`;
  return `
    <div class="occ-total occ-total--panel">
      <div id="occ-room-wrap">${roomPlanHtml(rooms)}</div>
      <p class="hint">Viajeros del mix: <strong>${escapeHtml(paxLabel)}</strong></p>
      <div class="occ-total-mix">
        <div class="occ-total-title">Vista cliente (WhatsApp / PDF)</div>
        ${renderOccupancyMixTotals()}
      </div>
      <label class="occ-include-wa">
        <input type="checkbox" id="auto-round-occ" ${autoRoundOccupancy ? 'checked' : ''} />
        Redondeo. Automático (Tarifa pp …9)
      </label>
      <label class="occ-include-wa">
        <input type="checkbox" id="pdf-insurance-annex" ${pdfInsuranceAnnex ? 'checked' : ''} />
        Mostrar anexo de asistencia en PDF
      </label>
      <label class="occ-include-wa">
        <input type="checkbox" id="occ-include-wa" ${occupancyTotalOpen ? 'checked' : ''} />
        Incluir valor total del mix en WhatsApp / PDF
      </label>
      <label class="occ-include-wa${occupancyTotalOpen ? '' : ' occ-include-wa--disabled'}" title="Requiere incluir el total del mix. La comisión es % de servicios (sin aéreos ni bloqueos).">
        <input type="checkbox" id="commission-approx" ${commissionApproxOpen ? 'checked' : ''} ${occupancyTotalOpen ? '' : 'disabled'} />
          Incluir valor aproximado de comisión (mensaje WhatsApp aparte)
        </label>
      ${
        occupancyTotalOpen && commissionApproxOpen
          ? `<div class="commission-kinds">
        <label class="commission-kind${commissionApproxKind === 'freelance' ? ' commission-kind--on' : ''}">
          <input type="radio" name="commission-kind" id="commission-kind-freelance" value="freelance" ${commissionApproxKind === 'freelance' ? 'checked' : ''} />
          Comisión aproximada para freelance 10%
        </label>
        <label class="commission-kind${commissionApproxKind === 'agency' ? ' commission-kind--on' : ''}">
          <input type="radio" name="commission-kind" id="commission-kind-agency" value="agency" ${commissionApproxKind === 'agency' ? 'checked' : ''} />
          Comisión aproximada para agencia 12%
        </label>
      </div>`
          : ''
      }
      <label class="occ-include-wa" title="Solo TRM del día; el suplemento nunca se muestra al cliente">
        <input type="checkbox" id="show-trm-quote" ${showTrmInQuote ? 'checked' : ''} />
        Mostrar TRM del día en PDF y WhatsApp
      </label>
      <p class="hint">El cliente solo ve tarifas por acomodación. El total del mix solo si marcas la casilla. La comisión va en un segundo mensaje WhatsApp (Copiar comisión), no en la cotización ni en el PDF.</p>
    </div>`;
}

function renderAccommodationPanel(): void {
  const card = document.getElementById('accommodation-card');
  const view = document.getElementById('accommodation-view');
  const empty = document.getElementById('accommodation-empty');
  syncWorkspaceTabsVisibility();
  if (!card || !view) return;
  if (quoteMode !== 'wholesale') {
    card.hidden = true;
    view.innerHTML = '';
    if (empty) {
      empty.hidden = false;
      empty.textContent = 'Disponible en modo Mayorista.';
    }
    return;
  }
  card.hidden = false;
  if (empty) empty.hidden = true;
  view.innerHTML = renderOccupancyTotalPanel();
}

function renderOccupancyMixTotals(): string {
  const byId = new Map(
    items.filter((i): i is HotelCartItem => i.type === 'hotel').map((h) => [h.id, h])
  );
  const groups =
    hotelOptionGroups.length > 0
      ? hotelOptionGroups
      : [{ id: 'all', hotelIds: [...byId.keys()] }];
  const pax = Math.max(1, getTaPaxCount(items, tripGuide || readBriefingDraft(), searchContext));
  const trm = effTrm();
  const clientLead = formatWholesaleClientTotalLead(tripGuide?.roomPlan, {
    adults: tripGuide?.totalAdults,
    children: tripGuide?.totalChildren,
  });
  const bits: string[] = [];
  groups.forEach((g, i) => {
    const hotels = g.hotelIds.map((id) => byId.get(id)).filter((h): h is HotelCartItem => !!h);
    if (hotels.length === 0) return;
    const { linePrice, baseLinePrice } = wholesalePriceFns();
    const sum = summarizeWholesaleOption(
      hotels,
      items,
      feesMayorRedondeoDisplay(),
      pax,
      tripGuide?.roomPlan,
      linePrice,
      taUnitDisplay(),
      baseLinePrice,
      {
        displayCurrency,
        effTrm: trm,
        trmDia: trmDiaOpt(),
        roundCharmNine: shouldRoundPackage(g.id),
      }
    );
    const hotelNames = hotels.map((h) => h.hotelName).filter(Boolean).join(' · ');
    if (sum.personLines.length === 0 && sum.groupTotal == null) {
      bits.push(
        `<div class="client-opt">
          <div class="client-opt-head">Opción ${i + 1}${hotelNames ? ` · ${escapeHtml(hotelNames)}` : ''}</div>
          <p class="hint">${sum.missingHint ? escapeHtml(sum.missingHint) : 'Faltan tarifas pp.'}</p>
        </div>`
      );
      return;
    }
    const rateRows = sum.personLines
      .map((line) => `<div class="total-row total-row--sub"><span>${escapeHtml(line)}</span></div>`)
      .join('');
    const grand =
      occupancyTotalOpen && sum.groupTotal != null && clientLead
        ? `<p class="client-grand">${escapeHtml(clientLead)} = <strong>${escapeHtml(
            formatCartPrice(sum.currency, sum.groupTotal)
          )}</strong></p>`
        : occupancyTotalOpen && sum.groupTotal != null
          ? `<p class="client-grand">Total = <strong>${escapeHtml(
              formatCartPrice(sum.currency, sum.groupTotal)
            )}</strong></p>`
          : '';
    const commissionAmt =
      occupancyTotalOpen &&
      commissionApproxOpen &&
      (commissionApproxKind === 'freelance' || commissionApproxKind === 'agency')
        ? approxCommissionAmount(sum.commissionableGroupTotal, commissionApproxKind)
        : undefined;
    const commissionLine =
      commissionAmt != null
        ? `<p class="client-commission">Valor aproximado de comisión: <strong>${escapeHtml(
            formatCartPrice(sum.currency, commissionAmt)
          )}</strong></p>`
        : '';
    const breakdown = buildWholesaleOptionBreakdown(
      i,
      g.id,
      hotels,
      items,
      feesMayorRedondeoDisplay(),
      pax,
      tripGuide?.roomPlan,
      linePrice,
      taUnitDisplay(),
      { displayCurrency, effTrm: trm, trmDia: trmDiaOpt() },
      tripGuide ?? undefined
    );
    breakdown.missingHint = sum.missingHint;
    breakdown.groupTotal = sum.groupTotal;
    bits.push(`
      <div class="client-opt">
        <div class="client-opt-head">Opción ${i + 1}${hotelNames ? ` · ${escapeHtml(hotelNames)}` : ''}</div>
        ${rateRows}
        ${grand}
        ${commissionLine}
        <details class="advisor-break">
          <summary>Desglose asesor (no va al cliente)</summary>
          ${renderWholesaleBreakdownTable(breakdown, escapeHtml, formatCartPrice)}
        </details>
        <div style="margin:4px 0 12px">
          <button type="button" class="btn-mini" data-action="restore-option-rates"
            data-option-id="${escapeAttr(g.id)}">Restablecer tarifas</button>
        </div>
      </div>`);
  });
  return bits.join('') || `<p class="hint">Arma DBL / TPL / niños para ver tarifas por acomodación.</p>`;
}

function renderTotal(): void {
  const feesEl = document.getElementById('total-fees');
  const totalsEl = document.getElementById('total-totals');
  const trm = effTrm();
  const pax = getTaPaxCount(items, tripGuide || readBriefingDraft(), searchContext);
  const taTotalCop = getTaTotal(taSelection, pax, items);
  const feeStep = displayCurrency === 'USD' ? '0.01' : '100';

  if (items.length === 0) {
    if (feesEl) feesEl.innerHTML = '<p class="hint">Agrega productos al carrito para editar Total.</p>';
    if (totalsEl) totalsEl.innerHTML = '';
    renderAccommodationPanel();
    return;
  }

  if (feesEl && !suppressFeeRerender) {
    const feeRows =
      quoteMode === 'wholesale'
        ? ''
        : FEE_DEFINITIONS.filter((def) => def.id !== MAYOR_VALOR_ID)
            .map(
              (def) => `
      <div class="fee-row">
        <label for="fee-${def.id}">${escapeHtml(def.label)} (${displayCurrency})</label>
        <input type="number" min="0" step="${feeStep}" id="fee-${def.id}" data-fee-id="${def.id}"
          class="fee-input" value="${copAmountToDisplay(fees[def.id] ?? 0, displayCurrency, trm)}" />
      </div>`
            )
            .join('');

    const type = taSelection.type;
    const mayorValorDisplay = copAmountToDisplay(fees[MAYOR_VALOR_ID] || 0, displayCurrency, trm);
    const taApplies = cartNeedsTaFee(items);
    const taUnitShown = taUnitDisplay();
    feesEl.innerHTML = `
      ${feeRows}
      <div class="ta-block">
        <div class="fee-row">
          <label for="fee-${MAYOR_VALOR_ID}">Mayor valor (${displayCurrency})</label>
          <input type="number" min="0" step="${feeStep}" id="fee-${MAYOR_VALOR_ID}" data-fee-id="${MAYOR_VALOR_ID}"
            class="fee-input" value="${mayorValorDisplay}"
            title="Se suma a los subtotales de las opciones" />
        </div>
        <div class="fee-row">
          <label for="ta-type">Tipo TA</label>
          <select id="ta-type" class="ta-type" ${taApplies ? '' : 'disabled'}>
            <option value="nacional_rt" ${type === 'nacional_rt' ? 'selected' : ''}>Ida y vuelta (nacional)</option>
            <option value="nacional_ow" ${type === 'nacional_ow' ? 'selected' : ''}>Solo ida (nacional)</option>
            <option value="internacional" ${type === 'internacional' ? 'selected' : ''}>Internacional (USD)</option>
          </select>
        </div>
        <div class="fee-row">
          <label for="ta-unit">Valor de TA (${displayCurrency})</label>
          <input type="number" min="0" step="${feeStep}" id="ta-unit" class="ta-unit"
            ${taApplies ? '' : 'disabled'}
            value="${taApplies ? copAmountToDisplay(taSelection.unitCop || 0, displayCurrency, trm) : 0}" />
        </div>
        <div class="ta-summary" id="ta-summary">
          ${
            quoteMode === 'wholesale'
              ? `TA por persona (sumada a tarifa pp) =
          <strong>${escapeHtml(formatCartPrice(displayCurrency, taUnitShown))}</strong>`
              : `TA × ${pax} pasajero${pax !== 1 ? 's' : ''} =
          <strong>${escapeHtml(formatCartPrice(displayCurrency, copAmountToDisplay(taTotalCop, displayCurrency, trm)))}</strong>`
          }
          <button type="button" class="btn-mini" data-action="ta-from-flight" ${taApplies ? '' : 'disabled'}>Según vuelo</button>
        </div>
        <div class="ta-hint">${escapeHtml(taTypeLabel(type))}${
          type === 'internacional' && trm > 0 && taApplies
            ? ` · ${taConfig.internacionalUsd} USD × TRM ${formatTrmRate(trm)}`
            : ''
        }${escapeHtml(taFeeHintForItems(items))}</div>
      </div>
      ${
        quoteMode === 'wholesale'
          ? `
      <div class="fee-row">
        <label for="initial-deposit">Depósito inicial</label>
        <input type="text" id="initial-deposit" class="initial-deposit" maxlength="120"
          placeholder="Texto tras 💰*DEPÓSITO INICIAL:*"
          value="${escapeAttr(initialDeposit)}" />
      </div>`
          : ''
      }
    `;
  }

  if (totalsEl) {
    const subtotals = getTotalsByCurrency(items, displayCurrency, trm, trmDiaOpt());
    const feesTotal = getFeesTotalDisplay(fees, taTotalCop, displayCurrency, trm);
    const primary = getPrimaryCurrency(subtotals, displayCurrency);
    const mayorValor = copAmountToDisplay(fees[MAYOR_VALOR_ID] || 0, displayCurrency, trm);
    const redondeo = copAmountToDisplay(fees[REDONDEO_ID] || 0, displayCurrency, trm);
    const taDisplay = copAmountToDisplay(taTotalCop, displayCurrency, trm);
    const paxForRate = Math.max(1, pax);
    const rows: string[] = [];
    const briefCtx = tripGuide || searchContext;
    const paxSuffix =
      hasAccommodationPlan(briefCtx) && formatBriefingPaxCompact(briefCtx)
        ? ` (${formatBriefingPaxCompact(briefCtx)})`
        : '';
    const feesOnOptions = mayorValor + redondeo;

    rows.push(`
      <div class="total-row total-row--sub total-row--vista">
        <span>Vista de montos</span>
        <span>Todo en ${escapeHtml(displayCurrency)}</span>
      </div>`);

    if (hotelsAsOptions && hotelOptionGroups.length > 0) {
      const optionSubs = compareOptionSubtotals(
        items,
        hotelOptionGroups,
        displayCurrency,
        trm > 0 ? trm : 0,
        feesOnOptions
      );
      for (const opt of optionSubs) {
        rows.push(`
        <div class="total-row total-row--opt">
          <span>Subtotal ${escapeHtml(primary)} Opción ${opt.index}${escapeHtml(paxSuffix)}</span>
          <span>${escapeHtml(formatCartPrice(primary, opt.subtotal))}</span>
        </div>`);
      }
    } else {
      for (const [currency, value] of subtotals) {
        rows.push(`
        <div class="total-row total-row--opt">
          <span>Subtotal ${escapeHtml(currency)}</span>
          <span>${escapeHtml(formatCartPrice(currency, value + (currency === primary ? feesOnOptions : 0)))}</span>
        </div>`);
      }
    }
    rows.push(...renderCostBreakdownRows(primary, trm));
    if (mayorValor > 0 || fees[MAYOR_VALOR_ID] != null) {
      rows.push(`
        <div class="total-row total-row--sub">
          <span>Mayor valor (global${hotelsAsOptions && hotelOptionGroups.length > 0 ? ', en cada opción' : ''})</span>
          <span>${escapeHtml(formatCartPrice(primary, mayorValor))}</span>
        </div>`);
    }
    rows.push(...renderItemAdjTotalRows(primary, trm));
    rows.push(...renderPackageRoundTotalRows(primary));
    if (redondeo > 0) {
      rows.push(`
        <div class="total-row total-row--sub">
          <span>Redondeo (global)</span>
          <span>${escapeHtml(formatCartPrice(primary, redondeo))}</span>
        </div>`);
    }
    if (taDisplay > 0 || (quoteMode === 'wholesale' && taUnitDisplay() > 0)) {
      const taLabel = quoteMode === 'wholesale' ? 'TA por persona' : `TA × ${pax} pax`;
      const taAmount = quoteMode === 'wholesale' ? taUnitDisplay() : taDisplay;
      rows.push(`
        <div class="total-row total-row--sub">
          <span>${escapeHtml(taLabel)}</span>
          <span>${escapeHtml(formatCartPrice(primary, taAmount))}</span>
        </div>`);
    }

    const roundLabel = displayCurrency === 'USD' ? 'decena de USD' : 'decena de mil';
    if (quoteMode !== 'wholesale') {
      rows.push(`
      <div class="rounding-row">
        <div>Redondeo: <strong>${escapeHtml(formatCartPrice(primary, redondeo))}</strong></div>
        <button type="button" class="btn-round" data-action="round"
          title="Excedente hasta la siguiente ${roundLabel}">Redondear</button>
      </div>`);
    }

    if (hotelsAsOptions && hotelOptionGroups.length > 0) {
      const byId = new Map(
        items.filter((i): i is HotelCartItem => i.type === 'hotel').map((h) => [h.id, h])
      );
      const sharedServices = compareSharedServicesHtml();
      const cols = hotelOptionGroups
        .map((g, i) => {
          const hotels = g.hotelIds.map((id) => byId.get(id)).filter((h): h is HotelCartItem => !!h);
          if (quoteMode === 'wholesale') {
            if (hotels.length === 0) {
              return `<div class="compare-col"><div class="compare-col-head">Opción ${i + 1}</div><div class="hint">Sin hoteles</div></div>`;
            }
            const { linePrice, baseLinePrice } = wholesalePriceFns();
            const sum = summarizeWholesaleOption(
              hotels,
              items,
              feesMayorRedondeoDisplay(),
              paxForRate,
              tripGuide?.roomPlan,
              linePrice,
              taUnitDisplay(),
              baseLinePrice,
              {
                displayCurrency,
                effTrm: effTrm(),
                trmDia: trmDiaOpt(),
                roundCharmNine: shouldRoundPackage(g.id),
              }
            );
            const hotelBits = hotels
              .map((h) => {
                const thumb = h.imageUrl
                  ? `<img class="compare-thumb" src="${escapeAttr(h.imageUrl)}" alt="" loading="lazy" />`
                  : '';
                return `<div class="compare-hotel">${thumb}<div><strong>${escapeHtml(h.hotelName)}</strong></div></div>`;
              })
              .join('');
            const lines = sum.personLines
              .map((line) => `<div class="total-row total-row--sub"><span>${escapeHtml(line)}</span></div>`)
              .join('');
            const tot =
              occupancyTotalOpen && sum.groupTotal != null
                ? `<div class="total-row total-row--grand"><span>Total según acomodación${sum.mixLabel ? ` (${escapeHtml(sum.mixLabel)})` : ''}</span><span>${escapeHtml(formatCartPrice(sum.currency, sum.groupTotal))}</span></div>`
                : '';
            return `
              <div class="compare-col">
                <div class="compare-col-head"><span>Opción ${i + 1}</span></div>
                ${sharedServices}
                ${hotelBits}
                ${lines}
                ${tot}
              </div>`;
          }
          const opts = compareOptionTotals(items, hotelOptionGroups, feesTotal, displayCurrency, trm);
          const opt = opts[i];
          const hotelBits = hotels
            .map((h) => `<div><strong>${escapeHtml(h.hotelName)}</strong></div>`)
            .join('');
          return `
            <div class="compare-col">
              <div class="compare-col-head"><span>Opción ${i + 1}</span></div>
              ${sharedServices}
              ${hotelBits || '<div class="hint">Sin hoteles</div>'}
              ${
                opt
                  ? `<div class="total-row total-row--sub"><span>Por pax (${opt.pax})</span><strong>${escapeHtml(formatCartPrice(displayCurrency, opt.perPerson))}</strong></div>
                     <div class="total-row total-row--grand"><span>Total</span><span>${escapeHtml(formatCartPrice(displayCurrency, opt.total))}</span></div>`
                  : ''
              }
            </div>`;
        })
        .join('');
      rows.push(`<div class="compare-columns compare-columns--totals">${cols}</div>`);
    } else {
      for (const [currency, value] of subtotals) {
        const total = currency === primary ? value + feesTotal : value;
        const perPerson = Math.round(total / paxForRate);
        rows.push(`
          <div class="total-row total-row--sub">
            <span>Valor por pasajero (${escapeHtml(currency)})</span>
            <span>${escapeHtml(formatCartPrice(currency, perPerson))}</span>
          </div>
          <div class="total-row total-row--grand">
            <span>Total ${escapeHtml(currency)} (${paxForRate} pax)</span>
            <span>${escapeHtml(formatCartPrice(currency, total))}</span>
          </div>`);
      }
    }

    totalsEl.innerHTML = rows.join('');
  }
  renderAccommodationPanel();
}

function renderWhatsApp(): void {
  const el = document.getElementById('whatsapp-view');
  if (!el) return;

  if (items.length === 0) {
    el.innerHTML =
      '<div class="empty">Agrega productos al carrito para generar la cotización WhatsApp.</div>';
    return;
  }

  const group = (kind: QuoteLine['kind'], title: string) => {
    const kindLines = lines.filter((l) => l.kind === kind);
    if (kindLines.length === 0) return '';
    return `
      <div class="quote-group-title">${title}</div>
      ${kindLines
        .map(
          (l) => `
        <label class="quote-line">
          <input type="checkbox" class="quote-check" data-line-id="${escapeAttr(l.id)}" ${l.enabled ? 'checked' : ''} />
          <span>${escapeHtml((l.emoji ? l.emoji + ' ' : '') + l.text)}</span>
        </label>`
        )
        .join('')}`;
  };

  const status =
    quoteCopyStatus === 'ok'
      ? `<div class="quote-status">${escapeHtml(quoteStatusMessage || '✓ Listo')}</div>`
      : quoteCopyStatus === 'err'
        ? `<div class="quote-status quote-status--err">${escapeHtml(
            quoteStatusMessage || 'No se pudo completar la acción.'
          )}</div>`
        : quoteStatusMessage
          ? `<div class="quote-status">${escapeHtml(quoteStatusMessage)}</div>`
          : '<div class="quote-status"></div>';

  el.innerHTML = `
    <div class="card">
      <h2>1 · Cotización para el pasajero</h2>
      ${status}
      <p class="hint" style="margin-top:0">La comisión aproximada no va aquí: usa el mensaje 2 (confidencial).</p>
      <textarea class="quote-preview" id="quote-preview" spellcheck="true"></textarea>
      <div class="quote-actions">
        <button type="button" class="btn-primary" data-action="copy-quote">Copiar WhatsApp</button>
        <button type="button" class="btn-chat" data-action="send-chat-center"
          title="Pega la cotización en la oportunidad abierta de Chat Center">Enviar a Chat Center</button>
        <button type="button" class="btn-pdf" data-action="download-pdf">Descargar PDF</button>
        <button type="button" class="btn-ghost" data-action="preview-quote">Regenerar desde carrito</button>
      </div>
      <label class="quote-opt">
        <input type="checkbox" id="usd-equiv-check" ${includeUsdEquiv ? 'checked' : ''} />
        Incluir conversión COP ↔ USD (TRM) en el mensaje
      </label>
      <div id="commission-wa-box" class="commission-wa" hidden>
        <h2>2 · Comisión aproximada (confidencial)</h2>
        <p class="hint" style="margin-top:0">Segundo mensaje — no enviar al pasajero. Actívalo en Acomodación.</p>
        <textarea class="commission-preview" id="commission-preview" readonly spellcheck="false"></textarea>
        <div class="quote-actions">
          <button type="button" class="btn-commission" data-action="copy-commission">Copiar comisión</button>
        </div>
      </div>
    </div>
    <div class="card">
      <h2>Qué incluir</h2>
      <p class="hint" style="margin-top:0">Editar catálogo en Config. Aquí solo marcas cuáles van al regenerar.</p>
      ${group('include', 'Tarifa incluye')}
      ${group('exclude', 'Plan no incluye')}
      ${group('policy', 'Nota importante')}
    </div>
  `;

  void showQuotePreview();
}

function ensureBriefingOrWarn(): boolean {
  if (quoteMode === 'wholesale') return true;
  if (isTripBriefingComplete(tripGuide)) return true;
  const missing = briefingMissingForQuote(tripGuide);
  quoteCopyStatus = 'err';
  quoteStatusMessage = `Completa el viaje (faltan: ${missing.join(', ') || 'datos'}) y pulsa Guardar viaje.`;
  selectTab('whatsapp');
  renderWhatsApp();
  renderBriefingForm();
  return false;
}

function renderHistorial(): void {
  const list = document.getElementById('historial-list');
  if (!list) return;
  if (history.length === 0) {
    list.innerHTML =
      '<div class="empty">Aún no hay cotizaciones en el historial local.<br>Se guarda al copiar WhatsApp, PDF o vaciar. Usa <strong>Exportar historial</strong> / <strong>Importar historial</strong> para respaldo.</div>';
    return;
  }
  list.innerHTML = history
    .map((h) => {
      const ctx = h.searchContext;
      const dest = h.destination || ctx?.destinationText || '—';
      const origin = ctx?.originText?.trim() || '';
      const client = h.clientName || '—';
      const total =
        typeof h.grandTotal === 'number'
          ? formatCartPrice(h.primaryCurrency || 'COP', h.grandTotal)
          : '—';
      const when = new Date(h.createdAt).toLocaleString('es-CO');
      const dates =
        ctx?.checkIn || ctx?.checkOut
          ? `${ctx?.checkIn || '?'}${ctx?.checkOut ? ` → ${ctx.checkOut}` : ''}${
              ctx?.nights ? ` · ${ctx.nights}n` : ''
            }`
          : '';
      const paxParts: string[] = [];
      if (ctx && ctx.totalAdults + ctx.totalChildren > 0) {
        if (ctx.totalAdults > 0) paxParts.push(`${ctx.totalAdults} adt`);
        if (ctx.totalChildren > 0) paxParts.push(`${ctx.totalChildren} chd`);
      }
      const mode =
        h.quoteMode === 'wholesale'
          ? 'Mayorista'
          : h.quoteMode === 'retail'
            ? 'Minorista'
            : '';
      const tripBits = [origin && `Origen: ${origin}`, dates, paxParts.join(' · '), mode]
        .filter(Boolean)
        .join(' · ');
      return `
        <article class="item-row item-row--rich">
          <span class="item-type">${escapeHtml(formatQuoteRef(h.quoteNumber))}</span>
          <div class="item-body">
            <div class="item-top">
              <div>
                <h3 class="item-title">${escapeHtml(dest)}</h3>
                <p class="item-meta">${escapeHtml(client)} · ${escapeHtml(when)} · ${h.items.length} ítem(s)</p>
                ${tripBits ? `<p class="item-meta">${escapeHtml(tripBits)}</p>` : ''}
              </div>
              <div class="item-price">${escapeHtml(total)}</div>
            </div>
            <button type="button" class="btn-restore-hist" data-action="restore-history" data-quote-number="${h.quoteNumber}">
              Restaurar al carrito
            </button>
          </div>
        </article>`;
    })
    .join('');
}

function renderLists(): void {
  renderKind('include', 'list-include');
  renderKind('exclude', 'list-exclude');
  renderKind('policy', 'list-policy');
}

function renderKind(kind: QuoteLineKind, listId: string): void {
  const list = document.getElementById(listId);
  if (!list) return;
  const kindLines = lines.filter((l) => l.kind === kind);
  list.innerHTML = kindLines
    .map(
      (l) => `
      <div class="line-row" data-id="${escapeAttr(l.id)}">
        <input class="emoji-input" type="text" maxlength="4" value="${escapeAttr(l.emoji)}" data-field="emoji" aria-label="Emoji" />
        <input type="text" value="${escapeAttr(l.text)}" data-field="text" aria-label="Texto" />
        <button type="button" class="btn-del" data-action="delete" title="Eliminar">✕</button>
      </div>`
    )
    .join('');
}

async function persistLines(): Promise<void> {
  await saveQuoteLines(lines);
}

async function saveFees(): Promise<void> {
  lastLocalFeesWriteAt = Date.now();
  await chrome.storage.local.set({ [FEES_KEY]: fees });
  scheduleHistoryDraftSync();
}

async function ensurePendingQuoteNumber(): Promise<number> {
  if (pendingQuoteNumber !== null) return pendingQuoteNumber;
  const stored = await loadPendingQuoteNumber();
  if (stored !== null) {
    pendingQuoteNumber = stored;
    return stored;
  }
  const peek = await peekNextQuoteNumber();
  pendingQuoteNumber = peek;
  await savePendingQuoteNumber(peek);
  return peek;
}

async function restoreHistoryEntry(quoteNumber: number): Promise<void> {
  const entry = history.find((h) => h.quoteNumber === quoteNumber);
  if (!entry || entry.items.length === 0) return;
  if (
    !confirm(
      `¿Restaurar ${formatQuoteRef(quoteNumber)} en el carrito?\nSe reemplazan productos, fees, opciones y modo actuales.`
    )
  ) {
    return;
  }
  items = freezeHistoryPayload(entry.items);
  fees = freezeHistoryPayload({ ...entry.fees });
  quoteMode = entry.quoteMode === 'wholesale' ? 'wholesale' : 'retail';
  hotelsAsOptions = entry.hotelsAsOptions === true || quoteMode === 'wholesale';
  hotelOptionGroups = freezeHistoryPayload(entry.hotelOptionGroups || []);
  occupancyTotalOpen = entry.occupancyTotalOpen === true;
  void saveOccupancyTotalOpen(occupancyTotalOpen);
  commissionApproxOpen = entry.commissionApproxOpen === true;
  void saveCommissionApproxOpen(commissionApproxOpen);
  commissionApproxKind =
    entry.commissionApproxKind === 'freelance' || entry.commissionApproxKind === 'agency'
      ? entry.commissionApproxKind
      : null;
  void saveCommissionApproxKind(commissionApproxKind);
  accommodationConfirmed =
    quoteMode === 'wholesale' &&
    Boolean(entry.searchContext?.roomPlan && entry.searchContext.roomPlan.length > 0);
  void saveAccommodationConfirmed(accommodationConfirmed);
  if (typeof entry.autoRoundOccupancy === 'boolean') {
    autoRoundOccupancy = entry.autoRoundOccupancy;
    void saveAutoRoundOccupancy(autoRoundOccupancy);
  }
  if (typeof entry.showTrmInQuote === 'boolean') {
    showTrmInQuote = entry.showTrmInQuote;
    void saveShowTrmInQuote(showTrmInQuote);
  }
  if (typeof entry.includeUsdEquiv === 'boolean') {
    includeUsdEquiv = entry.includeUsdEquiv;
    void saveIncludeUsdEquiv(includeUsdEquiv);
  }
  if (entry.taSelection) {
    taSelection = normalizeTaSelection(entry.taSelection);
    void saveTaSelection(taSelection);
  }
  if (entry.displayCurrency === 'COP' || entry.displayCurrency === 'USD') {
    displayCurrency = entry.displayCurrency;
    void saveDisplayCurrency(displayCurrency);
  }
  if (entry.trm && entry.trm > 0) {
    trmRate = entry.trm;
    const state: TrmState = {
      rate: entry.trm,
      date: todayIso(),
      source: 'manual',
      updatedAt: Date.now(),
    };
    void saveTrm(state);
  }
  if (typeof entry.trmSuplemento === 'number') {
    trmSuplemento = normalizeTrmSuplemento(entry.trmSuplemento);
    void saveTrmSuplemento(trmSuplemento);
  }
  initialDeposit = typeof entry.initialDeposit === 'string' ? entry.initialDeposit : '';
  void saveInitialDeposit(initialDeposit);
  if (entry.quoteLines && entry.quoteLines.length > 0) {
    lines = normalizeQuoteLines(entry.quoteLines);
    void saveQuoteLines(lines);
  }
  if (entry.clientName) {
    clientName = entry.clientName;
    void saveClientName(clientName);
  }
  if (entry.agencyName) {
    agencyName = entry.agencyName;
    void saveAgencyName(agencyName);
  }
  if (entry.searchContext) {
    tripGuide = freezeHistoryPayload(entry.searchContext);
    searchContext = tripGuide;
    void saveTripGuide(tripGuide);
  }
  pendingQuoteNumber = entry.quoteNumber;
  await savePendingQuoteNumber(entry.quoteNumber);
  void saveQuoteMode(quoteMode);
  void saveHotelsAsOptions(hotelsAsOptions);
  void saveHotelCompareGroups(hotelOptionGroups);
  await saveItems();
  await saveFees();
  refreshViews();
  void appendAppLog('info', `Historial restaurado ${formatQuoteRef(quoteNumber)}`);
}

async function archiveCurrentCart(reason: string): Promise<void> {
  if (items.length === 0) return;
  if (
    reason === 'Vaciar carrito' &&
    pendingQuoteNumber !== null &&
    history[0]?.quoteNumber === pendingQuoteNumber
  ) {
    return;
  }

  const quoteNumber = await ensurePendingQuoteNumber();
  await commitQuoteNumber(quoteNumber);
  const params = await buildHistoryParams();
  if (!params) return;
  const entry = buildHistoryEntry(params);
  await upsertHistory(entry);
  history = await loadHistory();
  void appendAppLog('info', `Historial: ${reason} ${formatQuoteRef(quoteNumber)}`);
}

async function buildQuoteInput(): Promise<QuoteBuildInput> {
  await ensurePendingQuoteNumber();
  const trm = effTrm();
  const subtotals = getTotalsByCurrency(items, displayCurrency, trm, trmDiaOpt());
  const pax = getTaPaxCount(items, tripGuide || readBriefingDraft(), searchContext);
  const taTotalCop = getTaTotal(taSelection, pax, items);
  const feesTotal = getFeesTotalDisplay(fees, taTotalCop, displayCurrency, trm);
  const primaryCurrency = getPrimaryCurrency(subtotals, displayCurrency) || 'COP';
  return {
    items,
    searchContext: quoteSearchContext(),
    subtotals,
    feesTotal,
    feesMayorRedondeo: feesMayorRedondeoDisplay(),
    primaryCurrency,
    quoteLines: lines,
    quoteNumber: pendingQuoteNumber ?? undefined,
    advisorName,
    agencyName: agencyName.trim() || undefined,
    trm: showTrmInQuote && trmRate > 0 ? trmRate : undefined,
    trmDia: trmDiaOpt(),
    trmEff: effTrm() > 0 ? effTrm() : undefined,
    includeUsdEquiv,
    hotelsAsOptions: hotelsAsOptions || quoteMode === 'wholesale',
    hotelOptionGroups:
      hotelsAsOptions || quoteMode === 'wholesale' ? hotelOptionGroups : undefined,
    itemTotals: itemTotalsMap(items, displayCurrency, trm),
    quoteMode,
    taUnit: taUnitDisplay(),
    includeOccupancyTotal: quoteMode === 'wholesale' && occupancyTotalOpen,
    includeCommissionApprox:
      quoteMode === 'wholesale' && occupancyTotalOpen && commissionApproxOpen,
    commissionApproxKind,
    initialDeposit,
    autoRoundOccupancy,
    manualPackageRoundIds,
    includePdfInsuranceAnnex: pdfInsuranceAnnex,
  };
}

async function buildCurrentQuote(): Promise<string> {
  return buildWhatsAppQuote(await buildQuoteInput());
}

async function buildCommissionMessage(): Promise<string | null> {
  return buildCommissionApproxWhatsApp(await buildQuoteInput());
}

async function showQuotePreview(): Promise<void> {
  const preview = document.getElementById('quote-preview') as HTMLTextAreaElement | null;
  if (!preview || items.length === 0) return;
  // Don't clobber user edits while focused
  if (document.activeElement === preview && preview.value.trim()) return;
  const input = await buildQuoteInput();
  preview.value = buildWhatsAppQuote(input);
  const commissionBox = document.getElementById('commission-wa-box');
  const commissionPreview = document.getElementById(
    'commission-preview'
  ) as HTMLTextAreaElement | null;
  const commission = buildCommissionApproxWhatsApp(input);
  if (commissionBox && commissionPreview) {
    if (commission) {
      commissionBox.hidden = false;
      commissionPreview.value = commission;
    } else {
      commissionBox.hidden = true;
      commissionPreview.value = '';
    }
  }
}

async function copyQuoteToClipboard(): Promise<void> {
  if (!ensureBriefingOrWarn()) return;
  const preview = document.getElementById('quote-preview') as HTMLTextAreaElement | null;
  const text =
    preview && preview.value.trim()
      ? preview.value
      : await buildCurrentQuote();
  if (preview && !preview.value.trim()) preview.value = text;

  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    if (preview) {
      preview.focus();
      preview.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
    }
  }

  if (ok) await archiveCurrentCart('Copiar WhatsApp');
  quoteCopyStatus = ok ? 'ok' : 'err';
  quoteStatusMessage = ok
    ? '✓ Copiado — pégalo en WhatsApp'
    : 'No se pudo copiar automático: selecciona el texto y Ctrl+C';
  renderWhatsApp();
  window.setTimeout(() => {
    quoteCopyStatus = 'idle';
    quoteStatusMessage = '';
    renderWhatsApp();
  }, 4000);
}

async function sendQuoteToChatCenter(): Promise<void> {
  if (!ensureBriefingOrWarn()) return;
  const preview = document.getElementById('quote-preview') as HTMLTextAreaElement | null;
  const text =
    preview && preview.value.trim()
      ? preview.value
      : await buildCurrentQuote();
  if (preview && !preview.value.trim()) preview.value = text;

  quoteCopyStatus = 'idle';
  quoteStatusMessage = 'Enviando a Chat Center…';
  selectTab('whatsapp');
  renderWhatsApp();

  try {
    const res = await chrome.runtime.sendMessage({
      type: 'TCE_SEND_TO_CHAT_CENTER',
      text,
    });
    if (res?.contact && typeof res.contact === 'string') {
      clientName = res.contact;
      void saveClientName(clientName);
      renderHeader();
    }
    if (res?.ok) await archiveCurrentCart('Enviar a Chat Center');
    quoteCopyStatus = res?.ok ? 'ok' : 'err';
    quoteStatusMessage = res?.ok
      ? `✓ Pegado en Chat Center${res.contact ? ` · ${res.contact}` : ''}`
      : res?.error || 'No se pudo pegar en Chat Center.';
  } catch {
    quoteCopyStatus = 'err';
    quoteStatusMessage =
      'No se pudo contactar Chat Center. Abre https://chatcrm.grupostravel.com/oportunidades';
  }
  renderWhatsApp();
  window.setTimeout(() => {
    quoteCopyStatus = 'idle';
    quoteStatusMessage = '';
    renderWhatsApp();
  }, 5000);
}

async function copyCommissionToClipboard(): Promise<void> {
  const preview = document.getElementById('commission-preview') as HTMLTextAreaElement | null;
  const text = (preview?.value || '').trim() || (await buildCommissionMessage()) || '';
  if (!text) {
    quoteCopyStatus = 'err';
    quoteStatusMessage =
      'Activa la comisión en Acomodación (total del mix + freelance/agencia).';
    selectTab('whatsapp');
    renderWhatsApp();
    return;
  }
  if (preview) preview.value = text;
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    if (preview) {
      preview.focus();
      preview.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
    }
  }
  quoteCopyStatus = ok ? 'ok' : 'err';
  quoteStatusMessage = ok
    ? '✓ Comisión copiada — pégala en un segundo mensaje'
    : 'No se pudo copiar: selecciona el texto ámbar y Ctrl+C';
  renderWhatsApp();
  window.setTimeout(() => {
    quoteCopyStatus = 'idle';
    quoteStatusMessage = '';
    renderWhatsApp();
  }, 4000);
}

async function downloadQuotePdf(): Promise<void> {
  if (!ensureBriefingOrWarn()) return;

  quoteCopyStatus = 'idle';
  quoteStatusMessage = 'Generando PDF…';
  selectTab('whatsapp');
  renderWhatsApp();

  await ensurePendingQuoteNumber();
  const trm = effTrm();
  const subtotals = getTotalsByCurrency(items, displayCurrency, trm, trmDiaOpt());
  const pax = getTaPaxCount(items, tripGuide || readBriefingDraft(), searchContext);
  const taTotalCop = getTaTotal(taSelection, pax, items);
  const feesTotal = getFeesTotalDisplay(fees, taTotalCop, displayCurrency, trm);
  const primaryCurrency = getPrimaryCurrency(subtotals, displayCurrency) || 'COP';
  const result = await openQuotePdfPrint({
    items,
    searchContext: quoteSearchContext(),
    subtotals,
    feesTotal,
    feesMayorRedondeo: feesMayorRedondeoDisplay(),
    primaryCurrency,
    quoteLines: lines,
    quoteNumber: pendingQuoteNumber ?? undefined,
    advisorName,
    agencyName: agencyName.trim() || undefined,
    trm: showTrmInQuote && trmRate > 0 ? trmRate : undefined,
    trmDia: trmDiaOpt(),
    trmEff: effTrm() > 0 ? effTrm() : undefined,
    includeUsdEquiv,
    hotelsAsOptions: hotelsAsOptions || quoteMode === 'wholesale',
    hotelOptionGroups:
      hotelsAsOptions || quoteMode === 'wholesale' ? hotelOptionGroups : undefined,
    itemTotals: itemTotalsMap(items, displayCurrency, trm),
    quoteMode,
    taUnit: taUnitDisplay(),
    includeOccupancyTotal: quoteMode === 'wholesale' && occupancyTotalOpen,
    includeCommissionApprox:
      quoteMode === 'wholesale' && occupancyTotalOpen && commissionApproxOpen,
    commissionApproxKind,
    initialDeposit,
    includePdfInsuranceAnnex: pdfInsuranceAnnex,
    autoRoundOccupancy,
    manualPackageRoundIds,
  });
  quoteCopyStatus = result.ok ? 'ok' : 'err';
  quoteStatusMessage = result.ok
    ? '✓ PDF abierto — elige «Guardar como PDF» en Imprimir'
    : result.reason || 'No se pudo generar el PDF';
  if (result.ok) {
    await archiveCurrentCart('Descargar PDF');
  }
  renderWhatsApp();
  window.setTimeout(() => {
    quoteCopyStatus = 'idle';
    quoteStatusMessage = '';
    renderWhatsApp();
  }, 5000);
}

function bindListEvents(): void {
  document.querySelectorAll('.line-list').forEach((list) => {
    list.addEventListener('input', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.tagName !== 'INPUT') return;
      const row = target.closest('.line-row') as HTMLElement | null;
      if (!row) return;
      const id = row.dataset.id;
      const field = (target as HTMLInputElement).dataset.field as 'emoji' | 'text' | undefined;
      if (!id || !field) return;
      lines = lines.map((l) =>
        l.id === id ? { ...l, [field]: (target as HTMLInputElement).value } : l
      );
      void persistLines();
    });

    list.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-action="delete"]') as HTMLElement | null;
      if (!btn) return;
      const row = btn.closest('.line-row') as HTMLElement | null;
      if (!row?.dataset.id) return;
      lines = lines.filter((l) => l.id !== row.dataset.id);
      renderLists();
      void persistLines();
    });
  });
}

function bindAddForms(): void {
  document.querySelectorAll('.add-form').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const el = form as HTMLFormElement;
      const kind = el.dataset.kind as QuoteLineKind;
      const fd = new FormData(el);
      const emoji = String(fd.get('emoji') || '').trim();
      const text = String(fd.get('text') || '').trim();
      if (!text) return;
      lines = [...lines, { id: newQuoteLineId(), kind, emoji, text, enabled: true }];
      el.reset();
      renderLists();
      void persistLines();
    });
  });
}

function bindReset(): void {
  document.getElementById('btn-reset-defaults')?.addEventListener('click', () => {
    if (!confirm('¿Restaurar las líneas incluye / no incluye / políticas por defecto?')) return;
    lines = defaultQuoteLines();
    renderLists();
    void persistLines();
  });
}

function fillTaForm(): void {
  const rt = document.getElementById('ta-nacional-rt') as HTMLInputElement | null;
  const ow = document.getElementById('ta-nacional-ow') as HTMLInputElement | null;
  const intl = document.getElementById('ta-internacional-usd') as HTMLInputElement | null;
  if (rt) rt.value = String(taConfig.nacionalRoundTripCop);
  if (ow) ow.value = String(taConfig.nacionalOneWayCop);
  if (intl) intl.value = String(taConfig.internacionalUsd);
}

function readTaForm(): TaConfig {
  const rt = document.getElementById('ta-nacional-rt') as HTMLInputElement | null;
  const ow = document.getElementById('ta-nacional-ow') as HTMLInputElement | null;
  const intl = document.getElementById('ta-internacional-usd') as HTMLInputElement | null;
  return normalizeTaConfig({
    nacionalRoundTripCop: Number(rt?.value || 0),
    nacionalOneWayCop: Number(ow?.value || 0),
    internacionalUsd: Number(intl?.value || 0),
  });
}

function fillTrmSuplementoForm(): void {
  const el = document.getElementById('trm-suplemento') as HTMLInputElement | null;
  if (el) el.value = String(trmSuplemento);
}

function fillTrmSourceForm(): void {
  const el = document.getElementById('trm-source') as HTMLSelectElement | null;
  if (el) el.value = trmSource;
}

function bindTaForm(): void {
  const persistTa = () => {
    taConfig = readTaForm();
    void saveTaConfig(taConfig);
  };
  for (const id of ['ta-nacional-rt', 'ta-nacional-ow', 'ta-internacional-usd']) {
    document.getElementById(id)?.addEventListener('change', persistTa);
    document.getElementById(id)?.addEventListener('blur', persistTa);
  }
}

function bindTrmSuplementoForm(): void {
  const persistSup = () => {
    const el = document.getElementById('trm-suplemento') as HTMLInputElement | null;
    trmSuplemento = normalizeTrmSuplemento(Number(el?.value || 0));
    void saveTrmSuplemento(trmSuplemento);
    renderTotal();
  };
  const el = document.getElementById('trm-suplemento');
  el?.addEventListener('change', persistSup);
  el?.addEventListener('blur', persistSup);
}

function bindTrmSourceForm(): void {
  const el = document.getElementById('trm-source') as HTMLSelectElement | null;
  el?.addEventListener('change', () => {
    trmSource = normalizeTrmSource(el.value);
    void saveTrmSource(trmSource);
    renderHeader();
    void chrome.runtime.sendMessage({ type: 'TCE_REFRESH_TRM', force: true }, (res) => {
      if (res?.ok && res.trm?.rate) {
        trmRate = res.trm.rate;
        renderHeader();
        renderProductos();
        renderTotal();
      }
    });
  });
}

function syncHotelOptionGroups(): void {
  const hotelIds = new Set(
    items.filter((i): i is HotelCartItem => i.type === 'hotel').map((h) => h.id)
  );
  hotelOptionGroups = hotelOptionGroups.map((g) => ({
    ...g,
    hotelIds: g.hotelIds.filter((id) => hotelIds.has(id)),
  }));
  if (hotelsAsOptions && hotelOptionGroups.length === 0) {
    hotelOptionGroups = [{ id: newHotelCompareGroupId(), hotelIds: [] }];
  }
}

function bindWorkspaceEvents(): void {
  document.getElementById('historial-import-file')?.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    void file.text().then(async (raw) => {
      const result = await importHistoryJson(raw);
      if (!result.ok) {
        window.alert(`No se pudo importar: ${result.error}`);
        return;
      }
      history = await loadHistory();
      renderHistorial();
      renderDashboard();
      void appendAppLog('info', `Historial importado (${result.count})`);
      window.alert(`Se importaron / fusionaron ${result.count} cotización(es).`);
    });
  });

  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest(
      '[data-action], [data-display-currency]'
    ) as HTMLElement | null;
    if (!target) return;

    const cur = target.dataset.displayCurrency as DisplayCurrency | undefined;
    if (cur === 'COP' || cur === 'USD') {
      if (cur === 'USD' && !(effTrm() > 0)) return;
      displayCurrency = cur;
      void saveDisplayCurrency(cur);
      renderHeader();
      renderProductos();
      renderTotal();
      return;
    }

    const action = target.dataset.action;
    if (action === 'toggle-occupancy-total') {
      occupancyTotalOpen = !occupancyTotalOpen;
      void saveOccupancyTotalOpen(occupancyTotalOpen);
      if (!occupancyTotalOpen) {
        commissionApproxOpen = false;
        void saveCommissionApproxOpen(false);
      }
      renderAccommodationPanel();
      renderTotal();
      return;
    }
    if (action?.startsWith('room-') && quoteMode === 'wholesale') {
      e.preventDefault();
      const row = target.closest('[data-room-idx]') as HTMLElement | null;
      const idx = Number(row?.dataset.roomIdx || '0');
      const next = mutateRoomPlan(readRoomPlanFromRoot(document), action, idx);
      tripGuide = applyRoomPlanToGuide(tripGuide, next);
      void saveTripGuide(tripGuide);
      markAccommodationConfirmed();
      renderAccommodationPanel();
      renderTotal();
      renderHeader();
      return;
    }
    if (action === 'refresh-trm') {
      void chrome.runtime.sendMessage({ type: 'TCE_REFRESH_TRM', force: true }, (res) => {
        if (res?.ok && res.trm?.rate) {
          trmRate = res.trm.rate;
          renderHeader();
          renderProductos();
          renderTotal();
        }
      });
      return;
    }
    if (action === 'round') {
      const excess = computeRoundingExcessCop(
        items,
        fees,
        getTaTotal(taSelection, getTaPaxCount(items, tripGuide || readBriefingDraft(), searchContext), items),
        displayCurrency,
        effTrm()
      );
      fees = { ...fees, [REDONDEO_ID]: excess };
      void saveFees();
      renderTotal();
      return;
    }
    if (action === 'ta-from-flight') {
      const suggested = suggestTaFromItems(items);
      if (!suggested) return;
      taSelection = applyTaType(taConfig, suggested, effTrm());
      void saveTaSelection(taSelection);
      renderTotal();
      return;
    }
    if (action === 'copy-quote') {
      void copyQuoteToClipboard();
      return;
    }
    if (action === 'send-chat-center') {
      void sendQuoteToChatCenter();
      return;
    }
    if (action === 'copy-commission') {
      void copyCommissionToClipboard();
      return;
    }
    if (action === 'restore-history') {
      const n = Number(target.dataset.quoteNumber);
      if (n > 0) void restoreHistoryEntry(n);
      return;
    }
    if (action === 'export-history') {
      if (history.length === 0) {
        window.alert('No hay cotizaciones para exportar.');
        return;
      }
      downloadHistoryBackup(history);
      void appendAppLog('info', `Historial exportado (${history.length})`);
      return;
    }
    if (action === 'import-history') {
      const input = document.getElementById('historial-import-file') as HTMLInputElement | null;
      input?.click();
      return;
    }
    if (action === 'toggle-warnings') {
      warningsPanelOpen = !warningsPanelOpen;
      renderHeader();
      return;
    }
    if (action === 'dismiss-warning') {
      const warnId = target.dataset.warnId;
      if (warnId) {
        if (!dismissedWarnings.includes(warnId)) {
          dismissedWarnings = [...dismissedWarnings, warnId];
        }
        void dismissWarning(warnId);
        const left = activeQuoteWarnings(
          quoteMode === 'wholesale'
            ? quoteWholesaleWarnings(items, hotelOptionGroups, {
                roomPlan: tripGuide?.roomPlan,
                displayCurrency,
                effTrm: effTrm(),
                trmDia: trmDiaOpt(),
                occupancyTotalOpen,
                autoRoundOccupancy,
                tripCheckIn: tripGuide?.checkIn,
                tripCheckOut: tripGuide?.checkOut,
                tripAdults: tripGuide?.totalAdults,
                tripChildren: tripGuide?.totalChildren,
              })
            : [],
          dismissedWarnings
        );
        if (left.length === 0) warningsPanelOpen = false;
        renderHeader();
      }
      return;
    }
    if (action === 'download-pdf') {
      void downloadQuotePdf();
      return;
    }
    if (action === 'clear-cart') {
      void clearCartFromPanel();
      return;
    }
    if (action === 'new-search') {
      void startNewSearchFromPanel();
      return;
    }
    if (action === 'wholesale-help') {
      void chrome.runtime.sendMessage({ type: 'TCE_OPEN_WHOLESALE_HELP' });
      return;
    }
    if (action === 'save-briefing') {
      void saveBriefingFromPanel();
      return;
    }
    if (action === 'toggle-dest-pin') {
      void toggleDestinationPinFromPanel();
      return;
    }
    if (action === 'round-item') {
      const id = target.dataset.id;
      if (id) void applyItemRounding(id);
      return;
    }
    if (action === 'restore-item-adj') {
      const itemId = target.dataset.itemId;
      if (itemId) restoreItemAdjustments(itemId);
      return;
    }
    if (action === 'restore-occ-rates') {
      const itemId = target.dataset.itemId;
      if (itemId) restoreHotelOccupancyRates(itemId);
      return;
    }
    if (action === 'toggle-auto-round') {
      void setAutoRoundOccupancy(!autoRoundOccupancy);
      return;
    }
    if (action === 'round-option') {
      const optionId = target.dataset.optionId;
      if (optionId) roundOptionOccupancyRates(optionId);
      return;
    }
    if (action === 'restore-option-rates') {
      const optionId = target.dataset.optionId;
      if (optionId) restoreOptionOccupancyRates(optionId);
      return;
    }
    if (action === 'search-hotel-transfer') {
      const id = target.dataset.id;
      const hotel = items.find((i): i is HotelCartItem => i.type === 'hotel' && i.id === id);
      if (!hotel) return;
      const guidePax =
        tripGuide && (tripGuide.totalAdults > 0 || tripGuide.totalChildren > 0)
          ? {
              totalAdults: tripGuide.totalAdults,
              totalChildren: tripGuide.totalChildren,
              childrenAges: tripGuide.childrenAges || [],
            }
          : undefined;
      void startHotelTransferSearch(pendingFromHotel(hotel, guidePax)).then(() =>
        openBookingMotorTransferSearch()
      );
      return;
    }
    if (action === 'preview-quote') {
      const preview = document.getElementById('quote-preview') as HTMLTextAreaElement | null;
      if (preview) preview.blur();
      void buildCurrentQuote().then((text) => {
        if (preview) preview.value = text;
      });
      return;
    }
    if (action === 'add-hotel-option') {
      hotelOptionGroups = [...hotelOptionGroups, { id: newHotelCompareGroupId(), hotelIds: [] }];
      void saveHotelCompareGroups(hotelOptionGroups);
      scheduleHistoryDraftSync();
      renderProductos();
      renderTotal();
      return;
    }
    if (action === 'remove-hotel-option') {
      const optionId = target.dataset.optionId;
      if (!optionId || hotelOptionGroups.length <= 1) return;
      hotelOptionGroups = hotelOptionGroups.filter((g) => g.id !== optionId);
      void saveHotelCompareGroups(hotelOptionGroups);
      scheduleHistoryDraftSync();
      renderProductos();
      renderTotal();
      return;
    }
    if (action === 'toggle-hotel-option') {
      const optionId = target.dataset.optionId;
      const hotelId = target.dataset.hotelId;
      if (!optionId || !hotelId) return;
      hotelOptionGroups = hotelOptionGroups.map((g) => {
        if (g.id !== optionId) return g;
        const has = g.hotelIds.includes(hotelId);
        return {
          ...g,
          hotelIds: has ? g.hotelIds.filter((id) => id !== hotelId) : [...g.hotelIds, hotelId],
        };
      });
      void saveHotelCompareGroups(hotelOptionGroups);
      scheduleHistoryDraftSync();
      renderProductos();
      renderTotal();
    }
  });

  document.addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement | null;
    if (
      t?.classList.contains('fee-input') ||
      t?.classList.contains('ta-unit') ||
      t?.classList.contains('item-adj-input') ||
      t?.classList.contains('item-occ-input') ||
      t?.classList.contains('option-mayor-input') ||
      t?.classList.contains('tier-mayor-input') ||
      t?.id === 'initial-deposit' ||
      t?.classList.contains('initial-deposit')
    ) {
      if (
        t.classList.contains('item-adj-input') ||
        t.classList.contains('item-occ-input') ||
        t.classList.contains('option-mayor-input') ||
        t.classList.contains('tier-mayor-input')
      ) {
        suppressItemAdjRerender = true;
      } else suppressFeeRerender = true;
    }
  });
  document.addEventListener('focusout', (e) => {
    const t = e.target as HTMLElement | null;
    if (
      t?.classList.contains('fee-input') ||
      t?.classList.contains('ta-unit') ||
      t?.id === 'initial-deposit' ||
      t?.classList.contains('initial-deposit')
    ) {
      window.setTimeout(() => {
        suppressFeeRerender = false;
        renderTotal();
      }, 0);
    }
    if (
      t?.classList.contains('item-adj-input') ||
      t?.classList.contains('item-occ-input') ||
      t?.classList.contains('option-mayor-input') ||
      t?.classList.contains('tier-mayor-input')
    ) {
      window.setTimeout(() => {
        suppressItemAdjRerender = false;
        if (
          t.classList.contains('item-adj-input') &&
          (t as HTMLInputElement).dataset.adj === 'mayorValor'
        ) {
          const itemId = (t as HTMLInputElement).dataset.itemId;
          if (itemId) {
            applyHotelMayorValorToRates(itemId);
            return;
          }
        }
        if (t.classList.contains('option-mayor-input')) {
          const optionId = (t as HTMLInputElement).dataset.optionId;
          const tier = (t as HTMLInputElement).dataset.occTier as OccupancyTierCode | undefined;
          const parsed = parseFloat((t as HTMLInputElement).value);
          const mayorDisplay = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
          if (optionId && tier && mayorDisplay > 0) {
            applyOptionMayorValor(optionId, { [tier]: mayorDisplay });
            return;
          }
        }
        if (t.classList.contains('tier-mayor-input')) {
          const itemId = (t as HTMLInputElement).dataset.itemId;
          const tier = (t as HTMLInputElement).dataset.occTier as OccupancyTierCode | undefined;
          const parsed = parseFloat((t as HTMLInputElement).value);
          const mayorDisplay = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
          if (itemId && tier && mayorDisplay > 0) {
            applyHotelTierMayorValor(itemId, tier, mayorDisplay);
            return;
          }
        }
        renderProductos();
        renderTotal();
        void showQuotePreview();
      }, 0);
    }
  });

  document.addEventListener('change', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (target.classList.contains('item-occ-child-eq-check')) {
      const itemId = target.dataset.itemId;
      if (itemId) setHotelChildEqualsAdult(itemId, (target as HTMLInputElement).checked);
      return;
    }

    if (target.id === 'occ-include-wa') {
      occupancyTotalOpen = (target as HTMLInputElement).checked;
      void saveOccupancyTotalOpen(occupancyTotalOpen);
      if (!occupancyTotalOpen) {
        commissionApproxOpen = false;
        void saveCommissionApproxOpen(false);
      }
      scheduleHistoryDraftSync();
      renderAccommodationPanel();
      renderTotal();
      void showQuotePreview();
      return;
    }

    if (target.id === 'commission-approx') {
      if (!occupancyTotalOpen) return;
      commissionApproxOpen = (target as HTMLInputElement).checked;
      void saveCommissionApproxOpen(commissionApproxOpen);
      scheduleHistoryDraftSync();
      renderAccommodationPanel();
      renderTotal();
      void showQuotePreview();
      return;
    }

    if (target.id === 'commission-kind-freelance' || target.id === 'commission-kind-agency') {
      const value = (target as HTMLInputElement).value;
      commissionApproxKind =
        value === 'freelance' || value === 'agency' ? value : null;
      void saveCommissionApproxKind(commissionApproxKind);
      scheduleHistoryDraftSync();
      renderAccommodationPanel();
      renderTotal();
      void showQuotePreview();
      return;
    }

    if (target.id === 'auto-round-occ') {
      void setAutoRoundOccupancy((target as HTMLInputElement).checked);
      return;
    }

    if (target.id === 'pdf-insurance-annex') {
      pdfInsuranceAnnex = (target as HTMLInputElement).checked;
      void savePdfInsuranceAnnex(pdfInsuranceAnnex);
      return;
    }

    if (target.id === 'show-trm-quote') {
      showTrmInQuote = (target as HTMLInputElement).checked;
      void saveShowTrmInQuote(showTrmInQuote);
      return;
    }

    if (target.hasAttribute('data-room-kind') || target.hasAttribute('data-child-age')) {
      if (quoteMode === 'wholesale') {
        const next = readRoomPlanFromRoot(document);
        tripGuide = applyRoomPlanToGuide(tripGuide, next);
        void saveTripGuide(tripGuide);
        markAccommodationConfirmed();
        if (target.hasAttribute('data-room-kind')) {
          renderAccommodationPanel();
          renderTotal();
          renderHeader();
        } else {
          renderAccommodationPanel();
          renderHeader();
        }
        return;
      }
    }

    if (target.id === 'quote-mode') {
      if (applyingQuoteMode) return;
      quoteMode = normalizeQuoteMode((target as HTMLSelectElement).value);
      void saveQuoteMode(quoteMode);
      if (quoteMode === 'wholesale') {
        hotelsAsOptions = true;
        void saveHotelsAsOptions(true);
        syncHotelOptionGroups();
        void saveHotelCompareGroups(hotelOptionGroups);
      }
      renderHeader();
      renderBriefingForm();
      renderProductos();
      renderTotal();
      void showQuotePreview();
      return;
    }

    if (target.id === 'hotels-as-options') {
      hotelsAsOptions = (target as HTMLInputElement).checked;
      void saveHotelsAsOptions(hotelsAsOptions);
      if (hotelsAsOptions) {
        syncHotelOptionGroups();
        void saveHotelCompareGroups(hotelOptionGroups);
      }
      renderHeader();
      renderProductos();
      renderTotal();
      return;
    }

    if (target.id === 'ta-type') {
      const type = (target as HTMLSelectElement).value as TaType;
      taSelection = applyTaType(taConfig, type, effTrm());
      void saveTaSelection(taSelection);
      renderTotal();
      return;
    }

    if (target.id === 'usd-equiv-check') {
      includeUsdEquiv = (target as HTMLInputElement).checked;
      void saveIncludeUsdEquiv(includeUsdEquiv);
      void buildCurrentQuote().then((text) => {
        const preview = document.getElementById('quote-preview') as HTMLTextAreaElement | null;
        if (preview) preview.value = text;
      });
      return;
    }

    if (target.classList.contains('quote-check')) {
      const lineId = (target as HTMLInputElement).dataset.lineId;
      if (!lineId) return;
      const enabled = (target as HTMLInputElement).checked;
      lines = lines.map((l) => (l.id === lineId ? { ...l, enabled } : l));
      void persistLines();
      void buildCurrentQuote().then((text) => {
        const preview = document.getElementById('quote-preview') as HTMLTextAreaElement | null;
        if (preview) preview.value = text;
      });
    }
  });

  document.addEventListener('input', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (target.classList.contains('brief-date')) {
      refreshBriefNights();
      return;
    }

    if (target.classList.contains('item-occ-input')) {
      const input = target as HTMLInputElement;
      const itemId = input.dataset.itemId;
      const field = input.dataset.occField as 'sglPp' | 'dblPp' | 'tplPp' | 'chd' | undefined;
      if (!itemId || !field) return;
      const parsed = parseFloat(input.value);
      updateHotelOccupancyField(
        itemId,
        field,
        Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
      );
      return;
    }

    if (target.classList.contains('option-mayor-input')) {
      return;
    }

    if (target.id === 'header-agency') {
      agencyName = (target as HTMLInputElement).value;
      void saveAgencyName(agencyName);
      return;
    }

    if (target.id === 'header-client') {
      clientName = (target as HTMLInputElement).value;
      void saveClientName(clientName);
      return;
    }

    if (target.id === 'initial-deposit' || target.classList.contains('initial-deposit')) {
      initialDeposit = (target as HTMLInputElement).value;
      void saveInitialDeposit(initialDeposit);
      return;
    }

    if (target.id === 'header-trm-input') {
      const parsed = parseFloat((target as HTMLInputElement).value);
      trmRate = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      if (trmRate > 0) {
        const state: TrmState = {
          rate: trmRate,
          date: todayIso(),
          source: 'manual',
          updatedAt: Date.now(),
        };
        void saveTrm(state);
      } else if (displayCurrency === 'USD') {
        displayCurrency = 'COP';
        void saveDisplayCurrency('COP');
      }
      // Only refresh header hint + totals — never rebuild productos (loses focus).
      const trmEff = document.getElementById('header-trm-eff');
      if (trmEff) {
        const trm = effTrm();
        trmEff.textContent =
          trmRate > 0
            ? `usada ${formatTrmRate(trm)} (+${Math.round(trmSuplemento).toLocaleString('es-CO')})`
            : 'sin TRM';
      }
      renderTotal();
      return;
    }

    if (target.id === 'header-trm-sup') {
      const parsed = parseFloat((target as HTMLInputElement).value);
      trmSuplemento = normalizeTrmSuplemento(
        Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
      );
      void saveTrmSuplemento(trmSuplemento);
      const trmEff = document.getElementById('header-trm-eff');
      if (trmEff) {
        const trm = effTrm();
        trmEff.textContent =
          trmRate > 0
            ? `usada ${formatTrmRate(trm)} (+${Math.round(trmSuplemento).toLocaleString('es-CO')})`
            : 'sin TRM';
      }
      renderTotal();
      return;
    }

    if (target.classList.contains('item-adj-input')) {
      const input = target as HTMLInputElement;
      const itemId = input.dataset.itemId;
      const adj = input.dataset.adj as 'mayorValor' | 'redondeo' | undefined;
      if (!itemId || (adj !== 'mayorValor' && adj !== 'redondeo')) return;
      const parsed = parseFloat(input.value);
      const displayVal = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      const value = displayAmountToCop(displayVal, displayCurrency, effTrm());
      items = items.map((item) => (item.id === itemId ? { ...item, [adj]: value } : item));
      void saveItems();
      const lineItem = items.find((i) => i.id === itemId);
      if (lineItem) {
        const line = getItemLineTotal(lineItem, displayCurrency, effTrm(), trmDiaOpt());
        const totalEl = document.querySelector(
          `.item-line-total[data-item-id="${CSS.escape(itemId)}"]`
        );
        if (totalEl) {
          totalEl.innerHTML = `<strong>${escapeHtml(
            formatServiceItemTotal(
              line.currency,
              line.price,
              serviceBreakdownPax(lineItem).pax,
              serviceBreakdownPax(lineItem).breakdown
            )
          )}</strong>`;
        }
        const priceEl = document.querySelector(
          `.item-row[data-id="${CSS.escape(itemId)}"] .item-price`
        );
        if (priceEl) priceEl.textContent = formatCartPrice(line.currency, line.price);
      }
      const keep = suppressItemAdjRerender;
      suppressItemAdjRerender = true;
      renderTotal();
      suppressItemAdjRerender = keep;
      return;
    }

    if (target.classList.contains('fee-input')) {
      const feeId = (target as HTMLInputElement).dataset.feeId;
      if (!feeId) return;
      const parsed = parseFloat((target as HTMLInputElement).value);
      const displayVal = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      fees = {
        ...fees,
        [feeId]: displayAmountToCop(displayVal, displayCurrency, effTrm()),
      };
      void saveFees();
      const keep = suppressFeeRerender;
      suppressFeeRerender = true;
      renderTotal();
      suppressFeeRerender = keep;
      return;
    }

    if (target.classList.contains('ta-unit')) {
      const parsed = parseFloat((target as HTMLInputElement).value);
      const displayVal = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      taSelection = {
        ...taSelection,
        unitCop: displayAmountToCop(displayVal, displayCurrency, effTrm()),
      };
      void saveTaSelection(taSelection);
      const keep = suppressFeeRerender;
      suppressFeeRerender = true;
      renderTotal();
      suppressFeeRerender = keep;
      const summary = document.getElementById('ta-summary');
      if (summary) {
        const pax = getTaPaxCount(items, tripGuide || readBriefingDraft(), searchContext);
        const trm = effTrm();
        const taUnit = taUnitDisplay();
        const taTotal = copAmountToDisplay(
          getTaTotal(taSelection, pax, items),
          displayCurrency,
          trm
        );
        const body =
          quoteMode === 'wholesale'
            ? `TA por persona (sumada a tarifa pp) =
          <strong>${escapeHtml(formatCartPrice(displayCurrency, taUnit))}</strong>`
            : `TA × ${pax} pasajero${pax !== 1 ? 's' : ''} =
          <strong>${escapeHtml(formatCartPrice(displayCurrency, taTotal))}</strong>`;
        summary.innerHTML = `
          ${body}
          <button type="button" class="btn-mini" data-action="ta-from-flight">Según vuelo</button>
        `;
      }
    }
  });
}

function refreshViews(): void {
  syncWorkspaceTabsVisibility();
  renderHeader();
  renderBriefingForm();
  renderDashboard();
  renderProductos();
  renderCompareBlock();
  renderTotal();
  renderWhatsApp();
  renderHistorial();
}

async function loadAll(): Promise<void> {
  setSyncOk(false);
  const stored = await chrome.storage.local.get([
    STORAGE_KEY,
    FEES_KEY,
    SEARCH_KEY,
    CLIENT_KEY,
    INITIAL_DEPOSIT_KEY,
    PDF_INSURANCE_ANNEX_KEY,
    OCCUPANCY_TOTAL_OPEN_KEY,
    COMMISSION_APPROX_OPEN_KEY,
    COMMISSION_APPROX_KIND_KEY,
    ACCOMMODATION_CONFIRMED_KEY,
    AGENCY_KEY,
  ]);
  items = Array.isArray(stored[STORAGE_KEY]) ? (stored[STORAGE_KEY] as CartItem[]) : [];
  fees =
    stored[FEES_KEY] && typeof stored[FEES_KEY] === 'object'
      ? { ...defaultFees(), ...(stored[FEES_KEY] as Record<string, number>) }
      : defaultFees();
  searchContext = (stored[SEARCH_KEY] as SearchContext) || null;
  clientName = typeof stored[CLIENT_KEY] === 'string' ? stored[CLIENT_KEY] : await loadClientName();
  initialDeposit =
    typeof stored[INITIAL_DEPOSIT_KEY] === 'string'
      ? stored[INITIAL_DEPOSIT_KEY]
      : await loadInitialDeposit();
  pdfInsuranceAnnex =
    stored[PDF_INSURANCE_ANNEX_KEY] === false ? false : await loadPdfInsuranceAnnex();
  occupancyTotalOpen = stored[OCCUPANCY_TOTAL_OPEN_KEY] === true;
  commissionApproxOpen =
    stored[COMMISSION_APPROX_OPEN_KEY] === true || (await loadCommissionApproxOpen());
  {
    const kindRaw = stored[COMMISSION_APPROX_KIND_KEY];
    commissionApproxKind =
      kindRaw === 'freelance' || kindRaw === 'agency'
        ? kindRaw
        : await loadCommissionApproxKind();
  }
  accommodationConfirmed =
    stored[ACCOMMODATION_CONFIRMED_KEY] === true || (await loadAccommodationConfirmed());
  agencyName =
    typeof stored[AGENCY_KEY] === 'string' ? stored[AGENCY_KEY] : await loadAgencyName();
  advisorName = await loadAdvisorName();
  tripGuide = await loadTripGuide();
  history = await loadHistory();
  lines = await loadQuoteLines();
  taConfig = await loadTaConfig();
  taSelection = await loadTaSelection();
  trmSuplemento = await loadTrmSuplemento();
  trmSource = await loadTrmSource();
  displayCurrency = await loadDisplayCurrency();
  includeUsdEquiv = await loadIncludeUsdEquiv();
  showTrmInQuote = await loadShowTrmInQuote();
  autoRoundOccupancy = await loadAutoRoundOccupancy();
  manualPackageRoundIds = await loadManualPackageRoundIds();
  dismissedWarnings = await loadDismissedWarnings();
  quoteMode = await loadQuoteMode();
  applyingQuoteMode = true;
  applyingQuoteMode = false;
  originCities = await loadOriginCities();
  bmDestinations = await loadBmDestinations();
  hotelsAsOptions = await loadHotelsAsOptions();
  if (quoteMode === 'wholesale' && !hotelsAsOptions) {
    hotelsAsOptions = true;
    void saveHotelsAsOptions(true);
  }
  hotelOptionGroups = await loadHotelCompareGroups();
  lockWholesaleTripFacts();
  pendingQuoteNumber = await loadPendingQuoteNumber();
  const trm = await loadTrm();
  trmRate = trm?.rate && trm.rate > 0 ? trm.rate : 0;
  if (displayCurrency === 'USD' && !(effTrm() > 0)) displayCurrency = 'COP';
  if (syncAutoRoundOccupancy()) await saveItems();
  fillTaForm();
  fillTrmSuplementoForm();
  fillTrmSourceForm();
  fillOriginCitiesForm();
  renderLists();
  refreshViews();
  setSyncOk(true);
}

function watchStorage(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    let dirty = false;
    let forceFull = false;

    if (changes[STORAGE_KEY]) {
      items = Array.isArray(changes[STORAGE_KEY].newValue)
        ? (changes[STORAGE_KEY].newValue as CartItem[])
        : [];
      const echo = isLocalStorageEcho(lastLocalCartWriteAt) && suppressItemAdjRerender;
      if (echo) {
        renderTotal();
      } else {
        suppressItemAdjRerender = false;
        dirty = true;
        forceFull = true;
      }
    }
    if (changes[FEES_KEY]) {
      fees =
        changes[FEES_KEY].newValue && typeof changes[FEES_KEY].newValue === 'object'
          ? { ...defaultFees(), ...(changes[FEES_KEY].newValue as Record<string, number>) }
          : defaultFees();
      const echo = isLocalStorageEcho(lastLocalFeesWriteAt) && suppressFeeRerender;
      if (echo) {
        const keep = suppressFeeRerender;
        suppressFeeRerender = true;
        renderTotal();
        suppressFeeRerender = keep;
      } else {
        suppressFeeRerender = false;
        dirty = true;
        forceFull = true;
      }
    }
    if (changes[SEARCH_KEY]) {
      if (Date.now() < ignoreSearchUntil) {
        if (changes[SEARCH_KEY].newValue) {
          void chrome.storage.local.remove(SEARCH_KEY);
        }
        searchContext = null;
      } else {
        searchContext = (changes[SEARCH_KEY].newValue as SearchContext) || null;
      }
      dirty = true;
    }
    if (changes[TRIP_GUIDE_KEY]) {
      tripGuide = (changes[TRIP_GUIDE_KEY].newValue as SearchContext) || null;
      dirty = true;
    }
    if (changes[ORIGIN_CITIES_KEY]) {
      originCities = Array.isArray(changes[ORIGIN_CITIES_KEY].newValue)
        ? (changes[ORIGIN_CITIES_KEY].newValue as string[])
        : originCities;
      fillOriginCitiesForm();
      dirty = true;
    }
    if (changes[BM_DESTINATIONS_KEY]) {
      bmDestinations = Array.isArray(changes[BM_DESTINATIONS_KEY].newValue)
        ? (changes[BM_DESTINATIONS_KEY].newValue as string[])
        : bmDestinations;
      dirty = true;
    }
    if (changes[CLIENT_KEY]) {
      clientName =
        typeof changes[CLIENT_KEY].newValue === 'string' ? changes[CLIENT_KEY].newValue : '';
      dirty = true;
    }
    if (changes[INITIAL_DEPOSIT_KEY]) {
      initialDeposit =
        typeof changes[INITIAL_DEPOSIT_KEY].newValue === 'string'
          ? changes[INITIAL_DEPOSIT_KEY].newValue
          : '';
      dirty = true;
    }
    if (changes[PDF_INSURANCE_ANNEX_KEY]) {
      pdfInsuranceAnnex = changes[PDF_INSURANCE_ANNEX_KEY].newValue !== false;
      dirty = true;
    }
    if (changes[OCCUPANCY_TOTAL_OPEN_KEY]) {
      occupancyTotalOpen = changes[OCCUPANCY_TOTAL_OPEN_KEY].newValue === true;
      dirty = true;
    }
    if (changes[COMMISSION_APPROX_OPEN_KEY]) {
      commissionApproxOpen = changes[COMMISSION_APPROX_OPEN_KEY].newValue === true;
      dirty = true;
    }
    if (changes[COMMISSION_APPROX_KIND_KEY]) {
      const next = changes[COMMISSION_APPROX_KIND_KEY].newValue;
      commissionApproxKind =
        next === 'freelance' || next === 'agency' ? next : null;
      dirty = true;
    }
    if (changes[ACCOMMODATION_CONFIRMED_KEY]) {
      accommodationConfirmed = changes[ACCOMMODATION_CONFIRMED_KEY].newValue === true;
      dirty = true;
    }
    if (changes[AGENCY_KEY]) {
      agencyName =
        typeof changes[AGENCY_KEY].newValue === 'string' ? changes[AGENCY_KEY].newValue : '';
      dirty = true;
    }
    if (changes[TRM_KEY]) {
      const v = changes[TRM_KEY].newValue as { rate?: number } | undefined;
      trmRate = v?.rate && v.rate > 0 ? v.rate : 0;
      const typingTrm =
        document.activeElement?.id === 'header-trm-input' ||
        document.activeElement?.id === 'header-trm-sup';
      if (!typingTrm) {
        if (autoRoundOccupancy && syncAutoRoundOccupancy()) void saveItems();
        dirty = true;
      } else {
        const trmEff = document.getElementById('header-trm-eff');
        if (trmEff) {
          const trm = effTrm();
          trmEff.textContent =
            trmRate > 0
              ? `usada ${formatTrmRate(trm)} (+${Math.round(trmSuplemento).toLocaleString('es-CO')})`
              : 'sin TRM';
        }
      }
    }
    if (changes[TRM_SUPLEMENTO_KEY]) {
      trmSuplemento = normalizeTrmSuplemento(changes[TRM_SUPLEMENTO_KEY].newValue);
      const typingSup =
        document.activeElement?.id === 'header-trm-sup' ||
        document.activeElement?.id === 'trm-suplemento';
      if (!typingSup) {
        fillTrmSuplementoForm();
        if (autoRoundOccupancy && syncAutoRoundOccupancy()) void saveItems();
        dirty = true;
      } else {
        const trmEff = document.getElementById('header-trm-eff');
        if (trmEff) {
          const trm = effTrm();
          trmEff.textContent =
            trmRate > 0
              ? `usada ${formatTrmRate(trm)} (+${Math.round(trmSuplemento).toLocaleString('es-CO')})`
              : 'sin TRM';
        }
      }
    }
    if (changes[TRM_SOURCE_KEY]) {
      trmSource = normalizeTrmSource(changes[TRM_SOURCE_KEY].newValue);
      fillTrmSourceForm();
      dirty = true;
    }
    if (changes[DISPLAY_CURRENCY_KEY]) {
      displayCurrency = normalizeDisplayCurrency(changes[DISPLAY_CURRENCY_KEY].newValue);
      if (autoRoundOccupancy && syncAutoRoundOccupancy()) void saveItems();
      dirty = true;
    }
    if (changes[TA_SELECTION_KEY]) {
      taSelection = normalizeTaSelection(changes[TA_SELECTION_KEY].newValue);
      dirty = true;
    }
    if (changes[HOTELS_AS_OPTIONS_KEY]) {
      hotelsAsOptions = changes[HOTELS_AS_OPTIONS_KEY].newValue === true;
      dirty = true;
    }
    if (changes[QUOTE_MODE_KEY]) {
      quoteMode = normalizeQuoteMode(changes[QUOTE_MODE_KEY].newValue);
      if (quoteMode === 'wholesale' && !hotelsAsOptions) {
        hotelsAsOptions = true;
      }
      dirty = true;
    }
    if (changes[HOTEL_COMPARE_GROUPS_KEY]) {
      void loadHotelCompareGroups().then((g) => {
        hotelOptionGroups = g;
        renderProductos();
        renderTotal();
      });
    }
    if (changes[USD_EQUIV_KEY]) {
      includeUsdEquiv = changes[USD_EQUIV_KEY].newValue === true;
      dirty = true;
    }
    if (changes[SHOW_TRM_IN_QUOTE_KEY]) {
      showTrmInQuote = changes[SHOW_TRM_IN_QUOTE_KEY].newValue === true;
      dirty = true;
    }
    if (changes[AUTO_ROUND_OCCUPANCY_KEY]) {
      const next = changes[AUTO_ROUND_OCCUPANCY_KEY].newValue !== false;
      if (next !== autoRoundOccupancy) {
        autoRoundOccupancy = next;
        if (syncAutoRoundOccupancy()) void saveItems();
        dirty = true;
      }
    }
    if (changes[MANUAL_PACKAGE_ROUND_IDS_KEY]) {
      const raw = changes[MANUAL_PACKAGE_ROUND_IDS_KEY].newValue;
      manualPackageRoundIds = Array.isArray(raw)
        ? raw.filter((id): id is string => typeof id === 'string')
        : [];
      dirty = true;
    }
    if (changes[PENDING_QUOTE_KEY]) {
      const n = changes[PENDING_QUOTE_KEY].newValue;
      pendingQuoteNumber = typeof n === 'number' && n > 0 ? n : null;
      dirty = true;
    }
    if (changes[DISMISSED_WARNINGS_KEY]) {
      const raw = changes[DISMISSED_WARNINGS_KEY].newValue;
      dismissedWarnings = Array.isArray(raw)
        ? raw.filter((x): x is string => typeof x === 'string')
        : [];
      dirty = true;
    }

    if (dirty) {
      if (forceFull) {
        suppressFeeRerender = false;
        suppressItemAdjRerender = false;
      }
      refreshViews();
      setSyncOk(true);
    }

    if (changes[QUOTE_LINES_KEY] || changes[HISTORY_KEY] || changes[TA_CONFIG_KEY]) {
      void (async () => {
        if (changes[QUOTE_LINES_KEY]) lines = await loadQuoteLines();
        if (changes[HISTORY_KEY]) history = await loadHistory();
        if (changes[TA_CONFIG_KEY]) {
          taConfig = await loadTaConfig();
          fillTaForm();
        }
        renderLists();
        refreshViews();
      })();
    }
  });
}

async function init(): Promise<void> {
  setupTabs();
  bindListEvents();
  bindAddForms();
  bindReset();
  bindTaForm();
  bindTrmSuplementoForm();
  bindTrmSourceForm();
  bindOriginCitiesForm();
  bindBriefingDirty();
  bindWorkspaceEvents();
  watchStorage();
  await loadAll();
}

void init();
