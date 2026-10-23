import {
  ActivityCartItem,
  CartItem,
  FlightCartItem,
  HotelCartItem,
  InsuranceCartItem,
  SearchContext,
  TourCartItem,
  TransferCartItem,
} from '../engine/core/types';
import {
  defaultQuoteLines,
  loadQuoteLines,
  normalizeQuoteLines,
  QUOTE_LINES_KEY,
  QuoteLine,
  saveQuoteLines,
} from '../shared/quoteConfig';
import {
  HistoryEntry,
  AGENCY_KEY,
  CLIENT_KEY,
  INITIAL_DEPOSIT_KEY,
  PDF_INSURANCE_ANNEX_KEY,
  OCCUPANCY_TOTAL_OPEN_KEY,
  COMMISSION_APPROX_OPEN_KEY,
  COMMISSION_APPROX_KIND_KEY,
  ACCOMMODATION_CONFIRMED_KEY,
  HISTORY_KEY,
  PENDING_QUOTE_KEY,
  USD_EQUIV_KEY,
  commitQuoteNumber,
  formatQuoteRef,
  freezeHistoryPayload,
  loadAdvisorName,
  loadAgencyName,
  loadClientName,
  loadClientEmail,
  loadLinkedOpportunity,
  loadInitialDeposit,
  saveClientEmail,
  saveLinkedOpportunity,
  type LinkedOpportunity,
  loadPdfInsuranceAnnex,
  loadOccupancyTotalOpen,
  loadCommissionApproxOpen,
  loadCommissionApproxKind,
  loadAccommodationConfirmed,
  loadHistory,
  loadIncludeUsdEquiv,
  loadShowTrmInQuote,
  loadAutoRoundOccupancy,
  loadManualPackageRoundIds,
  loadPendingQuoteNumber,
  peekNextQuoteNumber,
  saveAdvisorName,
  saveAgencyName,
  saveClientName,
  saveInitialDeposit,
  savePdfInsuranceAnnex,
  saveOccupancyTotalOpen,
  saveCommissionApproxOpen,
  saveCommissionApproxKind,
  saveAccommodationConfirmed,
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
  remoteCotizacionToHistoryEntry,
  slimHistoryEntry,
  type HistoryBuildParams,
  SHOW_TRM_IN_QUOTE_KEY,
  AUTO_ROUND_OCCUPANCY_KEY,
  MANUAL_PACKAGE_ROUND_IDS_KEY,
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
  DEFAULT_TRM_SUPLEMENTO,
  DisplayCurrency,
  DISPLAY_CURRENCY_KEY,
  copToUsd,
  effectiveTrm,
  loadDisplayCurrency,
  loadTrm,
  loadTrmSource,
  loadTrmSuplemento,
  normalizeDisplayCurrency,
  normalizeTrmSource,
  normalizeTrmSuplemento,
  saveDisplayCurrency,
  saveTrm,
  saveTrmSuplemento,
  todayIso,
  TRM_KEY,
  TRM_SOURCE_KEY,
  TRM_SOURCES,
  TRM_SUPLEMENTO_KEY,
  TrmSourceId,
  TrmState,
  usdToCop,
  getTrmReferencePage,
  DEFAULT_TRM_SOURCE,
  formatTrmRate,
  trmInputValue,
} from '../shared/trm';
import { appendAppLog } from '../shared/appLog';
import {
  TRIP_GUIDE_KEY,
  briefingMissingFields,
  briefingMissingForQuote,
  buildTripBriefing,
  clearTripGuide,
  enrichSearchContextFromItems,
  fromIsoDateInput,
  isTripBriefingComplete,
  loadTripGuide,
  mergeFirstTripFacts,
  applyRoomPlanToGuide,
  nightsFromTripDates,
  overlayBriefingPax,
  paxFromBriefingContext,
  saveTripGuide,
  toIsoDateInput,
  isoDateToday,
} from '../shared/tripGuide';
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
  deriveOccupancyRatesFromItem,
  displayHotelBoardBasis,
  displayHotelRoomType,
  findHotelMergeTarget,
  formatWholesalePersonValues,
  formatOccupancyBaselineGuide,
  formatOccupancyCurrentGuide,
  wholesaleTierWithOriginal,
  accommodationMixBreakdown,
  occupancyRatesToCurrency,
  coerceOccupancyRateCurrency,
  sanitizeOccupancyRates,
  repairHotelOccupancyInItems,
  occupancyMissingHint,
  occupancyHintOptsFromPlan,
  commercialRoomLabel,
  serviceItemBreakdownPax,
  approxCommissionAmount,
  summarizeWholesaleOption,
  packageRoundUpliftEntries,
  type CommissionApproxKind,
  charmNineOccupancyRates,
  ensureOccupancyBaseline,
  refreshOccupancyBaseline,
  restoreOccupancyFromBaseline,
  applyMayorValorToOccupancyRates,
  applyAutoRoundToHotelItems,
  occupancyTierUpliftFromBaseline,
  type OccupancyTierRates,
  type MayorValorByTier,
  type OccupancyTierCode,
} from '../shared/occupancyRates';
import {
  QUOTE_MODE_KEY,
  DEFAULT_QUOTE_MODE,
  loadQuoteMode,
  normalizeQuoteMode,
  saveQuoteMode,
  type QuoteMode,
} from '../shared/quoteMode';
import {
  buildWhatsAppQuote,
  buildCommissionApproxWhatsApp,
  formatFlightStopsLabel,
} from './QuoteBuilder';
import { airlineLogoUrl, flightPrimaryAirlineCode } from '../shared/airlineLogos';
import { openQuotePdfPrint } from './QuotePdf';
import { openAsistentePanel } from '../shared/openAsistente';
import {
  carApiConfigured,
  type CarCotizacion,
  type ContactSearchHit,
  ensureAsesor,
  ensureContacto,
  formatAsesorLabel,
  getContacto,
  getCotizacion,
  listCotizaciones,
  loadCrmUserEmail,
  loadCrmUserId,
  searchContactosMerged,
  searchOportunidades,
  type OportunidadHit,
  upsertCotizacion,
} from '../shared/carApi';
import {
  isChatCenterHost,
  loadTabTopPct,
  pasteQuoteIntoChatCenter,
  saveTabTopPct,
} from '../shared/chatCenter';
import {
  addOriginCity,
  BM_DESTINATIONS_KEY,
  destDatalistHtml,
  loadBmDestinations,
  loadOriginCities,
  ORIGIN_CITIES_KEY,
  originDatalistHtml,
} from '../shared/originCities';
import {
  flattenChildAges,
  mutateRoomPlan,
  readRoomPlanFromRoot,
  roomPlanHtml,
  roomsFromBriefing,
  serializeRoomPlan,
  distributeChildAges,
  summarizeRoomPlan,
  formatBriefingPaxCompact,
  formatWholesaleClientTotalLead,
  hasAccommodationPlan,
  adultsForKind,
  type BriefingRoom,
} from '../shared/roomPlan';
import {
  groupCartItemsForDisplay,
  linkTransferToHotelKit,
  openBookingMotorTransferSearch,
  pendingFromHotel,
  startHotelTransferSearch,
} from '../shared/hotelTransferKit';
import {
  defaultTaConfig,
  defaultTaSelection,
  loadTaConfig,
  loadTaSelection,
  normalizeTaConfig,
  normalizeTaSelection,
  resolveTaUnitCop,
  saveTaSelection,
  suggestTaType,
  TA_CONFIG_KEY,
  TA_SELECTION_KEY,
  TaConfig,
  TaSelection,
  TaType,
  taTypeLabel,
} from '../shared/taConfig';
import { cartNeedsTaFee, taFeeHintForItems, compareOptionSubtotals, charmNineExcess, formatValorOriginalDual, formatServiceItemTotal, toDisplay as toDisplayAmount } from '../shared/cartEngine';

const STORAGE_KEY = 'tce_cart_items';
const SEARCH_KEY = 'tce_last_search';
const FEES_KEY = 'tce_fees';

/**
 * Extra charges added on top of the selected products.
 * "Mayor valor cobrado" defaults to 0; Redondear fills it with the
 * difference up to the next thousand so the grand total is a round figure.
 */
interface FeeDefinition {
  id: string;
  label: string;
  defaultValue: number;
}

const MAYOR_VALOR_ID = 'mayor_valor_cobrado';
const REDONDEO_ID = 'redondeo';

const FEE_DEFINITIONS: FeeDefinition[] = [
  { id: MAYOR_VALOR_ID, label: 'Mayor valor cobrado', defaultValue: 0 },
  { id: REDONDEO_ID, label: 'Redondeo', defaultValue: 0 },
];

/** Legacy fee ids from earlier scaffolds — migrated on load. */
const LEGACY_FEE_IDS = ['fee_ejemplo_1', 'fee_ejemplo_2'] as const;

export class CartSidebar {
  private host: HTMLDivElement;
  private shadow: ShadowRoot;
  private items: CartItem[] = [];
  private searchContext: SearchContext | null = null;
  /**
   * First flight search for this trip — sticky header guide (dates/pax/route).
   * Hotel/BM `tce_last_search` only fills the header until a flight guide exists.
   */
  private tripGuide: SearchContext | null = null;
  private fees: Record<string, number> = {};
  private quoteLines: QuoteLine[] = defaultQuoteLines();
  private quoteCopyStatus: 'idle' | 'ok' | 'err' = 'idle';
  /** Shown under WhatsApp actions when status is ok/err (PDF, copy, briefing). */
  private quoteStatusMessage = '';
  private panelTab: 'items' | 'total' | 'accommodation' | 'whatsapp' | 'history' = 'items';
  /** Item ids currently expanded in the Productos list (default = collapsed). */
  private expandedIds = new Set<string>();
  private isOpen = false;
  private advisorName = '';
  private clientName = '';
  private initialDeposit = '';
  private pdfInsuranceAnnex = true;
  private agencyName = '';
  private clientEmail = '';
  private linkedOpportunity: LinkedOpportunity | null = null;
  private opportunityHits: OportunidadHit[] = [];
  private opportunitySearchOpen = false;
  private includeUsdEquiv = false;
  private showTrmInQuote = false;
  private hotelsAsOptions = false;
  /** retail = total÷pax; wholesale = DBL/TPL/CHD package lines. */
  private quoteMode: QuoteMode = DEFAULT_QUOTE_MODE;
  /** Mayorista: incluir total del mix del cliente en WhatsApp/PDF (pestaña Acomodación). */
  private occupancyTotalOpen = false;
  /** Mayorista: incluir comisión aproximada (requiere total del mix). */
  private commissionApproxOpen = false;
  /** freelance 10% | agency 12%. */
  private commissionApproxKind: CommissionApproxKind | null = null;
  /** Mayorista: chip Acomodación verde tras tocar el mix. */
  private accommodationConfirmed = false;
  /** Mayorista: redondeo …9 automático en Tarifa pp (paquete). */
  private autoRoundOccupancy = true;
  /** Con auto off: opciones con …9 manual en Tarifa pp. */
  private manualPackageRoundIds: string[] = [];
  /** Warning banner ids the advisor dismissed (session storage). */
  private dismissedWarnings: string[] = [];
  /** Warnings popover open (session UI only). */
  private warningsPanelOpen = false;
  private originCities: string[] = [];
  private bmDestinations: string[] = [];
  /** When comparing: each group is a column (Opción N) with one or more hotels. */
  private hotelOptionGroups: HotelCompareOptionGroup[] = [];
  /** Unify cart prices/totals to one currency (TRM converts the other). */
  private displayCurrency: DisplayCurrency = 'COP';
  private trmRate = 0;
  private trmSuplemento = DEFAULT_TRM_SUPLEMENTO;
  /** After Nueva búsqueda, ignore BM re-writing tce_last_search for a moment. */
  private ignoreSearchUntil = 0;
  private trmSource: TrmSourceId = DEFAULT_TRM_SOURCE;
  private history: HistoryEntry[] = [];
  private pendingQuoteNumber: number | null = null;
  /** Id `car_cotizacion.id` de la cotización activa (clave servidor). */
  private activeServerId: number | null = null;
  /** `numero_car` en BD vinculado a la sesión (puede ≠ pending local). */
  private activeServerNumeroCar: number | null = null;
  private taConfig: TaConfig = defaultTaConfig();
  private taSelection: TaSelection = defaultTaSelection();
  /** While typing TRM / fees / TA, skip full re-renders from storage echoes. */
  private suppressNumberFieldRerender = false;
  /** Timestamp of last cart/fees write from this tab — distinguish echo vs other tabs/panel. */
  private lastLocalCartWriteAt = 0;
  private lastLocalFeesWriteAt = 0;
  /** Blue Asistente tab vertical position (% of viewport height). */
  private tabTopPct = 50;
  /** Contact search (API car_*). */
  private contactHits: ContactSearchHit[] = [];
  private contactSearchOpen = false;
  private contactSearchTimer: number | null = null;
  private selectedContactId: number | null = null;
  private selectedContactPhone = '';
  private selectedCrmContactId: string | null = null;
  private opportunityLoadTimer: number | null = null;
  private selectedAsesorId: number | null = null;
  /** Cotizaciones en servidor (car_cotizacion). */
  private remoteQuotes: CarCotizacion[] = [];
  private remoteQuotesLoaded = false;
  private carApiReady = false;

  private isLocalStorageEcho(writtenAt: number, windowMs = 150): boolean {
    return writtenAt > 0 && Date.now() - writtenAt < windowMs;
  }

  constructor() {
    const existing = document.getElementById('tce-cart-sidebar-host');
    if (existing) {
      existing.remove();
    }

    this.host = document.createElement('div');
    this.host.id = 'tce-cart-sidebar-host';
    this.shadow = this.host.attachShadow({ mode: 'closed' });
    document.documentElement.appendChild(this.host);
    this.fees = this.defaultFees();
    this.injectStyles();
    this.render();
    this.loadFromStorage();
    this.watchCartStorage();
    this.loadSearchContext();
    this.watchSearchContext();
    this.loadFees();
    void this.loadQuoteLinesFromStorage();
    this.watchQuoteLines();
    void this.bootstrapMeta();
  }

  private async bootstrapMeta(): Promise<void> {
    this.advisorName = await loadAdvisorName();
    this.clientName = await loadClientName();
    this.initialDeposit = await loadInitialDeposit();
    this.pdfInsuranceAnnex = await loadPdfInsuranceAnnex();
    this.occupancyTotalOpen = await loadOccupancyTotalOpen();
    this.commissionApproxOpen = await loadCommissionApproxOpen();
    this.commissionApproxKind = await loadCommissionApproxKind();
    this.accommodationConfirmed = await loadAccommodationConfirmed();
    this.agencyName = await loadAgencyName();
    this.clientEmail = await loadClientEmail();
    this.linkedOpportunity = await loadLinkedOpportunity();
    this.includeUsdEquiv = await loadIncludeUsdEquiv();
    if (this.selectedContactPhone || this.clientName) {
      void this.refreshOpportunityHits();
    }
    this.showTrmInQuote = await loadShowTrmInQuote();
    this.autoRoundOccupancy = await loadAutoRoundOccupancy();
    this.manualPackageRoundIds = await loadManualPackageRoundIds();
    this.hotelsAsOptions = await loadHotelsAsOptions();
    this.quoteMode = await loadQuoteMode();
    this.originCities = await loadOriginCities();
    this.bmDestinations = await loadBmDestinations();
    if (this.quoteMode === 'wholesale' && !this.hotelsAsOptions) {
      this.hotelsAsOptions = true;
      void saveHotelsAsOptions(true);
    }
    this.hotelOptionGroups = await loadHotelCompareGroups();
    this.syncHotelOptionGroups();
    this.lockWholesaleTripFacts();
    this.pendingQuoteNumber = await loadPendingQuoteNumber();
    this.displayCurrency = await loadDisplayCurrency();
    const trm = await loadTrm();
    if (trm) this.trmRate = trm.rate;
    this.trmSuplemento = await loadTrmSuplemento();
    this.trmSource = await loadTrmSource();
    this.taConfig = await loadTaConfig();
    this.taSelection = await loadTaSelection();
    this.history = await loadHistory();
    this.dismissedWarnings = await loadDismissedWarnings();
    this.tabTopPct = await loadTabTopPct();
    this.carApiReady = await carApiConfigured();
    if (this.carApiReady) void this.refreshRemoteQuotes();
    // Strip legacy hotel-level …9; package …9 is applied in summarizeWholesaleOption.
    if (this.syncAutoRoundOccupancy()) {
      await this.saveToStorage();
    }
    this.watchTrmStorage();
    this.watchTaStorage();
    this.watchMetaStorage();
    this.render();
    // Ask background to pull TRM from the preferred public site (non-blocking).
    try {
      chrome.runtime.sendMessage({ type: 'TCE_REFRESH_TRM', force: false }, () => undefined);
    } catch {
      // ignore
    }
  }

  private getEffectiveTrm(): number {
    return effectiveTrm(this.trmRate, this.trmSuplemento);
  }

  private trmDiaOpt(): number | undefined {
    return this.trmRate > 0 ? this.trmRate : undefined;
  }

  /** Apply or undo auto …9 on hotel tier pp (SGL/DBL/TPL/CHD). */
  private syncAutoRoundOccupancy(): boolean {
    const fx = {
      effTrm: this.getEffectiveTrm(),
      trmDia: this.trmDiaOpt(),
      displayCurrency: this.displayCurrency,
    };
    let changed = false;
    const repaired = repairHotelOccupancyInItems(this.items, fx);
    if (repaired.changed) {
      this.items = repaired.items;
      changed = true;
    }
    const { items, changed: stripped } = applyAutoRoundToHotelItems(
      this.items,
      this.autoRoundOccupancy,
      this.displayCurrency,
      fx.effTrm,
      fx.trmDia
    );
    if (stripped) {
      this.items = items;
      changed = true;
    }
    return changed;
  }

  private shouldRoundPackage(optionId?: string): boolean {
    if (this.autoRoundOccupancy) return true;
    if (!optionId) return false;
    return this.manualPackageRoundIds.includes(optionId);
  }

  private async setManualPackageRound(optionId: string, on: boolean): Promise<void> {
    const set = new Set(this.manualPackageRoundIds);
    if (on) set.add(optionId);
    else set.delete(optionId);
    this.manualPackageRoundIds = [...set];
    await saveManualPackageRoundIds(this.manualPackageRoundIds);
  }

  private async setAutoRoundOccupancy(on: boolean): Promise<void> {
    if (on === this.autoRoundOccupancy) return;
    this.autoRoundOccupancy = on;
    await saveAutoRoundOccupancy(on);
    if (on) {
      this.manualPackageRoundIds = [];
      await saveManualPackageRoundIds([]);
    }
    if (this.syncAutoRoundOccupancy()) await this.saveToStorage();
    this.render();
  }

  private watchTrmStorage(): void {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        let dirty = false;
        if (changes[TRM_KEY]) {
          const next = changes[TRM_KEY].newValue as TrmState | undefined;
          if (next && typeof next.rate === 'number' && next.rate > 0) {
            this.trmRate = next.rate;
            if (this.taSelection.type === 'internacional') {
              this.taSelection = {
                ...this.taSelection,
                unitCop: resolveTaUnitCop(this.taConfig, 'internacional', this.getEffectiveTrm()),
              };
              void saveTaSelection(this.taSelection);
            }
            if (this.autoRoundOccupancy && this.syncAutoRoundOccupancy()) {
              void this.saveToStorage();
            }
            dirty = true;
          }
        }
        if (changes[TRM_SUPLEMENTO_KEY]) {
          this.trmSuplemento = normalizeTrmSuplemento(changes[TRM_SUPLEMENTO_KEY].newValue);
          if (this.taSelection.type === 'internacional') {
            this.taSelection = {
              ...this.taSelection,
              unitCop: resolveTaUnitCop(this.taConfig, 'internacional', this.getEffectiveTrm()),
            };
            void saveTaSelection(this.taSelection);
          }
          if (this.autoRoundOccupancy && this.syncAutoRoundOccupancy()) {
            void this.saveToStorage();
          }
          dirty = true;
        }
        if (changes[TRM_SOURCE_KEY]) {
          this.trmSource = normalizeTrmSource(changes[TRM_SOURCE_KEY].newValue);
          dirty = true;
        }
        if (dirty && !this.suppressNumberFieldRerender) this.render();
      });
    } catch {
      // ignore
    }
  }

  private watchTaStorage(): void {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        let dirty = false;
        if (changes[TA_CONFIG_KEY]) {
          this.taConfig = normalizeTaConfig(changes[TA_CONFIG_KEY].newValue);
          dirty = true;
        }
        if (changes[TA_SELECTION_KEY]) {
          this.taSelection = normalizeTaSelection(changes[TA_SELECTION_KEY].newValue);
          dirty = true;
        }
        if (dirty && !this.suppressNumberFieldRerender) this.render();
      });
    } catch {
      // ignore
    }
  }

  private async refreshTrmFromApi(): Promise<void> {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'TCE_REFRESH_TRM', force: true });
      if (res?.trm?.rate) {
        this.trmRate = res.trm.rate;
        this.render();
      }
    } catch {
      // ignore
    }
  }

  setAdvisorName(name: string): void {
    const trimmed = name.trim();
    if (!trimmed || trimmed === this.advisorName) return;
    this.advisorName = trimmed;
    void saveAdvisorName(trimmed);
    this.render();
  }

  setTrm(rate: number): void {
    if (!(rate > 0) || rate === this.trmRate) return;
    this.trmRate = rate;
    this.render();
  }

  private defaultFees(): Record<string, number> {
    const fees: Record<string, number> = {};
    for (const def of FEE_DEFINITIONS) fees[def.id] = def.defaultValue;
    return fees;
  }

  async addItem(item: CartItem): Promise<void> {
    if (item.type === 'hotel' && this.quoteMode === 'wholesale') {
      const merged = this.mergeWholesaleHotelProbe(item);
      if (merged) {
        if (this.hotelsAsOptions) this.syncHotelOptionGroups();
        this.lockWholesaleTripFacts();
        await this.saveToStorage();
        this.panelTab = 'items';
        this.render();
        this.highlightLatest();
        return;
      }
      item = {
        ...item,
        occupancyRates: refreshOccupancyBaseline(
          deriveOccupancyRatesFromItem(item, undefined, {
            effTrm: this.getEffectiveTrm(),
            trmDia: this.trmDiaOpt(),
          })
        ),
      };
      this.syncAutoRoundOccupancy();
    }

    if (item.type === 'transfer') {
      item = await linkTransferToHotelKit(item, this.items);
    }

    this.items.push(item);
    if (item.type === 'hotel' && this.hotelsAsOptions) {
      this.syncHotelOptionGroups();
      // New hotels start unassigned so the advisor picks option chips.
    }
    if (item.type === 'hotel') {
      const ages = item.occupancy.flatMap((o) => o.childrenAges ?? []);
      const children = item.occupancy.reduce((s, o) => s + o.children, 0);
      if (this.quoteMode !== 'wholesale') {
        this.enrichTripGuideChildAges(ages, children);
      }
    }
    this.lockWholesaleTripFacts();
    await this.saveToStorage();
    this.panelTab = 'items';
    this.render();
    this.highlightLatest();
  }

  /**
   * Mayorista: same hotel + room + board + dates → merge DBL/TPL/CHD into
   * the existing cart row instead of duplicating the option.
   */
  private mergeWholesaleHotelProbe(incoming: HotelCartItem): HotelCartItem | null {
    const target = findHotelMergeTarget(this.items, incoming);
    if (!target) return null;
    const occupancyRates = refreshOccupancyBaseline(
      deriveOccupancyRatesFromItem(incoming, target.occupancyRates as OccupancyTierRates | undefined, {
        effTrm: this.getEffectiveTrm(),
        trmDia: this.trmDiaOpt(),
      })
    );
    const updated: HotelCartItem = {
      ...target,
      occupancyRates,
      // Keep latest probe rate as selectedRate for reference / PDF hotel total.
      selectedRate: incoming.selectedRate,
      occupancy: incoming.occupancy,
      bookingUrl: incoming.bookingUrl || target.bookingUrl,
      sourceUrl: incoming.sourceUrl || target.sourceUrl,
      addedAt: Date.now(),
    };
    this.items = this.items.map((i) => (i.id === target.id ? updated : i));
    this.syncAutoRoundOccupancy();
    return updated;
  }

  private async setQuoteMode(mode: QuoteMode): Promise<void> {
    this.quoteMode = mode;
    void saveQuoteMode(mode);
    if (mode === 'wholesale') {
      this.hotelsAsOptions = true;
      void saveHotelsAsOptions(true);
      this.syncHotelOptionGroups();
    } else if (this.panelTab === 'accommodation') {
      this.panelTab = 'items';
      this.occupancyTotalOpen = false;
      this.commissionApproxOpen = false;
      this.commissionApproxKind = null;
      void saveOccupancyTotalOpen(false);
      void saveCommissionApproxOpen(false);
      void saveCommissionApproxKind(null);
    }
    this.render();
  }

  private async toggleDestinationPin(): Promise<void> {
    const destEl = this.shadow.querySelector('#tce-brief-dest') as HTMLInputElement | null;
    const dest = (destEl?.value || this.tripGuide?.destinationText || '').trim();
    const pinned = !this.tripGuide?.destinationPinned;
    if (pinned && !dest) {
      window.alert('Escribe o busca un destino antes de fijarlo.');
      return;
    }
    const briefing = buildTripBriefing({
      originText: this.tripGuide?.originText,
      destinationText: dest || this.tripGuide?.destinationText,
      checkIn: this.tripGuide?.checkIn,
      checkOut: this.tripGuide?.checkOut,
      adults: this.tripGuide?.totalAdults ?? 0,
      children: this.tripGuide?.totalChildren ?? 0,
      childrenAges: this.tripGuide?.childrenAges || [],
      roomPlan: this.tripGuide?.roomPlan,
      previous: this.tripGuide,
    });
    briefing.destinationPinned = pinned;
    briefing.destinationText = dest || briefing.destinationText;
    this.tripGuide = briefing;
    await saveTripGuide(briefing);
    this.render();
  }

  private async saveBriefingFromForm(): Promise<void> {
    const root = this.shadow;
    const origin = (root.querySelector('#tce-brief-origin') as HTMLInputElement | null)?.value;
    const dest = (root.querySelector('#tce-brief-dest') as HTMLInputElement | null)?.value;
    const checkIn = (root.querySelector('#tce-brief-in') as HTMLInputElement | null)?.value;
    const checkOut = (root.querySelector('#tce-brief-out') as HTMLInputElement | null)?.value;
    const roomPlan = readRoomPlanFromRoot(root);

    if (this.quoteMode === 'wholesale') {
      const briefing = buildTripBriefing({
        originText: origin,
        destinationText: dest || this.tripGuide?.destinationText,
        checkIn: this.tripGuide?.checkIn,
        checkOut: this.tripGuide?.checkOut,
        adults: 0,
        children: 0,
        childrenAges: this.tripGuide?.childrenAges || [],
        roomPlan: this.tripGuide?.roomPlan,
        previous: this.tripGuide,
      });
      this.tripGuide = briefing;
      await saveTripGuide(briefing);
      if (origin?.trim()) void addOriginCity(origin);
      this.render();
      return;
    }

    const today = isoDateToday();
    const inIso = checkIn && checkIn < today ? today : checkIn;
    const outIso =
      checkOut && inIso && checkOut < inIso ? inIso : checkOut && checkOut < today ? today : checkOut;

    const briefing = buildTripBriefing({
      originText: origin,
      destinationText: dest,
      checkIn: fromIsoDateInput(inIso) || this.tripGuide?.checkIn,
      checkOut: fromIsoDateInput(outIso) || this.tripGuide?.checkOut,
      adults: 0,
      children: 0,
      childrenAges: flattenChildAges(roomPlan),
      roomPlan,
      previous: this.tripGuide,
    });
    this.tripGuide = briefing;
    await saveTripGuide(briefing);
    if (origin?.trim()) void addOriginCity(origin);
    this.render();
  }

  private readBriefingDraft(): SearchContext | null {
    const origin = (this.shadow.querySelector('#tce-brief-origin') as HTMLInputElement | null)?.value;
    const dest = (this.shadow.querySelector('#tce-brief-dest') as HTMLInputElement | null)?.value;
    const checkIn = (this.shadow.querySelector('#tce-brief-in') as HTMLInputElement | null)?.value;
    const checkOut = (this.shadow.querySelector('#tce-brief-out') as HTMLInputElement | null)?.value;
    if (origin == null && dest == null) return null;
    const roomPlan = readRoomPlanFromRoot(this.shadow);
    return buildTripBriefing({
      originText: origin,
      destinationText: dest,
      checkIn: fromIsoDateInput(checkIn),
      checkOut: fromIsoDateInput(checkOut),
      adults: 0,
      children: 0,
      childrenAges: flattenChildAges(roomPlan),
      roomPlan,
      previous: this.tripGuide,
    });
  }

  private briefingNeedsSave(): boolean {
    const draft = this.readBriefingDraft() || this.tripGuide;
    if (briefingMissingFields(draft).length > 0) return true;
    const g = this.tripGuide;
    if (!g || !draft) return true;
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

  private refreshBriefingSaveButton(): void {
    const btn = this.shadow.querySelector('.tce-briefing-save');
    if (!btn) return;
    btn.classList.toggle('tce-briefing-save--need', this.briefingNeedsSave());
  }

  private refreshBriefingNightsLabel(): void {
    const checkIn = (this.shadow.querySelector('#tce-brief-in') as HTMLInputElement | null)?.value;
    const checkOut = (this.shadow.querySelector('#tce-brief-out') as HTMLInputElement | null)
      ?.value;
    const el = this.shadow.querySelector('#tce-brief-nights');
    const outEl = this.shadow.querySelector('#tce-brief-out') as HTMLInputElement | null;
    const today = isoDateToday();
    if (outEl) outEl.min = checkIn && checkIn > today ? checkIn : today;
    if (!el) return;
    const n = nightsFromTripDates(checkIn, checkOut);
    el.textContent = n > 0 ? String(n) : '—';
  }

  /** True if a flight with the same Despegar tripId is already in the cart. */
  hasFlightTrip(tripId?: string): boolean {
    if (!tripId) return false;
    return this.items.some(
      (item) => item.type === 'flight' && item.tripId === tripId
    );
  }

  /**
   * Updates the cart header summary.
   * - Flight: first one sticks as `tripGuide` (persisted); later flights don't replace it.
   * - Hotel/transfer/etc.: only shown in the header when there is no flight guide yet.
   * - Child ages from BM (or a hotel in cart) enrich the sticky guide when present.
   * Does not write `tce_last_search` (BookingMotor hotel↔transfer sync stays separate).
   */
  setSearchContext(ctx: SearchContext): void {
    if (ctx.sourceType === 'flight') {
      // First flight (or first with dates) seeds the sticky guide so BM forms
      // (hotel/transfer/insurance/activity) can prefill ida/regreso/pax.
      if (!this.tripGuide) {
        this.tripGuide = ctx;
        void saveTripGuide(ctx);
      } else if (!this.tripGuide.checkIn && ctx.checkIn) {
        this.tripGuide = {
          ...this.tripGuide,
          checkIn: ctx.checkIn,
          checkOut: ctx.checkOut || this.tripGuide.checkOut,
          nights: ctx.nights || this.tripGuide.nights,
          originText: this.tripGuide.originText || ctx.originText,
          destinationText: this.tripGuide.destinationText || ctx.destinationText,
          totalAdults: this.tripGuide.totalAdults || ctx.totalAdults,
          totalChildren: this.tripGuide.totalChildren || ctx.totalChildren,
          rooms: this.tripGuide.rooms?.length ? this.tripGuide.rooms : ctx.rooms,
          sourceType: this.tripGuide.sourceType === 'briefing' ? 'briefing' : 'flight',
          savedAt: Date.now(),
        };
        void saveTripGuide(this.tripGuide);
      } else if (
        this.tripGuide.sourceType !== 'briefing' &&
        !this.tripGuide.originText &&
        ctx.originText
      ) {
        this.tripGuide = {
          ...this.tripGuide,
          originText: ctx.originText,
          destinationText: this.tripGuide.destinationText || ctx.destinationText,
          savedAt: Date.now(),
        };
        void saveTripGuide(this.tripGuide);
      }
      this.render();
      return;
    }
    this.searchContext = ctx;
    this.enrichTripGuideChildAges(ctx.childrenAges, ctx.totalChildren);
    this.render();
  }

  /** Valid child ages only (empty → omit from guía). Age 0 is allowed. */
  private normalizeChildAges(ages: number[] | undefined | null): number[] {
    if (!ages?.length) return [];
    return ages.filter((a) => typeof a === 'number' && Number.isFinite(a) && a >= 0 && a <= 17);
  }

  /**
   * Fill empty briefing ages from BM. Never replace ages the advisor already saved
   * (hotel occupancy probes often send 0, 0 and were wiping Guardar viaje).
   */
  private enrichTripGuideChildAges(ages: number[] | undefined | null, children?: number): void {
    if (!this.tripGuide) return;
    const clean = this.normalizeChildAges(ages);
    const incomingReal = clean.some((a) => a > 0);
    if (!incomingReal) return;
    const prev = this.normalizeChildAges(this.tripGuide.childrenAges);
    if (this.tripGuide.sourceType === 'briefing' && prev.some((a) => a > 0)) return;

    const nextChildren =
      this.tripGuide.sourceType === 'briefing'
        ? this.tripGuide.totalChildren
        : children != null && children > 0
          ? children
          : Math.max(this.tripGuide.totalChildren, clean.length);
    const sliced = clean.slice(0, Math.max(nextChildren, 1));
    const same =
      prev.length === sliced.length && prev.every((a, i) => a === sliced[i]);
    if (same && this.tripGuide.totalChildren === nextChildren) return;

    const plan = roomsFromBriefing(
      this.tripGuide.roomPlan,
      this.tripGuide.totalAdults,
      nextChildren,
      sliced
    );
    const withAges = distributeChildAges(plan, sliced);

    this.tripGuide = {
      ...this.tripGuide,
      childrenAges: flattenChildAges(withAges),
      totalChildren: nextChildren,
      roomPlan: withAges,
      rooms: withAges.map((r) => ({
        adults: adultsForKind(r.kind),
        children: r.children || 0,
        childrenAges: r.childrenAges || [],
      })),
    };
    void saveTripGuide(this.tripGuide);
  }

  /** Context shown in the header: sticky flight guide wins; ages may come from BM/hotel. */
  private headerSearchContext(): SearchContext | null {
    const guide = this.tripGuide;
    const search = this.searchContext;
    if (!guide) return this.items.length === 0 ? null : search;

    const guideAges = this.normalizeChildAges(guide.childrenAges);
    if (guideAges.some((a) => a > 0)) return guide;

    const fromSearch = this.normalizeChildAges(search?.childrenAges);
    if (fromSearch.some((a) => a > 0) && guide.totalChildren > 0) {
      return {
        ...guide,
        childrenAges: fromSearch.slice(0, guide.totalChildren),
      };
    }

    const fromHotels = this.normalizeChildAges(
      this.items
        .filter((i): i is HotelCartItem => i.type === 'hotel')
        .flatMap((h) => h.occupancy.flatMap((o) => o.childrenAges ?? []))
    );
    if (fromHotels.some((a) => a > 0)) {
      return {
        ...guide,
        childrenAges: fromHotels,
        totalChildren: Math.max(guide.totalChildren, fromHotels.length),
      };
    }

    return guide;
  }

  async removeItem(id: string): Promise<void> {
    this.items = this.items.filter((i) => i.id !== id);
    this.expandedIds.delete(id);
    this.syncHotelOptionGroups();
    await this.saveToStorage();
    this.render();
  }

  async clearCart(): Promise<void> {
    if (this.items.length > 0) {
      await this.archiveCurrentCart('Vaciar carrito');
    }
    this.items = [];
    this.panelTab = 'items';
    this.expandedIds.clear();
    this.searchContext = null;
    this.tripGuide = null;
    this.fees = this.defaultFees();
    this.pendingQuoteNumber = null;
    this.activeServerId = null;
    this.activeServerNumeroCar = null;
    this.clientName = '';
    this.clientEmail = '';
    this.linkedOpportunity = null;
    this.opportunityHits = [];
    this.initialDeposit = '';
    void saveClientEmail('');
    void saveLinkedOpportunity(null);
    this.hotelOptionGroups = [];
    this.occupancyTotalOpen = false;
    this.commissionApproxOpen = false;
    this.commissionApproxKind = null;
    this.accommodationConfirmed = false;
    this.ignoreSearchUntil = Date.now() + 4000;
    this.applyTaType('nacional_rt', true);
    await this.saveToStorage();
    await this.clearSearchContextStorage();
    await clearTripGuide();
    await this.saveFees();
    await savePendingQuoteNumber(null);
    await saveClientName('');
    await saveInitialDeposit('');
    void saveOccupancyTotalOpen(false);
    void saveCommissionApproxOpen(false);
    void saveCommissionApproxKind(null);
    void saveAccommodationConfirmed(false);
    void saveHotelCompareGroups([]);
    void clearDismissedWarnings();
    this.dismissedWarnings = [];
    this.warningsPanelOpen = false;
    this.render();
  }

  /** Nueva búsqueda: vacía carrito/viaje y también el nombre de agencia. */
  async startNewSearch(): Promise<void> {
    const hasItems = this.items.length > 0;
    const hasTrip = Boolean(this.tripGuide) || Boolean(this.searchContext);
    if (!hasItems && !hasTrip) {
      this.agencyName = '';
      this.trmSuplemento = DEFAULT_TRM_SUPLEMENTO;
      await saveAgencyName('');
      await saveTrmSuplemento(0);
      void signalBmClearMarks();
      void clearDismissedWarnings();
      this.dismissedWarnings = [];
    this.warningsPanelOpen = false;
      this.ignoreSearchUntil = Date.now() + 4000;
      await this.clearSearchContextStorage();
      this.render();
      return;
    }
    const ok = window.confirm(
      hasItems
        ? '¿Nueva búsqueda? Se vacía el carrito (queda en historial), el viaje guardado y la agencia.'
        : '¿Nueva búsqueda? Se limpia origen, destino, fechas, pasajeros y agencia.'
    );
    if (!ok) return;
    await this.clearCart();
    this.agencyName = '';
    this.trmSuplemento = DEFAULT_TRM_SUPLEMENTO;
    await saveAgencyName('');
    await saveTrmSuplemento(0);
    void signalBmClearMarks();
    void clearDismissedWarnings();
    this.dismissedWarnings = [];
    this.warningsPanelOpen = false;
    this.render();
  }

  /** Stable quote # for this cart session (survives page navigation). */
  private async ensurePendingQuoteNumber(): Promise<number> {
    if (this.pendingQuoteNumber !== null) return this.pendingQuoteNumber;
    const stored = await loadPendingQuoteNumber();
    if (stored !== null) {
      this.pendingQuoteNumber = stored;
      return stored;
    }
    const peek = await peekNextQuoteNumber();
    this.pendingQuoteNumber = peek;
    await savePendingQuoteNumber(peek);
    return peek;
  }

  private async buildHistoryParams(): Promise<HistoryBuildParams | null> {
    if (this.items.length === 0) return null;
    const quoteNumber = await this.ensurePendingQuoteNumber();
    const subtotals = this.getTotalsByCurrency();
    const primaryCurrency = this.getPrimaryCurrency(subtotals) || 'COP';
    const itemsTotal = subtotals.get(primaryCurrency) || 0;
    const snapshot = enrichSearchContextFromItems(
      this.headerSearchContext(),
      this.items
    );
    return {
      quoteNumber,
      serverId: this.activeServerId || undefined,
      serverNumeroCar: this.activeServerNumeroCar || undefined,
      advisorName: this.advisorName,
      clientName: this.clientName.trim() || undefined,
      agencyName: this.agencyName.trim() || undefined,
      destination: snapshot?.destinationText,
      searchContext: snapshot,
      items: this.items,
      fees: this.fees,
      taTotal: this.getTaTotal() || undefined,
      taSelection: this.taSelection,
      trm: this.trmRate > 0 ? this.trmRate : undefined,
      trmSuplemento: this.trmSuplemento,
      initialDeposit: this.initialDeposit.trim() || undefined,
      grandTotal: itemsTotal + this.getFeesTotal(),
      primaryCurrency,
      displayCurrency: this.displayCurrency,
      quoteMode: this.quoteMode,
      hotelsAsOptions: this.hotelsAsOptions,
      hotelOptionGroups: this.hotelOptionGroups,
      occupancyTotalOpen: this.occupancyTotalOpen,
      commissionApproxOpen: this.commissionApproxOpen,
      commissionApproxKind: this.commissionApproxKind || undefined,
      autoRoundOccupancy: this.autoRoundOccupancy,
      showTrmInQuote: this.showTrmInQuote,
      includeUsdEquiv: this.includeUsdEquiv,
      quoteLines: this.quoteLines,
    };
  }

  private scheduleHistoryDraftSync(): void {
    void this.buildHistoryParams().then((params) => {
      if (params) scheduleHistoryDraft(params);
    });
  }

  private async archiveCurrentCart(reason: string): Promise<void> {
    if (this.items.length === 0) return;
    // Avoid duplicating the same session after "Copiar WhatsApp" then "Vaciar".
    if (
      reason === 'Vaciar carrito' &&
      this.pendingQuoteNumber !== null &&
      this.history[0]?.quoteNumber === this.pendingQuoteNumber
    ) {
      return;
    }

    const quoteNumber = await this.ensurePendingQuoteNumber();
    await commitQuoteNumber(quoteNumber);
    const params = await this.buildHistoryParams();
    if (!params) return;
    const entry = buildHistoryEntry(params);
    await upsertHistory(entry);
    this.history = await loadHistory();
    void appendAppLog('info', `Historial: ${reason} ${formatQuoteRef(quoteNumber)}`);
    void (async () => {
      await this.ensureContactOnServer();
      await this.ensureAsesorOnServer();
      await this.syncQuoteToCarApi(quoteNumber, entry, reason);
    })();
  }

  private async syncQuoteToCarApi(
    quoteNumber: number,
    entry: HistoryEntry,
    reason: string
  ): Promise<void> {
    if (!(await carApiConfigured())) return;
    // Prefer existing server numero_car so re-saves update the same DB row
    // even if the local CAR number was remapped to avoid collisions.
    const numeroCar = this.activeServerNumeroCar || entry.serverNumeroCar || quoteNumber;
    const historySnap = slimHistoryEntry({
      ...entry,
      quoteNumber,
      serverId: this.activeServerId || entry.serverId,
      serverNumeroCar: numeroCar,
    });
    const res = await upsertCotizacion({
      numero_car: numeroCar,
      numero_car_ref: formatQuoteRef(numeroCar),
      asesor_id: this.selectedAsesorId || undefined,
      asesor_nombre: this.advisorName || undefined,
      agencia_nombre: this.agencyName || entry.agencyName || undefined,
      contacto_nombre: this.clientName || entry.clientName || undefined,
      contacto_telefono: this.selectedContactPhone || undefined,
      contacto_id: this.selectedContactId || undefined,
      oportunidad_crm_id: this.linkedOpportunity?.id || undefined,
      oportunidad_seq: this.linkedOpportunity?.sequence_number ?? undefined,
      payload_json: {
        version: 1,
        reason,
        savedAt: Date.now(),
        localQuoteNumber: quoteNumber,
        history: historySnap,
        // Legacy flat fields (apps / versiones anteriores)
        quoteMode: entry.quoteMode,
        items: entry.items,
        fees: entry.fees,
        searchContext: entry.searchContext,
        hotelOptionGroups: entry.hotelOptionGroups,
        clientName: entry.clientName,
        agencyName: entry.agencyName,
      },
      origen: 'extension',
    });
    if (res.ok) {
      this.carApiReady = true;
      this.activeServerId = res.data.id;
      this.activeServerNumeroCar = res.data.numero_car;
      const patched: HistoryEntry = {
        ...historySnap,
        serverId: res.data.id,
        serverNumeroCar: res.data.numero_car,
      };
      await upsertHistory(patched);
      this.history = await loadHistory();
      void appendAppLog(
        'info',
        `API: guardada ${formatQuoteRef(numeroCar)} (db#${res.data.id}, local ${formatQuoteRef(quoteNumber)})`
      );
      void this.refreshRemoteQuotes();
    } else {
      void appendAppLog('warn', `API cotización: ${res.error}`);
    }
  }

  private async refreshRemoteQuotes(): Promise<void> {
    if (!(await carApiConfigured())) {
      this.carApiReady = false;
      this.remoteQuotes = [];
      this.remoteQuotesLoaded = true;
      return;
    }
    this.carApiReady = true;
    const res = await listCotizaciones({ limit: 40 });
    if (res.ok) {
      this.remoteQuotes = res.data.items || [];
    } else {
      this.remoteQuotes = [];
      void appendAppLog('warn', `API listar: ${res.error}`);
    }
    this.remoteQuotesLoaded = true;
    if (this.panelTab === 'history') this.render();
  }

  private scheduleContactSearch(q: string): void {
    if (this.contactSearchTimer) window.clearTimeout(this.contactSearchTimer);
    this.contactSearchTimer = window.setTimeout(() => {
      this.contactSearchTimer = null;
      void this.runContactSearch(q);
    }, 280);
  }

  private async runContactSearch(q: string): Promise<void> {
    const term = q.trim();
    if (term.length < 2 || !(await carApiConfigured())) {
      this.contactHits = [];
      this.contactSearchOpen = false;
      this.renderContactDropdownOnly();
      return;
    }
    const res = await searchContactosMerged(term, 12);
    if (!res.ok) {
      this.contactHits = [];
      this.contactSearchOpen = false;
      this.renderContactDropdownOnly();
      return;
    }
    this.contactHits = res.data.items || [];
    this.contactSearchOpen = this.contactHits.length > 0;
    this.renderContactDropdownOnly();
  }

  private renderContactDropdownOnly(): void {
    const host = this.shadow.querySelector('.tce-contact-dd');
    if (!host) return;
    host.innerHTML = this.contactDropdownHtml();
  }

  private contactDropdownHtml(): string {
    if (!this.contactSearchOpen || this.contactHits.length === 0) return '';
    return this.contactHits
      .map((c, idx) => {
        const phone = this.escape(c.telefono || c.telefono_norm || '—');
        const src = c.source === 'crm' ? 'CRM' : 'Carrito';
        const agencia = (c.agencia || '').trim();
        const agenciaHtml = agencia
          ? `<span class="tce-contact-hit-agency">${this.escape(agencia)}</span>`
          : '';
        const det =
          c.car_contacto_id != null
            ? `<button type="button" class="tce-contact-hit-det" data-action="contact-detail" data-car-id="${c.car_contacto_id}">Detalles</button>`
            : '';
        return `<div class="tce-contact-hit">
          <button type="button" class="tce-contact-hit-main" data-action="pick-contact" data-idx="${idx}">
            <span class="tce-contact-hit-name">${this.escape(c.nombre)} <span class="tce-contact-src">${src}</span></span>
            <span class="tce-contact-hit-phone">${phone}</span>
            ${agenciaHtml}
          </button>
          ${det}
        </div>`;
      })
      .join('');
  }

  private async pickContactHit(idx: number): Promise<void> {
    const hit = this.contactHits[idx];
    if (!hit) return;
    if (!(await carApiConfigured())) return;
    const phoneFromHit = (hit.telefono || hit.telefono_norm || '').trim();
    const nameFromHit = (hit.nombre || '').trim();
    const ensured = await ensureContacto({
      nombre: nameFromHit || this.clientName.trim() || 'Contacto',
      telefono: phoneFromHit || this.selectedContactPhone || undefined,
      crm_contact_id: hit.crm_contact_id || undefined,
    });
    if (!ensured.ok) {
      window.alert(ensured.error || 'No se pudo guardar el contacto');
      return;
    }
    this.selectedContactId = ensured.data.id;
    this.selectedCrmContactId = ensured.data.crm_contact_id || hit.crm_contact_id || null;
    // Prefer CRM hit values so name↔phone always cross-fill
    this.selectedContactPhone =
      phoneFromHit ||
      ensured.data.telefono ||
      ensured.data.telefono_norm ||
      this.selectedContactPhone ||
      '';
    this.clientName = nameFromHit || ensured.data.nombre || this.clientName;
    void saveClientName(this.clientName);
    const agencia = (hit.agencia || '').trim();
    if (agencia) {
      this.agencyName = agencia;
      void saveAgencyName(this.agencyName);
    }
    const email = (hit.email || '').trim();
    if (email) {
      this.clientEmail = email;
      void saveClientEmail(this.clientEmail);
    }
    this.contactSearchOpen = false;
    this.contactHits = [];
    void this.refreshOpportunityHits();
    this.render();
  }

  private scheduleOpportunityRefresh(): void {
    if (this.opportunityLoadTimer) window.clearTimeout(this.opportunityLoadTimer);
    this.opportunityLoadTimer = window.setTimeout(() => {
      this.opportunityLoadTimer = null;
      void this.refreshOpportunityHits();
    }, 320);
  }

  private async refreshOpportunityHits(): Promise<void> {
    if (!(await carApiConfigured())) {
      this.opportunityHits = [];
      return;
    }
    const phone = this.selectedContactPhone.trim();
    const crmId = this.selectedCrmContactId || '';
    if (phone.length < 7 && !crmId) {
      this.opportunityHits = [];
      if (this.panelTab === 'items' || this.isOpen) this.render();
      return;
    }
    const res = await searchOportunidades({
      phone: phone || undefined,
      crm_contact_id: crmId || undefined,
      limit: 15,
    });
    this.opportunityHits = res.ok ? res.data.items || [] : [];
    if (this.isOpen) this.render();
  }

  private pickOpportunity(id: string): void {
    if (!id) {
      this.linkedOpportunity = null;
      void saveLinkedOpportunity(null);
      this.opportunitySearchOpen = false;
      this.render();
      return;
    }
    const hit = this.opportunityHits.find((o) => o.id === id);
    if (!hit) return;
    this.linkedOpportunity = {
      id: hit.id,
      sequence_number: hit.sequence_number,
      stage_name: hit.stage_name,
      contact_name: hit.contact_name,
    };
    void saveLinkedOpportunity(this.linkedOpportunity);
    this.opportunitySearchOpen = false;
    this.render();
  }

  private async showContactDetail(carId: number): Promise<void> {
    const res = await getContacto(carId);
    if (!res.ok) {
      window.alert(res.error || 'No se pudo cargar el contacto');
      return;
    }
    const c = res.data;
    window.alert(
      [
        c.nombre,
        c.telefono ? `Tel: ${c.telefono}` : null,
        c.email ? `Email: ${c.email}` : null,
        c.crm_contact_id ? `CRM id: ${c.crm_contact_id}` : null,
        c.notas ? `Notas: ${c.notas}` : null,
        `Carrito id: ${c.id}`,
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  private async ensureContactOnServer(): Promise<void> {
    const name = this.clientName.trim();
    if (!name || !(await carApiConfigured())) return;
    const ensured = await ensureContacto({
      nombre: name,
      telefono: this.selectedContactPhone || undefined,
      crm_contact_id: this.selectedCrmContactId || undefined,
    });
    if (ensured.ok) {
      this.selectedContactId = ensured.data.id;
      this.selectedContactPhone =
        ensured.data.telefono || ensured.data.telefono_norm || this.selectedContactPhone;
      if (ensured.data.crm_contact_id) {
        this.selectedCrmContactId = ensured.data.crm_contact_id;
      }
    }
  }

  private async ensureAsesorOnServer(): Promise<void> {
    const name = (this.advisorName || '').trim();
    if (!name || !(await carApiConfigured())) return;
    const crmId = await loadCrmUserId();
    const email = await loadCrmUserEmail();
    const res = await ensureAsesor({
      nombre: name,
      email: email || undefined,
      crm_user_id: crmId || undefined,
    });
    if (res.ok) {
      this.selectedAsesorId = res.data.id;
      void appendAppLog('info', `Asesor API: ${formatAsesorLabel(res.data)}`);
    }
  }

  /**
   * Local CAR number for a server row: reuse mapping if known; else use
   * numero_car when free; else allocate a fresh local number (no collision).
   */
  private async resolveLocalNumberForRemote(
    serverId: number,
    serverNumeroCar: number
  ): Promise<{ local: number; remapped: boolean }> {
    const byServer = this.history.find((h) => h.serverId === serverId);
    if (byServer) {
      return { local: byServer.quoteNumber, remapped: byServer.quoteNumber !== serverNumeroCar };
    }
    const byNum = this.history.find((h) => h.quoteNumber === serverNumeroCar);
    if (!byNum || byNum.serverId === serverId) {
      await commitQuoteNumber(serverNumeroCar);
      return { local: serverNumeroCar, remapped: false };
    }
    const next = await peekNextQuoteNumber();
    await commitQuoteNumber(next);
    return { local: next, remapped: true };
  }

  /** Reload a frozen quote into the live cart (for BM reopen / venta efectiva). */
  private async restoreHistoryEntry(quoteNumber: number): Promise<void> {
    const entry = this.history.find((h) => h.quoteNumber === quoteNumber);
    if (!entry || entry.items.length === 0) return;
    const ok = window.confirm(
      `¿Restaurar ${formatQuoteRef(quoteNumber)} en el carrito?\nSe reemplazan productos, fees, opciones y modo actuales.`
    );
    if (!ok) return;
    await this.applyHistoryEntryToCart(entry, `Restaurado ${formatQuoteRef(quoteNumber)}`);
  }

  /** Cargar cotización desde `car_cotizacion` (requiere API). */
  private async restoreRemoteQuote(serverId: number): Promise<void> {
    if (!(await carApiConfigured())) {
      window.alert('Configura URL + token de Carrito API en el popup.');
      return;
    }
    const res = await getCotizacion(serverId);
    if (!res.ok) {
      window.alert(res.error || 'No se pudo cargar la cotización del servidor');
      return;
    }
    const q = res.data;
    const { local, remapped } = await this.resolveLocalNumberForRemote(q.id, q.numero_car);
    const entry = remoteCotizacionToHistoryEntry(q, local);
    if (!entry || entry.items.length === 0) {
      window.alert(
        'Esta cotización del servidor no tiene productos recuperables (payload vacío o antiguo).'
      );
      return;
    }
    const remapNote = remapped
      ? `\nNúmero local: ${formatQuoteRef(local)} (el ${formatQuoteRef(q.numero_car)} ya existía aquí; no se pisa).`
      : `\nNúmero local: ${formatQuoteRef(local)}.`;
    const ok = window.confirm(
      `¿Cargar ${q.numero_car_ref} (db#${q.id}) en el carrito?${remapNote}\nSe reemplazan productos, fees y opciones actuales.`
    );
    if (!ok) return;
    await upsertHistory(entry);
    this.history = await loadHistory();
    await this.applyHistoryEntryToCart(
      entry,
      `Cargada ${q.numero_car_ref} · db#${q.id}` +
        (remapped ? ` · local ${formatQuoteRef(local)}` : '')
    );
  }

  private async applyHistoryEntryToCart(
    entry: HistoryEntry,
    statusMessage: string
  ): Promise<void> {
    this.items = freezeHistoryPayload(entry.items);
    this.fees = freezeHistoryPayload({ ...entry.fees });
    this.quoteMode = entry.quoteMode === 'wholesale' ? 'wholesale' : 'retail';
    this.hotelsAsOptions =
      entry.hotelsAsOptions === true || this.quoteMode === 'wholesale';
    this.hotelOptionGroups = freezeHistoryPayload(entry.hotelOptionGroups || []);
    this.occupancyTotalOpen = entry.occupancyTotalOpen === true;
    void saveOccupancyTotalOpen(this.occupancyTotalOpen);
    this.commissionApproxOpen = entry.commissionApproxOpen === true;
    void saveCommissionApproxOpen(this.commissionApproxOpen);
    this.commissionApproxKind =
      entry.commissionApproxKind === 'freelance' || entry.commissionApproxKind === 'agency'
        ? entry.commissionApproxKind
        : null;
    void saveCommissionApproxKind(this.commissionApproxKind);
    this.accommodationConfirmed =
      this.quoteMode === 'wholesale' &&
      Boolean(entry.searchContext?.roomPlan && entry.searchContext.roomPlan.length > 0);
    void saveAccommodationConfirmed(this.accommodationConfirmed);
    if (typeof entry.autoRoundOccupancy === 'boolean') {
      this.autoRoundOccupancy = entry.autoRoundOccupancy;
      void saveAutoRoundOccupancy(this.autoRoundOccupancy);
    }
    if (typeof entry.showTrmInQuote === 'boolean') {
      this.showTrmInQuote = entry.showTrmInQuote;
      void saveShowTrmInQuote(this.showTrmInQuote);
    }
    if (typeof entry.includeUsdEquiv === 'boolean') {
      this.includeUsdEquiv = entry.includeUsdEquiv;
      void saveIncludeUsdEquiv(this.includeUsdEquiv);
    }
    if (entry.taSelection) {
      this.taSelection = normalizeTaSelection(entry.taSelection);
      void saveTaSelection(this.taSelection);
    }
    if (entry.displayCurrency === 'COP' || entry.displayCurrency === 'USD') {
      this.displayCurrency = entry.displayCurrency;
      void saveDisplayCurrency(this.displayCurrency);
    }
    if (entry.trm && entry.trm > 0) {
      this.trmRate = entry.trm;
      const state: TrmState = {
        rate: entry.trm,
        date: todayIso(),
        source: 'manual',
        updatedAt: Date.now(),
      };
      void saveTrm(state);
    }
    if (typeof entry.trmSuplemento === 'number') {
      this.trmSuplemento = normalizeTrmSuplemento(entry.trmSuplemento);
      void saveTrmSuplemento(this.trmSuplemento);
    }
    this.initialDeposit =
      typeof entry.initialDeposit === 'string' ? entry.initialDeposit : '';
    void saveInitialDeposit(this.initialDeposit);
    if (entry.quoteLines && entry.quoteLines.length > 0) {
      this.quoteLines = normalizeQuoteLines(entry.quoteLines);
      void saveQuoteLines(this.quoteLines);
    }
    if (entry.clientName) {
      this.clientName = entry.clientName;
      void saveClientName(this.clientName);
    }
    if (entry.agencyName) {
      this.agencyName = entry.agencyName;
      void saveAgencyName(this.agencyName);
    }
    if (entry.advisorName) {
      this.advisorName = entry.advisorName;
      void saveAdvisorName(this.advisorName);
    }
    if (entry.searchContext) {
      this.tripGuide = freezeHistoryPayload(entry.searchContext);
      void saveTripGuide(this.tripGuide);
    }
    this.pendingQuoteNumber = entry.quoteNumber;
    this.activeServerId = entry.serverId ?? null;
    this.activeServerNumeroCar = entry.serverNumeroCar ?? null;
    await savePendingQuoteNumber(entry.quoteNumber);
    void saveQuoteMode(this.quoteMode);
    void saveHotelsAsOptions(this.hotelsAsOptions);
    void saveHotelCompareGroups(this.hotelOptionGroups);
    await this.saveToStorage();
    this.panelTab = 'items';
    this.quoteCopyStatus = 'ok';
    this.quoteStatusMessage = statusMessage;
    this.render();
    void appendAppLog('info', statusMessage);
  }

  private async clearSearchContextStorage(): Promise<void> {
    try {
      await chrome.storage.local.remove(SEARCH_KEY);
    } catch {
      // storage unavailable
    }
  }

  private toggleItemExpand(id: string): void {
    if (this.expandedIds.has(id)) this.expandedIds.delete(id);
    else this.expandedIds.add(id);
    this.render();
  }

  private isItemExpanded(id: string): boolean {
    return this.expandedIds.has(id);
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    this.render();
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const stored = result[STORAGE_KEY];
      if (Array.isArray(stored)) {
        this.applyItemsFromStorage(stored);
        this.render();
      }
    } catch {
      // storage unavailable (e.g. test harness)
    }
  }

  private applyItemsFromStorage(stored: unknown[]): void {
    this.items = stored.map((item) => {
      const row = item as Partial<CartItem> & Record<string, unknown>;
      if (!row || typeof row !== 'object' || !row.type) {
        return { ...(row as object), type: 'hotel' as const } as CartItem;
      }
      if (row.type === 'hotel' && row.occupancyRates) {
        const rates = coerceOccupancyRateCurrency(row.occupancyRates as OccupancyTierRates);
        return { ...(row as HotelCartItem), occupancyRates: rates };
      }
      return row as CartItem;
    });
    const ids = new Set(this.items.map((i) => i.id));
    for (const id of [...this.expandedIds]) {
      if (!ids.has(id)) this.expandedIds.delete(id);
    }
    if (this.items.length === 0) this.panelTab = 'items';
    this.syncHotelOptionGroups();
  }

  private lockWholesaleTripFacts(): void {
    if (this.quoteMode !== 'wholesale') return;
    const next = mergeFirstTripFacts(this.tripGuide, this.items);
    if (!next || next === this.tripGuide) return;
    this.tripGuide = next;
    void saveTripGuide(next);
  }

  private applyFeesFromStorage(stored: Record<string, number> | undefined): void {
    const migrated = this.defaultFees();
    if (!stored) {
      this.fees = migrated;
      return;
    }
    if (typeof stored[MAYOR_VALOR_ID] === 'number') {
      migrated[MAYOR_VALOR_ID] = Math.max(0, stored[MAYOR_VALOR_ID]);
    } else if (typeof stored.fee_ejemplo_1 === 'number') {
      migrated[MAYOR_VALOR_ID] = Math.max(0, stored.fee_ejemplo_1);
    }
    if (typeof stored[REDONDEO_ID] === 'number') {
      migrated[REDONDEO_ID] = Math.max(0, stored[REDONDEO_ID]);
    }
    this.fees = migrated;
  }

  /**
   * Keeps one shared cart across all provider tabs (BookingMotor, Avianca,
   * Wingo, etc.) and the asistente panel: when another context writes
   * `tce_cart_items` / fees, refresh UI.
   */
  private watchCartStorage(): void {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;

        let dirty = false;

        if (changes[STORAGE_KEY]) {
          const next = changes[STORAGE_KEY].newValue;
          if (Array.isArray(next)) {
            this.applyItemsFromStorage(next);
          } else {
            this.applyItemsFromStorage([]);
          }
          const echo =
            this.isLocalStorageEcho(this.lastLocalCartWriteAt) &&
            this.suppressNumberFieldRerender;
          if (echo) {
            const totalsEl = this.shadow.querySelector('.tce-totals');
            if (totalsEl) totalsEl.innerHTML = this.renderTotals();
          } else {
            dirty = true;
          }
        }

        if (changes[FEES_KEY]) {
          this.applyFeesFromStorage(
            changes[FEES_KEY].newValue as Record<string, number> | undefined
          );
          const echo =
            this.isLocalStorageEcho(this.lastLocalFeesWriteAt) &&
            this.suppressNumberFieldRerender;
          if (echo) {
            const totalsEl = this.shadow.querySelector('.tce-totals');
            if (totalsEl) totalsEl.innerHTML = this.renderTotals();
          } else {
            dirty = true;
          }
        }

        if (dirty) this.render();
      });
    } catch {
      // storage.onChanged unavailable (e.g. test harness)
    }
  }

  /** Sync client, currency, compare-hotels, USD equiv, pending quote across tabs/panel. */
  private watchMetaStorage(): void {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        let dirty = false;

        if (changes[CLIENT_KEY]) {
          const next = changes[CLIENT_KEY].newValue;
          this.clientName = typeof next === 'string' ? next : '';
          dirty = true;
        }
        if (changes[INITIAL_DEPOSIT_KEY]) {
          const next = changes[INITIAL_DEPOSIT_KEY].newValue;
          this.initialDeposit = typeof next === 'string' ? next : '';
          dirty = true;
        }
        if (changes[PDF_INSURANCE_ANNEX_KEY]) {
          this.pdfInsuranceAnnex = changes[PDF_INSURANCE_ANNEX_KEY].newValue !== false;
          dirty = true;
        }
        if (changes[OCCUPANCY_TOTAL_OPEN_KEY]) {
          this.occupancyTotalOpen = changes[OCCUPANCY_TOTAL_OPEN_KEY].newValue === true;
          dirty = true;
        }
        if (changes[COMMISSION_APPROX_OPEN_KEY]) {
          this.commissionApproxOpen = changes[COMMISSION_APPROX_OPEN_KEY].newValue === true;
          dirty = true;
        }
        if (changes[COMMISSION_APPROX_KIND_KEY]) {
          const next = changes[COMMISSION_APPROX_KIND_KEY].newValue;
          this.commissionApproxKind =
            next === 'freelance' || next === 'agency' ? next : null;
          dirty = true;
        }
        if (changes[ACCOMMODATION_CONFIRMED_KEY]) {
          this.accommodationConfirmed = changes[ACCOMMODATION_CONFIRMED_KEY].newValue === true;
          dirty = true;
        }
        if (changes[AGENCY_KEY]) {
          const next = changes[AGENCY_KEY].newValue;
          this.agencyName = typeof next === 'string' ? next : '';
          dirty = true;
        }
        if (changes[DISPLAY_CURRENCY_KEY]) {
          this.displayCurrency = normalizeDisplayCurrency(changes[DISPLAY_CURRENCY_KEY].newValue);
          if (this.autoRoundOccupancy && this.syncAutoRoundOccupancy()) {
            void this.saveToStorage();
          }
          dirty = true;
        }
        if (changes[HOTELS_AS_OPTIONS_KEY]) {
          this.hotelsAsOptions = changes[HOTELS_AS_OPTIONS_KEY].newValue === true;
          this.syncHotelOptionGroups();
          dirty = true;
        }
        if (changes[QUOTE_MODE_KEY]) {
          this.quoteMode = normalizeQuoteMode(changes[QUOTE_MODE_KEY].newValue);
          if (this.quoteMode === 'wholesale' && !this.hotelsAsOptions) {
            this.hotelsAsOptions = true;
            this.syncHotelOptionGroups();
          }
          dirty = true;
        }
        if (changes[ORIGIN_CITIES_KEY]) {
          this.originCities = Array.isArray(changes[ORIGIN_CITIES_KEY].newValue)
            ? (changes[ORIGIN_CITIES_KEY].newValue as string[])
            : this.originCities;
          dirty = true;
        }
        if (changes[BM_DESTINATIONS_KEY]) {
          this.bmDestinations = Array.isArray(changes[BM_DESTINATIONS_KEY].newValue)
            ? (changes[BM_DESTINATIONS_KEY].newValue as string[])
            : this.bmDestinations;
          dirty = true;
        }
        if (changes[HOTEL_COMPARE_GROUPS_KEY]) {
          const raw = changes[HOTEL_COMPARE_GROUPS_KEY].newValue;
          if (Array.isArray(raw)) {
            this.hotelOptionGroups = raw
              .filter((g): g is HotelCompareOptionGroup => !!g && typeof g.id === 'string')
              .map((g) => ({
                id: g.id,
                hotelIds: Array.isArray(g.hotelIds)
                  ? g.hotelIds.filter((id): id is string => typeof id === 'string')
                  : [],
              }));
            this.syncHotelOptionGroups();
          }
          dirty = true;
        }
        if (changes[USD_EQUIV_KEY]) {
          this.includeUsdEquiv = changes[USD_EQUIV_KEY].newValue === true;
          dirty = true;
        }
        if (changes[SHOW_TRM_IN_QUOTE_KEY]) {
          this.showTrmInQuote = changes[SHOW_TRM_IN_QUOTE_KEY].newValue === true;
          dirty = true;
        }
        if (changes[AUTO_ROUND_OCCUPANCY_KEY]) {
          const next = changes[AUTO_ROUND_OCCUPANCY_KEY].newValue !== false;
          if (next !== this.autoRoundOccupancy) {
            this.autoRoundOccupancy = next;
            if (this.syncAutoRoundOccupancy()) void this.saveToStorage();
            dirty = true;
          }
        }
        if (changes[MANUAL_PACKAGE_ROUND_IDS_KEY]) {
          const raw = changes[MANUAL_PACKAGE_ROUND_IDS_KEY].newValue;
          this.manualPackageRoundIds = Array.isArray(raw)
            ? raw.filter((id): id is string => typeof id === 'string')
            : [];
          dirty = true;
        }
        if (changes[PENDING_QUOTE_KEY]) {
          const n = changes[PENDING_QUOTE_KEY].newValue;
          this.pendingQuoteNumber = typeof n === 'number' && n > 0 ? n : null;
          dirty = true;
        }
        if (changes[HISTORY_KEY]) {
          void loadHistory().then((h) => {
            this.history = h;
            if (this.panelTab === 'history') this.render();
          });
        }
        if (changes[DISMISSED_WARNINGS_KEY]) {
          const raw = changes[DISMISSED_WARNINGS_KEY].newValue;
          this.dismissedWarnings = Array.isArray(raw)
            ? raw.filter((x): x is string => typeof x === 'string')
            : [];
          dirty = true;
        }

        if (dirty && !this.suppressNumberFieldRerender) this.render();
      });
    } catch {
      // ignore
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      this.lastLocalCartWriteAt = Date.now();
      await chrome.storage.local.set({ [STORAGE_KEY]: this.items });
      this.scheduleHistoryDraftSync();
    } catch {
      // storage unavailable
    }
  }

  private async loadSearchContext(): Promise<void> {
    try {
      this.tripGuide = await loadTripGuide();
      const result = await chrome.storage.local.get(SEARCH_KEY);
      const stored = result[SEARCH_KEY] as SearchContext | undefined;
      this.searchContext = stored && stored.sourceType !== 'flight' ? stored : null;
      this.render();
    } catch {
      // storage unavailable
    }
  }

  private watchSearchContext(): void {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        let dirty = false;
        if (changes[TRIP_GUIDE_KEY]) {
          const next = changes[TRIP_GUIDE_KEY].newValue as SearchContext | undefined;
          this.tripGuide =
            next?.sourceType === 'flight' || next?.sourceType === 'briefing' ? next : null;
          dirty = true;
        }
        if (changes[SEARCH_KEY]) {
          if (Date.now() < this.ignoreSearchUntil) {
            // Drop BM echo after Nueva búsqueda so the form stays empty.
            if (changes[SEARCH_KEY].newValue) {
              void this.clearSearchContextStorage();
            }
            this.searchContext = null;
          } else {
            const next = changes[SEARCH_KEY].newValue as SearchContext | undefined;
            if (!next) {
              this.searchContext = null;
            } else if (next.sourceType !== 'flight') {
              this.searchContext = next;
              this.enrichTripGuideChildAges(next.childrenAges, next.totalChildren);
            }
          }
          dirty = true;
        }
        if (dirty) this.render();
      });
    } catch {
      // storage.onChanged unavailable (e.g. test harness)
    }
  }

  private async loadQuoteLinesFromStorage(): Promise<void> {
    this.quoteLines = await loadQuoteLines();
    this.render();
  }

  private watchQuoteLines(): void {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes[QUOTE_LINES_KEY]) return;
        this.quoteLines = normalizeQuoteLines(changes[QUOTE_LINES_KEY].newValue);
        this.render();
      });
    } catch {
      // storage.onChanged unavailable
    }
  }

  private async loadFees(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(FEES_KEY);
      const stored = result[FEES_KEY] as Record<string, number> | undefined;
      if (!stored) return;

      this.applyFeesFromStorage(stored);

      const hasLegacy = LEGACY_FEE_IDS.some((id) => id in stored);
      if (hasLegacy || !(MAYOR_VALOR_ID in stored) || !(REDONDEO_ID in stored)) {
        void this.saveFees();
      }
      this.render();
    } catch {
      // storage unavailable
    }
  }

  private async saveFees(): Promise<void> {
    try {
      this.lastLocalFeesWriteAt = Date.now();
      await chrome.storage.local.set({ [FEES_KEY]: this.fees });
      this.scheduleHistoryDraftSync();
    } catch {
      // storage unavailable
    }
  }

  private getFeesTotal(): number {
    const base = FEE_DEFINITIONS.reduce((sum, def) => sum + (this.fees[def.id] || 0), 0);
    return this.copAmountToDisplay(base + this.getTaTotal());
  }

  /** Passengers that pay TA: briefing / formulario, not BM occupancy. */
  private getTaPaxCount(): number {
    const overlaid = overlayBriefingPax(
      this.searchContext,
      this.tripGuide || this.readBriefingDraft()
    );
    const fromBrief =
      paxFromBriefingContext(overlaid) ||
      paxFromBriefingContext(this.tripGuide) ||
      paxFromBriefingContext(this.readBriefingDraft());
    if (fromBrief) return Math.max(1, fromBrief.adults + fromBrief.children);
    const flight = this.items.find((i): i is FlightCartItem => i.type === 'flight');
    if (flight && flight.adults + flight.children + flight.infants > 0) {
      return flight.adults + flight.children + flight.infants;
    }
    return Math.max(1, this.items.length > 0 ? 1 : 0);
  }

  private getFeesMayorRedondeoDisplay(): number {
    const mayor = this.copAmountToDisplay(this.fees[MAYOR_VALOR_ID] || 0);
    const redondeo = this.copAmountToDisplay(this.fees[REDONDEO_ID] || 0);
    if (this.quoteMode === 'wholesale') return mayor + redondeo;
    const base = FEE_DEFINITIONS.reduce((sum, def) => sum + (this.fees[def.id] || 0), 0);
    return this.copAmountToDisplay(base);
  }

  private wholesaleLinePriceFns(): {
    linePrice: (item: CartItem) => number;
    baseLinePrice: (item: CartItem) => number;
  } {
    return {
      linePrice: (item) => this.getItemLineTotal(item).price,
      baseLinePrice: (item) => this.getItemBasePrice(item).price,
    };
  }

  private getTaUnitDisplay(): number {
    if (!cartNeedsTaFee(this.items)) return 0;
    return this.copAmountToDisplay(this.taSelection.unitCop || 0);
  }

  private getTaTotal(): number {
    if (!cartNeedsTaFee(this.items)) return 0;
    if (!(this.taSelection.unitCop > 0)) return 0;
    return Math.round(this.taSelection.unitCop * this.getTaPaxCount());
  }

  private applyTaType(type: TaType, persist = true): void {
    this.taSelection = {
      type,
      unitCop: resolveTaUnitCop(this.taConfig, type, this.getEffectiveTrm()),
    };
    if (persist) void saveTaSelection(this.taSelection);
  }

  private syncTaFromFlightIfPresent(): void {
    const flight = this.items.find((i): i is FlightCartItem => i.type === 'flight');
    if (!flight) return;
    const type = suggestTaType({
      routeType: flight.routeType,
      originCode: flight.origin.code,
      destinationCode: flight.destination.code,
    });
    this.applyTaType(type, true);
  }

  /** Currency the fees are applied to — always the active display currency. */
  private getPrimaryCurrency(subtotals: Map<string, number>): string {
    if (subtotals.has(this.displayCurrency)) return this.displayCurrency;
    let best: string = this.displayCurrency;
    let bestValue = -Infinity;
    for (const [currency, value] of subtotals) {
      if (value > bestValue) {
        bestValue = value;
        best = currency;
      }
    }
    return best || this.displayCurrency;
  }

  private canUseDisplayCurrency(target: DisplayCurrency): boolean {
    if (target === 'COP') return true;
    return this.getEffectiveTrm() > 0;
  }

  /** Convert an amount from a native currency into the active display currency. */
  private toDisplay(amount: number, fromCurrency: string): { currency: string; price: number } {
    return toDisplayAmount(
      amount,
      fromCurrency,
      this.displayCurrency,
      this.getEffectiveTrm(),
      this.trmRate > 0 ? this.trmRate : undefined
    );
  }

  /** Fees / item adjustments are stored in COP; convert for display UI & totals. */
  private copAmountToDisplay(cop: number): number {
    if (this.displayCurrency === 'COP') return cop;
    const eff = this.getEffectiveTrm();
    if (!(eff > 0)) return cop;
    return copToUsd(cop, eff);
  }

  private displayAmountToCop(amount: number): number {
    if (this.displayCurrency === 'COP') return amount;
    const eff = this.getEffectiveTrm();
    if (!(eff > 0)) return amount;
    return usdToCop(amount, eff);
  }

  private roundUnit(): number {
    return this.displayCurrency === 'USD' ? 10 : 10_000;
  }

  /** Nights between two DD-MM-YYYY dates, or 0 if not computable. */
  private computeNights(checkIn?: string, checkOut?: string): number {
    if (!checkIn || !checkOut) return 0;
    const parse = (d: string): number | null => {
      const m = d.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (!m) return null;
      return Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    };
    const a = parse(checkIn);
    const b = parse(checkOut);
    if (a === null || b === null) return 0;
    const diff = Math.round((b - a) / 86_400_000);
    return diff > 0 ? diff : 0;
  }

  private resolveOriginLabel(): string | null {
    const flight = this.items.find((i): i is FlightCartItem => i.type === 'flight');
    if (flight) {
      const fromFlight = (flight.origin.name || flight.origin.code || '').trim();
      if (fromFlight) return fromFlight;
    }
    const fromGuide = this.tripGuide?.originText?.trim();
    if (fromGuide) return fromGuide;
    if (this.items.length === 0) return null;
    const fromCtx = this.searchContext?.originText?.trim();
    return fromCtx || null;
  }

  private formatSearchSummary(ctx: SearchContext): string {
    const parts: string[] = [];

    const origin = this.resolveOriginLabel();
    if (origin) parts.push(this.escape(origin));

    if (ctx.destinationText) {
      let dest = ctx.destinationText.trim();
      // Avoid "MDE · MDE → CTG" duplication when we already show origin.
      if (origin && /→|->/.test(dest)) {
        const right = dest.split(/\s*→\s*|\s*->\s*/).pop()?.trim();
        if (right) dest = right;
      }
      if (dest) parts.push(this.escape(dest));
    }

    if (ctx.checkIn) {
      const dates = ctx.checkOut
        ? `${this.escape(ctx.checkIn)} → ${this.escape(ctx.checkOut)}`
        : this.escape(ctx.checkIn);
      parts.push(dates);
    }

    const nights = ctx.nights && ctx.nights > 0 ? ctx.nights : this.computeNights(ctx.checkIn, ctx.checkOut);
    if (nights && nights > 0) {
      parts.push(`${nights}n`);
    }

    const pax: string[] = [];
    if (ctx.totalAdults > 0) pax.push(`${ctx.totalAdults} Adt`);
    if (ctx.totalChildren > 0) {
      const ages = this.normalizeChildAges(ctx.childrenAges);
      const agesHint = ages.length > 0 ? ` (${ages.join(', ')})` : '';
      pax.push(`${ctx.totalChildren} Chd${agesHint}`);
    }
    const flight = this.items.find((i): i is FlightCartItem => i.type === 'flight');
    const infants = flight?.infants ?? 0;
    if (infants > 0) pax.push(`${infants} Inf`);
    if (pax.length) parts.push(pax.join(' · '));

    return parts.join(' · ');
  }

  private highlightLatest(): void {
    const cards = this.shadow.querySelectorAll('.tce-item');
    const card = cards[cards.length - 1];
    if (!card) return;
    card.classList.add('tce-item--new');
    setTimeout(() => card.classList.remove('tce-item--new'), 1200);
  }

  private formatPrice(currency: string, price: number): string {
    const cur = (currency || 'COP').toUpperCase();
    const usd = cur === 'USD';
    const formatted = price.toLocaleString('es-CO', {
      minimumFractionDigits: usd ? 2 : 0,
      maximumFractionDigits: usd ? 2 : 0,
    });
    return usd ? `USD ${formatted}` : `$${formatted}`;
  }

  private roomCapacityLabel(adults: number, children: number): string {
    return commercialRoomLabel(adults, children);
  }

  private formatRoomOccupancy(room: { adults: number; children: number }, index: number): string {
    const pax: string[] = [];
    if (room.adults > 0) pax.push(`${room.adults} adulto${room.adults !== 1 ? 's' : ''}`);
    if (room.children > 0) pax.push(`${room.children} niño${room.children !== 1 ? 's' : ''}`);
    const capacity = this.roomCapacityLabel(room.adults, room.children);
    return `Hab ${index + 1}: ${capacity}${pax.length ? ` · ${pax.join(', ')}` : ''}`;
  }

  /** Per-room breakdown when multi-room; otherwise total adults/children. */
  private formatOccupancy(item: HotelCartItem): string {
    if (item.occupancy.length > 1) {
      return item.occupancy.map((room, i) => this.formatRoomOccupancy(room, i)).join(' · ');
    }
    const adults = item.occupancy.reduce((sum, o) => sum + o.adults, 0);
    const children = item.occupancy.reduce((sum, o) => sum + o.children, 0);
    const parts = [`${adults} adulto${adults !== 1 ? 's' : ''}`];
    if (children > 0) parts.push(`${children} niño${children !== 1 ? 's' : ''}`);
    if (item.occupancy.length === 1) {
      const capacity = this.roomCapacityLabel(
        item.occupancy[0].adults,
        item.occupancy[0].children
      );
      return `${capacity} · ${parts.join(', ')}`;
    }
    return parts.join(', ');
  }

  /**
   * Prune stale hotel ids; if comparing and no groups yet, seed one option per hotel
   * (legacy “each hotel = one option”). Persist when the list changes.
   */
  private syncHotelOptionGroups(): void {
    const hotelIds = new Set(
      this.items.filter((i): i is HotelCartItem => i.type === 'hotel').map((h) => h.id)
    );
    let changed = false;
    const pruned = this.hotelOptionGroups.map((g) => {
      const nextIds = g.hotelIds.filter((id) => hotelIds.has(id));
      if (nextIds.length !== g.hotelIds.length) changed = true;
      return { ...g, hotelIds: nextIds };
    });
    this.hotelOptionGroups = pruned;

    if (hotelIds.size === 0) {
      if (this.hotelOptionGroups.length > 0) {
        this.hotelOptionGroups = [];
        changed = true;
      }
    } else if (this.hotelsAsOptions && this.hotelOptionGroups.length === 0) {
      this.hotelOptionGroups = [...hotelIds].map((id) => ({
        id: newHotelCompareGroupId(),
        hotelIds: [id],
      }));
      changed = true;
    }

    if (changed) {
      void saveHotelCompareGroups(this.hotelOptionGroups);
      this.scheduleHistoryDraftSync();
    }
  }

  private addHotelOptionGroup(): void {
    this.hotelOptionGroups.push({ id: newHotelCompareGroupId(), hotelIds: [] });
    void saveHotelCompareGroups(this.hotelOptionGroups);
    this.scheduleHistoryDraftSync();
    this.render();
  }

  private removeHotelOptionGroup(optionId: string): void {
    if (this.hotelOptionGroups.length <= 1) return;
    this.hotelOptionGroups = this.hotelOptionGroups.filter((g) => g.id !== optionId);
    void saveHotelCompareGroups(this.hotelOptionGroups);
    this.scheduleHistoryDraftSync();
    this.render();
  }

  private toggleHotelInOption(optionId: string, hotelId: string): void {
    const group = this.hotelOptionGroups.find((g) => g.id === optionId);
    if (!group) return;
    const idx = group.hotelIds.indexOf(hotelId);
    if (idx >= 0) group.hotelIds.splice(idx, 1);
    else group.hotelIds.push(hotelId);
    void saveHotelCompareGroups(this.hotelOptionGroups);
    this.scheduleHistoryDraftSync();
    this.render();
  }

  /**
   * When "Comparar hoteles" is on: each option group = shared services + its
   * hotels + fees (TA / mayor / redondeo globales). A hotel may belong to several options.
   */
  private getHotelCompareOptions(): Array<{
    index: number;
    optionId: string;
    hotels: HotelCartItem[];
    currency: string;
    optionTotal: number;
    perPerson: number;
  }> {
    if (!this.hotelsAsOptions) return [];
    this.syncHotelOptionGroups();

    const feesTotal = this.getFeesTotal();
    const shared = this.items
      .filter((i) => i.type !== 'hotel')
      .reduce((sum, i) => sum + this.getItemLineTotal(i).price, 0);
    const pax = Math.max(1, this.getTaPaxCount());
    const currency = this.displayCurrency;
    const byId = new Map(
      this.items.filter((i): i is HotelCartItem => i.type === 'hotel').map((h) => [h.id, h])
    );

    return this.hotelOptionGroups
      .map((g, index) => {
        const hotels = g.hotelIds
          .map((id) => byId.get(id))
          .filter((h): h is HotelCartItem => !!h);
        const hotelLine = hotels.reduce((sum, h) => sum + this.getItemLineTotal(h).price, 0);
        const optionTotal = shared + hotelLine + feesTotal;
        const perPerson = Math.round(optionTotal / pax);
        return {
          index: index + 1,
          optionId: g.id,
          hotels,
          currency,
          optionTotal,
          perPerson,
        };
      })
      .filter((opt) => opt.hotels.length > 0);
  }

  private renderHotelOptionChips(hotelId: string): string {
    if (!this.hotelsAsOptions) return '';
    this.syncHotelOptionGroups();
    if (this.hotelOptionGroups.length === 0) return '';
    const chips = this.hotelOptionGroups
      .map((g, i) => {
        const on = g.hotelIds.includes(hotelId);
        return `<button type="button" class="tce-opt-chip${on ? ' tce-opt-chip--on' : ''}"
          data-action="toggle-hotel-option" data-option-id="${this.escape(g.id)}"
          data-hotel-id="${this.escape(hotelId)}" title="Incluir en Opción ${i + 1}">Opción ${i + 1}</button>`;
      })
      .join('');
    return `<div class="tce-opt-chips" title="Asignar este hotel a una o más opciones">${chips}</div>`;
  }

  private renderCompareSharedServicesHtml(): string {
    const rows: string[] = [];
    for (const item of this.items) {
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
        rows.push(
          `<div class="tce-compare-svc">✈️ ${this.escape(bits.join(' · ') || item.title || 'Vuelo')}</div>`
        );
      } else if (item.type === 'transfer') {
        rows.push(
          `<div class="tce-compare-svc">🚕 ${this.escape(item.name)}</div>`
        );
      } else if (item.type === 'insurance') {
        rows.push(
          `<div class="tce-compare-svc">🚑 ${this.escape(item.name)}</div>`
        );
      } else if (item.type === 'activity') {
        rows.push(
          `<div class="tce-compare-svc">🎢 ${this.escape(item.name)}</div>`
        );
      } else if (item.type === 'tour') {
        const label = item.isBloqueo ? 'Bloqueo' : item.isCombinado ? 'Combinado' : 'Tour';
        rows.push(
          `<div class="tce-compare-svc">🗺️ ${this.escape(label)}: ${this.escape(item.name)}</div>`
        );
      }
    }
    if (rows.length === 0) return '';
    return `<div class="tce-compare-svcs">${rows.join('')}</div>`;
  }

  private hotelsInOption(optionId: string): HotelCartItem[] {
    const g = this.hotelOptionGroups.find((o) => o.id === optionId);
    if (!g) return [];
    return g.hotelIds
      .map((id) => this.items.find((it) => it.id === id && it.type === 'hotel'))
      .filter((h): h is HotelCartItem => !!h);
  }

  private renderCompareOptionAdjControls(optionId: string, hotels: HotelCartItem[]): string {
    if (this.quoteMode !== 'wholesale' || hotels.length === 0) return '';
    const step = this.displayCurrency === 'USD' ? '0.01' : '100';
    const roundLabel = this.displayCurrency === 'COP' ? '…9.000' : '…9';
    const present = new Set<OccupancyTierCode>();
    for (const h of hotels) {
      for (const t of wholesaleTierWithOriginal(h.occupancyRates as OccupancyTierRates)) {
        present.add(t.tier);
      }
    }
    if (present.size === 0) return '';
    const currentGuides = hotels
      .map((h) => formatOccupancyCurrentGuide(h.occupancyRates as OccupancyTierRates))
      .filter((g): g is string => !!g);
    const sondaGuides = hotels
      .map((h) => formatOccupancyBaselineGuide(h.occupancyRates as OccupancyTierRates))
      .filter((g): g is string => !!g);
    const guideHtml =
      sondaGuides.length > 0 || currentGuides.length > 0
        ? `<p class="tce-compare-adj-guide">${
            sondaGuides[0]
              ? `<strong>Sonda:</strong> ${this.escape(sondaGuides[0])}`
              : ''
          }${
            currentGuides[0] && currentGuides[0] !== sondaGuides[0]
              ? `${sondaGuides[0] ? '<br>' : ''}<span class="tce-compare-adj-sonda">Hotel + mayor: ${this.escape(currentGuides[0])}</span>`
              : !sondaGuides[0] && currentGuides[0]
                ? `<strong>Hotel:</strong> ${this.escape(currentGuides[0])}`
                : ''
          }</p>`
        : '';
    const tierRow = (tier: OccupancyTierCode, label: string) => {
      if (!present.has(tier)) return '';
      return `
      <div class="tce-compare-adj-row">
        <label for="tce-opt-mayor-${tier}-${this.escape(optionId)}">Mayor ${label}</label>
        <input id="tce-opt-mayor-${tier}-${this.escape(optionId)}" type="number" min="0" step="${step}"
          class="tce-option-mayor-input" data-option-id="${this.escape(optionId)}" data-occ-tier="${tier}" value=""
          title="Se suma solo a tarifa hotel pp ${label} de esta opción" placeholder="0" />
      </div>`;
    };
    const autoOn = this.autoRoundOccupancy;
    return `
      <div class="tce-compare-adj" data-option-id="${this.escape(optionId)}">
        <p class="tce-compare-adj-title">Mayor valor por acomodación (${this.displayCurrency})</p>
        ${tierRow('sgl', 'SGL')}
        ${tierRow('dbl', 'DBL')}
        ${tierRow('tpl', 'TPL')}
        ${tierRow('qpl', 'QPL')}
        ${tierRow('chd', 'CHD')}
        <div class="tce-compare-adj-btns">
          <button type="button" class="tce-compare-adj-btn tce-compare-adj-btn--auto${autoOn ? ' is-on' : ''}"
            data-action="toggle-auto-round"
            title="${
              autoOn
                ? 'Redondeo automático activo: Tarifa pp (paquete) termina en …9'
                : 'Redondeo automático off: solo al pulsar Redondeo en Tarifa pp'
            }">Red. Automático</button>
          <button type="button" class="tce-compare-adj-btn" data-action="round-option"
            data-option-id="${this.escape(optionId)}"
            title="Redondear Tarifa pp de esta opción a ${roundLabel} (PDF / WhatsApp)">Redondeo ${roundLabel}</button>
          <button type="button" class="tce-compare-adj-btn" data-action="restore-option-rates"
            data-option-id="${this.escape(optionId)}"
            title="Volver a valores de sonda BM (quita mayor del hotel)">Restablecer</button>
        </div>
        ${guideHtml}
      </div>`;
  }

  private applyOptionMayorValor(optionId: string, bumps: MayorValorByTier): void {
    const any = (['sgl', 'dbl', 'tpl', 'qpl', 'chd'] as const).some(
      (k) => bumps[k] != null && bumps[k]! > 0
    );
    if (!any) return;
    const hotels = this.hotelsInOption(optionId);
    if (hotels.length === 0) return;
    const effTrm = this.getEffectiveTrm();
    this.items = this.items.map((item) => {
      if (item.type !== 'hotel' || !hotels.some((h) => h.id === item.id) || !item.occupancyRates) {
        return item;
      }
      const next = applyMayorValorToOccupancyRates(
        item.occupancyRates as OccupancyTierRates,
        bumps,
        this.displayCurrency,
        effTrm,
        this.trmDiaOpt()
      );
      if (!next) return item;
      return { ...item, occupancyRates: next, mayorValor: 0, redondeo: 0 };
    });
    this.syncAutoRoundOccupancy();
    void this.saveToStorage();
    this.render();
  }

  private roundOptionOccupancyRates(optionId: string): void {
    // Package …9 (Tarifa pp), not hotel-only. With auto on it's already applied.
    void this.setManualPackageRound(optionId, true).then(() => this.render());
  }

  private restoreOptionOccupancyRates(optionId: string): void {
    const hotels = this.hotelsInOption(optionId);
    if (hotels.length === 0) return;
    this.items = this.items.map((item) => {
      if (item.type !== 'hotel' || !hotels.some((h) => h.id === item.id) || !item.occupancyRates) {
        return item;
      }
      const restored = restoreOccupancyFromBaseline(item.occupancyRates as OccupancyTierRates);
      if (!restored) return item;
      return { ...item, occupancyRates: restored, mayorValor: 0, redondeo: 0 };
    });
    void this.setManualPackageRound(optionId, false).then(async () => {
      this.syncAutoRoundOccupancy();
      await this.saveToStorage();
      this.render();
    });
  }

  private renderHotelCompareBlock(opts?: { compact?: boolean }): string {
    if (!this.hotelsAsOptions) return '';
    this.syncHotelOptionGroups();
    const priced = this.getHotelCompareOptions();
    const pax = Math.max(1, this.getTaPaxCount());
    const sharedServices = this.renderCompareSharedServicesHtml();

    const columns = this.hotelOptionGroups
      .map((g, i) => {
        const pricedOpt = priced.find((p) => p.optionId === g.id);
        const hotels =
          pricedOpt?.hotels ??
          g.hotelIds
            .map((id) => this.items.find((it) => it.id === id && it.type === 'hotel'))
            .filter((h): h is HotelCartItem => !!h);
        const hotelRows =
          hotels.length === 0
            ? `<div class="tce-compare-hotel-empty">Sin hoteles — marca Opción ${i + 1} en un hotel</div>`
            : hotels
                .map((h) => {
                  const rate = h.selectedRate;
                  const roomLabel =
                    this.quoteMode === 'wholesale'
                      ? displayHotelRoomType(rate.roomType)
                      : rate.roomType?.trim() || '';
                  const roomShort =
                    roomLabel.length > 70 ? `${roomLabel.slice(0, 70)}…` : roomLabel;
                  const board = displayHotelBoardBasis(rate.boardBasis);
                  const roomLine = [roomShort, board].filter(Boolean).join(' · ');
                  const thumb = h.imageUrl
                    ? `<img class="tce-compare-thumb" src="${this.escape(h.imageUrl)}" alt="" loading="lazy" />`
                    : '';
                  return `
            <div class="tce-compare-hotel-line">
              ${thumb}
              <div class="tce-compare-hotel-body">
              <span class="tce-compare-hotel-name">${this.escape(h.hotelName)}</span>
              ${
                roomLine
                  ? `<span class="tce-compare-hotel-room" title="${this.escape(
                      [rate.roomType, rate.boardBasis].filter(Boolean).join(' · ')
                    )}">${this.escape(roomLine)}</span>`
                  : ''
              }
              <span class="tce-compare-hotel-nights">${h.nights}n · ${this.escape(h.checkIn)}→${this.escape(h.checkOut)}</span>
              </div>
            </div>`;
                })
                .join('');
        const wholesalePrices = (() => {
          if (this.quoteMode !== 'wholesale' || hotels.length === 0) return '';
          const { linePrice, baseLinePrice } = this.wholesaleLinePriceFns();
          const sum = summarizeWholesaleOption(
            hotels,
            this.items,
            this.getFeesMayorRedondeoDisplay(),
            pax,
            this.tripGuide?.roomPlan,
            linePrice,
            this.getTaUnitDisplay(),
            baseLinePrice,
            {
              displayCurrency: this.displayCurrency,
              effTrm: this.getEffectiveTrm(),
              trmDia: this.trmDiaOpt(),
              roundCharmNine: this.shouldRoundPackage(g.id),
            }
          );
          const rows = sum.personLines
            .map(
              (line) => `
          <div class="tce-compare-option-row tce-compare-option-row--tier">
            <span>${this.escape(line)}</span>
          </div>`
            )
            .join('');
          const adj = this.renderCompareOptionAdjControls(g.id, hotels);
          const miss = sum.missingHint
            ? `<div class="tce-compare-hotel-empty">${this.escape(sum.missingHint)}</div>`
            : '';
          const tot =
            this.occupancyTotalOpen && sum.groupTotal != null
              ? `
          <div class="tce-compare-option-row">
            <span>Total según acomodación${sum.mixLabel ? ` (${this.escape(sum.mixLabel)})` : ''}</span>
            <strong>${this.escape(this.formatPrice(sum.currency, sum.groupTotal))}</strong>
          </div>`
              : '';
          return `${rows}${adj}${miss}${tot}`;
        })();
        const prices =
          this.quoteMode === 'wholesale'
            ? wholesalePrices
            : pricedOpt
          ? `
          <div class="tce-compare-option-row">
            <span>Por pasajero (${pax} pax)</span>
            <strong>${this.escape(this.formatPrice(pricedOpt.currency, pricedOpt.perPerson))}</strong>
          </div>
          <div class="tce-compare-option-row">
            <span>Total</span>
            <strong>${this.escape(this.formatPrice(pricedOpt.currency, pricedOpt.optionTotal))}</strong>
          </div>`
          : '';
        const canRemove = this.hotelOptionGroups.length > 1;
        return `
        <div class="tce-compare-column" data-option-id="${this.escape(g.id)}">
          <div class="tce-compare-column-head">
            <span>Opción ${i + 1}</span>
            ${
              canRemove
                ? `<button type="button" class="tce-compare-col-remove" data-action="remove-hotel-option" data-option-id="${this.escape(g.id)}" title="Quitar opción">✕</button>`
                : ''
            }
          </div>
          ${sharedServices}
          ${hotelRows}
          ${prices}
        </div>`;
      })
      .join('');

    return `
      <div class="tce-compare-hotels${opts?.compact ? ' tce-compare-hotels--compact' : ''}">
        <div class="tce-compare-title-row">
          <div class="tce-compare-title">Comparar opciones · ${this.hotelOptionGroups.length} opción${this.hotelOptionGroups.length !== 1 ? 'es' : ''}</div>
          <button type="button" class="tce-add-option-btn" data-action="add-hotel-option">+ Nueva opción</button>
        </div>
        <div class="tce-compare-columns">${columns}</div>
      </div>`;
  }

  /** Compact grand total for Productos when not comparing hotels. */
  private renderSimpleTotalsCompact(): string {
    if (this.items.length === 0) return '';
    const subtotals = this.getTotalsByCurrency();
    const feesTotal = this.getFeesTotal();
    const primaryCurrency = this.getPrimaryCurrency(subtotals) || this.displayCurrency;
    const pax = Math.max(1, this.getTaPaxCount());
    const rows = Array.from(subtotals.entries()).map(([currency, value]) => {
      const total = currency === primaryCurrency ? value + feesTotal : value;
      const perPerson = Math.round(total / pax);
      return { currency, total, perPerson };
    });
    if (rows.length === 0) return '';
    return `
      <div class="tce-compare-hotels tce-compare-hotels--compact">
        <div class="tce-compare-title">Total</div>
        ${rows
          .map(
            (r) => `
        <div class="tce-compare-option">
          <div class="tce-compare-option-row">
            <span>Por pasajero (${pax} pax)</span>
            <strong>${this.escape(this.formatPrice(r.currency, r.perPerson))}</strong>
          </div>
          <div class="tce-compare-option-row">
            <span>Total ${this.escape(r.currency)}</span>
            <strong>${this.escape(this.formatPrice(r.currency, r.total))}</strong>
          </div>
        </div>`
          )
          .join('')}
      </div>`;
  }

  private getItemPrice(item: CartItem): { currency: string; price: number } {
    if (item.type === 'hotel') {
      return { currency: item.selectedRate.currency, price: item.selectedRate.price };
    }
    return { currency: item.currency, price: item.price };
  }

  /** Base price in the active display currency (TRM when converting). */
  private getItemBasePrice(item: CartItem): { currency: string; price: number } {
    const native = this.getItemPrice(item);
    return this.toDisplay(native.price, native.currency);
  }

  private getItemAdjustments(item: CartItem): { mayorValor: number; redondeo: number } {
    return {
      mayorValor: Math.max(0, Number(item.mayorValor) || 0),
      redondeo: Math.max(0, Number(item.redondeo) || 0),
    };
  }

  /** Adjustments in display currency (stored values are COP). */
  private getItemAdjustmentsDisplay(item: CartItem): { mayorValor: number; redondeo: number } {
    const adj = this.getItemAdjustments(item);
    return {
      mayorValor: this.copAmountToDisplay(adj.mayorValor),
      redondeo: this.copAmountToDisplay(adj.redondeo),
    };
  }

  /** Line total = base (display) + mayor + redondeo (display). */
  private getItemLineTotal(item: CartItem): { currency: string; price: number } {
    const base = this.getItemBasePrice(item);
    const adj = this.getItemAdjustmentsDisplay(item);
    return {
      currency: base.currency,
      price: base.price + adj.mayorValor + adj.redondeo,
    };
  }

  private getTotalsByCurrency(): Map<string, number> {
    const totals = new Map<string, number>();
    for (const item of this.items) {
      const { currency, price } = this.getItemLineTotal(item);
      totals.set(currency, (totals.get(currency) || 0) + price);
    }
    return totals;
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      *, *::before, *::after { box-sizing: border-box; }

      .tce-tab {
        position: fixed;
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        z-index: 2147483646;
        background: #1e40af;
        color: #fff;
        border: none;
        border-radius: 8px 0 0 8px;
        padding: 12px 8px;
        cursor: grab;
        touch-action: none;
        user-select: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        font-weight: 600;
        writing-mode: vertical-rl;
        text-orientation: mixed;
        box-shadow: -2px 0 12px rgba(0,0,0,0.15);
        transition: background 0.2s, right 0.25s ease;
        letter-spacing: 0.5px;
      }
      .tce-tab:hover { background: #1d4ed8; }
      .tce-tab--dragging {
        cursor: grabbing;
        transition: background 0.2s, right 0.25s ease;
      }
      .tce-tab--open { right: 340px; }
      .tce-tab--open.tce-tab--wide { right: min(820px, 96vw); }
      .tce-tab--open.tce-tab--wide.tce-tab--roomy { right: min(900px, 96vw); }
      .tce-tab--open.tce-tab--compare { right: min(980px, 98vw); }

      .tce-badge {
        display: inline-block;
        background: #f59e0b;
        color: #1e293b;
        border-radius: 10px;
        padding: 1px 6px;
        font-size: 11px;
        margin-top: 6px;
        writing-mode: horizontal-tb;
      }

      .tce-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 340px;
        height: 100vh;
        z-index: 2147483645;
        background: #f8fafc;
        border-left: 1px solid #e2e8f0;
        box-shadow: -4px 0 24px rgba(0,0,0,0.12);
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transform: translateX(100%);
        transition: transform 0.25s ease, width 0.25s ease;
      }
      .tce-panel--open { transform: translateX(0); }
      .tce-panel--wide { width: min(820px, 96vw); }
      .tce-panel--wide.tce-panel--roomy { width: min(900px, 96vw); }
      .tce-panel--compare { width: min(980px, 98vw); }

      .tce-header {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        padding: 8px 12px 10px;
        background: #1e40af;
        color: #fff;
        flex-shrink: 0;
        gap: 8px;
      }
      .tce-header-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-width: 0;
      }
      .tce-header-fields {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        justify-content: flex-start;
        gap: 8px 10px;
        width: 100%;
      }
      .tce-header-title {
        display: flex;
        align-items: baseline;
        flex-wrap: nowrap;
        gap: 5px;
        min-width: 0;
        flex: 1 1 auto;
        overflow: hidden;
      }
      .tce-header h2 {
        margin: 0;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .tce-header-meta {
        font-size: 11px;
        opacity: 0.85;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tce-header-client {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 3px;
        flex: 0 1 280px;
        min-width: 180px;
        max-width: 340px;
      }
      .tce-header-agency {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 3px;
        flex: 0 1 150px;
        min-width: 120px;
        max-width: 190px;
      }
      .tce-header-opp {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 3px;
        flex: 0 1 180px;
        min-width: 140px;
        max-width: 220px;
      }
      .tce-header-fields .tce-hotel-options-toggle {
        margin-bottom: 2px;
        flex: 0 0 auto;
      }
      .tce-header-client label,
      .tce-header-agency label,
      .tce-header-opp label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.3px;
        opacity: 0.9;
        flex-shrink: 0;
      }
      .tce-email-input,
      .tce-opp-select {
        width: 100%;
        box-sizing: border-box;
        border: none;
        border-radius: 6px;
        padding: 5px 8px;
        font-size: 12px;
        font-family: inherit;
        color: #0f172a;
        background: #fff;
      }
      .tce-opp-select { cursor: pointer; }
      .tce-contact-wrap {
        position: relative;
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 6px;
        align-items: stretch;
      }
      .tce-contact-wrap .tce-client-input {
        flex: 1 1 140px;
        min-width: 120px;
      }
      .tce-contact-wrap .tce-contact-phone-input {
        flex: 0 1 140px;
        min-width: 110px;
        width: auto;
      }
      .tce-client-input,
      .tce-agency-input {
        flex: 1;
        min-width: 0;
        border: 1px solid rgba(255,255,255,0.35);
        border-radius: 5px;
        padding: 4px 7px;
        font-size: 12px;
        color: #0f172a;
        background: #fff;
      }
      .tce-client-input:focus,
      .tce-agency-input:focus {
        outline: none;
        border-color: #facc15;
        box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.35);
      }
      .tce-contact-phone-input {
        font-size: 12px;
        padding: 4px 7px;
        border-radius: 5px;
        border: 1px solid rgba(255,255,255,0.35);
        background: #fff;
        color: #0f172a;
        font-family: inherit;
      }
      .tce-contact-phone-input:focus {
        outline: none;
        border-color: #facc15;
        box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.35);
      }
      .tce-contact-src {
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #be185d;
        margin-left: 4px;
      }
      .tce-contact-dd {
        position: absolute;
        left: 0;
        right: 0;
        top: calc(100% + 4px);
        z-index: 50;
        min-width: 260px;
        max-height: 220px;
        overflow: auto;
        background: #fff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(15,23,42,0.18);
      }
      .tce-contact-hit {
        display: flex;
        gap: 4px;
        align-items: center;
        width: 100%;
        border-bottom: 1px solid #f1f5f9;
        background: #fff;
        padding: 4px 6px;
      }
      .tce-contact-hit:hover { background: #f8fafc; }
      .tce-contact-hit-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1px;
        border: none;
        background: transparent;
        padding: 4px;
        text-align: left;
        cursor: pointer;
        font-family: inherit;
        color: #0f172a;
        min-width: 0;
      }
      .tce-contact-hit-name { font-size: 12px; font-weight: 600; }
      .tce-contact-hit-phone { font-size: 11px; color: #64748b; }
      .tce-contact-hit-agency { font-size: 10px; color: #0369a1; font-weight: 600; }
      .tce-contact-hit-det {
        flex-shrink: 0;
        border: none;
        font-size: 10px;
        font-weight: 700;
        color: #be185d;
        padding: 4px 8px;
        border-radius: 99px;
        background: #fdf2f8;
        cursor: pointer;
        font-family: inherit;
      }
      .tce-remote-history { margin-top: 10px; }
      .tce-remote-history h3 {
        margin: 0 0 6px;
        font-size: 12px;
        font-weight: 700;
        color: #334155;
      }
      .tce-remote-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px 10px;
        align-items: center;
        padding: 8px 10px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 6px;
        background: #f8fafc;
        font-size: 12px;
      }
      .tce-remote-row-main {
        flex: 1 1 160px;
        display: flex;
        flex-wrap: wrap;
        gap: 4px 10px;
        align-items: baseline;
        min-width: 0;
      }
      .tce-remote-ref { font-weight: 700; color: #9d174d; }
      .tce-remote-db {
        font-size: 10px;
        font-weight: 700;
        color: #475569;
        background: #e2e8f0;
        padding: 1px 6px;
        border-radius: 99px;
      }
      .tce-remote-meta { color: #64748b; font-size: 11px; }
      .tce-remote-load {
        flex: 0 0 auto;
        border: 1px solid #9d174d;
        background: #fff;
        color: #9d174d;
        font-size: 11px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: 8px;
        cursor: pointer;
        font-family: inherit;
      }
      .tce-remote-load:hover { background: #fdf2f8; }
      .tce-api-pill {
        display: inline-block;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 99px;
        background: #fee2e2;
        color: #991b1b;
      }
      .tce-api-pill--ok {
        background: #dcfce7;
        color: #166534;
      }
      .tce-header-actions {
        display: flex;
        align-items: center;
        gap: 5px;
        flex-shrink: 0;
        margin-left: 0;
      }
      .tce-hotel-options-toggle {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
        padding: 3px 6px;
        border-radius: 5px;
        background: rgba(255,255,255,0.14);
        font-size: 10px;
        font-weight: 600;
        color: #fff;
        cursor: pointer;
        white-space: nowrap;
      }
      .tce-hotel-options-toggle input {
        margin: 0;
        width: 12px;
        height: 12px;
        accent-color: #facc15;
      }

      /* Route + TRM on one compact row */
      .tce-meta-bar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px 8px;
        padding: 5px 10px;
        background: #eff6ff;
        border-bottom: 1px solid #dbeafe;
        flex-shrink: 0;
        min-height: 0;
      }
      .tce-briefing {
        padding: 6px 10px 8px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        flex-shrink: 0;
      }
      .tce-briefing-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 6px;
      }
      .tce-briefing-row-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
        flex-shrink: 0;
      }
      .tce-warn-bell {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        font-size: 11px;
        font-weight: 800;
        padding: 3px 8px;
        border: 1px solid #f59e0b;
        border-radius: 999px;
        background: #fffbeb;
        color: #92400e;
        cursor: pointer;
        font-family: inherit;
        line-height: 1.2;
      }
      .tce-warn-bell:hover {
        background: #fef3c7;
      }
      .tce-warn-bell--open {
        background: #fde68a;
        border-color: #d97706;
      }
      .tce-warn-bell--pulse {
        animation: tce-warn-pulse 1.35s ease-in-out infinite;
      }
      @keyframes tce-warn-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.55); }
        55% { box-shadow: 0 0 0 7px rgba(245, 158, 11, 0); }
      }
      .tce-warn-bell-count {
        font-variant-numeric: tabular-nums;
      }
      .tce-warn-panel {
        padding: 0 10px 8px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex-shrink: 0;
        max-height: 40vh;
        overflow-y: auto;
      }
      .tce-warn-panel .tce-coverage-warn {
        width: auto;
        margin-top: 0;
      }
      .tce-mode-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 600;
        color: #334155;
      }
      .tce-quote-mode {
        font-size: 11px;
        padding: 2px 4px;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        background: #fff;
      }
      .tce-briefing-new {
        font-size: 11px;
        padding: 3px 8px;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        background: #fff;
        color: #334155;
        cursor: pointer;
        font-weight: 600;
      }
      .tce-briefing-new:hover { background: #f1f5f9; }
      .tce-briefing-save {
        font-size: 11px;
        padding: 3px 8px;
        border: 1px solid #93c5fd;
        border-radius: 4px;
        background: #dbeafe;
        color: #1e3a8a;
        cursor: pointer;
        font-weight: 600;
      }
      .tce-briefing-save:hover { background: #bfdbfe; }
      .tce-briefing-save--need {
        background: #fbcfe8;
        border-color: #f9a8d4;
        color: #9d174d;
      }
      .tce-briefing-save--need:hover { background: #f9a8d4; }
      .tce-help-q {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 1px solid #93c5fd;
        background: #eff6ff;
        color: #1e3a8a;
        font-size: 11px;
        font-weight: 800;
        cursor: pointer;
        line-height: 1;
        padding: 0;
      }
      .tce-help-q:hover { background: #dbeafe; }
      .tce-briefing-grid {
        display: grid;
        grid-template-columns: minmax(3.2rem, 0.55fr) minmax(4.5rem, 1fr) auto auto 2.4rem;
        gap: 4px 6px;
        align-items: end;
      }
      .tce-briefing-grid label {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 10px;
        color: #64748b;
        font-weight: 600;
        min-width: 0;
      }
      .tce-brief-dest-wrap { min-width: 0; }
      .tce-brief-dest-row {
        display: flex;
        align-items: stretch;
        gap: 4px;
        min-width: 0;
      }
      .tce-brief-dest-row input { flex: 1; min-width: 0; }
      .tce-dest-pin {
        flex-shrink: 0;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        background: #f8fafc;
        color: #334155;
        font-size: 10px;
        font-weight: 700;
        padding: 0 7px;
        cursor: pointer;
        font-family: inherit;
        white-space: nowrap;
      }
      .tce-dest-pin:hover { background: #e2e8f0; }
      .tce-dest-pin--on {
        border-color: #2563eb;
        background: #dbeafe;
        color: #1e40af;
      }
      .tce-briefing-grid input {
        font-size: 11px;
        padding: 3px 5px;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        font-weight: 400;
        color: #0f172a;
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
      }
      .tce-briefing-dates {
        display: contents;
      }
      .tce-briefing-nights-field { min-width: 0; }
      .tce-briefing-grid .tce-brief-date {
        min-width: 0;
        width: auto;
        max-width: 8.5rem;
        box-sizing: border-box;
      }
      .tce-brief-readonly {
        display: inline-block;
        font-size: 11px;
        font-weight: 600;
        color: #0f172a;
        padding: 3px 0;
        white-space: nowrap;
      }
      .tce-brief-nights {
        display: inline-flex;
        align-items: center;
        min-height: 22px;
        font-size: 12px;
        font-weight: 800;
        color: #0f172a;
      }
      .tce-occ-total {
        margin: 0 0 10px;
        padding: 8px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #f8fafc;
      }
      .tce-accommodation {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .tce-accommodation-pax {
        margin: 0;
        font-size: 12px;
        color: #334155;
      }
      .tce-accommodation-totals {
        padding: 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
      }
      .tce-accommodation-totals-title {
        font-size: 11px;
        font-weight: 700;
        color: #1e40af;
        margin-bottom: 6px;
      }
      .tce-accommodation-include {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 12px;
        color: #0f172a;
        font-weight: 600;
        cursor: pointer;
        padding: 8px;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 8px;
      }
      .tce-accommodation-include input { margin-top: 2px; }
      .tce-accommodation-include--disabled {
        opacity: 0.55;
        cursor: not-allowed;
        background: #f1f5f9;
        border-color: #e2e8f0;
        color: #64748b;
      }
      .tce-commission-kinds {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 8px;
      }
      .tce-commission-kind {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 11px;
        font-weight: 600;
        color: #0f172a;
        cursor: pointer;
        padding: 8px;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
      }
      .tce-commission-kind--on {
        background: #ecfdf5;
        border-color: #6ee7b7;
        color: #065f46;
      }
      .tce-commission-kind input { margin-top: 2px; }
      .tce-occ-total-btn {
        width: 100%;
        border: 1px solid #93c5fd;
        background: #dbeafe;
        color: #1e3a8a;
        font-size: 11px;
        font-weight: 800;
        padding: 7px 8px;
        border-radius: 6px;
        cursor: pointer;
      }
      .tce-occ-total-btn:hover { background: #bfdbfe; }
      .tce-occ-total-btn--on { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
      .tce-occ-total-mix { margin-top: 8px; }
      .tce-brief-nights {
        display: block;
        font-size: 12px;
        font-weight: 700;
        color: #1e3a8a;
        padding: 4px 2px;
        background: #e0e7ff;
        border-radius: 4px;
        min-height: 22px;
        text-align: center;
        min-width: 0;
      }
      .tce-room-plan-wrap { grid-column: 1 / -1; }
      .tce-room-hint {
        margin: 0 0 4px;
        font-size: 10px;
        color: #64748b;
        font-weight: 400;
        line-height: 1.35;
      }
      .tce-room-plan { display: grid; gap: 4px; margin-top: 6px; grid-column: 1 / -1; }
      .tce-room-row {
        display: flex; flex-wrap: wrap; align-items: flex-end; gap: 4px;
      }
      .tce-room-row > label { min-width: 110px; }
      .tce-room-kids {
        display: inline-flex; flex-wrap: wrap; align-items: flex-end; gap: 4px;
      }
      .tce-room-child-age {
        min-width: 0;
        width: auto;
        flex: 0 0 auto;
      }
      .tce-room-child-age input {
        width: 3rem;
        max-width: 3rem;
        min-width: 0;
        box-sizing: border-box;
        font-size: 11px;
        padding: 3px 4px;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
      }
      .tce-room-row select {
        font-size: 11px; padding: 3px 4px; border: 1px solid #cbd5e1; border-radius: 4px;
      }
      .tce-room-btn {
        font-size: 10px; padding: 3px 6px; border: 1px solid #93c5fd;
        background: #eff6ff; color: #1e3a8a; border-radius: 4px; cursor: pointer;
      }
      .tce-room-btn--del { background: #fff1f2; color: #9f1239; border-color: #fda4af; }
      .tce-room-actions { display: flex; align-items: center; gap: 8px; }
      .tce-room-sum { font-size: 11px; font-weight: 700; color: #1e3a8a; }
      .tce-briefing-note {
        margin: 6px 0 0;
        font-size: 10px;
        color: #b45309;
        line-height: 1.35;
      }
      .tce-briefing--warn {
        background: #fff7ed;
        border-bottom-color: #fdba74;
      }
      .tce-briefing-note--warn {
        color: #9a3412;
        font-weight: 600;
      }
      .tce-occ-rates {
        margin-top: 8px;
        padding: 8px;
        background: #fff7ed;
        border: 1px solid #fed7aa;
        border-radius: 6px;
      }
      .tce-occ-hint {
        margin: 0 0 6px;
        font-size: 10px;
        color: #9a3412;
        line-height: 1.3;
      }
      .tce-occ-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 4px;
      }
      .tce-occ-grid label {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 10px;
        font-weight: 600;
        color: #9a3412;
      }
      .tce-occ-input {
        font-size: 11px;
        padding: 3px 4px;
        border: 1px solid #fdba74;
        border-radius: 4px;
        width: 100%;
      }
      .tce-occ-child-eq {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 6px;
        font-size: 10px;
        color: #7c2d12;
        font-weight: 600;
      }
      .tce-occ-reset-row {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 6px 8px;
        margin: 6px 0 0;
      }
      .tce-occ-reset-btn {
        font-size: 10px;
        padding: 2px 8px;
        border-radius: 4px;
        border: 1px solid #fdba74;
        background: #fff7ed;
        color: #9a3412;
        cursor: pointer;
        font-weight: 700;
        font-family: inherit;
      }
      .tce-occ-reset-btn:hover { background: #ffedd5; }
      .tce-occ-reset-guide {
        margin: 0;
        font-size: 10px;
        color: #9a3412;
        line-height: 1.3;
        flex: 1 1 120px;
      }

      .tce-meta-route {
        flex: 1 1 auto;
        min-width: 0;
        font-size: 11px;
        color: #1e3a8a;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tce-meta-route--guide {
        font-size: 12.5px;
        font-weight: 700;
        color: #1e3a8a;
      }
      .tce-meta-route-label {
        font-weight: 800;
        color: #1d4ed8;
        margin-right: 4px;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        font-size: 0.92em;
      }
      .tce-meta-route--guide .tce-meta-route-label {
        color: #1e40af;
      }
      .tce-coverage {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 6px 10px 2px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      .tce-coverage-chip {
        display: inline-flex;
        align-items: center;
        border: 1px solid transparent;
        border-radius: 6px;
        padding: 3px 8px;
        font-size: 10px;
        font-weight: 700;
        font-family: inherit;
        line-height: 1.2;
        cursor: default;
        pointer-events: none;
      }
      .tce-coverage-chip--miss {
        background: #fef2f2;
        border-color: #fecaca;
        color: #b91c1c;
      }
      .tce-coverage-chip--ok {
        background: #ecfdf5;
        border-color: #a7f3d0;
        color: #047857;
      }
      .tce-coverage-warn {
        display: block;
        position: relative;
        width: 100%;
        margin-top: 0;
        padding: 8px 28px 8px 10px;
        border-radius: 6px;
        background: #fffbeb;
        border: 1px solid #fcd34d;
        color: #92400e;
        font-size: 10px;
        font-weight: 600;
        line-height: 1.35;
      }
      .tce-coverage-warn--info {
        background: #eff6ff;
        border-color: #bfdbfe;
        color: #1e40af;
      }
      .tce-coverage-warn-close {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 22px;
        height: 22px;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: inherit;
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        font-family: inherit;
        opacity: 0.7;
      }
      .tce-coverage-warn-close:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.06);
      }
      .tce-coverage-warn-msg {
        margin-bottom: 4px;
      }
      .tce-coverage-warn-fix {
        font-weight: 500;
        opacity: 0.95;
      }
      .tce-coverage-warn-fix strong {
        font-weight: 800;
      }
      .wb-wrap {
        overflow-x: auto;
        margin: 8px 0 4px;
      }
      .wb-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10px;
      }
      .wb-table th,
      .wb-table td {
        border: 1px solid #e2e8f0;
        padding: 4px 6px;
        text-align: left;
        vertical-align: top;
      }
      .wb-table th {
        background: #f1f5f9;
        font-weight: 700;
        color: #475569;
      }
      .wb-table td.num {
        text-align: right;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .wb-table tr.wb-section td {
        background: #f8fafc;
      }
      .wb-table tr.wb-total td {
        background: #eff6ff;
        font-weight: 700;
      }
      .wb-grand {
        margin: 0 0 6px;
        padding: 8px 10px;
        border-radius: 8px;
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        font-size: 11px;
        color: #065f46;
        line-height: 1.4;
      }
      .tce-client-opt {
        margin: 0 0 12px;
        padding: 8px 10px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #fff;
        max-width: 420px;
      }
      .tce-client-opt-head {
        font-size: 12px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 6px;
      }
      .tce-client-commission {
        margin: 4px 0 0;
        font-size: 12px;
        font-weight: 600;
        color: #334155;
      }
      .tce-client-grand {
        margin: 8px 0 4px;
        padding: 8px 10px;
        border-radius: 8px;
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        font-size: 11px;
        color: #065f46;
        line-height: 1.4;
      }
      .tce-advisor-break {
        margin-top: 8px;
        border-top: 1px dashed #e2e8f0;
        padding-top: 6px;
      }
      .tce-advisor-break > summary {
        cursor: pointer;
        font-size: 10px;
        font-weight: 700;
        color: #64748b;
        user-select: none;
      }
      .tce-advisor-break[open] > summary {
        margin-bottom: 6px;
        color: #475569;
      }
      .tce-trm-bar {
        display: flex;
        align-items: center;
        flex-wrap: nowrap;
        gap: 5px;
        flex: 0 0 auto;
        padding: 0;
        background: transparent;
        border: none;
        font-size: 11px;
        color: #92400e;
      }
      .tce-trm-bar label { font-weight: 700; white-space: nowrap; }
      .tce-trm-input {
        width: 72px;
        border: 1px solid #fbbf24;
        border-radius: 5px;
        padding: 3px 5px;
        font-size: 11px;
        font-weight: 700;
        color: #78350f;
        background: #fffbeb;
      }
      .tce-trm-sup-input { width: 56px; }
      .tce-trm-sup-label { font-weight: 800; color: #b45309; }
      .tce-trm-hint {
        display: none;
      }
      .tce-panel--wide .tce-trm-hint,
      .tce-panel--compare .tce-trm-hint {
        display: inline;
        flex: 0 1 auto;
        font-size: 10px;
        color: #a16207;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 160px;
      }
      .tce-trm-refresh {
        border: 1px solid #fbbf24;
        background: #fffbeb;
        color: #92400e;
        border-radius: 5px;
        font-size: 10px;
        font-weight: 700;
        padding: 3px 5px;
        cursor: pointer;
        white-space: nowrap;
      }
      .tce-trm-refresh:hover { background: #fef3c7; }
      .tce-currency-toggle {
        display: inline-flex;
        align-items: center;
        border: 1px solid #fbbf24;
        border-radius: 5px;
        overflow: hidden;
        flex-shrink: 0;
        background: #fffbeb;
      }
      .tce-currency-btn {
        border: none;
        background: transparent;
        color: #a16207;
        font-size: 10px;
        font-weight: 700;
        padding: 3px 6px;
        cursor: pointer;
        font-family: inherit;
        line-height: 1.2;
      }
      .tce-currency-btn + .tce-currency-btn {
        border-left: 1px solid #fde68a;
      }
      .tce-currency-btn--active {
        background: #fde047;
        color: #78350f;
      }
      .tce-currency-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .tce-compare-hotels {
        margin-top: 10px;
        padding: 10px;
        border: 1px solid #bfdbfe;
        border-radius: 8px;
        background: #eff6ff;
      }
      .tce-compare-hotels--compact {
        margin-top: 8px;
      }
      .tce-compare-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }
      .tce-compare-title {
        font-size: 11px;
        font-weight: 700;
        color: #1e40af;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .tce-add-option-btn {
        flex-shrink: 0;
        border: 1px solid #93c5fd;
        background: #fff;
        color: #1d4ed8;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        cursor: pointer;
      }
      .tce-add-option-btn:hover { background: #dbeafe; }
      .tce-compare-columns {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 8px;
        align-items: stretch;
      }
      .tce-compare-column {
        min-width: 0;
        background: #fff;
        border: 1px solid #bfdbfe;
        border-radius: 8px;
        padding: 8px;
      }
      .tce-compare-svcs {
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 1px dashed #e2e8f0;
      }
      .tce-compare-svc {
        font-size: 10px;
        color: #475569;
        line-height: 1.35;
        margin-bottom: 3px;
      }
      .tce-compare-hotel-line {
        display: flex;
        gap: 6px;
        align-items: flex-start;
        font-size: 11px;
        color: #334155;
        margin-bottom: 6px;
        padding-bottom: 6px;
        border-bottom: 1px dashed #e2e8f0;
      }
      .tce-compare-thumb {
        width: 36px;
        height: 36px;
        object-fit: cover;
        border-radius: 4px;
        flex-shrink: 0;
        background: #e2e8f0;
      }
      .tce-compare-hotel-body { min-width: 0; flex: 1; }
      .tce-compare-column-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        font-weight: 700;
        color: #1e3a8a;
        margin-bottom: 6px;
      }
      .tce-compare-col-remove {
        border: none;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        font-size: 12px;
        padding: 0 2px;
        line-height: 1;
      }
      .tce-compare-col-remove:hover { color: #dc2626; }
      .tce-compare-hotel-name { display: block; font-weight: 600; }
      .tce-compare-hotel-room {
        display: block;
        color: #475569;
        font-size: 10px;
        margin-top: 2px;
        line-height: 1.35;
      }
      .tce-compare-hotel-nights { display: block; color: #64748b; font-size: 10px; margin-top: 2px; }
      .tce-compare-hotel-empty {
        font-size: 11px;
        color: #94a3b8;
        margin-bottom: 6px;
        line-height: 1.35;
      }
      .tce-compare-option {
        padding: 8px 0;
        border-top: 1px dashed #bfdbfe;
      }
      .tce-compare-option:first-of-type {
        border-top: none;
        padding-top: 0;
      }
      .tce-compare-option-title {
        font-size: 12px;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 4px;
      }
      .tce-compare-option-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-size: 12px;
        color: #334155;
        line-height: 1.4;
      }
      .tce-compare-option-row strong {
        color: #1e40af;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .tce-compare-option-row--tier {
        font-size: 10px;
        line-height: 1.35;
        color: #334155;
      }
      .tce-compare-adj {
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed #bfdbfe;
      }
      .tce-compare-adj-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        margin-bottom: 4px;
        font-size: 10px;
        font-weight: 600;
        color: #9a3412;
      }
      .tce-compare-adj-row input {
        width: 72px;
        font-size: 10px;
        padding: 2px 4px;
        border: 1px solid #fdba74;
        border-radius: 4px;
      }
      .tce-compare-adj-btns {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
        margin-top: 4px;
      }
      .tce-compare-adj-btn {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid #fdba74;
        background: #fff7ed;
        color: #9a3412;
        cursor: pointer;
        font-weight: 700;
        font-family: inherit;
      }
      .tce-compare-adj-btn:hover { background: #ffedd5; }
      .tce-compare-adj-btn--auto.is-on {
        background: #1d4ed8;
        border-color: #1d4ed8;
        color: #fff;
      }
      .tce-compare-adj-btn--auto:not(.is-on) {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #64748b;
      }
      .tce-compare-adj-guide {
        margin: 4px 0 0;
        font-size: 9px;
        color: #9a3412;
        line-height: 1.35;
      }
      .tce-compare-adj-sonda {
        color: #64748b;
        font-weight: 500;
      }
      .tce-opt-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 6px;
      }
      .tce-opt-chip {
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        color: #475569;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 600;
        padding: 2px 8px;
        cursor: pointer;
      }
      .tce-opt-chip--on {
        border-color: #2563eb;
        background: #dbeafe;
        color: #1e40af;
      }
      .tce-width-toggle,
      .tce-open-panel,
      .tce-close {
        background: rgba(255,255,255,0.15);
        border: none;
        color: #fff;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      }
      .tce-width-toggle:hover,
      .tce-open-panel:hover,
      .tce-close:hover {
        background: rgba(255,255,255,0.28);
      }
      .tce-open-panel {
        font-size: 15px;
      }
      .tce-width-toggle {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: -1px;
      }

      .tce-products-toolbar {
        display: flex;
        justify-content: flex-end;
        padding: 6px 0 8px;
        margin-bottom: 4px;
      }
      .tce-ta-block {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px dashed #cbd5e1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .tce-ta-type {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 6px 8px;
        font-size: 12px;
        font-family: inherit;
      }
      .tce-ta-unit {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 6px 8px;
        font-size: 13px;
        font-family: inherit;
      }
      .tce-ta-summary {
        font-size: 12px;
        color: #334155;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .tce-ta-suggest {
        margin-left: auto;
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        border-radius: 6px;
        padding: 3px 8px;
        font-size: 11px;
        cursor: pointer;
        font-family: inherit;
      }
      .tce-ta-hint {
        font-size: 10px;
        color: #64748b;
      }
      .tce-history-item {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 10px;
        font-size: 12px;
        color: #334155;
        line-height: 1.45;
      }
      .tce-history-item strong { color: #1e40af; }
      .tce-history-meta { color: #64748b; font-size: 11px; margin-top: 4px; }
      .tce-history-trip {
        margin-top: 6px;
        font-size: 12px;
        color: #1e293b;
      }
      .tce-history-trip div { margin-top: 2px; }
      .tce-history-services {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .tce-history-svc {
        font-size: 12px;
        color: #0f172a;
      }
      .tce-history-svc-title {
        font-weight: 700;
        color: #1e40af;
      }
      .tce-history-svc-line {
        color: #475569;
        font-size: 11px;
        margin-top: 1px;
      }
      .tce-history-svc-price {
        margin-top: 2px;
        font-weight: 600;
        color: #0f172a;
      }
      .tce-history-fees {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px dashed #cbd5e1;
        font-size: 11px;
        color: #475569;
      }
      .tce-history-fees div { margin-top: 2px; }
      .tce-history-total {
        margin-top: 6px;
        font-size: 13px;
        font-weight: 700;
        color: #1e40af;
      }
      .tce-history-restore {
        margin-top: 8px;
        width: 100%;
        border: 1px solid #93c5fd;
        background: #eff6ff;
        color: #1d4ed8;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        padding: 6px 8px;
        cursor: pointer;
      }
      .tce-history-restore:hover { background: #dbeafe; }
      .tce-history-toolbar {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
      }
      .tce-history-tool {
        flex: 1;
        padding: 6px 8px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #f8fafc;
        color: #334155;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
      }
      .tce-history-tool:hover { background: #e2e8f0; }
      .tce-history-hint {
        margin: 0 0 10px;
        font-size: 11px;
        color: #64748b;
        line-height: 1.4;
      }

      .tce-body {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        min-height: 0;
      }

      .tce-panel-tabs {
        display: flex;
        flex-shrink: 0;
        background: #fff;
        border-bottom: 1px solid #e2e8f0;
      }
      .tce-panel-tab {
        flex: 1;
        padding: 8px 6px;
        border: none;
        background: transparent;
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        cursor: pointer;
        font-family: inherit;
        border-bottom: 2px solid transparent;
      }
      .tce-panel-tab:hover { color: #1e40af; background: #f8fafc; }
      .tce-panel-tab--active {
        color: #1e40af;
        border-bottom-color: #1e40af;
        background: #eff6ff;
      }

      .tce-empty {
        text-align: center;
        color: #94a3b8;
        padding: 48px 24px;
        font-size: 14px;
        line-height: 1.6;
      }
      .tce-empty-icon { font-size: 36px; margin-bottom: 12px; }

      .tce-item {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 10px;
        transition: border-color 0.3s, box-shadow 0.3s;
      }
      .tce-item--collapsed {
        padding: 8px 10px;
      }
      .tce-item--new {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59,130,246,0.25);
      }
      .tce-kit {
        border: 1px solid #99d4cf;
        border-radius: 12px;
        padding: 8px;
        margin-bottom: 10px;
        background: #f3faf9;
      }
      .tce-kit-label {
        font-size: 11px;
        font-weight: 700;
        color: #0f6e6a;
        margin: 0 0 6px;
      }
      .tce-kit .tce-item { margin-bottom: 8px; }
      .tce-kit .tce-item:last-child { margin-bottom: 0; }
      .tce-kit-transfer {
        margin-left: 10px;
        border-left: 3px solid #0f6e6a;
      }
      .tce-search-transfer {
        flex-shrink: 0;
        border: 1px solid #99d4cf;
        border-radius: 6px;
        background: #ecf8f6;
        color: #0a4f4c;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 7px;
        cursor: pointer;
        white-space: nowrap;
      }
      .tce-search-transfer:hover { background: #d5efeb; }

      .tce-item-head {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .tce-item-open {
        flex-shrink: 0;
        width: 26px;
        height: 26px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #bfdbfe;
        border-radius: 6px;
        background: #eff6ff;
        color: #1e40af;
        text-decoration: none;
        font-size: 13px;
        line-height: 1;
        cursor: pointer;
      }
      .tce-item-open:hover {
        background: #dbeafe;
        border-color: #93c5fd;
      }
      .tce-item-toggle {
        flex-shrink: 0;
        width: 26px;
        height: 26px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #f8fafc;
        color: #1e40af;
        font-size: 16px;
        font-weight: 700;
        line-height: 1;
        cursor: pointer;
        font-family: inherit;
        padding: 0;
      }
      .tce-item-toggle:hover {
        background: #eff6ff;
        border-color: #93c5fd;
      }
      .tce-item-summary {
        flex: 1;
        min-width: 0;
      }
      .tce-item-summary-type {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #1e40af;
        margin: 0 0 2px;
      }
      .tce-item-summary-title {
        font-size: 13px;
        font-weight: 700;
        color: #1e293b;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tce-item-summary-meta {
        font-size: 11px;
        color: #64748b;
        margin: 2px 0 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tce-item-summary-price {
        flex-shrink: 0;
        font-size: 13px;
        font-weight: 700;
        color: #1e40af;
        white-space: nowrap;
      }
      .tce-item-details {
        margin-top: 8px;
      }
      .tce-item-adjust {
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px dashed #cbd5e1;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .tce-item-adjust-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .tce-item-adjust-row label {
        font-size: 11px;
        font-weight: 600;
        color: #475569;
      }
      .tce-item-adjust-label {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
      }
      .tce-item-round-btn {
        flex-shrink: 0;
        padding: 1px 5px;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 4px;
        color: #1e40af;
        font-size: 10px;
        font-weight: 700;
        line-height: 1.3;
        cursor: pointer;
        font-family: inherit;
      }
      .tce-item-round-btn:hover { background: #dbeafe; }
      .tce-item-adj-input {
        width: 110px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 4px 6px;
        font-size: 12px;
        font-family: inherit;
      }
      .tce-item-adjust-base {
        font-size: 10px;
        color: #94a3b8;
      }
      .tce-item-line-total {
        font-size: 12px;
        color: #1e293b;
      }
      .tce-item-line-total strong {
        color: #1e40af;
      }

      .tce-item-type {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #1e40af;
        margin-bottom: 6px;
      }

      .tce-item-top {
        display: flex;
        gap: 10px;
        margin-bottom: 8px;
      }
      .tce-item-img {
        width: 56px;
        height: 56px;
        border-radius: 6px;
        object-fit: cover;
        flex-shrink: 0;
        background: #e2e8f0;
      }
      .tce-item-img--placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
      }
      .tce-item-name {
        font-size: 13px;
        font-weight: 700;
        color: #1e293b;
        line-height: 1.3;
        margin: 0 0 2px;
      }
      .tce-stars { color: #f59e0b; font-size: 11px; }
      .tce-item-address {
        font-size: 11px;
        color: #64748b;
        margin: 0;
        line-height: 1.3;
      }

      .tce-dates {
        font-size: 12px;
        color: #475569;
        background: #f1f5f9;
        border-radius: 6px;
        padding: 6px 8px;
        margin-bottom: 8px;
      }
      .tce-dates strong { color: #1e293b; }

      .tce-detail {
        font-size: 12px;
        color: #475569;
        margin: 0 0 4px;
        line-height: 1.4;
      }
      .tce-detail-label {
        font-weight: 600;
        color: #334155;
      }
      .tce-detail--pp .tce-detail-label {
        font-weight: 800;
        color: #9a3412;
        font-size: 13px;
      }

      .tce-flight-leg {
        background: #f1f5f9;
        border-radius: 8px;
        padding: 8px 10px;
        margin-bottom: 6px;
      }
      .tce-flight-valor {
        margin: 8px 0 4px;
        font-size: 12px;
        color: #1e293b;
        line-height: 1.45;
      }
      .tce-flight-valor strong { color: #9a3412; }
      .tce-detail--mix .tce-detail-label,
      .tce-detail--subtotal .tce-detail-label {
        font-weight: 700;
        color: #334155;
      }
      .tce-detail--subtotal {
        margin-top: 4px;
        padding-top: 4px;
        border-top: 1px dashed #cbd5e1;
      }
      .tce-tier-mayor-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin: 0 0 6px;
        font-size: 11px;
        color: #64748b;
      }
      .tce-tier-mayor-row label { flex: 1; }
      .tce-tier-mayor-input {
        width: 88px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 3px 6px;
        font-size: 11px;
        font-family: inherit;
      }
      .tce-total-row--head {
        font-weight: 700;
        color: #1e40af;
        margin-top: 8px;
        border-top: 1px solid #e2e8f0;
        padding-top: 6px;
      }
      .tce-total-row--hotel { font-weight: 600; color: #334155; }
      .tce-flight-leg-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 8px;
        margin-bottom: 4px;
      }
      .tce-flight-leg-dir {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: #1e40af;
      }
      .tce-flight-leg-meta {
        font-size: 11px;
        color: #64748b;
        text-align: right;
      }
      .tce-flight-route {
        font-size: 13px;
        font-weight: 700;
        color: #1e293b;
        letter-spacing: 0.2px;
      }
      .tce-flight-cities {
        font-size: 11px;
        color: #64748b;
        margin-top: 2px;
      }
      .tce-flight-airline {
        font-size: 11px;
        color: #475569;
        margin-top: 4px;
      }
      .tce-price-breakdown {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 2px;
        line-height: 1.35;
      }

      .tce-item-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #f1f5f9;
      }
      .tce-price {
        font-size: 14px;
        font-weight: 700;
        color: #1e40af;
      }
      .tce-supplier {
        font-size: 11px;
        color: #64748b;
      }
      .tce-remove {
        background: none;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        color: #94a3b8;
        cursor: pointer;
        padding: 4px 8px;
        font-size: 14px;
        line-height: 1;
      }
      .tce-remove:hover { color: #ef4444; border-color: #fca5a5; background: #fef2f2; }

      .tce-footer {
        padding: 12px 16px;
        border-top: 1px solid #e2e8f0;
        background: #fff;
        flex-shrink: 0;
      }
      .tce-footer--scroll {
        border-top: none;
        padding: 0;
        background: transparent;
      }
      .tce-total {
        font-size: 14px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 10px;
      }
      .tce-total-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        column-gap: 12px;
        align-items: baseline;
        margin-bottom: 4px;
        font-size: 13px;
      }
      .tce-total-row > span:last-child {
        text-align: right;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .tce-total-row--sub {
        color: #64748b;
        font-size: 12px;
      }
      .tce-total-row--vista {
        font-weight: 700;
        color: #334155;
      }
      .tce-total-row--opt {
        font-weight: 800;
        color: #0f172a;
        font-size: 13px;
        margin-top: 2px;
      }
      .tce-total-row--opt > span:last-child {
        font-variant-numeric: tabular-nums;
      }

      .tce-fees {
        margin-bottom: 10px;
        padding-bottom: 10px;
        border-bottom: 1px dashed #e2e8f0;
        max-width: 420px;
      }
      .tce-fee-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 6px;
      }
      .tce-fee-row label {
        font-size: 12px;
        color: #475569;
      }
      .tce-fee-input {
        width: 96px;
        padding: 4px 8px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        font-size: 12px;
        text-align: right;
        font-family: inherit;
        color: #1e293b;
      }
      .tce-fee-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59,130,246,0.2);
      }
      .tce-totals {
        margin-bottom: 10px;
        max-width: 420px;
      }
      .tce-rounding-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }
      .tce-rounding-excess {
        font-size: 12px;
        color: #64748b;
        flex: 1;
      }
      .tce-rounding-excess strong { color: #1e293b; }
      .tce-round-btn {
        flex-shrink: 0;
        padding: 5px 10px;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 6px;
        color: #1e40af;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
      }
      .tce-round-btn:hover { background: #dbeafe; }
      .tce-clear {
        width: 100%;
        padding: 8px;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        color: #64748b;
        font-size: 13px;
        cursor: pointer;
        font-family: inherit;
      }
      .tce-clear:hover { background: #fef2f2; color: #ef4444; border-color: #fca5a5; }

      .tce-quote {
        display: flex;
        flex-direction: column;
        gap: 8px;
        height: 100%;
      }
      .tce-quote-hint {
        font-size: 11px;
        color: #64748b;
        margin: 0;
        line-height: 1.35;
      }
      .tce-quote-group-title {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: #64748b;
        margin: 8px 0 4px;
      }
      .tce-quote-line {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        margin-bottom: 4px;
        font-size: 11px;
        color: #334155;
        line-height: 1.35;
      }
      .tce-quote-line input { margin-top: 2px; flex-shrink: 0; }
      .tce-quote-actions {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
      }
      .tce-quote-btn {
        flex: 1;
        padding: 8px;
        border-radius: 8px;
        border: none;
        background: #16a34a;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
      }
      .tce-quote-btn:hover { background: #15803d; }
      .tce-quote-btn--secondary {
        background: #fff;
        color: #1e40af;
        border: 1px solid #bfdbfe;
      }
      .tce-quote-btn--secondary:hover { background: #eff6ff; }
      .tce-quote-btn--pdf {
        background: #0369a1;
      }
      .tce-quote-btn--pdf:hover { background: #075985; }
      .tce-quote-btn--chat {
        background: #0f766e;
      }
      .tce-quote-btn--chat:hover { background: #0d9488; }
      .tce-quote-status {
        font-size: 11px;
        color: #16a34a;
        min-height: 14px;
      }
      .tce-quote-status--err { color: #dc2626; }
      .tce-quote-preview {
        width: 100%;
        flex: 1;
        min-height: 180px;
        padding: 8px;
        border: 1px solid #86efac;
        border-radius: 8px;
        font-size: 11px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        line-height: 1.4;
        color: #14532d;
        background: #f0fdf4;
        resize: vertical;
        box-sizing: border-box;
        white-space: pre-wrap;
      }
      .tce-commission-wa {
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .tce-commission-preview {
        width: 100%;
        min-height: 90px;
        padding: 8px;
        border: 1px solid #fcd34d;
        border-radius: 8px;
        font-size: 11px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        line-height: 1.4;
        color: #78350f;
        background: #fffbeb;
        resize: vertical;
        box-sizing: border-box;
        white-space: pre-wrap;
      }
      .tce-quote-btn--commission {
        background: #b45309;
      }
      .tce-quote-btn--commission:hover { background: #92400e; }
      .tce-quote-preview-label {
        font-size: 11px;
        font-weight: 700;
        color: #15803d;
        margin: 0;
      }
      .tce-commission-wa .tce-quote-preview-label {
        color: #92400e;
      }
      .tce-quote-checks {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 160px;
        overflow-y: auto;
        padding: 6px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
        flex-shrink: 0;
      }
      .tce-quote-opt {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 12px;
        color: #334155;
        margin: 8px 0 0;
        cursor: pointer;
      }
      .tce-quote-opt input { margin-top: 2px; }
    `;
    this.shadow.appendChild(style);
  }

  private renderItem(item: CartItem): string {
    if (item.type === 'transfer') return this.renderTransferItem(item);
    if (item.type === 'flight') return this.renderFlightItem(item);
    if (item.type === 'activity') return this.renderActivityItem(item);
    if (item.type === 'tour') return this.renderTourItem(item);
    if (item.type === 'insurance') return this.renderInsuranceItem(item);
    return this.renderHotelItem(item);
  }

  private getItemSourceUrl(item: CartItem): string | undefined {
    if (item.sourceUrl) return item.sourceUrl;
    if ('bookingUrl' in item && item.bookingUrl) return item.bookingUrl;
    if (item.type === 'hotel' && item.selectedRate.bookingUrl) {
      return item.selectedRate.bookingUrl;
    }
    return undefined;
  }

  private renderItemOpenLink(item: CartItem): string {
    const url = this.getItemSourceUrl(item);
    if (!url) return '';
    return `<a class="tce-item-open" href="${this.escape(url)}" target="_blank" rel="noopener noreferrer"
      title="Abrir búsqueda / página de origen" aria-label="Abrir búsqueda">↗</a>`;
  }

  private renderItemCard(opts: {
    item: CartItem;
    typeLabel: string;
    title: string;
    meta?: string;
    /** HTML injected under the summary (e.g. option chips). Not escaped. */
    summaryExtraHtml?: string;
    headActionsHtml?: string;
    /** Extra class on the card wrapper. */
    extraClass?: string;
    /** Base product details (adjustments are appended automatically). */
    detailsHtml: string;
  }): string {
    const expanded = this.isItemExpanded(opts.item.id);
    const toggleLabel = expanded ? '−' : '+';
    const toggleTitle = expanded ? 'Recoger' : 'Expandir';
    const line = this.getItemLineTotal(opts.item);
    const priceLabel = this.formatPrice(line.currency, line.price);
    const id = this.escape(opts.item.id);
    const openLink = this.renderItemOpenLink(opts.item);
    const extra = opts.summaryExtraHtml || '';
    const headActions = opts.headActionsHtml || '';
    const extraClass = opts.extraClass ? ` ${opts.extraClass}` : '';

    if (!expanded) {
      return `
        <div class="tce-item tce-item--truncated${extraClass}" data-id="${id}">
          <div class="tce-item-head">
            <button type="button" class="tce-item-toggle" data-action="toggle-item"
              data-id="${id}" title="${toggleTitle}" aria-expanded="false">${toggleLabel}</button>
            <div class="tce-item-summary">
              <p class="tce-item-summary-type">${this.escape(opts.typeLabel)}</p>
              <p class="tce-item-summary-title">${this.escape(opts.title)}</p>
              ${opts.meta ? `<p class="tce-item-summary-meta">${this.escape(opts.meta)}</p>` : ''}
              ${extra}
            </div>
            <div class="tce-item-summary-price">${this.escape(priceLabel)}</div>
            ${headActions}
            ${openLink}
            <button class="tce-remove" data-action="remove" data-id="${id}" title="Quitar">✕</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="tce-item${extraClass}" data-id="${id}">
        <div class="tce-item-head" style="margin-bottom:6px">
          <button type="button" class="tce-item-toggle" data-action="toggle-item"
            data-id="${id}" title="${toggleTitle}" aria-expanded="true">${toggleLabel}</button>
          <div class="tce-item-summary">
            <p class="tce-item-summary-type" style="margin:0">${this.escape(opts.typeLabel)}</p>
            ${extra}
          </div>
          ${headActions}
          ${openLink}
          <button class="tce-remove" data-action="remove" data-id="${id}" title="Quitar">✕</button>
        </div>
        <div class="tce-item-details">
          ${opts.detailsHtml}
          ${
            opts.item.type === 'hotel'
              ? `${this.renderHotelLineTotal(opts.item as HotelCartItem)}${
                  this.quoteMode === 'wholesale'
                    ? ''
                    : this.renderItemAdjustments(opts.item, { compact: true })
                }`
              : this.renderItemAdjustments(opts.item)
          }
        </div>
      </div>
    `;
  }

  /** Paying pax for service breakdowns: product search seats, not acomodación. */
  private serviceBreakdownPax(item?: CartItem): { pax: number; breakdown: boolean } {
    return serviceItemBreakdownPax(item, this.tripGuide || this.headerSearchContext());
  }

  /** Hotel probe total with “pp × N personas = total” (even in wholesale). */
  private renderHotelLineTotal(item: HotelCartItem): string {
    const line = this.getItemLineTotal(item);
    const { pax, breakdown } = this.serviceBreakdownPax(item);
    const totalLabel = formatServiceItemTotal(line.currency, line.price, pax, breakdown);
    return `<div class="tce-item-line-total" data-item-id="${this.escape(item.id)}"><strong>${this.escape(totalLabel)}</strong></div>`;
  }

  private renderItemAdjustments(
    item: CartItem,
    opts?: { compact?: boolean; hideMayor?: boolean }
  ): string {
    const adj = this.getItemAdjustmentsDisplay(item);
    const line = this.getItemLineTotal(item);
    const native = this.getItemPrice(item);
    const id = this.escape(item.id);
    const step = this.displayCurrency === 'USD' ? '0.01' : '100';
    const valorOriginal = formatValorOriginalDual(
      native.price,
      native.currency,
      this.getEffectiveTrm()
    );
    // Flight already shows Total ítem breakdown under legs.
    const { pax, breakdown } = this.serviceBreakdownPax(item);
    const totalLabel = formatServiceItemTotal(line.currency, line.price, pax, breakdown);
    const totalBlockHtml =
      opts?.compact || item.type === 'flight'
        ? ''
        : `<div class="tce-item-line-total" data-item-id="${id}"><strong>${this.escape(totalLabel)}</strong></div>`;
    const mayorRow = opts?.hideMayor
      ? ''
      : `
        <div class="tce-item-adjust-row">
          <label for="tce-item-mayor-${id}">Mayor valor (${this.displayCurrency})</label>
          <input
            id="tce-item-mayor-${id}"
            class="tce-item-adj-input"
            type="number"
            min="0"
            step="${step}"
            data-item-id="${id}"
            data-adj="mayorValor"
            value="${adj.mayorValor}"
            title="${
              item.type === 'hotel' && this.quoteMode === 'wholesale'
                ? 'Se suma a SGL/DBL/TPL/CHD al salir del campo'
                : 'Ajuste sobre el total del ítem'
            }"
          />
        </div>`;
    return `
      <div class="tce-item-adjust${opts?.compact ? ' tce-item-adjust--compact' : ''}">
        ${mayorRow}
        <div class="tce-item-adjust-row">
          <span class="tce-item-adjust-label">
            <label for="tce-item-redondeo-${id}">Redondeo (${this.displayCurrency})</label>
            <button
              type="button"
              class="tce-item-round-btn"
              data-action="round-item"
              data-id="${id}"
              title="Redondear tarifas de acomodación SGL/DBL/TPL/CHD a …9 (o el total del ítem si no hay tarifas)"
            >…9</button>
          </span>
          <input
            id="tce-item-redondeo-${id}"
            class="tce-item-adj-input"
            type="number"
            min="0"
            step="${step}"
            data-item-id="${id}"
            data-adj="redondeo"
            value="${adj.redondeo}"
          />
        </div>
        <div class="tce-item-adjust-row tce-item-adjust-row--actions">
          <button type="button" class="tce-occ-reset-btn" data-action="restore-item-adj"
            data-item-id="${id}" title="Quitar mayor valor y redondeo de este ítem">Restablecer</button>
        </div>
        <div class="tce-item-adjust-base">${this.escape(valorOriginal)}</div>
        ${totalBlockHtml}
      </div>
    `;
  }

  private renderFlightItem(item: FlightCartItem): string {
    const tripLabel = item.routeType === 'roundTrip' ? 'Ida y vuelta' : 'Solo ida';

    const pax = item.paxSummary
      ? [item.paxSummary]
      : [
          `${item.adults} adulto${item.adults !== 1 ? 's' : ''}`,
          ...(item.children > 0
            ? [`${item.children} niño${item.children !== 1 ? 's' : ''}`]
            : []),
          ...(item.infants > 0
            ? [`${item.infants} bebé${item.infants !== 1 ? 's' : ''}`]
            : []),
        ];

    const dateRange = [item.departureDate, item.returnDate]
      .filter(Boolean)
      .map((d) => this.formatIsoDate(d!))
      .join(' → ');

    const legsHtml = item.legs.map((leg) => this.renderFlightLeg(leg)).join('');

    const line = this.getItemLineTotal(item);
    const { pax: paying, breakdown } = this.serviceBreakdownPax(item);
    const totalLabel = formatServiceItemTotal(line.currency, line.price, paying, breakdown);
    const valorHtml = `
      <div class="tce-flight-valor tce-item-line-total" data-item-id="${this.escape(item.id)}">
        <strong>${this.escape(totalLabel)}</strong>
      </div>`;

    const airlineCode = flightPrimaryAirlineCode(item);
    const flightImg = airlineCode
      ? `<img class="tce-item-img" src="${this.escape(airlineLogoUrl(airlineCode))}" alt="${this.escape(airlineCode)}" />`
      : `<div class="tce-item-img tce-item-img--placeholder">✈️</div>`;
    const detailsHtml = `
      <div class="tce-item-top">
        ${flightImg}
        <div>
          <p class="tce-item-name">${this.escape(item.title)}</p>
          <p class="tce-item-address">${this.escape(tripLabel)} · ${this.escape(pax.join(', '))}</p>
        </div>
      </div>
      ${dateRange ? `<div class="tce-dates"><strong>${this.escape(dateRange)}</strong></div>` : ''}
      ${legsHtml}
      ${valorHtml}
    `;

    return this.renderItemCard({
      item,
      typeLabel: `Vuelo · ${item.provider}`,
      title: item.title,
      meta: [tripLabel, dateRange].filter(Boolean).join(' · '),
      detailsHtml,
    });
  }

  private renderFlightLeg(leg: FlightCartItem['legs'][number]): string {
    const first = leg.segments[0];
    const last = leg.segments[leg.segments.length - 1];
    const dir = leg.direction === 'return' ? 'Vuelta' : 'Ida';
    const stops = leg.stops ?? Math.max(0, leg.segments.length - 1);
    const stopsLabel = formatFlightStopsLabel(stops);

    const metaParts = [
      leg.dateLabel,
      leg.duration,
      stopsLabel,
    ].filter(Boolean);

    const routeLine = first && last
      ? `${this.escape(first.departure.airportCode)} ${this.escape(first.departure.hour)} → ${this.escape(last.arrival.airportCode)} ${this.escape(last.arrival.hour)}`
      : this.escape(leg.routeDescription || '');

    const cities = first && last
      ? [first.departure.cityName, last.arrival.cityName].filter(Boolean).join(' → ')
      : '';

    const cabin = first?.cabin;
    const airlineBits = leg.segments
      .map((s) => {
        const parts = [s.airlineName || s.airlineCode, s.flightNumber].filter(Boolean);
        return parts.join(' ');
      })
      .filter(Boolean);
    const airlineLine = Array.from(new Set(airlineBits)).join(' · ');

    const legBaggage = leg.baggageIncluded?.length
      ? `<div class="tce-flight-baggage"><strong>Maletas:</strong> ${leg.baggageIncluded.map((b) => this.escape(b)).join(' · ')}</div>`
      : '';

    return `
      <div class="tce-flight-leg">
        <div class="tce-flight-leg-head">
          <span class="tce-flight-leg-dir">${dir}</span>
          <span class="tce-flight-leg-meta">${metaParts.map((p) => this.escape(String(p))).join(' · ')}</span>
        </div>
        <div class="tce-flight-route">${routeLine}</div>
        ${cities ? `<div class="tce-flight-cities">${this.escape(cities)}</div>` : ''}
        ${airlineLine || cabin
          ? `<div class="tce-flight-airline">${this.escape([airlineLine, cabin].filter(Boolean).join(' · '))}</div>`
          : ''}
        ${legBaggage}
      </div>
    `;
  }

  /** YYYY-MM-DD → DD-MM-YYYY (fallback to original). */
  private formatIsoDate(iso: string): string {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
  }

  private renderHotelOccupancyRates(item: HotelCartItem): string {
    if (this.quoteMode !== 'wholesale') return '';
    const rates = (this.hotelRatesForDisplay(item) || {
      currency: item.selectedRate.currency || 'COP',
    }) as OccupancyTierRates;
    const missHint = occupancyMissingHint(
      rates,
      occupancyHintOptsFromPlan(this.tripGuide?.roomPlan)
    );
    const missing = missHint
      ? `<p class="tce-occ-hint">${this.escape(missHint)}</p>`
      : '';
    const baselineGuide = formatOccupancyBaselineGuide(rates);
    const resetRow = `<div class="tce-occ-reset-row">
          <button type="button" class="tce-occ-reset-btn" data-action="restore-occ-rates"
            data-item-id="${this.escape(item.id)}" title="Volver a tarifas originales (antes de mayor valor / …9)">
            Restablecer
          </button>
          ${
            baselineGuide
              ? `<p class="tce-occ-reset-guide">${this.escape(baselineGuide)}</p>`
              : ''
          }
        </div>`;
    return `
      <div class="tce-occ-rates" data-item-id="${this.escape(item.id)}">
        ${missing}
        ${resetRow}
        <label class="tce-occ-child-eq">
          <input type="checkbox" class="tce-occ-child-eq-check" data-item-id="${this.escape(item.id)}"
            ${rates.childEqualsAdult ? 'checked' : ''} />
          Niño = adulto (sin CHD)
        </label>
        ${this.hotelsAsOptions ? '' : this.renderItemAdjustments(item, { compact: true, hideMayor: true })}
      </div>
    `;
  }

  private hotelRatesForDisplay(item: HotelCartItem): OccupancyTierRates | undefined {
    const raw = item.occupancyRates as OccupancyTierRates | undefined;
    if (!raw) return undefined;
    const fx = {
      effTrm: this.getEffectiveTrm(),
      trmDia: this.trmDiaOpt(),
      displayCurrency: this.displayCurrency,
    };
    const coerced = sanitizeOccupancyRates(raw, fx);
    const converted = occupancyRatesToCurrency(
      coerced,
      this.displayCurrency,
      fx.effTrm,
      fx.trmDia
    );
    // Prefer converted when TRM allows; otherwise show native (coerced) currency.
    if (converted && (converted.currency || '').toUpperCase() === this.displayCurrency) {
      return converted;
    }
    return coerced;
  }

  private renderHotelWholesaleBreakdown(item: HotelCartItem): string {
    if (this.quoteMode !== 'wholesale') return '';
    const rates = this.hotelRatesForDisplay(item);
    const tiers = wholesaleTierWithOriginal(rates);
    const hasPlan = hasAccommodationPlan(this.tripGuide);
    const mix = hasPlan
      ? accommodationMixBreakdown(this.tripGuide?.roomPlan, rates)
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
    const step = this.displayCurrency === 'USD' ? '0.01' : '100';
    const showTierMayor = !this.hotelsAsOptions;
    const parts: string[] = [];
    for (const t of tiers) {
      const cur = this.formatPrice(t.currency, t.current);
      if (t.original != null) {
        const delta = t.current - t.original;
        const deltaLabel =
          delta === 0
            ? ''
            : ` ${delta > 0 ? '+' : ''}${this.escape(this.formatPrice(t.currency, delta))} → `;
        parts.push(
          `<p class="tce-detail tce-detail--pp"><span class="tce-detail-label">Tarifa pp ${this.escape(t.label)}:</span> ${this.escape(this.formatPrice(t.currency, t.original))}${deltaLabel}<strong>${this.escape(cur)}</strong></p>`
        );
      } else {
        parts.push(
          `<p class="tce-detail tce-detail--pp"><span class="tce-detail-label">Tarifa pp ${this.escape(t.label)}:</span> <strong>${this.escape(cur)}</strong></p>`
        );
      }
      if (showTierMayor) {
        parts.push(`
          <div class="tce-tier-mayor-row">
            <label for="tce-tier-mayor-${t.tier}-${this.escape(item.id)}">Mayor valor ${this.escape(codeForTier(t.tier))} (${this.displayCurrency})</label>
            <input id="tce-tier-mayor-${t.tier}-${this.escape(item.id)}" type="number" min="0" step="${step}"
              class="tce-tier-mayor-input" data-item-id="${this.escape(item.id)}" data-occ-tier="${t.tier}"
              value="" placeholder="0" title="Se suma solo a esta acomodación al salir del campo" />
          </div>`);
      }
      const mixLine = mixByCode.get(codeForTier(t.tier));
      if (mixLine) {
        parts.push(
          `<p class="tce-detail tce-detail--mix"><span class="tce-detail-label">${this.escape(mixLine.code)} x ${mixLine.count} =</span> <strong>${this.escape(this.formatPrice(rates?.currency || 'COP', mixLine.total))}</strong></p>`
        );
        mixByCode.delete(codeForTier(t.tier));
      }
    }
    if (rates?.childEqualsAdult) {
      parts.push(
        `<p class="tce-detail tce-detail--pp"><span class="tce-detail-label">Tarifa pp NIÑO = tarifa adulto</span></p>`
      );
    }
    for (const l of mixByCode.values()) {
      parts.push(
        `<p class="tce-detail tce-detail--mix"><span class="tce-detail-label">${this.escape(l.code)} x ${l.count} =</span> <strong>${this.escape(this.formatPrice(rates?.currency || 'COP', l.total))}</strong></p>`
      );
    }
    // Total mix only when briefing has acomodación.
    if (hasPlan && mix.subtotal != null) {
      parts.push(
        `<p class="tce-detail tce-detail--subtotal"><span class="tce-detail-label">Subtotal acomodación:</span> <strong>${this.escape(this.formatPrice(rates?.currency || 'COP', mix.subtotal))}</strong></p>`
      );
    }
    return parts.join('');
  }

  private restoreHotelOccupancyRates(itemId: string): void {
    this.items = this.items.map((item) => {
      if (item.type !== 'hotel' || item.id !== itemId || !item.occupancyRates) return item;
      const restored = restoreOccupancyFromBaseline(item.occupancyRates as OccupancyTierRates);
      if (!restored) return { ...item, mayorValor: 0, redondeo: 0 };
      return { ...item, occupancyRates: restored, mayorValor: 0, redondeo: 0 };
    });
    void this.saveToStorage();
    this.render();
  }

  private restoreItemAdjustments(itemId: string): void {
    this.items = this.items.map((item) =>
      item.id === itemId ? { ...item, mayorValor: 0, redondeo: 0 } : item
    );
    void this.saveToStorage();
    this.render();
  }

  private itemShortLabel(item: CartItem): string {
    if (item.type === 'hotel') return item.hotelName;
    if (item.type === 'flight') return item.title || 'Vuelo';
    if (item.type === 'transfer') return item.name || 'Traslado';
    if (item.type === 'activity') return item.name || 'Actividad';
    if (item.type === 'tour') return item.name || 'Circuito';
    if (item.type === 'insurance') return item.name || 'Seguro';
    return 'Ítem';
  }

  private renderPackageRoundTotalRows(primaryCurrency: string): string[] {
    if (this.quoteMode !== 'wholesale') return [];
    const rows: string[] = [];
    const byId = new Map(
      this.items.filter((i): i is HotelCartItem => i.type === 'hotel').map((h) => [h.id, h])
    );
    if (byId.size === 0) return rows;
    const groups =
      this.hotelOptionGroups.length > 0
        ? this.hotelOptionGroups
        : [{ id: 'all', hotelIds: [...byId.keys()] }];
    const pax = Math.max(1, this.getTaPaxCount());
    const { linePrice, baseLinePrice } = this.wholesaleLinePriceFns();
    const multi = groups.filter((g) => g.hotelIds.some((id) => byId.has(id))).length > 1;
    groups.forEach((g, i) => {
      if (!this.shouldRoundPackage(g.id)) return;
      const hotels = g.hotelIds.map((id) => byId.get(id)).filter((h): h is HotelCartItem => !!h);
      if (hotels.length === 0) return;
      const sum = summarizeWholesaleOption(
        hotels,
        this.items,
        this.getFeesMayorRedondeoDisplay(),
        pax,
        this.tripGuide?.roomPlan,
        linePrice,
        this.getTaUnitDisplay(),
        baseLinePrice,
        {
          displayCurrency: this.displayCurrency,
          effTrm: this.getEffectiveTrm(),
          trmDia: this.trmDiaOpt(),
          roundCharmNine: true,
        }
      );
      const optSuffix = multi ? ` · Opción ${i + 1}` : '';
      for (const e of packageRoundUpliftEntries(sum.roundUplift)) {
        rows.push(`
        <div class="tce-total-row tce-total-row--sub">
          <span>Redondeo …9 ${this.escape(e.label)}${this.escape(optSuffix)}</span>
          <span>${this.escape(this.formatPrice(sum.currency || primaryCurrency, e.amount))}</span>
        </div>`);
      }
    });
    return rows;
  }

  private renderItemAdjTotalRows(primaryCurrency: string): string[] {
    const rows: string[] = [];
    for (const item of this.items) {
      const adj = this.getItemAdjustmentsDisplay(item);
      const label = this.itemShortLabel(item);
      if (adj.mayorValor > 0) {
        rows.push(`
        <div class="tce-total-row tce-total-row--sub">
          <span>Mayor valor · ${this.escape(label)}</span>
          <span>${this.escape(this.formatPrice(primaryCurrency, adj.mayorValor))}</span>
        </div>`);
      }
      if (adj.redondeo > 0) {
        rows.push(`
        <div class="tce-total-row tce-total-row--sub">
          <span>Redondeo · ${this.escape(label)}</span>
          <span>${this.escape(this.formatPrice(primaryCurrency, adj.redondeo))}</span>
        </div>`);
      }
      // Absorbed into occupancy rates (baseline → current).
      if (this.quoteMode !== 'wholesale' && item.type === 'hotel' && item.occupancyRates) {
        const rates = this.hotelRatesForDisplay(item);
        for (const u of occupancyTierUpliftFromBaseline(rates)) {
          if (!(u.uplift > 0)) continue;
          rows.push(`
          <div class="tce-total-row tce-total-row--sub">
            <span>Mayor/ajuste ${this.escape(u.label)} · ${this.escape(label)}</span>
            <span>${this.escape(this.formatPrice(u.currency || primaryCurrency, u.uplift))}</span>
          </div>`);
        }
      }
    }
    return rows;
  }

  /** Desglose de costos por servicio + acomodación (pp y total si hay plan). */
  private renderCostBreakdownRows(primaryCurrency: string): string[] {
    const rows: string[] = [];
    const hasPlan = hasAccommodationPlan(this.tripGuide || this.headerSearchContext());
    rows.push(`
      <div class="tce-total-row tce-total-row--head">
        <span>Desglose de costos</span>
        <span></span>
      </div>`);

    for (const item of this.items) {
      if (item.type === 'hotel') continue;
      const line = this.getItemLineTotal(item);
      const { pax, breakdown } = this.serviceBreakdownPax(item);
      const label = this.itemShortLabel(item);
      const detail =
        breakdown && pax > 0
          ? formatServiceItemTotal(line.currency, line.price, pax, true)
          : this.formatPrice(line.currency, line.price);
      rows.push(`
        <div class="tce-total-row tce-total-row--sub">
          <span>${this.escape(label)}</span>
          <span>${this.escape(detail.replace(/^Total ítem:\s*/, ''))}</span>
        </div>`);
    }

    const hotels = this.items.filter((i): i is HotelCartItem => i.type === 'hotel');
    for (const hotel of hotels) {
      const rates = this.hotelRatesForDisplay(hotel);
      if (!rates) continue;
      rows.push(`
        <div class="tce-total-row tce-total-row--sub tce-total-row--hotel">
          <span>🏨 ${this.escape(hotel.hotelName)}</span>
          <span></span>
        </div>`);
      const tiers = wholesaleTierWithOriginal(rates);
      for (const t of tiers) {
        rows.push(`
          <div class="tce-total-row tce-total-row--sub">
            <span>Tarifa pp ${this.escape(t.label)}</span>
            <span>${this.escape(this.formatPrice(t.currency, t.current))}</span>
          </div>`);
      }
      if (hasPlan) {
        const mix = accommodationMixBreakdown(this.tripGuide?.roomPlan, rates);
        for (const l of mix.lines) {
          rows.push(`
            <div class="tce-total-row tce-total-row--sub">
              <span>${this.escape(l.code)} x ${l.count}</span>
              <span>${this.escape(this.formatPrice(rates.currency || primaryCurrency, l.total))}</span>
            </div>`);
        }
        if (mix.subtotal != null) {
          rows.push(`
            <div class="tce-total-row tce-total-row--sub">
              <span>Subtotal acomodación · ${this.escape(hotel.hotelName)}</span>
              <span>${this.escape(this.formatPrice(rates.currency || primaryCurrency, mix.subtotal))}</span>
            </div>`);
        }
      }
    }
    return rows;
  }

  /** Apply mayor valor bump into one occupancy tier and clear the field via re-render. */
  private applyHotelTierMayorValor(
    itemId: string,
    tier: OccupancyTierCode,
    mayorDisplay: number
  ): void {
    if (!(mayorDisplay > 0)) return;
    const item = this.items.find((i) => i.id === itemId);
    if (!item || item.type !== 'hotel' || !item.occupancyRates) return;
    const next = applyMayorValorToOccupancyRates(
      item.occupancyRates as OccupancyTierRates,
      { [tier]: mayorDisplay },
      this.displayCurrency,
      this.getEffectiveTrm(),
      this.trmDiaOpt()
    );
    if (!next) return;
    this.items = this.items.map((i) =>
      i.id === itemId ? { ...i, occupancyRates: next, mayorValor: 0 } : i
    );
    this.syncAutoRoundOccupancy();
    void this.saveToStorage();
    this.render();
  }

  /** Legacy: bump all tiers from the single mayor field (non-wholesale / fallback). */
  private applyHotelMayorValorToRates(itemId: string): void {
    const item = this.items.find((i) => i.id === itemId);
    if (!item || item.type !== 'hotel' || !item.occupancyRates) return;
    const mayorDisplay = this.getItemAdjustmentsDisplay(item).mayorValor;
    if (!(mayorDisplay > 0)) return;
    const next = applyMayorValorToOccupancyRates(
      item.occupancyRates as OccupancyTierRates,
      mayorDisplay,
      this.displayCurrency,
      this.getEffectiveTrm(),
      this.trmDiaOpt()
    );
    if (!next) return;
    this.items = this.items.map((i) =>
      i.id === itemId ? { ...i, occupancyRates: next, mayorValor: 0 } : i
    );
    this.syncAutoRoundOccupancy();
    void this.saveToStorage();
    this.render();
  }

  private updateHotelOccupancyField(
    itemId: string,
    field: 'sglPp' | 'dblPp' | 'tplPp' | 'chd',
    value: number | undefined
  ): void {
    this.items = this.items.map((item) => {
      if (item.type !== 'hotel' || item.id !== itemId) return item;
      const base: OccupancyTierRates = ensureOccupancyBaseline({
        ...(item.occupancyRates || {
          currency: item.selectedRate.currency || 'COP',
        }),
      });
      if (value == null || !Number.isFinite(value)) {
        delete base[field];
      } else {
        base[field] = Math.round(value);
      }
      return { ...item, occupancyRates: base };
    });
    this.syncAutoRoundOccupancy();
    void this.saveToStorage();
  }

  private setHotelChildEqualsAdult(itemId: string, equals: boolean): void {
    this.items = this.items.map((item) => {
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
    this.syncAutoRoundOccupancy();
    void this.saveToStorage();
    this.render();
  }

  private toIsoDateInput(ddMmYyyy?: string): string {
    return toIsoDateInput(ddMmYyyy);
  }

  private listWholesaleWarnings(): QuoteWarning[] {
    if (this.quoteMode !== 'wholesale') return [];
    return quoteWholesaleWarnings(this.items, this.hotelOptionGroups, {
      roomPlan: this.tripGuide?.roomPlan,
      displayCurrency: this.displayCurrency,
      effTrm: this.getEffectiveTrm(),
      trmDia: this.trmDiaOpt(),
      occupancyTotalOpen: this.occupancyTotalOpen,
      autoRoundOccupancy: this.autoRoundOccupancy,
      tripCheckIn: this.tripGuide?.checkIn,
      tripCheckOut: this.tripGuide?.checkOut,
      tripAdults: this.tripGuide?.totalAdults,
      tripChildren: this.tripGuide?.totalChildren,
    });
  }

  private renderQuoteCoverageStrip(): string {
    const chips = quoteCoverageFromItems(this.items, {
      quoteMode: this.quoteMode,
      accommodationConfirmed: this.accommodationConfirmed,
      roomPlan: this.tripGuide?.roomPlan,
      totalAdults: this.tripGuide?.totalAdults,
      totalChildren: this.tripGuide?.totalChildren,
      childrenAges: this.tripGuide?.childrenAges,
    })
      .map((chip) => {
        const ok = quoteCoverageChipOk(chip);
        const text = quoteCoverageChipText(chip);
        const title =
          chip.kind === 'accommodation'
            ? ok
              ? 'Acomodación revisada'
              : 'Revisa o ajusta Acomodación (por defecto 2A en DBL)'
            : ok
              ? 'Incluido en la cotización'
              : 'Aún no agregado';
        return `<span class="tce-coverage-chip ${ok ? 'tce-coverage-chip--ok' : 'tce-coverage-chip--miss'}" title="${title}">${this.escape(text)}</span>`;
      })
      .join('');
    return `<div class="tce-coverage" aria-label="Cobertura de la cotización">${chips}</div>`;
  }

  private renderWarningsPanelBlock(): string {
    return renderWarningsPanelHtml(
      this.listWholesaleWarnings(),
      this.dismissedWarnings,
      (s) => this.escape(s),
      this.warningsPanelOpen,
      { prefix: 'tce-' }
    );
  }

  private renderTripBriefingBar(): string {
    const g = this.tripGuide;
    const wholesale = this.quoteMode === 'wholesale';
    const tripCtx = enrichSearchContextFromItems(this.tripGuide, this.items) || this.tripGuide;
    const nights =
      nightsFromTripDates(tripCtx?.checkIn, tripCtx?.checkOut) || tripCtx?.nights || 0;
    const missing = wholesale ? [] : briefingMissingFields(g);
    const incomplete = missing.length > 0;
    const todayIso = isoDateToday();
    // Prefer live field values across re-renders (storage echoes / BM sync)
    // so unsaved date edits are not snapped back to the guía.
    const live = (id: string, fallback: string): string => {
      const el = this.shadow.querySelector(`#${id}`) as HTMLInputElement | null;
      if (!el?.value) return fallback;
      if (el.value === fallback) return fallback;
      if (this.briefingNeedsSave()) return el.value;
      return fallback;
    };
    const destValue = live('tce-brief-dest', g?.destinationText || '');
    const inIso = live('tce-brief-in', this.toIsoDateInput(g?.checkIn));
    const outIso = live('tce-brief-out', this.toIsoDateInput(g?.checkOut));
    const originValue = live('tce-brief-origin', g?.originText || '');
    const outMin = inIso && inIso > todayIso ? inIso : todayIso;
    const needsSave = !wholesale && (incomplete || !g);
    const destHint =
      !wholesale && !incomplete && g && !g.destinationText?.trim()
        ? `<p class="tce-briefing-note tce-briefing-note--warn">Viaje guardado. Destino: escríbelo en <strong>Hoteles BM</strong> (fechas y pax se copian al Guardar). Luego busca o vuelve a Guardar viaje.</p>`
        : '';
    const activeWarns = activeQuoteWarnings(
      this.listWholesaleWarnings(),
      this.dismissedWarnings
    );
    if (activeWarns.length === 0) this.warningsPanelOpen = false;
    const warnBell = renderWarningsBellHtml(
      activeWarns.length,
      this.warningsPanelOpen,
      { prefix: 'tce-' }
    );
    const wholesaleDest =
      tripCtx?.destinationText?.trim() || g?.destinationText?.trim() || '';
    const wholesaleDestPinned = !!(g?.destinationPinned || tripCtx?.destinationPinned);
    const wholesaleOrigin =
      g?.originText?.trim() || tripCtx?.originText?.trim() || '';
    const wholesaleIn = tripCtx?.checkIn || g?.checkIn || '';
    const wholesaleOut = tripCtx?.checkOut || g?.checkOut || '';
    return `
      <div class="tce-briefing${incomplete ? ' tce-briefing--warn' : ''}">
        <div class="tce-briefing-row">
          <label class="tce-mode-toggle" title="Minorista: total÷pax · Mayorista: DBL/TPL/CHD por persona">
            Modo
            <select class="tce-quote-mode">
              <option value="wholesale" ${wholesale ? 'selected' : ''}>Mayorista</option>
              <option value="retail" ${!wholesale ? 'selected' : ''}>Minorista</option>
            </select>
            ${
              wholesale
                ? `<button type="button" class="tce-help-q" data-action="wholesale-help" title="Cómo llenar DBL / TPL / CHD">?</button>`
                : ''
            }
          </label>
          <div class="tce-briefing-row-actions">
            ${warnBell}
            <button type="button" class="tce-briefing-new" data-action="new-search"
              title="Limpia el formulario del viaje (aunque el carrito esté vacío)">Nueva búsqueda</button>
            ${
              wholesale
                ? `<button type="button" class="tce-briefing-save" data-action="save-briefing"
              title="Guarda el origen escrito (destino lo llena BM o el vuelo)">Guardar origen</button>`
                : `<button type="button" class="tce-briefing-save${needsSave ? ' tce-briefing-save--need' : ''}" data-action="save-briefing"
              title="Guarda origen/destino/fechas/pax del viaje real (editable sin nueva búsqueda)">Guardar viaje</button>`
            }
          </div>
        </div>
        ${
          wholesale
            ? `<div class="tce-briefing-grid">
            <label>Origen
              <input id="tce-brief-origin" list="tce-origin-cities" type="text" maxlength="80" placeholder="Vuelo, bloqueo o escribe"
                value="${this.escape(wholesaleOrigin)}" />
              ${originDatalistHtml(this.originCities, 'tce-origin-cities')}
            </label>
            <label class="tce-brief-dest-wrap">Destino
              <span class="tce-brief-dest-row">
                <input id="tce-brief-dest" list="tce-bm-dests" type="text" maxlength="80"
                  ${wholesaleDestPinned ? 'readonly' : ''}
                  placeholder="Ciudad BM o vuelo"
                  value="${this.escape(wholesaleDest)}"
                  title="${
                    wholesaleDestPinned
                      ? 'Destino fijado — no cambia con búsquedas BM'
                      : 'Se copia de Hoteles BM (ciudad) o de la búsqueda de vuelo/bloqueo'
                  }" />
                <button type="button" class="tce-dest-pin${wholesaleDestPinned ? ' tce-dest-pin--on' : ''}"
                  data-action="toggle-dest-pin"
                  title="${
                    wholesaleDestPinned
                      ? 'Destino fijado — clic para permitir cambios'
                      : 'Fijar destino — no lo cambien otras búsquedas'
                  }">${wholesaleDestPinned ? 'Fijado' : 'Fijar'}</button>
              </span>
              ${destDatalistHtml(this.bmDestinations, 'tce-bm-dests')}
            </label>
            <div class="tce-briefing-dates">
              <label>Ida
                <span class="tce-brief-readonly">${this.escape(wholesaleIn || '—')}</span>
              </label>
              <label>Regreso
                <span class="tce-brief-readonly">${this.escape(wholesaleOut || '—')}</span>
              </label>
              <label class="tce-briefing-nights-field">Noches
                <span id="tce-brief-nights" class="tce-brief-nights">${
                  nights > 0 ? String(nights) : '—'
                }</span>
              </label>
            </div>
          </div>`
            : `<div class="tce-briefing-grid">
          <label>Origen
            <input id="tce-brief-origin" list="tce-origin-cities" type="text" maxlength="80" placeholder="Elige o escribe"
              value="${this.escape(originValue)}" />
            ${originDatalistHtml(this.originCities, 'tce-origin-cities')}
          </label>
          <label class="tce-brief-dest-wrap">Destino
            <span class="tce-brief-dest-row">
              <input id="tce-brief-dest" list="tce-bm-dests" type="text" maxlength="80"
                ${g?.destinationPinned ? 'readonly' : ''}
                placeholder="Se copia de Hoteles BM"
                value="${this.escape(destValue)}"
                title="${
                  g?.destinationPinned
                    ? 'Destino fijado — no cambia con búsquedas BM'
                    : 'Déjalo vacío: en BM Hoteles escribe el destino. Guardar viaje llena fechas/pax y copia el nombre.'
                }" />
              <button type="button" class="tce-dest-pin${g?.destinationPinned ? ' tce-dest-pin--on' : ''}"
                data-action="toggle-dest-pin"
                title="${
                  g?.destinationPinned
                    ? 'Destino fijado — clic para permitir cambios'
                    : 'Fijar destino — no lo cambien otras búsquedas'
                }">${g?.destinationPinned ? 'Fijado' : 'Fijar'}</button>
            </span>
            ${destDatalistHtml(this.bmDestinations, 'tce-bm-dests')}
          </label>
          <div class="tce-briefing-dates">
            <label>Ida *
              <input id="tce-brief-in" class="tce-brief-date" type="date" required min="${todayIso}"
                value="${this.escape(inIso)}" />
            </label>
            <label>Regreso *
              <input id="tce-brief-out" class="tce-brief-date" type="date" required min="${outMin}"
                value="${this.escape(outIso)}" />
            </label>
            <label class="tce-briefing-nights-field">Noches
              <span id="tce-brief-nights" class="tce-brief-nights">${
                nights > 0 ? String(nights) : '—'
              }</span>
            </label>
          </div>
          <div class="tce-room-plan-wrap" style="grid-column:1/-1">
            ${this.roomPlanWrapHtml(
              roomsFromBriefing(
                g?.roomPlan,
                g?.totalAdults ?? 2,
                g?.totalChildren ?? 0,
                g?.childrenAges
              )
            )}
          </div>
        </div>
        ${
          incomplete
            ? `<p class="tce-briefing-note tce-briefing-note--warn">Completa y Guardar viaje (faltan: ${this.escape(missing.join(', '))}).</p>`
            : destHint
        }`
        }
      </div>
      ${this.renderWarningsPanelBlock()}`;
  }

  private roomPlanWrapHtml(rooms: BriefingRoom[]): string {
    return `
      <span style="font-size:10px;color:#64748b;font-weight:700">Quién viaja (acomodación del cliente)</span>
      ${
        this.quoteMode === 'wholesale'
          ? `<p class="tce-room-hint">Mix del cliente, no las hab. de tarifa en BM. SGL/DBL/TPL/CHD de cotización se buscan después.</p>`
          : ''
      }
      ${roomPlanHtml(rooms, { compact: true })}`;
  }

  private renderHotelItem(item: HotelCartItem): string {
    const rate = item.selectedRate;
    const stars = item.stars ? `<span class="tce-stars">${'★'.repeat(item.stars)}</span>` : '';
    const img = item.imageUrl
      ? `<img class="tce-item-img" src="${this.escape(item.imageUrl)}" alt="">`
      : `<div class="tce-item-img tce-item-img--placeholder">🏨</div>`;

    const roomLabel = displayHotelRoomType(rate.roomType);
    const boardLabel = displayHotelBoardBasis(rate.boardBasis);
    const roomBoardMeta = [roomLabel, boardLabel].filter(Boolean).join(' · ');
    const displayRates = this.hotelRatesForDisplay(item);
    const personValues = formatWholesalePersonValues(displayRates);
    const wholesaleBreakdown = this.renderHotelWholesaleBreakdown(item);
    const detailsHtml = `
      <div class="tce-item-top">
        ${img}
        <div>
          <p class="tce-item-name">${this.escape(item.hotelName)} ${stars}</p>
          ${item.address ? `<p class="tce-item-address">${this.escape(item.address)}</p>` : ''}
        </div>
      </div>
      <div class="tce-dates">
        <strong>${this.escape(item.checkIn)}</strong> → <strong>${this.escape(item.checkOut)}</strong>
        &nbsp;·&nbsp; ${item.nights} noche${item.nights !== 1 ? 's' : ''}
      </div>
      ${
        this.quoteMode === 'wholesale'
          ? wholesaleBreakdown
          : item.occupancy.length > 1
            ? item.occupancy
                .map(
                  (room, i) =>
                    `<p class="tce-detail"><span class="tce-detail-label">Hab ${i + 1}:</span> ${this.escape(this.formatRoomOccupancy(room, i).replace(/^Hab \d+:\s*/, ''))}</p>`
                )
                .join('')
            : `<p class="tce-detail"><span class="tce-detail-label">Ocupación:</span> ${this.escape(this.formatOccupancy(item))}</p>`
      }
      ${
        roomLabel
          ? `<p class="tce-detail"><span class="tce-detail-label">Habitación:</span> ${this.escape(roomLabel)}</p>`
          : ''
      }
      ${boardLabel ? `<p class="tce-detail"><span class="tce-detail-label">Régimen:</span> ${this.escape(boardLabel)}</p>` : ''}
      ${this.renderHotelOccupancyRates(item)}
      <div class="tce-item-footer">
        <div>
          <div class="tce-supplier">${this.escape(rate.supplierName)}</div>
        </div>
      </div>
    `;

    return this.renderItemCard({
      item,
      typeLabel: 'Hotel',
      title: item.hotelName,
      meta:
        this.quoteMode === 'wholesale' && personValues.length > 0
          ? [roomBoardMeta, `${item.checkIn} → ${item.checkOut}`, personValues.join(' · ')]
              .filter(Boolean)
              .join(' · ')
          : [roomBoardMeta, `${item.checkIn} → ${item.checkOut} · ${item.nights} noche${item.nights !== 1 ? 's' : ''}`]
              .filter(Boolean)
              .join(' · '),
      summaryExtraHtml: this.renderHotelOptionChips(item.id),
      headActionsHtml: this.renderSearchTransferButton(item.id),
      detailsHtml,
    });
  }

  private renderTransferItem(item: TransferCartItem): string {
    const img = item.imageUrl
      ? `<img class="tce-item-img" src="${this.escape(item.imageUrl)}" alt="">`
      : `<div class="tce-item-img tce-item-img--placeholder">🚐</div>`;

    const tripLabel = item.tripType === 'roundTrip' ? 'Ida y vuelta' : 'Solo ida';
    const legsHtml = item.legs.map((leg) => `
      <p class="tce-detail">
        <span class="tce-detail-label">${leg.direction === 'in' ? 'Ida' : 'Vuelta'}:</span>
        ${this.escape(leg.date)} ${this.escape(leg.time)}
        ${leg.status ? ` · ${this.escape(leg.status)}` : ''}
      </p>
    `).join('');

    const priceLabel = this.formatPrice(item.currency, item.price);
    const detailsHtml = `
      <div class="tce-item-top">
        ${img}
        <div>
          <p class="tce-item-name">${this.escape(item.name)}</p>
          ${item.vehicleDescription ? `<p class="tce-item-address">${this.escape(item.vehicleDescription)}</p>` : ''}
          ${item.transferType ? `<p class="tce-item-address">${this.escape(item.transferType)}</p>` : ''}
        </div>
      </div>
      <div class="tce-dates">
        <strong>${this.escape(item.from)}</strong> → <strong>${this.escape(item.to)}</strong>
        &nbsp;·&nbsp; ${this.escape(tripLabel)}
        &nbsp;·&nbsp; ${item.adults} adulto${item.adults !== 1 ? 's' : ''}
        ${item.children > 0 ? `, ${item.children} niño${item.children !== 1 ? 's' : ''}` : ''}
      </div>
      ${legsHtml}
      <div class="tce-item-footer">
        <div>
          <div class="tce-price">${this.escape(priceLabel)}</div>
          <div class="tce-supplier">${this.escape(item.supplierName)}</div>
        </div>
      </div>
    `;

    const hotelBit = item.linkedHotelName ? `${item.linkedHotelName} · ` : '';
    return this.renderItemCard({
      item,
      typeLabel: item.linkedHotelName ? `Traslado · ${item.linkedHotelName}` : 'Traslado',
      title: `${hotelBit}${item.name}`,
      meta: `${item.from} → ${item.to} · ${tripLabel}`,
      extraClass: item.linkedHotelId ? 'tce-kit-transfer' : '',
      detailsHtml,
    });
  }

  private renderActivityItem(item: ActivityCartItem): string {
    const img = item.imageUrl
      ? `<img class="tce-item-img" src="${this.escape(item.imageUrl)}" alt="">`
      : `<div class="tce-item-img tce-item-img--placeholder">🎟️</div>`;
    const priceLabel = this.formatPrice(item.currency, item.price);
    const usdLine =
      item.priceUsd && this.getEffectiveTrm() > 0
        ? `<div class="tce-supplier">USD ${item.priceUsd.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · TRM ${formatTrmRate(this.getEffectiveTrm())} (día+sup.)</div>`
        : item.priceUsd
          ? `<div class="tce-supplier">USD ${item.priceUsd.toLocaleString('es-CO')}</div>`
          : '';
    const detailsHtml = `
      <div class="tce-item-top">
        ${img}
        <div>
          <p class="tce-item-name">${this.escape(item.name)}</p>
          ${item.description ? `<p class="tce-item-address">${this.escape(item.description)}</p>` : ''}
        </div>
      </div>
      <div class="tce-dates">
        ${item.checkIn ? `<strong>${this.escape(item.checkIn)}</strong>` : ''}
        ${item.checkOut ? ` → <strong>${this.escape(item.checkOut)}</strong>` : ''}
        &nbsp;·&nbsp; ${item.adults} adulto${item.adults !== 1 ? 's' : ''}
        ${item.children > 0 ? `, ${item.children} niño${item.children !== 1 ? 's' : ''}` : ''}
      </div>
      <div class="tce-item-footer">
        <div>
          <div class="tce-price">${this.escape(priceLabel)}</div>
          ${
            item.pricePerPerson != null &&
            item.adults + item.children > 1
              ? `<div class="tce-supplier">${this.escape(
                  this.formatPrice(item.currency, item.pricePerPerson)
                )}/persona</div>`
              : ''
          }
          <div class="tce-supplier">${this.escape(item.supplierName)}</div>
          ${usdLine}
        </div>
      </div>
    `;
    return this.renderItemCard({
      item,
      typeLabel: 'Actividad',
      title: item.name,
      meta: [item.checkIn, item.supplierName].filter(Boolean).join(' · '),
      detailsHtml,
    });
  }

  private renderTourItem(item: TourCartItem): string {
    const kind = item.isBloqueo ? 'Bloqueo' : item.isCombinado ? 'Combinado' : 'Circuito';
    const img = `<div class="tce-item-img tce-item-img--placeholder">${
      item.isBloqueo ? '🔒' : item.isCombinado ? '🏨' : '🗺️'
    }</div>`;
    const route =
      item.originCity && item.destinationCity
        ? `${item.originCity} → ${item.destinationCity}`
        : item.destinationCity || item.originCity || '';
    const dateLabel = item.departureLabel || item.departureDate;
    const dateRange =
      item.returnDate && item.returnDate !== item.departureDate
        ? `${item.departureDate} → ${item.returnDate}`
        : item.departureDate;
    const ppLabel = this.formatPrice(item.currency, item.pricePerPerson);
    const totalLabel = this.formatPrice(item.currency, item.price);
    const paxBits: string[] = [];
    if (item.payingPax > 0) paxBits.push(`${item.payingPax} paga${item.payingPax !== 1 ? 'n' : ''}`);
    if (item.infants > 0) paxBits.push(`${item.infants} infante${item.infants !== 1 ? 's' : ''} (gratis)`);

    const rates = item.isBloqueo ? undefined : item.occupancyRates;
    const rateBits: string[] = [];
    if (rates) {
      const fmt = (n?: number) =>
        n != null && n > 0 ? this.formatPrice(rates.currency || item.currency, n) : '';
      if (rates.sgl) rateBits.push(`SGL ${fmt(rates.sgl)}`);
      if (rates.dbl) rateBits.push(`DBL ${fmt(rates.dbl)}`);
      if (rates.tpl) rateBits.push(`TPL ${fmt(rates.tpl)}`);
      if (rates.qdp) rateBits.push(`QDP ${fmt(rates.qdp)}`);
    }
    const ratesLine = rateBits.length
      ? `<div class="tce-supplier">$/pers.: ${this.escape(rateBits.join(' · '))}</div>`
      : '';
    const bloqueoHint = item.isBloqueo
      ? `<div class="tce-supplier">${this.escape(ppLabel)}/pers. (se suma a acomodaciones; no va en WA/PDF)${
          item.baggageNote ? ` · Incluye ${this.escape(item.baggageNote)}` : ''
        }</div>`
      : '';

    const detailsHtml = `
      <div class="tce-item-top">
        ${img}
        <div>
          <p class="tce-item-name">${this.escape(item.name)}</p>
          ${route ? `<p class="tce-item-address">${this.escape(route)}</p>` : ''}
          ${item.roomsSummary ? `<p class="tce-item-address">${this.escape(item.roomsSummary)}</p>` : ''}
        </div>
      </div>
      <div class="tce-dates">
        <strong>${this.escape(dateLabel)}</strong>
        ${item.days ? ` · ${item.days} día${item.days !== 1 ? 's' : ''}` : ''}
        ${item.nights != null ? ` · ${item.nights} noche${item.nights !== 1 ? 's' : ''}` : ''}
        ${paxBits.length ? ` · ${this.escape(paxBits.join(', '))}` : ''}
      </div>
      <div class="tce-item-footer">
        <div>
          <div class="tce-price">${this.escape(ppLabel)} <span style="font-weight:500;font-size:12px;opacity:.8">/ persona${
            rates?.dbl ? ' (DBL)' : ''
          }</span></div>
          <div class="tce-supplier">Total ${this.escape(totalLabel)}${
            item.priceEstimated ? ' · estimado' : ''
          }${item.category ? ` · ${this.escape(item.category)}` : ''}</div>
          ${bloqueoHint}
          ${ratesLine}
        </div>
      </div>
    `;
    return this.renderItemCard({
      item,
      typeLabel: kind,
      title: item.name,
      meta: [route || dateRange, ppLabel + '/pers.'].filter(Boolean).join(' · '),
      detailsHtml,
    });
  }

  private renderInsuranceItem(item: InsuranceCartItem): string {
    const img = item.imageUrl
      ? `<img class="tce-item-img" src="${this.escape(item.imageUrl)}" alt="">`
      : `<div class="tce-item-img tce-item-img--placeholder">🛡️</div>`;
    const priceLabel = this.formatPrice(item.currency, item.price);
    const detailsHtml = `
      <div class="tce-item-top">
        ${img}
        <div>
          <p class="tce-item-name">${this.escape(item.name)}</p>
          ${item.planLabel ? `<p class="tce-item-address">${this.escape(item.planLabel)}</p>` : ''}
          ${
            item.summaryLines?.length
              ? `<p class="tce-item-address">${this.escape(item.summaryLines.slice(0, 3).join(' · '))}</p>`
              : ''
          }
        </div>
      </div>
      <div class="tce-dates">
        ${item.checkIn ? `<strong>${this.escape(item.checkIn)}</strong>` : ''}
        ${item.checkOut ? ` → <strong>${this.escape(item.checkOut)}</strong>` : ''}
        &nbsp;·&nbsp; ${item.passengers} pasajero${item.passengers !== 1 ? 's' : ''}
      </div>
      <div class="tce-item-footer">
        <div>
          <div class="tce-price">${this.escape(priceLabel)}</div>
          <div class="tce-supplier">${this.escape(item.supplierName)}</div>
        </div>
      </div>
    `;
    return this.renderItemCard({
      item,
      typeLabel: 'Seguro',
      title: item.name,
      meta: [item.planLabel, item.checkIn].filter(Boolean).join(' · '),
      detailsHtml,
    });
  }

  private renderSearchTransferButton(hotelCartId: string): string {
    return `<button type="button" class="tce-search-transfer" data-action="search-hotel-transfer"
      data-id="${this.escape(hotelCartId)}" title="Abre Traslados en BookingMotor con este hotel en Hasta">🚐 Traslado</button>`;
  }

  private async searchTransferForHotel(hotelCartId: string): Promise<void> {
    const hotel = this.items.find(
      (i): i is HotelCartItem => i.type === 'hotel' && i.id === hotelCartId
    );
    if (!hotel) return;
    const guidePax =
      this.tripGuide && (this.tripGuide.totalAdults > 0 || this.tripGuide.totalChildren > 0)
        ? {
            totalAdults: this.tripGuide.totalAdults,
            totalChildren: this.tripGuide.totalChildren,
            childrenAges: this.tripGuide.childrenAges || [],
          }
        : undefined;
    await startHotelTransferSearch(pendingFromHotel(hotel, guidePax));
    await openBookingMotorTransferSearch();
  }

  private renderCartItems(): string {
    return groupCartItemsForDisplay(this.items)
      .map((group) => {
        if (group.kind === 'item') return this.renderItem(group.item);
        const transfersHtml = group.transfers.map((t) => this.renderItem(t)).join('');
        return `<div class="tce-kit">
          <p class="tce-kit-label">Kit · ${this.escape(group.hotel.hotelName)}</p>
          ${this.renderItem(group.hotel)}
          ${transfersHtml}
        </div>`;
      })
      .join('');
  }

  private escape(text: string): string {
    const el = document.createElement('span');
    el.textContent = text;
    return el.innerHTML;
  }

  private render(): void {
    const prevBody = this.shadow.querySelector('.tce-body') as HTMLElement | null;
    const savedScroll = prevBody?.scrollTop ?? 0;

    const existing = this.shadow.querySelector('.tce-root');
    if (existing) existing.remove();

    const root = document.createElement('div');
    root.className = 'tce-root';

    const itemsHtml = this.items.length === 0
      ? `<div class="tce-empty">
           <div class="tce-empty-icon">🛒</div>
           <p>Tu carrito está vacío.<br>${
             this.tripGuide
               ? 'El formulario aún tiene un viaje guardado. Pulsa <strong>Nueva búsqueda</strong> para empezar de cero.'
               : 'Agrega hoteles, traslados, actividades, seguros o vuelos con <strong>+ 🛒 GT</strong>.'
           }</p>
         </div>`
      : this.renderCartItems();

    const tab = (
      id: 'items' | 'total' | 'accommodation' | 'whatsapp' | 'history',
      label: string
    ) => `
      <button type="button"
        class="tce-panel-tab ${this.panelTab === id ? 'tce-panel-tab--active' : ''}"
        data-action="panel-tab"
        data-tab="${id}">
        ${label}
      </button>`;

    let bodyHtml = '';
    if (this.panelTab === 'history') {
      bodyHtml = this.renderHistorySection();
    } else if (this.items.length === 0) {
      bodyHtml = itemsHtml;
    } else if (this.panelTab === 'items') {
      const showNewOpt = this.hotelsAsOptions || this.quoteMode === 'wholesale';
      const newOptBar = showNewOpt
        ? `<div class="tce-products-toolbar">
            <button type="button" class="tce-add-option-btn" data-action="add-hotel-option">+ Nueva opción</button>
          </div>`
        : '';
      bodyHtml = `
        ${newOptBar}
        ${itemsHtml}
        <div class="tce-footer tce-footer--scroll" style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0">
          ${
            this.hotelsAsOptions
              ? this.renderHotelCompareBlock({ compact: true })
              : this.renderSimpleTotalsCompact()
          }
          <button class="tce-clear" data-action="clear">Vaciar carrito</button>
        </div>`;
    } else if (this.panelTab === 'total') {
      bodyHtml = `
        <div class="tce-footer tce-footer--scroll">
          <div class="tce-fees">${this.renderFees()}</div>
          <div class="tce-totals">${this.renderTotals()}</div>
        </div>`;
    } else if (this.panelTab === 'accommodation') {
      bodyHtml = `<div class="tce-footer tce-footer--scroll">${this.renderAccommodationTab()}</div>`;
    } else {
      bodyHtml = `<div class="tce-quote">${this.renderQuoteSection()}</div>`;
    }

    const compareWide = this.hotelsAsOptions && this.hotelOptionGroups.length > 0;
    const roomyEmpty = this.items.length === 0;
    const wideClass = ` tce-panel--wide${roomyEmpty ? ' tce-panel--roomy' : ''}${compareWide ? ' tce-panel--compare' : ''}`;
    const tabWideClass = ` tce-tab--wide${compareWide ? ' tce-tab--compare' : ''}${roomyEmpty ? ' tce-tab--roomy' : ''}`;
    const trmValue = trmInputValue(this.trmRate);
    const effTrm = this.getEffectiveTrm();
    const trmEffHint =
      this.trmRate > 0
        ? `${formatTrmRate(effTrm)} (+${Math.round(this.trmSuplemento).toLocaleString('es-CO')})`
        : '';

    const ctx = this.headerSearchContext();
    const routeSummary =
      (ctx && this.formatSearchSummary(ctx)) ||
      (this.resolveOriginLabel() ? this.escape(this.resolveOriginLabel()!) : '');
    const routeLabel = this.tripGuide ? 'Guía' : routeSummary ? 'Ruta' : '';

    root.innerHTML = `
      <button type="button" class="tce-tab ${this.isOpen ? 'tce-tab--open' : ''}${tabWideClass}" data-action="toggle"
        style="top:${this.tabTopPct}%" title="Arrastra arriba/abajo · clic para abrir">
        🛒 Asistente
        ${this.items.length > 0 ? `<span class="tce-badge">${this.items.length}</span>` : ''}
      </button>
      <div class="tce-panel ${this.isOpen ? 'tce-panel--open' : ''}${wideClass}">
        <div class="tce-header">
          <div class="tce-header-top">
            <div class="tce-header-title">
              <h2>Asistente de cotización</h2>
              <span class="tce-header-meta">${this.items.length} item${this.items.length !== 1 ? 's' : ''}${this.advisorName ? ` · ${this.escape(this.advisorName)}` : ''}</span>
            </div>
            <div class="tce-header-actions">
              <button type="button" class="tce-open-panel" data-action="open-asistente"
                title="Abrir panel en otra pestaña">↗</button>
              <button class="tce-close" data-action="toggle" title="Cerrar">✕</button>
            </div>
          </div>
          <div class="tce-header-fields">
            <div class="tce-header-client">
              <label for="tce-client-input">Contacto</label>
              <div class="tce-contact-wrap">
                <input
                  id="tce-client-input"
                  class="tce-client-input"
                  type="text"
                  maxlength="120"
                  placeholder="Nombre…"
                  autocomplete="off"
                  value="${this.escape(this.clientName)}"
                />
                <input
                  id="tce-contact-phone"
                  class="tce-contact-phone-input"
                  type="tel"
                  maxlength="40"
                  placeholder="Teléfono…"
                  autocomplete="off"
                  value="${this.escape(this.selectedContactPhone)}"
                />
                <div class="tce-contact-dd">${this.contactDropdownHtml()}</div>
              </div>
            </div>
            <div class="tce-header-agency">
              <label for="tce-agency-input">Agencia</label>
              <input
                id="tce-agency-input"
                class="tce-agency-input"
                type="text"
                maxlength="120"
                placeholder="Nombre en el PDF"
                value="${this.escape(this.agencyName)}"
              />
              <input
                id="tce-email-input"
                class="tce-email-input"
                type="email"
                maxlength="160"
                placeholder="Email…"
                autocomplete="off"
                value="${this.escape(this.clientEmail)}"
              />
            </div>
            <div class="tce-header-opp">
              <label for="tce-opp-select">Oportunidad</label>
              <select id="tce-opp-select" class="tce-opp-select" title="Vincular esta cotización a una oportunidad de venta">
                <option value="">Sin vincular</option>
                ${this.opportunityHits
                  .map((o) => {
                    const seq = o.sequence_number != null ? `#${o.sequence_number}` : '';
                    const stage = (o.stage_name || o.stage_code || '').trim();
                    const car = o.numero_car_ref ? ` · ${o.numero_car_ref}` : '';
                    const label = `${seq} ${o.contact_name || ''} · ${stage}${car}`.replace(/\s+/g, ' ').trim();
                    const sel = this.linkedOpportunity?.id === o.id ? 'selected' : '';
                    return `<option value="${this.escape(o.id)}" ${sel}>${this.escape(label || o.id.slice(0, 8))}</option>`;
                  })
                  .join('')}
              </select>
              ${
                this.linkedOpportunity &&
                !this.opportunityHits.some((o) => o.id === this.linkedOpportunity!.id)
                  ? `<span class="tce-header-meta" style="opacity:.9">Vinculada ${
                      this.linkedOpportunity.sequence_number != null
                        ? `#${this.linkedOpportunity.sequence_number}`
                        : this.linkedOpportunity.id.slice(0, 8)
                    }</span>`
                  : this.selectedContactPhone.trim().length >= 7 && this.opportunityHits.length === 0
                    ? `<span class="tce-header-meta" style="opacity:.75">Sin oportunidades para este teléfono</span>`
                    : ''
              }
            </div>
            <label class="tce-hotel-options-toggle" title="Comparar cada opción de hotel con su propio total">
              <input type="checkbox" class="tce-hotels-as-options" ${this.hotelsAsOptions ? 'checked' : ''}>
              Comparar
            </label>
          </div>
        </div>
        <div class="tce-meta-bar">
          <div class="tce-meta-route${this.tripGuide ? ' tce-meta-route--guide' : ''}" title="${routeSummary}">
            ${
              routeSummary
                ? `${routeLabel ? `<span class="tce-meta-route-label">${routeLabel}</span>` : ''}${routeSummary}`
                : '<span class="tce-meta-route-label">Sin ruta</span> Agrega un vuelo u hotel'
            }
          </div>
          <div class="tce-trm-bar">
            <label for="tce-trm-input">TRM</label>
            <input id="tce-trm-input" class="tce-trm-input" type="number" min="0" step="0.01"
              value="${trmValue}" placeholder="COP" title="TRM del día (${TRM_SOURCES[this.trmSource].label})" />
            <label for="tce-trm-sup" class="tce-trm-sup-label" title="Pesos que se suman a la TRM del día">+</label>
            <input id="tce-trm-sup" class="tce-trm-input tce-trm-sup-input" type="number" min="0" step="10"
              value="${Math.round(this.trmSuplemento)}" placeholder="sup"
              title="Suplemento TRM (COP) — se suma a la TRM del día" />
            <button type="button" class="tce-trm-refresh" data-action="refresh-trm"
              title="Actualizar TRM desde ${TRM_SOURCES[this.trmSource].label}">web</button>
            <div class="tce-currency-toggle" title="Unificar precios en una moneda">
              <button type="button" class="tce-currency-btn ${this.displayCurrency === 'COP' ? 'tce-currency-btn--active' : ''}"
                data-action="display-currency" data-currency="COP">COP</button>
              <button type="button" class="tce-currency-btn ${this.displayCurrency === 'USD' ? 'tce-currency-btn--active' : ''}"
                data-action="display-currency" data-currency="USD"
                ${this.canUseDisplayCurrency('USD') ? '' : 'disabled title="Necesitas TRM para ver todo en USD"'}
              >USD</button>
            </div>
            ${
              trmEffHint
                ? `<span class="tce-trm-hint" title="TRM usada = día + suplemento · ${getTrmReferencePage(this.trmSource)}">${trmEffHint}</span>`
                : ''
            }
          </div>
        </div>
        ${this.renderQuoteCoverageStrip()}
        ${this.renderTripBriefingBar()}
        <nav class="tce-panel-tabs" role="tablist">
          ${
            this.quoteMode === 'wholesale'
              ? tab('accommodation', '🛏️ Acomodación')
              : ''
          }
          ${tab('items', '🛒 Productos')}
          ${this.items.length > 0 ? tab('total', '💰 Total') : ''}
          ${this.items.length > 0 ? tab('whatsapp', '💬 WhatsApp') : ''}
          ${tab('history', '🕘 Historial')}
        </nav>
        <div class="tce-body">${bodyHtml}</div>
      </div>
    `;

    this.shadow.appendChild(root);
    this.bindEvents(root);
    this.refreshBriefingSaveButton();
    const newBody = this.shadow.querySelector('.tce-body') as HTMLElement | null;
    if (newBody && savedScroll > 0) newBody.scrollTop = savedScroll;
    if (this.panelTab === 'whatsapp' && this.items.length > 0) {
      this.showQuotePreview();
    }
  }

  private renderHistorySection(): string {
    const toolbar = `
      <div class="tce-history-toolbar">
        <button type="button" class="tce-history-tool" data-action="export-history" title="Descargar respaldo JSON del historial">Exportar historial</button>
        <button type="button" class="tce-history-tool" data-action="import-history" title="Fusionar cotizaciones desde un JSON">Importar historial…</button>
        <button type="button" class="tce-history-tool" data-action="refresh-remote-quotes" title="Recargar cotizaciones del servidor">Servidor</button>
        <input type="file" class="tce-history-import-file" accept="application/json,.json" hidden />
      </div>
      <p class="tce-history-hint">
        <span class="tce-api-pill${this.carApiReady ? ' tce-api-pill--ok' : ''}">${this.carApiReady ? 'API conectada' : 'API sin token'}</span>
        Chrome borra el historial local si <strong>quitas</strong> la extensión. El servidor guarda en tablas <code>car_*</code> (popup → Config → token).
      </p>`;
    const remote = this.renderRemoteQuotesSection();
    if (this.history.length === 0) {
      return `${toolbar}${remote}<div class="tce-empty"><p>Aún no hay historial local.<br>Se guarda al copiar WhatsApp, PDF o vaciar el carrito.</p></div>`;
    }
    return `${toolbar}${remote}<h3 class="tce-remote-history" style="margin-top:12px">Historial local</h3>${this.history.map((h) => this.renderHistoryEntry(h)).join('')}`;
  }

  private renderRemoteQuotesSection(): string {
    if (!this.remoteQuotesLoaded && this.carApiReady) {
      return `<div class="tce-remote-history"><h3>Servidor (car_cotizacion)</h3><p class="tce-history-hint">Cargando…</p></div>`;
    }
    if (!this.carApiReady) {
      return `<div class="tce-remote-history"><h3>Servidor (car_cotizacion)</h3><p class="tce-history-hint">Sin conexión API: el historial local sigue disponible. Configura URL + token en el popup (Config → Carrito API) para listar y cargar del servidor.</p></div>`;
    }
    if (this.remoteQuotes.length === 0) {
      return `<div class="tce-remote-history"><h3>Servidor (car_cotizacion)</h3><p class="tce-history-hint">Aún no hay cotizaciones en la base. Se crean al copiar WhatsApp / PDF / Chat Center / vaciar.</p></div>`;
    }
    const rows = this.remoteQuotes
      .map((q) => {
        const when = q.created_at ? new Date(q.created_at).toLocaleString('es-CO') : '';
        const localMap = this.history.find((h) => h.serverId === q.id);
        const localHint = localMap
          ? localMap.quoteNumber !== q.numero_car
            ? ` · local ${formatQuoteRef(localMap.quoteNumber)}`
            : ''
          : '';
        return `<div class="tce-remote-row">
          <div class="tce-remote-row-main">
            <span class="tce-remote-ref">${this.escape(q.numero_car_ref)}</span>
            <span class="tce-remote-db" title="Id en car_cotizacion">db#${q.id}</span>
            <span>${this.escape(q.contacto_nombre || '—')}</span>
            <span class="tce-remote-meta">${this.escape(q.asesor_nombre || '')}</span>
            <span class="tce-remote-meta">${this.escape(q.agencia_nombre || '')}</span>
            <span class="tce-remote-meta">${this.escape(when)}${this.escape(localHint)}</span>
          </div>
          <button type="button" class="tce-remote-load" data-action="load-remote-quote"
            data-server-id="${q.id}" title="Traer al carrito desde el servidor">
            Cargar
          </button>
        </div>`;
      })
      .join('');
    return `<div class="tce-remote-history">
      <h3>Servidor (car_cotizacion) · ${this.remoteQuotes.length}</h3>
      <p class="tce-history-hint">Claves: <strong>CAR###</strong> en BD + <strong>db#id</strong>. Si el CAR local ya existe, se asigna otro número local sin pisar.</p>
      ${rows}
    </div>`;
  }

  private historyItemLineTotal(
    item: CartItem,
    trm?: number,
    targetCurrency: string = 'COP'
  ): { currency: string; price: number } {
    let { currency, price } = this.getItemPrice(item);
    const rate = trm && trm > 0 ? trm : 0;
    const target = (targetCurrency || 'COP').toUpperCase();
    const from = (currency || 'COP').toUpperCase();
    if (from !== target && rate > 0) {
      if (from === 'USD' && target === 'COP') {
        price = usdToCop(price, rate);
        currency = 'COP';
      } else if (from === 'COP' && target === 'USD') {
        price = copToUsd(price, rate);
        currency = 'USD';
      }
    }
    const adj = this.getItemAdjustments(item);
    let mayor = adj.mayorValor;
    let redondeo = adj.redondeo;
    // Item adj stored as COP; convert if history total is USD.
    if (target === 'USD' && rate > 0) {
      mayor = copToUsd(mayor, rate);
      redondeo = copToUsd(redondeo, rate);
    }
    return {
      currency: target === 'USD' || target === 'COP' ? target : currency,
      price: price + mayor + redondeo,
    };
  }

  private formatHistoryPax(h: HistoryEntry): string {
    const ctx = h.searchContext;
    let adults = 0;
    let children = 0;
    let infants = 0;

    // Prefer sticky briefing / saved search (not BM probe occupancy).
    if (ctx && ctx.totalAdults + ctx.totalChildren > 0) {
      adults = ctx.totalAdults;
      children = ctx.totalChildren;
    } else {
      const flight = h.items.find((i): i is FlightCartItem => i.type === 'flight');
      if (flight && flight.adults + flight.children + flight.infants > 0) {
        adults = flight.adults;
        children = flight.children;
        infants = flight.infants;
      } else {
        const hotel = h.items.find((i): i is HotelCartItem => i.type === 'hotel');
        if (hotel) {
          adults = hotel.occupancy.reduce((s, o) => s + o.adults, 0);
          children = hotel.occupancy.reduce((s, o) => s + o.children, 0);
        }
      }
    }

    const parts: string[] = [];
    if (adults > 0) parts.push(`${adults} adulto${adults !== 1 ? 's' : ''}`);
    if (children > 0) parts.push(`${children} niño${children !== 1 ? 's' : ''}`);
    if (infants > 0) parts.push(`${infants} bebé${infants !== 1 ? 's' : ''}`);
    return parts.join(', ');
  }

  private formatHistoryOrigin(h: HistoryEntry): string | null {
    const fromCtx = h.searchContext?.originText?.trim();
    if (fromCtx) return fromCtx;
    const flight = h.items.find((i): i is FlightCartItem => i.type === 'flight');
    if (flight) {
      const o = (flight.origin.name || flight.origin.code || '').trim();
      if (o) return o;
    }
    return null;
  }

  private formatHistoryDates(h: HistoryEntry): string | null {
    const ctx = h.searchContext;
    const hotel = h.items.find((i): i is HotelCartItem => i.type === 'hotel');
    const flight = h.items.find((i): i is FlightCartItem => i.type === 'flight');

    // Prefer briefing / saved search context over probe hotel rows.
    let checkIn = ctx?.checkIn || hotel?.checkIn;
    let checkOut = ctx?.checkOut || hotel?.checkOut;
    let nights = ctx?.nights || hotel?.nights;

    if ((!checkIn || !checkOut) && flight) {
      const toLabel = (iso?: string) => {
        if (!iso) return undefined;
        const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;
        return iso;
      };
      checkIn = checkIn || toLabel(flight.departureDate);
      checkOut = checkOut || toLabel(flight.returnDate);
    }

    if (!nights) {
      nights = nightsFromTripDates(checkIn, checkOut) || undefined;
    }

    if (!checkIn && !checkOut) return null;
    const range = checkOut ? `${checkIn} → ${checkOut}` : checkIn!;
    const nightBit =
      nights && nights > 0 ? ` · ${nights} noche${nights !== 1 ? 's' : ''}` : '';
    return `${range}${nightBit}`;
  }

  private renderHistoryServiceLines(h: HistoryEntry): string {
    const trm =
      h.trm && h.trm > 0
        ? effectiveTrm(h.trm, normalizeTrmSuplemento(h.trmSuplemento ?? 0))
        : undefined;
    return h.items
      .map((item) => {
        const line = this.historyItemLineTotal(item, trm, h.primaryCurrency || 'COP');
        const price = this.formatPrice(line.currency, line.price);
        const adj = this.getItemAdjustments(item);
        const adjBits: string[] = [];
        if (adj.mayorValor > 0) {
          adjBits.push(`mayor ${this.formatPrice(line.currency, adj.mayorValor)}`);
        }
        if (adj.redondeo > 0) {
          adjBits.push(`redondeo ${this.formatPrice(line.currency, adj.redondeo)}`);
        }
        const adjLine = adjBits.length
          ? `<div class="tce-history-svc-line">${this.escape(adjBits.join(' · '))}</div>`
          : '';

        if (item.type === 'hotel') {
          const rate = item.selectedRate;
          const roomBits = [rate.roomType, rate.boardBasis].filter(Boolean).join(' · ');
          const tiers = formatWholesalePersonValues(
            item.occupancyRates as OccupancyTierRates | undefined
          );
          const reopen =
            item.bookingUrl || item.sourceUrl
              ? `<div class="tce-history-svc-line"><a href="${this.escape(
                  item.bookingUrl || item.sourceUrl || '#'
                )}" target="_blank" rel="noopener">Reabrir búsqueda BM</a>${
                  item.hotelId ? ` · id ${this.escape(item.hotelId)}` : ''
                }</div>`
              : item.hotelId
                ? `<div class="tce-history-svc-line">BM hotel id: ${this.escape(item.hotelId)}</div>`
                : '';
          return `
            <div class="tce-history-svc">
              <div class="tce-history-svc-title">Hotel: ${this.escape(item.hotelName)}${item.stars ? ` · ${item.stars}★` : ''}</div>
              ${roomBits ? `<div class="tce-history-svc-line">${this.escape(roomBits)}</div>` : ''}
              <div class="tce-history-svc-line">${this.escape(item.checkIn)} → ${this.escape(item.checkOut)}${item.nights ? ` · ${item.nights} noche${item.nights !== 1 ? 's' : ''}` : ''} · ${this.escape(this.formatOccupancy(item))}</div>
              ${tiers
                .map((t) => `<div class="tce-history-svc-line">${this.escape(t)}</div>`)
                .join('')}
              ${reopen}
              <div class="tce-history-svc-price">${this.escape(price)}</div>
              ${adjLine}
            </div>`;
        }

        if (item.type === 'flight') {
          const trip = item.routeType === 'roundTrip' ? 'Ida y vuelta' : 'Solo ida';
          const from = item.origin.name || item.origin.code;
          const to = item.destination.name || item.destination.code;
          const pax =
            item.paxSummary ||
            [
              item.adults > 0 ? `${item.adults} adulto${item.adults !== 1 ? 's' : ''}` : '',
              item.children > 0 ? `${item.children} niño${item.children !== 1 ? 's' : ''}` : '',
              item.infants > 0 ? `${item.infants} bebé${item.infants !== 1 ? 's' : ''}` : '',
            ]
              .filter(Boolean)
              .join(', ');
          const dateBits = [item.departureDate, item.returnDate]
            .filter(Boolean)
            .join(' → ');
          return `
            <div class="tce-history-svc">
              <div class="tce-history-svc-title">Vuelo: ${this.escape(from)} → ${this.escape(to)} · ${trip}</div>
              ${item.title ? `<div class="tce-history-svc-line">${this.escape(item.title)}</div>` : ''}
              ${dateBits ? `<div class="tce-history-svc-line">${this.escape(dateBits)}</div>` : ''}
              ${pax ? `<div class="tce-history-svc-line">${this.escape(pax)}</div>` : ''}
              <div class="tce-history-svc-price">${this.escape(price)}</div>
              ${adjLine}
            </div>`;
        }

        if (item.type === 'transfer') {
          const pax = [
            item.adults > 0 ? `${item.adults} adulto${item.adults !== 1 ? 's' : ''}` : '',
            item.children > 0 ? `${item.children} niño${item.children !== 1 ? 's' : ''}` : '',
          ]
            .filter(Boolean)
            .join(', ');
          const route = [item.from, item.to].filter(Boolean).join(' → ');
          const dateBits = item.checkOut
            ? `${item.checkIn} → ${item.checkOut}`
            : item.checkIn;
          return `
            <div class="tce-history-svc">
              <div class="tce-history-svc-title">Traslado: ${this.escape(item.name)}</div>
              ${route ? `<div class="tce-history-svc-line">${this.escape(route)}</div>` : ''}
              ${dateBits ? `<div class="tce-history-svc-line">${this.escape(dateBits)}</div>` : ''}
              ${pax ? `<div class="tce-history-svc-line">${this.escape(pax)}</div>` : ''}
              <div class="tce-history-svc-price">${this.escape(price)}</div>
              ${adjLine}
            </div>`;
        }

        if (item.type === 'activity') {
          const pax = [
            item.adults > 0 ? `${item.adults} adulto${item.adults !== 1 ? 's' : ''}` : '',
            item.children > 0 ? `${item.children} niño${item.children !== 1 ? 's' : ''}` : '',
          ]
            .filter(Boolean)
            .join(', ');
          const dateBits = item.checkOut
            ? `${item.checkIn} → ${item.checkOut}`
            : item.checkIn;
          return `
            <div class="tce-history-svc">
              <div class="tce-history-svc-title">Actividad: ${this.escape(item.name)}</div>
              ${dateBits ? `<div class="tce-history-svc-line">${this.escape(dateBits)}</div>` : ''}
              ${pax ? `<div class="tce-history-svc-line">${this.escape(pax)}</div>` : ''}
              <div class="tce-history-svc-price">${this.escape(price)}</div>
              ${adjLine}
            </div>`;
        }

        if (item.type === 'tour') {
          const route =
            item.originCity && item.destinationCity
              ? `${item.originCity} → ${item.destinationCity}`
              : item.destinationCity || '';
          const pp = this.formatPrice(item.currency, item.pricePerPerson);
          const rates = item.occupancyRates;
          const rateBits: string[] = [];
          if (rates?.dbl) rateBits.push(`DBL ${this.formatPrice(rates.currency || item.currency, rates.dbl)}`);
          if (rates?.tpl) rateBits.push(`TPL ${this.formatPrice(rates.currency || item.currency, rates.tpl)}`);
          if (rates?.sgl) rateBits.push(`SGL ${this.formatPrice(rates.currency || item.currency, rates.sgl)}`);
          const kind = item.isBloqueo ? 'Bloqueo' : item.isCombinado ? 'Combinado' : 'Circuito';
          return `
            <div class="tce-history-svc">
              <div class="tce-history-svc-title">${kind}: ${this.escape(item.name)}</div>
              ${route ? `<div class="tce-history-svc-line">${this.escape(route)}</div>` : ''}
              <div class="tce-history-svc-line">${this.escape(item.departureLabel || item.departureDate)}${
                item.payingPax ? ` · ${item.payingPax} pers.` : ''
              }</div>
              <div class="tce-history-svc-line">${this.escape(pp)} / persona${
                item.priceEstimated ? ' · estimado' : ''
              }</div>
              ${
                rateBits.length
                  ? `<div class="tce-history-svc-line">${this.escape(rateBits.join(' · '))}</div>`
                  : ''
              }
              <div class="tce-history-svc-price">${this.escape(price)}</div>
              ${adjLine}
            </div>`;
        }

        if (item.type === 'insurance') {
          const dateBits = item.checkOut
            ? `${item.checkIn} → ${item.checkOut}`
            : item.checkIn;
          return `
            <div class="tce-history-svc">
              <div class="tce-history-svc-title">Seguro: ${this.escape(item.name)}</div>
              ${dateBits ? `<div class="tce-history-svc-line">${this.escape(dateBits)}</div>` : ''}
              ${item.passengers > 0 ? `<div class="tce-history-svc-line">${item.passengers} pasajero${item.passengers !== 1 ? 's' : ''}</div>` : ''}
              <div class="tce-history-svc-price">${this.escape(price)}</div>
              ${adjLine}
            </div>`;
        }

        return '';
      })
      .join('');
  }

  private renderHistoryEntry(h: HistoryEntry): string {
    const when = new Date(h.createdAt).toLocaleString('es-CO');
    const dest = (h.destination || h.searchContext?.destinationText || 'Sin destino').toLocaleUpperCase(
      'es-CO'
    );
    const origin = this.formatHistoryOrigin(h);
    const dates = this.formatHistoryDates(h);
    const pax = this.formatHistoryPax(h);
    const currency = h.primaryCurrency || 'COP';
    const total =
      h.grandTotal !== undefined ? this.formatPrice(currency, h.grandTotal) : '';
    const rate =
      h.trm && h.trm > 0
        ? effectiveTrm(h.trm, normalizeTrmSuplemento(h.trmSuplemento ?? 0))
        : 0;
    const feeToDisplay = (cop: number) =>
      currency === 'USD' && rate > 0 ? copToUsd(cop, rate) : cop;

    const mayor = feeToDisplay(Math.max(0, Number(h.fees?.[MAYOR_VALOR_ID]) || 0));
    const redondeo = feeToDisplay(Math.max(0, Number(h.fees?.[REDONDEO_ID]) || 0));
    const ta = feeToDisplay(Math.max(0, Number(h.taTotal) || 0));

    const feeLines: string[] = [];
    if (mayor > 0) {
      feeLines.push(
        `<div>Mayor valor cobrado: ${this.escape(this.formatPrice(currency, mayor))}</div>`
      );
    }
    if (ta > 0) {
      feeLines.push(`<div>TA: ${this.escape(this.formatPrice(currency, ta))}</div>`);
    }
    if (redondeo > 0) {
      feeLines.push(
        `<div>Redondeo: ${this.escape(this.formatPrice(currency, redondeo))}</div>`
      );
    }

    return `
      <div class="tce-history-item">
        <strong>${formatQuoteRef(h.quoteNumber)}</strong>
        ${
          h.serverId
            ? ` <span class="tce-remote-db" title="Id servidor">db#${h.serverId}</span>${
                h.serverNumeroCar && h.serverNumeroCar !== h.quoteNumber
                  ? ` <span class="tce-remote-meta">srv ${formatQuoteRef(h.serverNumeroCar)}</span>`
                  : ''
              }`
            : ''
        }
        ${h.clientName ? ` · ${this.escape(h.clientName)}` : ''}
        ${h.advisorName ? ` · Asesor: ${this.escape(h.advisorName)}` : ''}
        <div class="tce-history-trip">
          ${origin ? `<div>Origen: ${this.escape(origin)}</div>` : ''}
          <div>Destino: ${this.escape(dest)}</div>
          ${dates ? `<div>Fechas: ${this.escape(dates)}</div>` : ''}
          ${pax ? `<div>Viajeros: ${this.escape(pax)}</div>` : ''}
          ${h.quoteMode ? `<div>Modo: ${h.quoteMode === 'wholesale' ? 'Mayorista' : 'Minorista'}</div>` : ''}
          <div>${h.items.length} ítem(s)${
            h.hotelOptionGroups && h.hotelOptionGroups.length > 0
              ? ` · ${h.hotelOptionGroups.length} opción(es)`
              : ''
          }</div>
        </div>
        <div class="tce-history-meta">${this.escape(when)}${
          h.trm
            ? ` · TRM ${formatTrmRate(
                effectiveTrm(h.trm, normalizeTrmSuplemento(h.trmSuplemento ?? 0))
              )}`
            : ''
        }</div>
        <div class="tce-history-services">${this.renderHistoryServiceLines(h)}</div>
        ${feeLines.length ? `<div class="tce-history-fees">${feeLines.join('')}</div>` : ''}
        ${
          h.quoteMode === 'wholesale'
            ? `<div class="tce-history-total">Mayorista · tarifas por acomodación (fees en pp)</div>`
            : total
              ? `<div class="tce-history-total">Total: ${this.escape(total)}</div>`
              : ''
        }
        <button type="button" class="tce-history-restore" data-action="restore-history"
          data-quote-number="${h.quoteNumber}" title="Traer al carrito tal como se cotizó">
          Restaurar al carrito
        </button>
      </div>`;
  }

  private renderQuoteSection(): string {
    const status =
      this.quoteCopyStatus === 'ok'
        ? `<div class="tce-quote-status">${this.escape(this.quoteStatusMessage || '✓ Listo')}</div>`
        : this.quoteCopyStatus === 'err'
          ? `<div class="tce-quote-status tce-quote-status--err">${this.escape(
              this.quoteStatusMessage || 'No se pudo completar la acción.'
            )}</div>`
          : this.quoteStatusMessage
            ? `<div class="tce-quote-status">${this.escape(this.quoteStatusMessage)}</div>`
            : '<div class="tce-quote-status"></div>';

    const group = (kind: QuoteLine['kind'], title: string) => {
      const lines = this.quoteLines.filter((l) => l.kind === kind);
      if (lines.length === 0) return '';
      return `
        <div class="tce-quote-group-title">${title}</div>
        ${lines
          .map(
            (l) => `
          <label class="tce-quote-line">
            <input type="checkbox" class="tce-quote-check" data-line-id="${this.escape(l.id)}" ${l.enabled ? 'checked' : ''}>
            <span>${this.escape((l.emoji ? l.emoji + ' ' : '') + l.text)}</span>
          </label>`
          )
          .join('')}
      `;
    };

    return `
      <p class="tce-quote-hint">
        Mensaje listo para WhatsApp. En mayorista: tarifas por acomodación (fees en pp). Total de grupo solo si lo marcas en <strong>Acomodación</strong>.
        La comisión aproximada va en un <strong>segundo mensaje</strong> (confidencial).
      </p>
      <label class="tce-quote-opt">
        <input type="checkbox" class="tce-usd-equiv-check" ${this.includeUsdEquiv ? 'checked' : ''}>
        Incluir conversión COP ↔ USD (TRM) en el mensaje
      </label>
      <p class="tce-quote-preview-label">1 · Cotización para el pasajero</p>
      <textarea class="tce-quote-preview" readonly></textarea>
      <div class="tce-quote-actions">
        <button type="button" class="tce-quote-btn" data-action="copy-quote">Copiar WhatsApp</button>
        <button type="button" class="tce-quote-btn tce-quote-btn--chat" data-action="send-chat-center"
          title="Pega la cotización en la oportunidad abierta de Chat Center">Enviar a Chat Center</button>
        <button type="button" class="tce-quote-btn tce-quote-btn--pdf" data-action="download-pdf">Descargar PDF</button>
        <button type="button" class="tce-quote-btn tce-quote-btn--secondary" data-action="preview-quote">Actualizar texto</button>
      </div>
      <div class="tce-commission-wa" hidden>
        <p class="tce-quote-preview-label">2 · Comisión aproximada (confidencial — no al pasajero)</p>
        <textarea class="tce-commission-preview" readonly></textarea>
        <div class="tce-quote-actions">
          <button type="button" class="tce-quote-btn tce-quote-btn--commission" data-action="copy-commission">Copiar comisión</button>
        </div>
      </div>
      ${status}
      <p class="tce-quote-hint">Qué incluir (editar líneas en el popup → Config):</p>
      <div class="tce-quote-checks">
        ${group('include', 'Tarifa incluye')}
        ${group('exclude', 'Plan no incluye')}
        ${group('policy', 'Nota importante')}
      </div>
    `;
  }

  private ensureBriefingOrWarn(statusSelector = '.tce-quote-status'): boolean {
    if (this.quoteMode === 'wholesale') return true;
    if (isTripBriefingComplete(this.tripGuide)) return true;
    const missing = briefingMissingForQuote(this.tripGuide);
    this.quoteCopyStatus = 'err';
    this.quoteStatusMessage = `Completa el viaje (faltan: ${missing.join(', ') || 'datos'}) y pulsa Guardar viaje.`;
    this.panelTab = 'whatsapp';
    this.render();
    return false;
  }

  private async buildQuoteInput() {
    await this.ensurePendingQuoteNumber();
    const subtotals = this.getTotalsByCurrency();
    const feesTotal = this.getFeesTotal();
    const primaryCurrency = this.getPrimaryCurrency(subtotals) || 'COP';
    const itemTotals = Object.fromEntries(
      this.items.map((item) => [item.id, this.getItemLineTotal(item).price])
    );
    return {
      items: this.items,
      searchContext: overlayBriefingPax(
        enrichSearchContextFromItems(this.headerSearchContext(), this.items),
        this.tripGuide || this.readBriefingDraft()
      ),
      subtotals,
      feesTotal,
      feesMayorRedondeo: this.getFeesMayorRedondeoDisplay(),
      primaryCurrency,
      quoteLines: this.quoteLines,
      quoteNumber: this.pendingQuoteNumber ?? undefined,
      advisorName: this.advisorName,
      agencyName: this.agencyName.trim() || undefined,
      trm: this.showTrmInQuote && this.trmRate > 0 ? this.trmRate : undefined,
      trmDia: this.trmDiaOpt(),
      trmEff: this.getEffectiveTrm() > 0 ? this.getEffectiveTrm() : undefined,
      includeUsdEquiv: this.includeUsdEquiv,
      hotelsAsOptions: this.hotelsAsOptions || this.quoteMode === 'wholesale',
      hotelOptionGroups:
        this.hotelsAsOptions || this.quoteMode === 'wholesale'
          ? this.hotelOptionGroups
          : undefined,
      itemTotals,
      quoteMode: this.quoteMode,
      taUnit: this.getTaUnitDisplay(),
      includeOccupancyTotal: this.quoteMode === 'wholesale' && this.occupancyTotalOpen,
      includeCommissionApprox:
        this.quoteMode === 'wholesale' &&
        this.occupancyTotalOpen &&
        this.commissionApproxOpen,
      commissionApproxKind: this.commissionApproxKind,
      initialDeposit: this.initialDeposit,
      autoRoundOccupancy: this.autoRoundOccupancy,
      manualPackageRoundIds: this.manualPackageRoundIds,
      includePdfInsuranceAnnex: this.pdfInsuranceAnnex,
    };
  }

  private async buildCurrentQuote(): Promise<string> {
    return buildWhatsAppQuote(await this.buildQuoteInput());
  }

  private async buildCommissionMessage(): Promise<string | null> {
    return buildCommissionApproxWhatsApp(await this.buildQuoteInput());
  }

  private async copyQuoteToClipboard(): Promise<void> {
    if (!this.ensureBriefingOrWarn()) return;
    const text = await this.buildCurrentQuote();
    const preview = this.shadow.querySelector('.tce-quote-preview') as HTMLTextAreaElement | null;
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

    if (ok) {
      await this.archiveCurrentCart('Copiar WhatsApp');
    }

    this.quoteCopyStatus = ok ? 'ok' : 'err';
    this.quoteStatusMessage = ok
      ? '✓ Copiado — pégalo en WhatsApp'
      : 'No se pudo copiar automático: selecciona el texto verde y Ctrl+C';
    this.render();
    window.setTimeout(() => {
      this.quoteCopyStatus = 'idle';
      this.quoteStatusMessage = '';
      this.render();
    }, 4000);
  }

  private async sendQuoteToChatCenter(): Promise<void> {
    if (!this.ensureBriefingOrWarn()) return;
    const text = await this.buildCurrentQuote();
    const preview = this.shadow.querySelector('.tce-quote-preview') as HTMLTextAreaElement | null;
    if (preview) preview.value = text;

    this.quoteCopyStatus = 'idle';
    this.quoteStatusMessage = 'Enviando a Chat Center…';
    this.panelTab = 'whatsapp';
    this.render();

    // Same page: paste directly into the open opportunity modal.
    if (isChatCenterHost()) {
      const local = pasteQuoteIntoChatCenter(text, document);
      if (local.contact) {
        this.clientName = local.contact;
        void saveClientName(local.contact);
      }
      if (local.ok) await this.archiveCurrentCart('Enviar a Chat Center');
      this.quoteCopyStatus = local.ok ? 'ok' : 'err';
      this.quoteStatusMessage = local.ok
        ? `✓ Pegado en Chat Center${local.contact ? ` · ${local.contact}` : ''}`
        : local.error || 'No se pudo pegar en Chat Center.';
      this.render();
      window.setTimeout(() => {
        this.quoteCopyStatus = 'idle';
        this.quoteStatusMessage = '';
        this.render();
      }, 4500);
      return;
    }

    try {
      const res = await chrome.runtime.sendMessage({
        type: 'TCE_SEND_TO_CHAT_CENTER',
        text,
      });
      if (res?.contact && typeof res.contact === 'string') {
        this.clientName = res.contact;
        void saveClientName(res.contact);
      }
      if (res?.ok) await this.archiveCurrentCart('Enviar a Chat Center');
      this.quoteCopyStatus = res?.ok ? 'ok' : 'err';
      this.quoteStatusMessage = res?.ok
        ? `✓ Pegado en Chat Center${res.contact ? ` · ${res.contact}` : ''}`
        : res?.error || 'No se pudo pegar en Chat Center.';
    } catch {
      this.quoteCopyStatus = 'err';
      this.quoteStatusMessage =
        'No se pudo contactar Chat Center. Abre https://chatcrm.grupostravel.com/oportunidades';
    }
    this.render();
    window.setTimeout(() => {
      this.quoteCopyStatus = 'idle';
      this.quoteStatusMessage = '';
      this.render();
    }, 5000);
  }

  private async downloadQuotePdf(): Promise<void> {
    if (!this.ensureBriefingOrWarn()) return;

    this.quoteCopyStatus = 'idle';
    this.quoteStatusMessage = 'Generando PDF…';
    this.panelTab = 'whatsapp';
    this.render();

    await this.ensurePendingQuoteNumber();
    const subtotals = this.getTotalsByCurrency();
    const feesTotal = this.getFeesTotal();
    const primaryCurrency = this.getPrimaryCurrency(subtotals) || 'COP';
    const itemTotals = Object.fromEntries(
      this.items.map((item) => [item.id, this.getItemLineTotal(item).price])
    );
    const result = await openQuotePdfPrint({
      items: this.items,
      searchContext: overlayBriefingPax(
        enrichSearchContextFromItems(this.headerSearchContext(), this.items),
        this.tripGuide || this.readBriefingDraft()
      ),
      subtotals,
      feesTotal,
      feesMayorRedondeo: this.getFeesMayorRedondeoDisplay(),
      primaryCurrency,
      quoteLines: this.quoteLines,
      quoteNumber: this.pendingQuoteNumber ?? undefined,
      advisorName: this.advisorName,
      agencyName: this.agencyName.trim() || undefined,
      trm: this.showTrmInQuote && this.trmRate > 0 ? this.trmRate : undefined,
      trmDia: this.trmDiaOpt(),
      trmEff: this.getEffectiveTrm() > 0 ? this.getEffectiveTrm() : undefined,
      includeUsdEquiv: this.includeUsdEquiv,
      hotelsAsOptions: this.hotelsAsOptions || this.quoteMode === 'wholesale',
      hotelOptionGroups:
        this.hotelsAsOptions || this.quoteMode === 'wholesale'
          ? this.hotelOptionGroups
          : undefined,
      itemTotals,
      quoteMode: this.quoteMode,
      taUnit: this.getTaUnitDisplay(),
      includeOccupancyTotal: this.quoteMode === 'wholesale' && this.occupancyTotalOpen,
      includeCommissionApprox:
        this.quoteMode === 'wholesale' &&
        this.occupancyTotalOpen &&
        this.commissionApproxOpen,
      commissionApproxKind: this.commissionApproxKind,
      initialDeposit: this.initialDeposit,
      includePdfInsuranceAnnex: this.pdfInsuranceAnnex,
      autoRoundOccupancy: this.autoRoundOccupancy,
      manualPackageRoundIds: this.manualPackageRoundIds,
    });
    this.quoteCopyStatus = result.ok ? 'ok' : 'err';
    this.quoteStatusMessage = result.ok
      ? '✓ PDF abierto — elige «Guardar como PDF» en Imprimir'
      : result.reason || 'No se pudo generar el PDF';
    if (result.ok) {
      await this.archiveCurrentCart('Descargar PDF');
    }
    this.render();
    window.setTimeout(() => {
      this.quoteCopyStatus = 'idle';
      this.quoteStatusMessage = '';
      this.render();
    }, 5000);
  }

  private showQuotePreview(): void {
    const preview = this.shadow.querySelector('.tce-quote-preview') as HTMLTextAreaElement | null;
    const commissionBox = this.shadow.querySelector('.tce-commission-wa') as HTMLElement | null;
    const commissionPreview = this.shadow.querySelector(
      '.tce-commission-preview'
    ) as HTMLTextAreaElement | null;
    if (!preview) return;
    void this.buildQuoteInput().then((input) => {
      preview.value = buildWhatsAppQuote(input);
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
    });
  }

  private async copyCommissionToClipboard(): Promise<void> {
    const text = await this.buildCommissionMessage();
    const preview = this.shadow.querySelector(
      '.tce-commission-preview'
    ) as HTMLTextAreaElement | null;
    if (!text) {
      this.quoteCopyStatus = 'err';
      this.quoteStatusMessage =
        'Activa la comisión en Acomodación (total del mix + freelance/agencia).';
      this.panelTab = 'whatsapp';
      this.render();
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
    this.quoteCopyStatus = ok ? 'ok' : 'err';
    this.quoteStatusMessage = ok
      ? '✓ Comisión copiada — pégala en un segundo mensaje'
      : 'No se pudo copiar: selecciona el texto ámbar y Ctrl+C';
    this.render();
    window.setTimeout(() => {
      this.quoteCopyStatus = 'idle';
      this.quoteStatusMessage = '';
      this.render();
    }, 4000);
  }

  private async toggleQuoteLine(lineId: string, enabled: boolean): Promise<void> {
    this.quoteLines = this.quoteLines.map((l) =>
      l.id === lineId ? { ...l, enabled } : l
    );
    await saveQuoteLines(this.quoteLines);
    this.showQuotePreview();
  }

  private renderFees(): string {
    const pax = this.getTaPaxCount();
    const taTotalDisplay = this.copAmountToDisplay(this.getTaTotal());
    const primaryCurrency = this.displayCurrency;
    const type = this.taSelection.type;
    const feeStep = this.displayCurrency === 'USD' ? '0.01' : '100';
    const taStep = this.displayCurrency === 'USD' ? '0.01' : '100';

    const feeRows =
      this.quoteMode === 'wholesale'
        ? ''
        : FEE_DEFINITIONS.filter((def) => def.id !== MAYOR_VALOR_ID)
            .map(
              (def) => `
      <div class="tce-fee-row">
        <label for="tce-fee-${def.id}">${this.escape(def.label)} (${this.displayCurrency})</label>
        <input
          type="number"
          min="0"
          step="${feeStep}"
          id="tce-fee-${def.id}"
          class="tce-fee-input"
          data-fee-id="${def.id}"
          value="${this.copAmountToDisplay(this.fees[def.id] ?? 0)}"
        >
      </div>
    `
            )
            .join('');

    const taUnitDisplay = this.getTaUnitDisplay();
    const mayorValorDisplay = this.copAmountToDisplay(this.fees[MAYOR_VALOR_ID] || 0);
    const taApplies = cartNeedsTaFee(this.items);
    const taSummary =
      this.quoteMode === 'wholesale'
        ? `TA por persona (sumada a tarifa pp) =
          <strong>${this.escape(this.formatPrice(primaryCurrency, taUnitDisplay))}</strong>`
        : `TA × ${pax} pasajero${pax !== 1 ? 's' : ''} =
          <strong>${this.escape(this.formatPrice(primaryCurrency, taTotalDisplay))}</strong>`;

    const taBlock = `
      <div class="tce-ta-block">
        <div class="tce-fee-row tce-fee-row--mayor">
          <label for="tce-fee-${MAYOR_VALOR_ID}">Mayor valor (${this.displayCurrency})</label>
          <input
            type="number"
            min="0"
            step="${feeStep}"
            id="tce-fee-${MAYOR_VALOR_ID}"
            class="tce-fee-input"
            data-fee-id="${MAYOR_VALOR_ID}"
            value="${mayorValorDisplay}"
            title="Se suma a los subtotales de las opciones"
          >
        </div>
        <div class="tce-fee-row">
          <label for="tce-ta-type">Tipo TA</label>
          <select id="tce-ta-type" class="tce-ta-type" ${taApplies ? '' : 'disabled'}>
            <option value="nacional_rt" ${type === 'nacional_rt' ? 'selected' : ''}>Ida y vuelta (nacional)</option>
            <option value="nacional_ow" ${type === 'nacional_ow' ? 'selected' : ''}>Solo ida (nacional)</option>
            <option value="internacional" ${type === 'internacional' ? 'selected' : ''}>Internacional (USD)</option>
          </select>
        </div>
        <div class="tce-fee-row">
          <label for="tce-ta-unit">Valor de TA (${this.displayCurrency})</label>
          <input
            type="number"
            min="0"
            step="${taStep}"
            id="tce-ta-unit"
            class="tce-ta-unit"
            ${taApplies ? '' : 'disabled'}
            value="${taApplies ? this.copAmountToDisplay(this.taSelection.unitCop || 0) : 0}"
          >
        </div>
        <div class="tce-ta-summary">
          ${taSummary}
          <button type="button" class="tce-ta-suggest" data-action="ta-from-flight"
            title="Sugerir tipo según el vuelo del carrito" ${taApplies ? '' : 'disabled'}>Según vuelo</button>
        </div>
        <div class="tce-ta-hint">${this.escape(taTypeLabel(type))}${
          type === 'internacional' && this.getEffectiveTrm() > 0 && taApplies
            ? ` · ${this.taConfig.internacionalUsd} USD × TRM ${formatTrmRate(this.getEffectiveTrm())} (día+sup.)`
            : ''
        }${this.escape(taFeeHintForItems(this.items))}</div>
      </div>
    `;

    const depositBlock =
      this.quoteMode === 'wholesale'
        ? `
      <div class="tce-fee-row">
        <label for="tce-initial-deposit">Depósito inicial</label>
        <input
          type="text"
          id="tce-initial-deposit"
          class="tce-initial-deposit"
          maxlength="120"
          placeholder="Texto tras 💰*DEPÓSITO INICIAL:*"
          value="${this.escape(this.initialDeposit)}"
        >
      </div>`
        : '';

    return feeRows + taBlock + depositBlock;
  }

  private persistOccupancyRoomPlan(next: BriefingRoom[]): void {
    this.tripGuide = applyRoomPlanToGuide(this.tripGuide, next);
    void saveTripGuide(this.tripGuide);
    this.markAccommodationConfirmed();
  }

  private markAccommodationConfirmed(): void {
    if (this.accommodationConfirmed) return;
    this.accommodationConfirmed = true;
    void saveAccommodationConfirmed(true);
  }

  /** Pestaña Acomodación (mayorista): mix del cliente + total opcional en WhatsApp. */
  private renderAccommodationTab(): string {
    if (this.quoteMode !== 'wholesale') {
      return `<p class="tce-briefing-note">Disponible en modo <strong>Mayorista</strong>.</p>`;
    }
    const rooms = roomsFromBriefing(
      this.tripGuide?.roomPlan,
      this.tripGuide?.totalAdults || 2,
      this.tripGuide?.totalChildren || 0,
      this.tripGuide?.childrenAges
    );
    const { adults, children } = summarizeRoomPlan(rooms);
    const paxLabel =
      children > 0
        ? `${adults} adulto${adults !== 1 ? 's' : ''} + ${children} niño${children !== 1 ? 's' : ''}`
        : `${adults} adulto${adults !== 1 ? 's' : ''}`;
    return `
      <div class="tce-accommodation">
        <p class="tce-briefing-note">
          Habitaciones del <strong>viaje real</strong> (no la sonda BM). El total por opción usa las tarifas pp ya cargadas.
        </p>
        <div class="tce-room-plan-wrap">${this.roomPlanWrapHtml(rooms)}</div>
        <p class="tce-accommodation-pax">Viajeros del mix: <strong>${this.escape(paxLabel)}</strong></p>
        <div class="tce-accommodation-totals">
          <div class="tce-accommodation-totals-title">Vista cliente (WhatsApp / PDF)</div>
          ${this.renderOccupancyMixTotals()}
        </div>
        <label class="tce-accommodation-include">
          <input type="checkbox" class="tce-auto-round-occ" ${this.autoRoundOccupancy ? 'checked' : ''} />
          Redondeo. Automático (Tarifa pp …9)
        </label>
        <label class="tce-accommodation-include">
          <input type="checkbox" class="tce-pdf-insurance-annex" ${this.pdfInsuranceAnnex ? 'checked' : ''} />
          Mostrar anexo de asistencia en PDF
        </label>
        <label class="tce-accommodation-include">
          <input type="checkbox" class="tce-occ-include-wa" ${this.occupancyTotalOpen ? 'checked' : ''} />
          Incluir valor total del mix en WhatsApp / PDF
        </label>
        <label class="tce-accommodation-include${this.occupancyTotalOpen ? '' : ' tce-accommodation-include--disabled'}" title="Requiere incluir el total del mix. La comisión es % de servicios (sin aéreos ni bloqueos).">
          <input type="checkbox" class="tce-commission-approx" ${this.commissionApproxOpen ? 'checked' : ''} ${this.occupancyTotalOpen ? '' : 'disabled'} />
          Incluir valor aproximado de comisión (mensaje WhatsApp aparte)
        </label>
        ${
          this.occupancyTotalOpen && this.commissionApproxOpen
            ? `<div class="tce-commission-kinds">
          <label class="tce-commission-kind${this.commissionApproxKind === 'freelance' ? ' tce-commission-kind--on' : ''}">
            <input type="radio" name="tce-commission-kind" class="tce-commission-kind-radio" value="freelance" ${this.commissionApproxKind === 'freelance' ? 'checked' : ''} />
            Comisión aproximada para freelance 10%
          </label>
          <label class="tce-commission-kind${this.commissionApproxKind === 'agency' ? ' tce-commission-kind--on' : ''}">
            <input type="radio" name="tce-commission-kind" class="tce-commission-kind-radio" value="agency" ${this.commissionApproxKind === 'agency' ? 'checked' : ''} />
            Comisión aproximada para agencia 12%
          </label>
        </div>`
            : ''
        }
        <label class="tce-accommodation-include" title="Solo TRM del día; el suplemento nunca se muestra al cliente">
          <input type="checkbox" class="tce-show-trm-quote" ${this.showTrmInQuote ? 'checked' : ''} />
          Mostrar TRM del día en PDF y WhatsApp
        </label>
        <p class="tce-briefing-note">El cliente solo ve tarifas por acomodación (SGL/DBL/TPL/CHD). El total del mix solo si marcas la casilla. La comisión va en un segundo mensaje WhatsApp (Copiar comisión), no en la cotización ni en el PDF.</p>
      </div>`;
  }

  private renderOccupancyMixTotals(): string {
    const byId = new Map(
      this.items.filter((i): i is HotelCartItem => i.type === 'hotel').map((h) => [h.id, h])
    );
    const groups =
      this.hotelOptionGroups.length > 0
        ? this.hotelOptionGroups
        : [{ id: 'all', hotelIds: [...byId.keys()] }];
    const pax = Math.max(1, this.getTaPaxCount());
    const clientLead = formatWholesaleClientTotalLead(this.tripGuide?.roomPlan, {
      adults: this.tripGuide?.totalAdults,
      children: this.tripGuide?.totalChildren,
    });
    const chunks: string[] = [];
    groups.forEach((g, i) => {
      const hotels = g.hotelIds.map((id) => byId.get(id)).filter((h): h is HotelCartItem => !!h);
      if (hotels.length === 0) return;
      const { linePrice, baseLinePrice } = this.wholesaleLinePriceFns();
      const sum = summarizeWholesaleOption(
        hotels,
        this.items,
        this.getFeesMayorRedondeoDisplay(),
        pax,
        this.tripGuide?.roomPlan,
        linePrice,
        this.getTaUnitDisplay(),
        baseLinePrice,
        {
          displayCurrency: this.displayCurrency,
          effTrm: this.getEffectiveTrm(),
          trmDia: this.trmDiaOpt(),
          roundCharmNine: this.shouldRoundPackage(g.id),
        }
      );
      const hotelNames = hotels.map((h) => h.hotelName).filter(Boolean).join(' · ');
      if (sum.personLines.length === 0 && sum.groupTotal == null) {
        chunks.push(
          `<div class="tce-client-opt">
            <div class="tce-client-opt-head">Opción ${i + 1}${hotelNames ? ` · ${this.escape(hotelNames)}` : ''}</div>
            <p class="tce-briefing-note">${sum.missingHint ? this.escape(sum.missingHint) : 'Faltan tarifas pp.'}</p>
          </div>`
        );
        return;
      }
      const rateRows = sum.personLines
        .map(
          (line) =>
            `<div class="tce-total-row tce-total-row--sub"><span>${this.escape(line)}</span></div>`
        )
        .join('');
      const grand =
        this.occupancyTotalOpen && sum.groupTotal != null && clientLead
          ? `<p class="tce-client-grand">${this.escape(clientLead)} = <strong>${this.escape(
              this.formatPrice(sum.currency, sum.groupTotal)
            )}</strong></p>`
          : this.occupancyTotalOpen && sum.groupTotal != null
            ? `<p class="tce-client-grand">Total = <strong>${this.escape(
                this.formatPrice(sum.currency, sum.groupTotal)
              )}</strong></p>`
            : '';
      const commissionAmt =
        this.occupancyTotalOpen &&
        this.commissionApproxOpen &&
        (this.commissionApproxKind === 'freelance' || this.commissionApproxKind === 'agency')
          ? approxCommissionAmount(sum.commissionableGroupTotal, this.commissionApproxKind)
          : undefined;
      const commissionLine =
        commissionAmt != null
          ? `<p class="tce-client-commission">Valor aproximado de comisión: <strong>${this.escape(
              this.formatPrice(sum.currency, commissionAmt)
            )}</strong></p>`
          : '';
      const breakdown = buildWholesaleOptionBreakdown(
        i,
        g.id,
        hotels,
        this.items,
        this.getFeesMayorRedondeoDisplay(),
        pax,
        this.tripGuide?.roomPlan,
        linePrice,
        this.getTaUnitDisplay(),
        {
          displayCurrency: this.displayCurrency,
          effTrm: this.getEffectiveTrm(),
          trmDia: this.trmDiaOpt(),
        },
        this.tripGuide ?? undefined
      );
      breakdown.missingHint = sum.missingHint;
      breakdown.groupTotal = sum.groupTotal;
      chunks.push(`
        <div class="tce-client-opt">
          <div class="tce-client-opt-head">Opción ${i + 1}${hotelNames ? ` · ${this.escape(hotelNames)}` : ''}</div>
          ${rateRows}
          ${grand}
          ${commissionLine}
          <details class="tce-advisor-break">
            <summary>Desglose asesor (no va al cliente)</summary>
            ${renderWholesaleBreakdownTable(breakdown, (s) => this.escape(s), (c, n) => this.formatPrice(c, n))}
          </details>
          <div class="tce-occ-reset-row" style="margin:4px 0 12px">
            <button type="button" class="tce-occ-reset-btn" data-action="restore-option-rates"
              data-option-id="${this.escape(g.id)}">Restablecer tarifas</button>
          </div>
        </div>`);
    });
    return chunks.join('') || `<p class="tce-briefing-note">Arma DBL / TPL / niños para ver tarifas por acomodación.</p>`;
  }

  private renderTotals(): string {
    const subtotals = this.getTotalsByCurrency();
    const feesTotal = this.getFeesTotal();
    const primaryCurrency = this.getPrimaryCurrency(subtotals) || this.displayCurrency;
    const mayorValor = this.copAmountToDisplay(this.fees[MAYOR_VALOR_ID] || 0);
    const redondeo = this.copAmountToDisplay(this.fees[REDONDEO_ID] || 0);
    const taTotal = this.copAmountToDisplay(this.getTaTotal());
    const taPax = this.getTaPaxCount();
    const paxForRate = Math.max(1, taPax);

    const breakdownRows: string[] = [];
    const eff = this.getEffectiveTrm();
    const needsFx = this.items.some(
      (item) => this.getItemPrice(item).currency.toUpperCase() !== this.displayCurrency
    );
    if (needsFx && eff > 0) {
      breakdownRows.push(`
        <div class="tce-total-row tce-total-row--sub">
          <span>TRM usada (día + suplemento)</span>
          <span>${formatTrmRate(this.trmRate)} + ${Math.round(this.trmSuplemento).toLocaleString('es-CO')} = ${formatTrmRate(eff)}</span>
        </div>
      `);
    }
    breakdownRows.push(`
      <div class="tce-total-row tce-total-row--sub tce-total-row--vista">
        <span>Vista de montos</span>
        <span>Todo en ${this.displayCurrency}</span>
      </div>
    `);

    const compareMode = this.hotelsAsOptions;
    const compareWithOptions =
      compareMode && this.hotelOptionGroups.length > 0;
    const briefCtx = this.tripGuide || this.headerSearchContext();
    const paxSuffix =
      hasAccommodationPlan(briefCtx) && formatBriefingPaxCompact(briefCtx)
        ? ` (${formatBriefingPaxCompact(briefCtx)})`
        : '';
    const feesOnOptions = mayorValor + redondeo;

    if (compareWithOptions) {
      this.syncHotelOptionGroups();
      const optionSubs = compareOptionSubtotals(
        this.items,
        this.hotelOptionGroups,
        this.displayCurrency,
        eff > 0 ? eff : 0,
        feesOnOptions
      );
      for (const opt of optionSubs) {
        breakdownRows.push(`
        <div class="tce-total-row tce-total-row--opt">
          <span>Subtotal ${this.escape(primaryCurrency)} Opción ${opt.index}${this.escape(paxSuffix)}</span>
          <span>${this.escape(this.formatPrice(primaryCurrency, opt.subtotal))}</span>
        </div>
      `);
      }
    } else {
      for (const [currency, value] of subtotals) {
        breakdownRows.push(`
        <div class="tce-total-row tce-total-row--opt">
          <span>Subtotal ${this.escape(currency)}</span>
          <span>${this.escape(this.formatPrice(currency, value + (currency === primaryCurrency ? feesOnOptions : 0)))}</span>
        </div>
      `);
      }
    }
    breakdownRows.push(...this.renderCostBreakdownRows(primaryCurrency));
    if (mayorValor > 0 || this.fees[MAYOR_VALOR_ID] != null) {
      breakdownRows.push(`
        <div class="tce-total-row tce-total-row--sub">
          <span>Mayor valor (global${compareWithOptions ? ', en cada opción' : ''})</span>
          <span>${this.escape(this.formatPrice(primaryCurrency, mayorValor))}</span>
        </div>
      `);
    }
    breakdownRows.push(...this.renderItemAdjTotalRows(primaryCurrency));
    breakdownRows.push(...this.renderPackageRoundTotalRows(primaryCurrency));
    if (redondeo > 0) {
      breakdownRows.push(`
        <div class="tce-total-row tce-total-row--sub">
          <span>Redondeo (global)</span>
          <span>${this.escape(this.formatPrice(primaryCurrency, redondeo))}</span>
        </div>
      `);
    }
    if (taTotal > 0 || (this.quoteMode === 'wholesale' && this.getTaUnitDisplay() > 0)) {
      const taLabel =
        this.quoteMode === 'wholesale'
          ? 'TA por persona'
          : `TA × ${taPax} pax`;
      const taAmount =
        this.quoteMode === 'wholesale' ? this.getTaUnitDisplay() : taTotal;
      breakdownRows.push(`
        <div class="tce-total-row tce-total-row--sub">
          <span>${taLabel}</span>
          <span>${this.escape(this.formatPrice(primaryCurrency, taAmount))}</span>
        </div>
      `);
    }

    const totalRows = Array.from(subtotals.entries()).map(([currency, value]) => {
      const total = currency === primaryCurrency ? value + feesTotal : value;
      const perPerson = Math.round(total / paxForRate);
      return { currency, total, perPerson };
    });

    const perPersonHtml = compareMode
      ? ''
      : totalRows
          .map(
            ({ currency, perPerson }) => `
        <div class="tce-total-row tce-total-row--sub">
          <span>Valor por pasajero${totalRows.length > 1 ? ` (${this.escape(currency)})` : ''}</span>
          <span>${this.escape(this.formatPrice(currency, perPerson))}</span>
        </div>`
          )
          .join('');

    const roundLabel = this.displayCurrency === 'USD' ? 'decena de USD' : 'decena de mil';
    const roundingHtml =
      this.quoteMode === 'wholesale'
        ? ''
        : `
      <div class="tce-rounding-row">
        <div class="tce-rounding-excess">
          Redondeo:
          <strong>${this.escape(this.formatPrice(primaryCurrency || '', redondeo))}</strong>
        </div>
        <button type="button" class="tce-round-btn" data-action="round" title="Calcula el excedente hasta la siguiente ${roundLabel} y lo guarda en Redondeo (no toca Mayor valor cobrado)">
          Redondear
        </button>
      </div>
    `;

    const totalHtml = compareMode
      ? this.renderHotelCompareBlock()
      : totalRows
          .map(
            ({ currency, total }) => `
          <div class="tce-total-row">
            <span>Total ${this.escape(currency)} (${paxForRate} pax)</span>
            <span>${this.escape(this.formatPrice(currency, total))}</span>
          </div>`
          )
          .join('');

    return breakdownRows.join('') + perPersonHtml + roundingHtml + totalHtml;
  }

  /**
   * Rounds (items + mayor valor cobrado + TA) up to the next round unit
   * in the active display currency and stores Redondeo (as COP internally).
   */
  private async applyRounding(): Promise<void> {
    const subtotals = this.getTotalsByCurrency();
    if (subtotals.size === 0) return;

    const primaryCurrency = this.getPrimaryCurrency(subtotals);
    const itemsTotal = subtotals.get(primaryCurrency) || 0;
    const mayorValor = this.copAmountToDisplay(this.fees[MAYOR_VALOR_ID] || 0);
    const taTotal = this.copAmountToDisplay(this.getTaTotal());
    const base = itemsTotal + mayorValor + taTotal;
    const ROUND_UNIT = this.roundUnit();
    const rounded = Math.ceil(base / ROUND_UNIT) * ROUND_UNIT;
    const excessDisplay = Math.max(0, rounded - base);

    this.fees[REDONDEO_ID] = this.displayAmountToCop(excessDisplay);
    await this.saveFees();

    const feeInput = this.shadow.querySelector(
      `#tce-fee-${REDONDEO_ID}`
    ) as HTMLInputElement | null;
    if (feeInput) feeInput.value = String(excessDisplay);

    const feesEl = this.shadow.querySelector('.tce-fees');
    if (feesEl) feesEl.innerHTML = this.renderFees();
    const totalsEl = this.shadow.querySelector('.tce-totals');
    if (totalsEl) totalsEl.innerHTML = this.renderTotals();
  }

  /**
   * Charm-9: for hotels with occupancy rates, round SGL/DBL/TPL/CHD all at once.
   * Otherwise round the line total (base + mayor) via redondeo.
   */
  private async applyItemRounding(itemId: string): Promise<void> {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return;

    if (item.type === 'hotel' && item.occupancyRates) {
      const rounded = charmNineOccupancyRates(
        item.occupancyRates as OccupancyTierRates,
        this.displayCurrency,
        this.getEffectiveTrm(),
        this.trmDiaOpt()
      );
      this.items = this.items.map((i) =>
        i.id === itemId
          ? {
              ...i,
              occupancyRates: rounded,
              redondeo: 0,
            }
          : i
      );
      await this.saveToStorage();
      this.render();
      return;
    }

    const base = this.getItemBasePrice(item);
    const mayorValor = this.getItemAdjustmentsDisplay(item).mayorValor;
    const beforeRound = base.price + mayorValor;
    const excessDisplay = charmNineExcess(beforeRound, this.displayCurrency);

    this.items = this.items.map((i) =>
      i.id === itemId ? { ...i, redondeo: this.displayAmountToCop(excessDisplay) } : i
    );
    await this.saveToStorage();
    this.refreshItemAdjUi(itemId);
  }

  private refreshItemAdjUi(itemId: string): void {
    const lineItem = this.items.find((i) => i.id === itemId);
    if (!lineItem) return;
    const adj = this.getItemAdjustmentsDisplay(lineItem);
    const line = this.getItemLineTotal(lineItem);
    const label = this.formatPrice(line.currency, line.price);

    const redondeoInput = this.shadow.querySelector(
      `#tce-item-redondeo-${CSS.escape(itemId)}`
    ) as HTMLInputElement | null;
    if (redondeoInput) redondeoInput.value = String(adj.redondeo);

    const totalEl = this.shadow.querySelector(
      `.tce-item-line-total[data-item-id="${CSS.escape(itemId)}"]`
    );
    if (totalEl) {
      const { pax, breakdown } = this.serviceBreakdownPax(lineItem);
      totalEl.innerHTML = `<strong>${this.escape(
        formatServiceItemTotal(line.currency, line.price, pax, breakdown)
      )}</strong>`;
    }
    const priceEl = this.shadow.querySelector(
      `.tce-item[data-id="${CSS.escape(itemId)}"] .tce-item-price`
    );
    if (priceEl) priceEl.textContent = label;

    const totalsEl = this.shadow.querySelector('.tce-totals');
    if (totalsEl) totalsEl.innerHTML = this.renderTotals();
  }

  private bindTabDrag(root: HTMLElement): void {
    const tab = root.querySelector('.tce-tab') as HTMLElement | null;
    if (!tab) return;

    let dragging = false;
    let moved = false;
    let startY = 0;
    let startPct = this.tabTopPct;

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      if (Math.abs(dy) > 4) moved = true;
      if (!moved) return;
      e.preventDefault();
      const vh = window.innerHeight || 1;
      const next = Math.min(92, Math.max(8, startPct + (dy / vh) * 100));
      this.tabTopPct = next;
      tab.style.top = `${next}%`;
    };

    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      tab.classList.remove('tce-tab--dragging');
      try {
        tab.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (moved) {
        void saveTabTopPct(this.tabTopPct);
        // Prevent the following click from toggling the panel.
        const blockClick = (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
          tab.removeEventListener('click', blockClick, true);
        };
        tab.addEventListener('click', blockClick, true);
      }
    };

    tab.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      moved = false;
      startY = e.clientY;
      startPct = this.tabTopPct;
      tab.classList.add('tce-tab--dragging');
      try {
        tab.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    });
  }

  private bindEvents(root: HTMLElement): void {
    this.bindTabDrag(root);
    root.addEventListener('focusin', (e) => {
      const t = e.target as HTMLElement | null;
      if (
        t?.classList?.contains('tce-fee-input') ||
        t?.classList?.contains('tce-trm-input') ||
        t?.classList?.contains('tce-trm-sup-input') ||
        t?.classList?.contains('tce-ta-unit') ||
        t?.classList?.contains('tce-item-adj-input') ||
        t?.classList?.contains('tce-option-mayor-input') ||
        t?.classList?.contains('tce-tier-mayor-input') ||
        t?.classList?.contains('tce-occ-input') ||
        t?.classList?.contains('tce-client-input') ||
        t?.classList?.contains('tce-contact-phone-input') ||
        t?.classList?.contains('tce-agency-input') ||
        t?.classList?.contains('tce-initial-deposit')
      ) {
        this.suppressNumberFieldRerender = true;
      }
      if (t?.hasAttribute?.('data-child-age')) {
        this.suppressNumberFieldRerender = true;
      }
    });
    root.addEventListener('focusout', (e) => {
      const t = e.target as HTMLElement | null;
      if (t?.hasAttribute?.('data-child-age')) {
        window.setTimeout(() => {
          this.suppressNumberFieldRerender = false;
        }, 0);
        return;
      }
      if (
        t?.classList?.contains('tce-fee-input') ||
        t?.classList?.contains('tce-trm-input') ||
        t?.classList?.contains('tce-trm-sup-input') ||
        t?.classList?.contains('tce-ta-unit') ||
        t?.classList?.contains('tce-item-adj-input') ||
        t?.classList?.contains('tce-option-mayor-input') ||
        t?.classList?.contains('tce-tier-mayor-input') ||
        t?.classList?.contains('tce-occ-input') ||
        t?.classList?.contains('tce-client-input') ||
        t?.classList?.contains('tce-contact-phone-input') ||
        t?.classList?.contains('tce-agency-input') ||
        t?.classList?.contains('tce-initial-deposit')
      ) {
        // Defer so storage.onChanged from the last keystroke still sees the flag.
        window.setTimeout(() => {
          this.suppressNumberFieldRerender = false;
          if (
            t.classList.contains('tce-item-adj-input') &&
            (t as HTMLInputElement).dataset.adj === 'mayorValor'
          ) {
            const itemId = (t as HTMLInputElement).dataset.itemId;
            if (itemId) {
              this.applyHotelMayorValorToRates(itemId);
              return;
            }
          }
          if (t.classList.contains('tce-option-mayor-input')) {
            const optionId = (t as HTMLInputElement).dataset.optionId;
            const tier = (t as HTMLInputElement).dataset.occTier as OccupancyTierCode | undefined;
            const parsed = parseFloat((t as HTMLInputElement).value);
            const mayorDisplay = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
            if (optionId && mayorDisplay > 0 && tier) {
              this.applyOptionMayorValor(optionId, { [tier]: mayorDisplay });
              return;
            }
          }
          if (t.classList.contains('tce-tier-mayor-input')) {
            const itemId = (t as HTMLInputElement).dataset.itemId;
            const tier = (t as HTMLInputElement).dataset.occTier as OccupancyTierCode | undefined;
            const parsed = parseFloat((t as HTMLInputElement).value);
            const mayorDisplay = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
            if (itemId && tier && mayorDisplay > 0) {
              this.applyHotelTierMayorValor(itemId, tier, mayorDisplay);
              return;
            }
          }
          // Pull latest shared state after editing (other tabs / panel may have written).
          void this.loadFromStorage();
          void this.loadFees();
        }, 0);
      }
    });

    root.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
      if (!target) return;

      const action = target.dataset.action;
      if (action?.startsWith('room-')) {
        e.preventDefault();
        const row = target.closest('[data-room-idx]') as HTMLElement | null;
        const idx = Number(row?.dataset.roomIdx || '0');
        const next = mutateRoomPlan(readRoomPlanFromRoot(this.shadow), action, idx);
        if (this.quoteMode === 'wholesale') {
          this.persistOccupancyRoomPlan(next);
          this.render();
          return;
        }
        const wrap = this.shadow.querySelector('.tce-room-plan-wrap');
        if (wrap) {
          wrap.innerHTML = this.roomPlanWrapHtml(next);
        }
        this.refreshBriefingSaveButton();
        return;
      }
      if (action === 'toggle-occupancy-total') {
        this.occupancyTotalOpen = !this.occupancyTotalOpen;
        void saveOccupancyTotalOpen(this.occupancyTotalOpen);
        if (!this.occupancyTotalOpen) {
          this.commissionApproxOpen = false;
          void saveCommissionApproxOpen(false);
        }
        this.render();
        return;
      }
      if (action === 'toggle') {
        this.toggle();
      } else if (action === 'open-asistente') {
        openAsistentePanel();
      } else if (action === 'remove') {
        this.removeItem(target.dataset.id!);
      } else if (action === 'search-hotel-transfer') {
        const id = target.dataset.id;
        if (id) void this.searchTransferForHotel(id);
      } else if (action === 'toggle-item') {
        const id = target.dataset.id;
        if (id) this.toggleItemExpand(id);
      } else if (action === 'clear') {
        this.clearCart();
      } else if (action === 'round') {
        void this.applyRounding();
      } else if (action === 'round-item') {
        const id = target.dataset.id;
        if (id) void this.applyItemRounding(id);
      } else if (action === 'restore-item-adj') {
        const itemId = target.dataset.itemId;
        if (itemId) this.restoreItemAdjustments(itemId);
      } else if (action === 'toggle-auto-round') {
        void this.setAutoRoundOccupancy(!this.autoRoundOccupancy);
      } else if (action === 'round-option') {
        const optionId = target.dataset.optionId;
        if (optionId) this.roundOptionOccupancyRates(optionId);
      } else if (action === 'restore-option-rates') {
        const optionId = target.dataset.optionId;
        if (optionId) this.restoreOptionOccupancyRates(optionId);
      } else if (action === 'display-currency') {
        const next = normalizeDisplayCurrency(target.dataset.currency);
        if (next === this.displayCurrency) return;
        if (!this.canUseDisplayCurrency(next)) return;
        this.displayCurrency = next;
        void saveDisplayCurrency(next);
        this.render();
      } else if (action === 'ta-from-flight') {
        this.syncTaFromFlightIfPresent();
        const feesEl = this.shadow.querySelector('.tce-fees');
        if (feesEl) feesEl.innerHTML = this.renderFees();
        const totalsEl = this.shadow.querySelector('.tce-totals');
        if (totalsEl) totalsEl.innerHTML = this.renderTotals();
      } else if (action === 'panel-tab') {
        const next = target.dataset.tab as
          | 'items'
          | 'total'
          | 'accommodation'
          | 'whatsapp'
          | 'history'
          | undefined;
        if (next && next !== this.panelTab) {
          this.panelTab = next;
          this.quoteCopyStatus = 'idle';
          this.render();
          if (next === 'history') void this.refreshRemoteQuotes();
        }
      } else if (action === 'refresh-trm') {
        void this.refreshTrmFromApi();
      } else if (action === 'copy-quote') {
        void this.copyQuoteToClipboard();
      } else if (action === 'send-chat-center') {
        void this.sendQuoteToChatCenter();
      } else if (action === 'copy-commission') {
        void this.copyCommissionToClipboard();
      } else if (action === 'download-pdf') {
        void this.downloadQuotePdf();
      } else if (action === 'preview-quote') {
        this.showQuotePreview();
      } else if (action === 'new-search') {
        void this.startNewSearch();
      } else if (action === 'toggle-dest-pin') {
        void this.toggleDestinationPin();
      } else if (action === 'restore-occ-rates') {
        const itemId = target.dataset.itemId;
        if (itemId) this.restoreHotelOccupancyRates(itemId);
      } else if (action === 'save-briefing') {
        void this.saveBriefingFromForm();
      } else if (action === 'wholesale-help') {
        void chrome.runtime.sendMessage({ type: 'TCE_OPEN_WHOLESALE_HELP' });
      } else if (action === 'add-hotel-option') {
        this.addHotelOptionGroup();
      } else if (action === 'remove-hotel-option') {
        const optionId = target.dataset.optionId;
        if (optionId) this.removeHotelOptionGroup(optionId);
      } else if (action === 'toggle-hotel-option') {
        const optionId = target.dataset.optionId;
        const hotelId = target.dataset.hotelId;
        if (optionId && hotelId) this.toggleHotelInOption(optionId, hotelId);
      } else if (action === 'restore-history') {
        const n = Number(target.dataset.quoteNumber);
        if (n > 0) void this.restoreHistoryEntry(n);
      } else if (action === 'load-remote-quote') {
        const sid = Number(target.dataset.serverId);
        if (sid > 0) void this.restoreRemoteQuote(sid);
      } else if (action === 'pick-contact') {
        const idx = Number(target.dataset.idx);
        if (Number.isFinite(idx) && idx >= 0) void this.pickContactHit(idx);
      } else if (action === 'contact-detail') {
        e.preventDefault();
        e.stopPropagation();
        const id = Number(target.dataset.carId);
        if (id > 0) void this.showContactDetail(id);
      } else if (action === 'refresh-remote-quotes') {
        void this.refreshRemoteQuotes();
      } else if (action === 'export-history') {
        if (this.history.length === 0) {
          window.alert('No hay cotizaciones para exportar.');
        } else {
          downloadHistoryBackup(this.history);
          void appendAppLog('info', `Historial exportado (${this.history.length})`);
        }
      } else if (action === 'import-history') {
        const input = root.querySelector('.tce-history-import-file') as HTMLInputElement | null;
        input?.click();
      } else if (action === 'toggle-warnings') {
        this.warningsPanelOpen = !this.warningsPanelOpen;
        this.render();
      } else if (action === 'dismiss-warning') {
        const warnId = target.dataset.warnId;
        if (warnId) {
          if (!this.dismissedWarnings.includes(warnId)) {
            this.dismissedWarnings = [...this.dismissedWarnings, warnId];
          }
          void dismissWarning(warnId);
          const left = activeQuoteWarnings(
            this.listWholesaleWarnings(),
            this.dismissedWarnings
          );
          if (left.length === 0) this.warningsPanelOpen = false;
          this.render();
        }
      }
    });

    root.addEventListener('change', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target.classList.contains('tce-history-import-file')) {
        const input = target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file) return;
        void file.text().then(async (raw) => {
          const result = await importHistoryJson(raw);
          if (!result.ok) {
            window.alert(`No se pudo importar: ${result.error}`);
            return;
          }
          this.history = await loadHistory();
          this.render();
          void appendAppLog('info', `Historial importado (${result.count})`);
          window.alert(`Se importaron / fusionaron ${result.count} cotización(es).`);
        });
        return;
      }

      if (target.classList.contains('tce-quote-mode')) {
        const mode = normalizeQuoteMode((target as HTMLSelectElement).value);
        void this.setQuoteMode(mode);
        return;
      }

      if (target.classList.contains('tce-occ-child-eq-check')) {
        const itemId = target.dataset.itemId;
        if (itemId) {
          this.setHotelChildEqualsAdult(itemId, (target as HTMLInputElement).checked);
        }
        return;
      }

      if (target.classList.contains('tce-auto-round-occ')) {
        void this.setAutoRoundOccupancy((target as HTMLInputElement).checked);
        return;
      }

      if (target.classList.contains('tce-occ-include-wa')) {
        this.occupancyTotalOpen = (target as HTMLInputElement).checked;
        void saveOccupancyTotalOpen(this.occupancyTotalOpen);
        if (!this.occupancyTotalOpen) {
          this.commissionApproxOpen = false;
          void saveCommissionApproxOpen(false);
        }
        this.scheduleHistoryDraftSync();
        this.render();
        return;
      }

      if (target.classList.contains('tce-commission-approx')) {
        if (!this.occupancyTotalOpen) return;
        this.commissionApproxOpen = (target as HTMLInputElement).checked;
        void saveCommissionApproxOpen(this.commissionApproxOpen);
        this.scheduleHistoryDraftSync();
        this.render();
        return;
      }

      if (target.classList.contains('tce-commission-kind-radio')) {
        const value = (target as HTMLInputElement).value;
        this.commissionApproxKind =
          value === 'freelance' || value === 'agency' ? value : null;
        void saveCommissionApproxKind(this.commissionApproxKind);
        this.scheduleHistoryDraftSync();
        this.render();
        return;
      }

      if (target.classList.contains('tce-pdf-insurance-annex')) {
        this.pdfInsuranceAnnex = (target as HTMLInputElement).checked;
        void savePdfInsuranceAnnex(this.pdfInsuranceAnnex);
        return;
      }

      if (target.classList.contains('tce-show-trm-quote')) {
        this.showTrmInQuote = (target as HTMLInputElement).checked;
        void saveShowTrmInQuote(this.showTrmInQuote);
        return;
      }

      if (target.classList.contains('tce-ta-type')) {
        const type = (target as HTMLSelectElement).value as TaType;
        this.applyTaType(type, true);
        const feesEl = this.shadow.querySelector('.tce-fees');
        if (feesEl) feesEl.innerHTML = this.renderFees();
        const totalsEl = this.shadow.querySelector('.tce-totals');
        if (totalsEl) totalsEl.innerHTML = this.renderTotals();
        return;
      }

      if (target.classList.contains('tce-usd-equiv-check')) {
        this.includeUsdEquiv = (target as HTMLInputElement).checked;
        void saveIncludeUsdEquiv(this.includeUsdEquiv);
        this.showQuotePreview();
        return;
      }

      if (target.classList.contains('tce-hotels-as-options')) {
        this.hotelsAsOptions = (target as HTMLInputElement).checked;
        void saveHotelsAsOptions(this.hotelsAsOptions);
        if (this.hotelsAsOptions) this.syncHotelOptionGroups();
        this.render();
        return;
      }

      if (target.classList.contains('tce-opp-select')) {
        this.pickOpportunity((target as HTMLSelectElement).value);
        return;
      }

      if (!target.classList.contains('tce-quote-check')) return;
      const input = target as HTMLInputElement;
      const lineId = input.dataset.lineId;
      if (!lineId) return;
      void this.toggleQuoteLine(lineId, input.checked);
    });

    root.addEventListener('input', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target.classList.contains('tce-agency-input')) {
        this.agencyName = (target as HTMLInputElement).value;
        void saveAgencyName(this.agencyName);
        return;
      }

      if (target.classList.contains('tce-client-input')) {
        this.clientName = (target as HTMLInputElement).value;
        this.selectedContactId = null;
        this.selectedCrmContactId = null;
        void saveClientName(this.clientName);
        this.scheduleContactSearch(this.clientName);
        return;
      }

      if (target.classList.contains('tce-contact-phone-input')) {
        this.selectedContactPhone = (target as HTMLInputElement).value;
        this.selectedContactId = null;
        const q = this.selectedContactPhone.trim().length >= 2
          ? this.selectedContactPhone
          : this.clientName;
        this.scheduleContactSearch(q);
        this.scheduleOpportunityRefresh();
        return;
      }

      if (target.classList.contains('tce-email-input')) {
        this.clientEmail = (target as HTMLInputElement).value;
        void saveClientEmail(this.clientEmail);
        return;
      }

      if (target.classList.contains('tce-initial-deposit')) {
        this.initialDeposit = (target as HTMLInputElement).value;
        void saveInitialDeposit(this.initialDeposit);
        return;
      }

      if (target.classList.contains('tce-brief-date')) {
        this.refreshBriefingNightsLabel();
        this.refreshBriefingSaveButton();
        return;
      }

      if (
        target.id === 'tce-brief-origin' ||
        target.id === 'tce-brief-dest' ||
        (target as HTMLElement).hasAttribute('data-child-age') ||
        (target as HTMLElement).hasAttribute('data-room-kind')
      ) {
        const next = readRoomPlanFromRoot(this.shadow);
        if (this.quoteMode === 'wholesale' && this.panelTab === 'accommodation') {
          this.persistOccupancyRoomPlan(next);
          if ((target as HTMLElement).hasAttribute('data-room-kind')) this.render();
          else {
            const totals = this.shadow.querySelector('.tce-accommodation-totals');
            const paxEl = this.shadow.querySelector('.tce-accommodation-pax');
            if (totals) {
              totals.innerHTML = `<div class="tce-accommodation-totals-title">Valor total según acomodación</div>${this.renderOccupancyMixTotals()}`;
            }
            if (paxEl) {
              const { adults, children } = summarizeRoomPlan(next);
              const paxLabel =
                children > 0
                  ? `${adults} adulto${adults !== 1 ? 's' : ''} + ${children} niño${children !== 1 ? 's' : ''}`
                  : `${adults} adulto${adults !== 1 ? 's' : ''}`;
              paxEl.innerHTML = `Viajeros del mix: <strong>${this.escape(paxLabel)}</strong>`;
            }
            const cov = this.shadow.querySelector('.tce-coverage');
            if (cov) cov.outerHTML = this.renderQuoteCoverageStrip();
          }
          return;
        }
        if ((target as HTMLElement).hasAttribute('data-room-kind')) {
          const wrap = this.shadow.querySelector('.tce-room-plan-wrap');
          if (wrap) {
            wrap.innerHTML = this.roomPlanWrapHtml(next);
          }
        }
        this.refreshBriefingSaveButton();
        return;
      }

      if (target.classList.contains('tce-occ-input')) {
        const input = target as HTMLInputElement;
        const itemId = input.dataset.itemId;
        const field = input.dataset.occField as 'sglPp' | 'dblPp' | 'tplPp' | 'chd' | undefined;
        if (!itemId || !field) return;
        const parsed = parseFloat(input.value);
        this.updateHotelOccupancyField(
          itemId,
          field,
          Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
        );
        return;
      }

      if (target.classList.contains('tce-trm-input') && target.id === 'tce-trm-sup') {
        const input = target as HTMLInputElement;
        const parsed = parseFloat(input.value);
        this.trmSuplemento = normalizeTrmSuplemento(
          Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
        );
        void saveTrmSuplemento(this.trmSuplemento);
        if (this.taSelection.type === 'internacional') {
          this.taSelection = {
            ...this.taSelection,
            unitCop: resolveTaUnitCop(this.taConfig, 'internacional', this.getEffectiveTrm()),
          };
          void saveTaSelection(this.taSelection);
          const unitEl = this.shadow.querySelector('#tce-ta-unit') as HTMLInputElement | null;
          if (unitEl && this.panelTab === 'total') {
            unitEl.value = String(this.copAmountToDisplay(this.taSelection.unitCop));
          }
        }
        const totalsEl = this.shadow.querySelector('.tce-totals');
        if (totalsEl) totalsEl.innerHTML = this.renderTotals();
        const hint = this.shadow.querySelector('.tce-trm-hint');
        if (hint) {
          const eff = this.getEffectiveTrm();
          hint.textContent =
            this.trmRate > 0
              ? `usada ${formatTrmRate(eff)} (+${Math.round(this.trmSuplemento).toLocaleString('es-CO')})`
              : '';
        }
        return;
      }

      if (target.classList.contains('tce-trm-input') && target.id === 'tce-trm-input') {
        const input = target as HTMLInputElement;
        const parsed = parseFloat(input.value);
        this.trmRate = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
        if (this.trmRate > 0) {
          const state: TrmState = {
            rate: this.trmRate,
            date: todayIso(),
            source: 'manual',
            updatedAt: Date.now(),
          };
          void saveTrm(state);
          if (this.taSelection.type === 'internacional') {
            this.taSelection = {
              ...this.taSelection,
              unitCop: resolveTaUnitCop(this.taConfig, 'internacional', this.getEffectiveTrm()),
            };
            void saveTaSelection(this.taSelection);
            const unitEl = this.shadow.querySelector('#tce-ta-unit') as HTMLInputElement | null;
            if (unitEl && this.panelTab === 'total') {
              unitEl.value = String(this.copAmountToDisplay(this.taSelection.unitCop));
            }
            const totalsEl = this.shadow.querySelector('.tce-totals');
            if (totalsEl) totalsEl.innerHTML = this.renderTotals();
          }
        } else if (this.displayCurrency === 'USD') {
          this.displayCurrency = 'COP';
          void saveDisplayCurrency('COP');
          this.render();
        }
        return;
      }

      if (target.classList.contains('tce-ta-unit')) {
        const input = target as HTMLInputElement;
        const parsed = parseFloat(input.value);
        const displayVal = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
        this.taSelection = {
          ...this.taSelection,
          unitCop: this.displayAmountToCop(displayVal),
        };
        void saveTaSelection(this.taSelection);
        const totalsEl = this.shadow.querySelector('.tce-totals');
        if (totalsEl) totalsEl.innerHTML = this.renderTotals();
        const summary = this.shadow.querySelector('.tce-ta-summary');
        if (summary) {
          const pax = this.getTaPaxCount();
          const primaryCurrency = this.displayCurrency;
          const taUnitDisplay = this.getTaUnitDisplay();
          const taTotalDisplay = this.copAmountToDisplay(this.getTaTotal());
          const taSummary =
            this.quoteMode === 'wholesale'
              ? `TA por persona (sumada a tarifa pp) =
                <strong>${this.escape(this.formatPrice(primaryCurrency, taUnitDisplay))}</strong>`
              : `TA × ${pax} pasajero${pax !== 1 ? 's' : ''} =
                <strong>${this.escape(this.formatPrice(primaryCurrency, taTotalDisplay))}</strong>`;
          summary.innerHTML = `
            ${taSummary}
            <button type="button" class="tce-ta-suggest" data-action="ta-from-flight"
              title="Sugerir tipo según el vuelo del carrito">Según vuelo</button>
          `;
        }
        return;
      }

      if (target.classList.contains('tce-item-adj-input')) {
        const input = target as HTMLInputElement;
        const itemId = input.dataset.itemId;
        const adj = input.dataset.adj as 'mayorValor' | 'redondeo' | undefined;
        if (!itemId || (adj !== 'mayorValor' && adj !== 'redondeo')) return;
        const parsed = parseFloat(input.value);
        const displayVal = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
        const value = this.displayAmountToCop(displayVal);
        this.items = this.items.map((item) =>
          item.id === itemId ? { ...item, [adj]: value } : item
        );
        void this.saveToStorage();
        const lineItem = this.items.find((i) => i.id === itemId);
        if (lineItem) {
          const line = this.getItemLineTotal(lineItem);
          const label = this.formatPrice(line.currency, line.price);
          const totalEl = this.shadow.querySelector(
            `.tce-item-line-total[data-item-id="${CSS.escape(itemId)}"]`
          );
          if (totalEl) {
            const { pax, breakdown } = this.serviceBreakdownPax(lineItem);
            totalEl.innerHTML = `<strong>${this.escape(
              formatServiceItemTotal(line.currency, line.price, pax, breakdown)
            )}</strong>`;
          }
          const priceEl = this.shadow.querySelector(
            `.tce-item[data-id="${CSS.escape(itemId)}"] .tce-item-price`
          );
          if (priceEl) priceEl.textContent = label;
        }
        const totalsEl = this.shadow.querySelector('.tce-totals');
        if (totalsEl) totalsEl.innerHTML = this.renderTotals();
        return;
      }

      if (!target.classList.contains('tce-fee-input')) return;

      const input = target as HTMLInputElement;
      const feeId = input.dataset.feeId;
      if (!feeId) return;

      const parsed = parseFloat(input.value);
      const displayVal = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      this.fees[feeId] = this.displayAmountToCop(displayVal);
      void this.saveFees();

      // Update only the totals so the input keeps focus while typing.
      const totalsEl = this.shadow.querySelector('.tce-totals');
      if (totalsEl) totalsEl.innerHTML = this.renderTotals();
    });
  }
}
