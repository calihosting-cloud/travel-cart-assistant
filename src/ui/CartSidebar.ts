import {
  ActivityCartItem,
  CartItem,
  FlightCartItem,
  HotelCartItem,
  InsuranceCartItem,
  SearchContext,
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
  commitQuoteNumber,
  formatQuoteRef,
  loadAdvisorName,
  loadClientName,
  loadHistory,
  loadIncludeUsdEquiv,
  loadPendingQuoteNumber,
  peekNextQuoteNumber,
  saveAdvisorName,
  saveClientName,
  saveIncludeUsdEquiv,
  savePendingQuoteNumber,
  upsertHistory,
} from '../shared/quoteHistory';
import {
  DEFAULT_TRM_SUPLEMENTO,
  DisplayCurrency,
  copToUsd,
  effectiveTrm,
  loadDisplayCurrency,
  loadTrm,
  loadTrmSuplemento,
  normalizeDisplayCurrency,
  normalizeTrmSuplemento,
  saveDisplayCurrency,
  saveTrm,
  todayIso,
  TRM_KEY,
  TRM_REFERENCE_PAGE,
  TRM_SUPLEMENTO_KEY,
  TrmState,
  usdToCop,
} from '../shared/trm';
import { appendAppLog } from '../shared/appLog';
import {
  TRIP_GUIDE_KEY,
  clearTripGuide,
  loadTripGuide,
  saveTripGuide,
} from '../shared/tripGuide';
import {
  HotelCompareOptionGroup,
  loadHotelCompareGroups,
  loadHotelsAsOptions,
  newHotelCompareGroupId,
  saveHotelCompareGroups,
  saveHotelsAsOptions,
} from '../shared/quoteOptions';
import { buildWhatsAppQuote } from './QuoteBuilder';
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
  private panelTab: 'items' | 'total' | 'whatsapp' | 'history' = 'items';
  /** Item ids currently expanded in the Productos list (default = collapsed). */
  private expandedIds = new Set<string>();
  /** Wider panel for reading WhatsApp / totals comfortably. */
  private panelWide = false;
  private isOpen = false;
  private advisorName = '';
  private clientName = '';
  private includeUsdEquiv = false;
  private hotelsAsOptions = false;
  /** When comparing: each group is a column (Opción N) with one or more hotels. */
  private hotelOptionGroups: HotelCompareOptionGroup[] = [];
  /** Unify cart prices/totals to one currency (TRM converts the other). */
  private displayCurrency: DisplayCurrency = 'COP';
  private trmRate = 0;
  private trmSuplemento = DEFAULT_TRM_SUPLEMENTO;
  private history: HistoryEntry[] = [];
  private pendingQuoteNumber: number | null = null;
  private taConfig: TaConfig = defaultTaConfig();
  private taSelection: TaSelection = defaultTaSelection();
  /** While typing TRM / fees / TA, skip full re-renders from storage echoes. */
  private suppressNumberFieldRerender = false;

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
    this.includeUsdEquiv = await loadIncludeUsdEquiv();
    this.hotelsAsOptions = await loadHotelsAsOptions();
    this.hotelOptionGroups = await loadHotelCompareGroups();
    this.syncHotelOptionGroups();
    this.pendingQuoteNumber = await loadPendingQuoteNumber();
    this.displayCurrency = await loadDisplayCurrency();
    const trm = await loadTrm();
    if (trm) this.trmRate = trm.rate;
    this.trmSuplemento = await loadTrmSuplemento();
    this.taConfig = await loadTaConfig();
    this.taSelection = await loadTaSelection();
    this.history = await loadHistory();
    this.watchTrmStorage();
    this.watchTaStorage();
    this.render();
    // Ask background to pull TRM from dolar-colombia.com (non-blocking).
    try {
      chrome.runtime.sendMessage({ type: 'TCE_REFRESH_TRM', force: false }, () => undefined);
    } catch {
      // ignore
    }
  }

  private getEffectiveTrm(): number {
    return effectiveTrm(this.trmRate, this.trmSuplemento);
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
    this.items.push(item);
    this.expandedIds.add(item.id);
    if (item.type === 'hotel' && this.hotelsAsOptions) {
      this.syncHotelOptionGroups();
      // New hotels start unassigned so the advisor picks option chips.
    }
    if (item.type === 'hotel') {
      const ages = item.occupancy.flatMap((o) => o.childrenAges ?? []);
      const children = item.occupancy.reduce((s, o) => s + o.children, 0);
      this.enrichTripGuideChildAges(ages, children);
    }
    await this.saveToStorage();
    this.isOpen = true;
    this.panelTab = 'items';
    this.render();
    this.highlightLatest();
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
      if (!this.tripGuide) {
        this.tripGuide = ctx;
        void saveTripGuide(ctx);
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
   * When the sticky flight guide has no ages yet (or BM updates them),
   * persist ages into `tce_trip_guide` so the header shows them.
   */
  private enrichTripGuideChildAges(ages: number[] | undefined | null, children?: number): void {
    if (!this.tripGuide) return;
    const clean = this.normalizeChildAges(ages);
    if (clean.length === 0) return;
    const prev = this.normalizeChildAges(this.tripGuide.childrenAges);
    const same =
      prev.length === clean.length && prev.every((a, i) => a === clean[i]);
    const nextChildren =
      children != null && children > 0
        ? children
        : Math.max(this.tripGuide.totalChildren, clean.length);
    if (same && this.tripGuide.totalChildren === nextChildren) return;

    this.tripGuide = {
      ...this.tripGuide,
      childrenAges: clean,
      totalChildren: nextChildren,
      rooms:
        this.tripGuide.rooms.length > 0
          ? this.tripGuide.rooms.map((r, i) =>
              i === 0 ? { ...r, childrenAges: clean, children: nextChildren } : r
            )
          : [{ adults: this.tripGuide.totalAdults, children: nextChildren, childrenAges: clean }],
    };
    void saveTripGuide(this.tripGuide);
  }

  /** Context shown in the header: sticky flight guide wins; ages may come from BM/hotel. */
  private headerSearchContext(): SearchContext | null {
    const guide = this.tripGuide;
    const search = this.searchContext;
    if (!guide) return search;

    const guideAges = this.normalizeChildAges(guide.childrenAges);
    if (guideAges.length > 0) return guide;

    const fromSearch = this.normalizeChildAges(search?.childrenAges);
    if (fromSearch.length > 0) {
      return {
        ...guide,
        childrenAges: fromSearch,
        totalChildren: Math.max(guide.totalChildren, search?.totalChildren ?? 0, fromSearch.length),
      };
    }

    const fromHotels = this.normalizeChildAges(
      this.items
        .filter((i): i is HotelCartItem => i.type === 'hotel')
        .flatMap((h) => h.occupancy.flatMap((o) => o.childrenAges ?? []))
    );
    if (fromHotels.length > 0) {
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
    this.clientName = '';
    this.applyTaType('nacional_rt', true);
    await this.saveToStorage();
    await this.clearSearchContextStorage();
    await clearTripGuide();
    await this.saveFees();
    await savePendingQuoteNumber(null);
    await saveClientName('');
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
    const subtotals = this.getTotalsByCurrency();
    const primaryCurrency = this.getPrimaryCurrency(subtotals) || 'COP';
    const itemsTotal = subtotals.get(primaryCurrency) || 0;
    const entry: HistoryEntry = {
      id: `hist_${quoteNumber}_${Date.now()}`,
      quoteNumber,
      advisorName: this.advisorName,
      clientName: this.clientName.trim() || undefined,
      destination: this.headerSearchContext()?.destinationText,
      searchContext: this.headerSearchContext(),
      items: [...this.items],
      fees: { ...this.fees },
      taTotal: this.getTaTotal() || undefined,
      trm: this.getEffectiveTrm() || undefined,
      grandTotal: itemsTotal + this.getFeesTotal(),
      primaryCurrency,
      createdAt: Date.now(),
    };
    await upsertHistory(entry);
    this.history = await loadHistory();
    void appendAppLog('info', `Historial: ${reason} ${formatQuoteRef(quoteNumber)}`);
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

  private togglePanelWidth(): void {
    this.panelWide = !this.panelWide;
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
      if (row && typeof row === 'object' && row.type) return row as CartItem;
      return { ...(row as object), type: 'hotel' as const } as CartItem;
    });
    const ids = new Set(this.items.map((i) => i.id));
    for (const id of [...this.expandedIds]) {
      if (!ids.has(id)) this.expandedIds.delete(id);
    }
    if (this.items.length === 0) this.panelTab = 'items';
    this.syncHotelOptionGroups();
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
   * Wingo, etc.): when another page writes `tce_cart_items` / fees, refresh UI.
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
          // Own saveToStorage() while editing item mayor valor / redondeo:
          // avoid full re-render (focus loss); only refresh grand totals.
          if (this.suppressNumberFieldRerender) {
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
          // Our own saveFees() echoes here. A full render recreates the input and
          // steals focus after every digit — only refresh totals while typing.
          if (this.suppressNumberFieldRerender) {
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

  private async saveToStorage(): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: this.items });
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
          this.tripGuide = next?.sourceType === 'flight' ? next : null;
          dirty = true;
        }
        if (changes[SEARCH_KEY]) {
          const next = changes[SEARCH_KEY].newValue as SearchContext | undefined;
          if (!next) {
            this.searchContext = null;
          } else if (next.sourceType !== 'flight') {
            this.searchContext = next;
            this.enrichTripGuideChildAges(next.childrenAges, next.totalChildren);
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
      await chrome.storage.local.set({ [FEES_KEY]: this.fees });
    } catch {
      // storage unavailable
    }
  }

  private getFeesTotal(): number {
    const base = FEE_DEFINITIONS.reduce((sum, def) => sum + (this.fees[def.id] || 0), 0);
    return this.copAmountToDisplay(base + this.getTaTotal());
  }

  /** Passengers that pay TA (adults + children + infants). */
  private getTaPaxCount(): number {
    const candidates: number[] = [];
    for (const item of this.items) {
      if (item.type === 'flight') {
        candidates.push(item.adults + item.children + item.infants);
      } else if (item.type === 'hotel') {
        candidates.push(
          item.occupancy.reduce((sum, room) => sum + room.adults + room.children, 0)
        );
      } else if (item.type === 'transfer' || item.type === 'activity') {
        candidates.push(item.adults + item.children);
      } else if (item.type === 'insurance') {
        candidates.push(item.passengers);
      }
    }
    if (this.tripGuide) {
      candidates.push(this.tripGuide.totalAdults + this.tripGuide.totalChildren);
    }
    if (this.searchContext) {
      candidates.push(
        this.searchContext.totalAdults + this.searchContext.totalChildren
      );
    }
    const max = Math.max(0, ...candidates);
    return max > 0 ? max : Math.max(1, this.items.length > 0 ? 1 : 0);
  }

  private getTaTotal(): number {
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
    const target = this.displayCurrency;
    const from = (fromCurrency || 'COP').toUpperCase();
    if (from === target) return { currency: target, price: amount };

    const eff = this.getEffectiveTrm();
    if (!(eff > 0)) return { currency: target, price: amount };

    if (from === 'USD' && target === 'COP') {
      return { currency: 'COP', price: usdToCop(amount, eff) };
    }
    if (from === 'COP' && target === 'USD') {
      return { currency: 'USD', price: copToUsd(amount, eff) };
    }
    // No exchange source for other currencies (e.g. CLP): keep the native
    // currency and amount rather than silently relabeling it as COP/USD.
    return { currency: from, price: amount };
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
    return `${currency} ${price.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  private roomCapacityLabel(adults: number, children: number): string {
    const n = adults + children;
    if (n <= 1) return 'Sencilla';
    if (n === 2) return 'Doble';
    if (n === 3) return 'Triple';
    if (n === 4) return 'Cuádruple';
    return `${n} personas`;
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

    if (changed) void saveHotelCompareGroups(this.hotelOptionGroups);
  }

  private addHotelOptionGroup(): void {
    this.hotelOptionGroups.push({ id: newHotelCompareGroupId(), hotelIds: [] });
    void saveHotelCompareGroups(this.hotelOptionGroups);
    this.render();
  }

  private removeHotelOptionGroup(optionId: string): void {
    if (this.hotelOptionGroups.length <= 1) return;
    this.hotelOptionGroups = this.hotelOptionGroups.filter((g) => g.id !== optionId);
    void saveHotelCompareGroups(this.hotelOptionGroups);
    this.render();
  }

  private toggleHotelInOption(optionId: string, hotelId: string): void {
    const group = this.hotelOptionGroups.find((g) => g.id === optionId);
    if (!group) return;
    const idx = group.hotelIds.indexOf(hotelId);
    if (idx >= 0) group.hotelIds.splice(idx, 1);
    else group.hotelIds.push(hotelId);
    void saveHotelCompareGroups(this.hotelOptionGroups);
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

  private renderHotelCompareBlock(opts?: { compact?: boolean }): string {
    if (!this.hotelsAsOptions) return '';
    this.syncHotelOptionGroups();
    const priced = this.getHotelCompareOptions();
    const pax = Math.max(1, this.getTaPaxCount());

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
                  const roomRaw = rate.roomType?.trim() || '';
                  const roomShort =
                    roomRaw.length > 70 ? `${roomRaw.slice(0, 70)}…` : roomRaw;
                  const board = rate.boardBasis?.trim() || '';
                  const roomLine = [roomShort, board].filter(Boolean).join(' · ');
                  return `
            <div class="tce-compare-hotel-line">
              <span class="tce-compare-hotel-name">${this.escape(h.hotelName)}</span>
              ${
                roomLine
                  ? `<span class="tce-compare-hotel-room" title="${this.escape(
                      [rate.roomType, rate.boardBasis].filter(Boolean).join(' · ')
                    )}">${this.escape(roomLine)}</span>`
                  : ''
              }
              <span class="tce-compare-hotel-nights">${h.nights}n · ${this.escape(h.checkIn)}→${this.escape(h.checkOut)}</span>
            </div>`;
                })
                .join('');
        const prices = pricedOpt
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
          ${hotelRows}
          ${prices}
        </div>`;
      })
      .join('');

    return `
      <div class="tce-compare-hotels${opts?.compact ? ' tce-compare-hotels--compact' : ''}">
        <div class="tce-compare-title-row">
          <div class="tce-compare-title">Comparar hoteles · ${this.hotelOptionGroups.length} opción${this.hotelOptionGroups.length !== 1 ? 'es' : ''}</div>
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
        cursor: pointer;
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
      .tce-tab--open { right: 340px; }
      .tce-tab--open.tce-tab--wide { right: 700px; }
      .tce-tab--open.tce-tab--compare { right: 900px; }

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
      .tce-panel--wide { width: 700px; }
      .tce-panel--compare { width: 900px; }

      .tce-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        padding: 6px 10px;
        background: #1e40af;
        color: #fff;
        flex-shrink: 0;
        gap: 6px 8px;
      }
      .tce-header-title {
        display: flex;
        align-items: baseline;
        flex-wrap: nowrap;
        gap: 5px;
        min-width: 0;
        flex: 0 1 auto;
        overflow: hidden;
      }
      .tce-header h2 {
        margin: 0;
        font-size: 13px;
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
        align-items: center;
        gap: 5px;
        flex: 1 1 120px;
        min-width: 90px;
        max-width: 260px;
      }
      .tce-panel:not(.tce-panel--wide):not(.tce-panel--compare) .tce-header-client {
        flex: 1 1 calc(100% - 72px);
        max-width: none;
        order: 3;
      }
      .tce-panel:not(.tce-panel--wide):not(.tce-panel--compare) .tce-header-actions {
        order: 2;
        margin-left: auto;
      }
      .tce-panel:not(.tce-panel--wide):not(.tce-panel--compare) .tce-hotel-options-toggle {
        order: 4;
      }
      .tce-header-client label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.3px;
        opacity: 0.9;
        flex-shrink: 0;
      }
      .tce-client-input {
        flex: 1;
        min-width: 0;
        border: 1px solid rgba(255,255,255,0.35);
        border-radius: 5px;
        padding: 4px 7px;
        font-size: 12px;
        color: #0f172a;
        background: #fff;
      }
      .tce-client-input:focus {
        outline: none;
        border-color: #facc15;
        box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.35);
      }
      .tce-header-actions {
        display: flex;
        align-items: center;
        gap: 5px;
        flex-shrink: 0;
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
        width: 64px;
        border: 1px solid #fbbf24;
        border-radius: 5px;
        padding: 3px 5px;
        font-size: 11px;
        font-weight: 700;
        color: #78350f;
        background: #fffbeb;
      }
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
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 2px;
      }
      .tce-compare-column {
        flex: 1 0 150px;
        min-width: 150px;
        max-width: 220px;
        background: #fff;
        border: 1px solid #bfdbfe;
        border-radius: 8px;
        padding: 8px;
      }
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
      .tce-compare-hotel-line {
        font-size: 11px;
        color: #334155;
        margin-bottom: 6px;
        padding-bottom: 6px;
        border-bottom: 1px dashed #e2e8f0;
      }
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
      .tce-close:hover { background: rgba(255,255,255,0.25); }
      .tce-width-toggle {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: -1px;
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

      .tce-flight-leg {
        background: #f1f5f9;
        border-radius: 8px;
        padding: 8px 10px;
        margin-bottom: 6px;
      }
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
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
        font-size: 13px;
      }
      .tce-total-row--sub {
        color: #64748b;
        font-size: 12px;
      }

      .tce-fees {
        margin-bottom: 10px;
        padding-bottom: 10px;
        border-bottom: 1px dashed #e2e8f0;
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
      .tce-totals { margin-bottom: 10px; }
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
      .tce-quote-preview-label {
        font-size: 11px;
        font-weight: 700;
        color: #15803d;
        margin: 0;
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

    if (!expanded) {
      return `
        <div class="tce-item tce-item--truncated" data-id="${id}">
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
            ${openLink}
            <button class="tce-remove" data-action="remove" data-id="${id}" title="Quitar">✕</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="tce-item" data-id="${id}">
        <div class="tce-item-head" style="margin-bottom:6px">
          <button type="button" class="tce-item-toggle" data-action="toggle-item"
            data-id="${id}" title="${toggleTitle}" aria-expanded="true">${toggleLabel}</button>
          <div class="tce-item-summary">
            <p class="tce-item-summary-type" style="margin:0">${this.escape(opts.typeLabel)}</p>
            ${extra}
          </div>
          ${openLink}
          <button class="tce-remove" data-action="remove" data-id="${id}" title="Quitar">✕</button>
        </div>
        <div class="tce-item-details">
          ${opts.detailsHtml}
          ${this.renderItemAdjustments(opts.item)}
        </div>
      </div>
    `;
  }

  private renderItemAdjustments(item: CartItem): string {
    const adj = this.getItemAdjustmentsDisplay(item);
    const line = this.getItemLineTotal(item);
    const base = this.getItemBasePrice(item);
    const native = this.getItemPrice(item);
    const id = this.escape(item.id);
    const step = this.displayCurrency === 'USD' ? '0.01' : '100';
    const nativeHint =
      native.currency !== this.displayCurrency
        ? `<div class="tce-item-adjust-base">Original: ${this.escape(this.formatPrice(native.currency, native.price))}</div>`
        : '';
    return `
      <div class="tce-item-adjust">
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
          />
        </div>
        <div class="tce-item-adjust-row">
          <span class="tce-item-adjust-label">
            <label for="tce-item-redondeo-${id}">Redondeo (${this.displayCurrency})</label>
            <button
              type="button"
              class="tce-item-round-btn"
              data-action="round-item"
              data-id="${id}"
              title="Redondear este ítem a la siguiente ${this.displayCurrency === 'USD' ? 'decena de dólares' : 'decena de mil'} (base + mayor valor)"
            >${this.displayCurrency === 'USD' ? '10$' : '10k'}</button>
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
        <div class="tce-item-adjust-base">Base: ${this.escape(this.formatPrice(base.currency, base.price))}</div>
        ${nativeHint}
        <div class="tce-item-line-total" data-item-id="${id}">
          Total ítem: <strong>${this.escape(this.formatPrice(line.currency, line.price))}</strong>
        </div>
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

    const breakdownHtml = item.priceBreakdown.length
      ? `<div class="tce-price-breakdown">${item.priceBreakdown
          .map(
            (b) =>
              `${this.escape(b.description || b.code)}: ${this.escape(
                this.formatPrice(item.currency, b.amount)
              )}`
          )
          .join('<br>')}</div>`
      : '';
    const baggageHtml = item.baggageIncluded?.length
      ? `<div class="tce-price-breakdown"><strong>Equipaje incluido:</strong><br>${item.baggageIncluded
          .map((bag) => this.escape(bag))
          .join('<br>')}</div>`
      : '';

    const priceLabel = this.formatPrice(item.currency, item.price);
    const detailsHtml = `
      <div class="tce-item-top">
        <div class="tce-item-img tce-item-img--placeholder">✈️</div>
        <div>
          <p class="tce-item-name">${this.escape(item.title)}</p>
          <p class="tce-item-address">${this.escape(tripLabel)} · ${this.escape(pax.join(', '))}</p>
        </div>
      </div>
      ${dateRange ? `<div class="tce-dates"><strong>${this.escape(dateRange)}</strong></div>` : ''}
      ${legsHtml}
      ${baggageHtml}
      <div class="tce-item-footer">
        <div>
          <div class="tce-price">${this.escape(priceLabel)}</div>
          ${breakdownHtml}
        </div>
      </div>
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
    const stopsLabel = leg.stops === 0 ? 'Directo' : `${leg.stops} escala${leg.stops !== 1 ? 's' : ''}`;

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
      </div>
    `;
  }

  /** YYYY-MM-DD → DD-MM-YYYY (fallback to original). */
  private formatIsoDate(iso: string): string {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
  }

  private renderHotelItem(item: HotelCartItem): string {
    const rate = item.selectedRate;
    const stars = item.stars ? `<span class="tce-stars">${'★'.repeat(item.stars)}</span>` : '';
    const img = item.imageUrl
      ? `<img class="tce-item-img" src="${this.escape(item.imageUrl)}" alt="">`
      : `<div class="tce-item-img tce-item-img--placeholder">🏨</div>`;

    const roomShort = rate.roomType.length > 80
      ? rate.roomType.slice(0, 80) + '…'
      : rate.roomType;

    const priceLabel = this.formatPrice(rate.currency, rate.price);
    const roomsHint =
      rate.roomsCount && rate.roomsCount > 1
        ? ` · ${rate.roomsCount} habitaciones${
            rate.pricePerRoom
              ? ` (${this.formatPrice(rate.currency, rate.pricePerRoom)} c/u)`
              : ''
          }`
        : '';
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
        item.occupancy.length > 1
          ? item.occupancy
              .map(
                (room, i) =>
                  `<p class="tce-detail"><span class="tce-detail-label">Hab ${i + 1}:</span> ${this.escape(this.formatRoomOccupancy(room, i).replace(/^Hab \d+:\s*/, ''))}</p>`
              )
              .join('')
          : `<p class="tce-detail"><span class="tce-detail-label">Ocupación:</span> ${this.escape(this.formatOccupancy(item))}</p>`
      }
      <p class="tce-detail"><span class="tce-detail-label">Habitación:</span> ${this.escape(roomShort || (rate.roomsCount && rate.roomsCount > 1 ? `${rate.roomsCount} habitaciones` : '—'))}</p>
      ${rate.boardBasis ? `<p class="tce-detail"><span class="tce-detail-label">Régimen:</span> ${this.escape(rate.boardBasis)}</p>` : ''}
      <div class="tce-item-footer">
        <div>
          <div class="tce-price">${this.escape(priceLabel)}${this.escape(roomsHint)}</div>
          <div class="tce-supplier">${this.escape(rate.supplierName)}</div>
        </div>
      </div>
    `;

    return this.renderItemCard({
      item,
      typeLabel: 'Hotel',
      title: item.hotelName,
      meta: `${item.checkIn} → ${item.checkOut} · ${item.nights} noche${item.nights !== 1 ? 's' : ''}`,
      summaryExtraHtml: this.renderHotelOptionChips(item.id),
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

    return this.renderItemCard({
      item,
      typeLabel: 'Traslado',
      title: item.name,
      meta: `${item.from} → ${item.to} · ${tripLabel}`,
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
        ? `<div class="tce-supplier">USD ${item.priceUsd.toLocaleString('es-CO')} · TRM ${Math.round(this.getEffectiveTrm()).toLocaleString('es-CO')} (día+sup.)</div>`
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

  private escape(text: string): string {
    const el = document.createElement('span');
    el.textContent = text;
    return el.innerHTML;
  }

  private render(): void {
    const existing = this.shadow.querySelector('.tce-root');
    if (existing) existing.remove();

    const root = document.createElement('div');
    root.className = 'tce-root';

    const itemsHtml = this.items.length === 0
      ? `<div class="tce-empty">
           <div class="tce-empty-icon">🛒</div>
           <p>Tu carrito está vacío.<br>Agrega hoteles, traslados, actividades, seguros o vuelos con <strong>+ 🛒 GT</strong>.</p>
         </div>`
      : this.items.map((item) => this.renderItem(item)).join('');

    const tab = (id: 'items' | 'total' | 'whatsapp' | 'history', label: string) => `
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
      bodyHtml = `
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
    } else {
      bodyHtml = `<div class="tce-quote">${this.renderQuoteSection()}</div>`;
    }

    const compareWide = this.hotelsAsOptions && this.hotelOptionGroups.length > 0;
    const wideClass = `${this.panelWide ? ' tce-panel--wide' : ''}${compareWide ? ' tce-panel--compare' : ''}`;
    const tabWideClass = `${this.panelWide ? ' tce-tab--wide' : ''}${compareWide ? ' tce-tab--compare' : ''}`;
    const widthTitle = this.panelWide ? 'Reducir ancho' : 'Ampliar ancho';
    const widthIcon = this.panelWide ? '››' : '‹‹';
    const trmValue = this.trmRate > 0 ? String(Math.round(this.trmRate)) : '';
    const effTrm = this.getEffectiveTrm();
    const trmEffHint =
      this.trmRate > 0
        ? `${Math.round(effTrm).toLocaleString('es-CO')} (+${Math.round(this.trmSuplemento).toLocaleString('es-CO')})`
        : '';

    const ctx = this.headerSearchContext();
    const routeSummary =
      (ctx && this.formatSearchSummary(ctx)) ||
      (this.resolveOriginLabel() ? this.escape(this.resolveOriginLabel()!) : '');
    const routeLabel = this.tripGuide ? 'Guía' : routeSummary ? 'Ruta' : '';

    root.innerHTML = `
      <button class="tce-tab ${this.isOpen ? 'tce-tab--open' : ''}${tabWideClass}" data-action="toggle">
        🛒 Asistente
        ${this.items.length > 0 ? `<span class="tce-badge">${this.items.length}</span>` : ''}
      </button>
      <div class="tce-panel ${this.isOpen ? 'tce-panel--open' : ''}${wideClass}">
        <div class="tce-header">
          <div class="tce-header-title">
            <h2>Asistente de cotización</h2>
            <span class="tce-header-meta">${this.items.length} item${this.items.length !== 1 ? 's' : ''}${this.advisorName ? ` · ${this.escape(this.advisorName)}` : ''}</span>
          </div>
          <div class="tce-header-client">
            <label for="tce-client-input">Cliente</label>
            <input
              id="tce-client-input"
              class="tce-client-input"
              type="text"
              maxlength="120"
              placeholder="Nombre (historial)"
              value="${this.escape(this.clientName)}"
            />
          </div>
          <label class="tce-hotel-options-toggle" title="Comparar cada opción de hotel con su propio total">
            <input type="checkbox" class="tce-hotels-as-options" ${this.hotelsAsOptions ? 'checked' : ''}>
            Comparar
          </label>
          <div class="tce-header-actions">
            <button type="button" class="tce-width-toggle" data-action="toggle-width"
              title="${widthTitle}" aria-label="${widthTitle}">${widthIcon}</button>
            <button class="tce-close" data-action="toggle" title="Cerrar">✕</button>
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
              value="${trmValue}" placeholder="COP" title="TRM del día" />
            <button type="button" class="tce-trm-refresh" data-action="refresh-trm"
              title="Actualizar TRM desde dolar-colombia.com">web</button>
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
                ? `<span class="tce-trm-hint" title="TRM usada = día + suplemento · ${TRM_REFERENCE_PAGE}">${trmEffHint}</span>`
                : ''
            }
          </div>
        </div>
        <nav class="tce-panel-tabs" role="tablist">
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
    if (this.panelTab === 'whatsapp' && this.items.length > 0) {
      this.showQuotePreview();
    }
  }

  private renderHistorySection(): string {
    if (this.history.length === 0) {
      return `<div class="tce-empty"><p>Aún no hay historial.<br>Se guarda al copiar WhatsApp o vaciar el carrito.</p></div>`;
    }
    return this.history.map((h) => this.renderHistoryEntry(h)).join('');
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
    const flight = h.items.find((i): i is FlightCartItem => i.type === 'flight');
    let adults = 0;
    let children = 0;
    let infants = 0;

    if (flight && flight.adults + flight.children + flight.infants > 0) {
      adults = flight.adults;
      children = flight.children;
      infants = flight.infants;
    } else {
      const hotel = h.items.find((i): i is HotelCartItem => i.type === 'hotel');
      if (hotel) {
        adults = hotel.occupancy.reduce((s, o) => s + o.adults, 0);
        children = hotel.occupancy.reduce((s, o) => s + o.children, 0);
      } else if (ctx) {
        adults = ctx.totalAdults;
        children = ctx.totalChildren;
      }
    }

    const parts: string[] = [];
    if (adults > 0) parts.push(`${adults} adulto${adults !== 1 ? 's' : ''}`);
    if (children > 0) parts.push(`${children} niño${children !== 1 ? 's' : ''}`);
    if (infants > 0) parts.push(`${infants} bebé${infants !== 1 ? 's' : ''}`);
    return parts.join(', ');
  }

  private formatHistoryOrigin(h: HistoryEntry): string | null {
    const flight = h.items.find((i): i is FlightCartItem => i.type === 'flight');
    if (flight) {
      const o = (flight.origin.name || flight.origin.code || '').trim();
      if (o) return o;
    }
    return h.searchContext?.originText?.trim() || null;
  }

  private formatHistoryDates(h: HistoryEntry): string | null {
    const ctx = h.searchContext;
    const hotel = h.items.find((i): i is HotelCartItem => i.type === 'hotel');
    const flight = h.items.find((i): i is FlightCartItem => i.type === 'flight');

    let checkIn = hotel?.checkIn || ctx?.checkIn;
    let checkOut = hotel?.checkOut || ctx?.checkOut;
    let nights = hotel?.nights || ctx?.nights;

    if ((!checkIn || !checkOut) && flight) {
      // flight dates may be ISO
      const toLabel = (iso?: string) => {
        if (!iso) return undefined;
        const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;
        return iso;
      };
      checkIn = checkIn || toLabel(flight.departureDate);
      checkOut = checkOut || toLabel(flight.returnDate);
    }

    if (!checkIn && !checkOut) return null;
    const range = checkOut ? `${checkIn} → ${checkOut}` : checkIn!;
    const nightBit =
      nights && nights > 0 ? ` · ${nights} noche${nights !== 1 ? 's' : ''}` : '';
    return `${range}${nightBit}`;
  }

  private renderHistoryServiceLines(h: HistoryEntry): string {
    const trm = h.trm;
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
          return `
            <div class="tce-history-svc">
              <div class="tce-history-svc-title">Hotel: ${this.escape(item.hotelName)}${item.stars ? ` · ${item.stars}★` : ''}</div>
              ${roomBits ? `<div class="tce-history-svc-line">${this.escape(roomBits)}</div>` : ''}
              <div class="tce-history-svc-line">${this.escape(item.checkIn)} → ${this.escape(item.checkOut)}${item.nights ? ` · ${item.nights} noche${item.nights !== 1 ? 's' : ''}` : ''} · ${this.escape(this.formatOccupancy(item))}</div>
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
    const rate = h.trm && h.trm > 0 ? h.trm : 0;
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
        ${h.clientName ? ` · ${this.escape(h.clientName)}` : ''}
        ${h.advisorName ? ` · Asesor: ${this.escape(h.advisorName)}` : ''}
        <div class="tce-history-trip">
          ${origin ? `<div>Origen: ${this.escape(origin)}</div>` : ''}
          <div>Destino: ${this.escape(dest)}</div>
          ${dates ? `<div>Fechas: ${this.escape(dates)}</div>` : ''}
          ${pax ? `<div>Viajeros: ${this.escape(pax)}</div>` : ''}
        </div>
        <div class="tce-history-meta">${this.escape(when)}${h.trm ? ` · TRM ${Math.round(h.trm).toLocaleString('es-CO')}` : ''}</div>
        <div class="tce-history-services">${this.renderHistoryServiceLines(h)}</div>
        ${feeLines.length ? `<div class="tce-history-fees">${feeLines.join('')}</div>` : ''}
        ${total ? `<div class="tce-history-total">Total: ${this.escape(total)}</div>` : ''}
      </div>`;
  }

  private renderQuoteSection(): string {
    const status =
      this.quoteCopyStatus === 'ok'
        ? '<div class="tce-quote-status">✓ Copiado — pégalo en WhatsApp</div>'
        : this.quoteCopyStatus === 'err'
          ? '<div class="tce-quote-status tce-quote-status--err">No se pudo copiar automático: selecciona el texto verde y Ctrl+C</div>'
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
        Mensaje listo para WhatsApp (gran total).
        <strong>Copiar WhatsApp</strong> o selecciona el texto verde y Ctrl+C.
      </p>
      <label class="tce-quote-opt">
        <input type="checkbox" class="tce-usd-equiv-check" ${this.includeUsdEquiv ? 'checked' : ''}>
        Incluir conversión COP ↔ USD (TRM) en el mensaje
      </label>
      <p class="tce-quote-preview-label">Texto para pegar en el chat</p>
      <textarea class="tce-quote-preview" readonly></textarea>
      <div class="tce-quote-actions">
        <button type="button" class="tce-quote-btn" data-action="copy-quote">Copiar WhatsApp</button>
        <button type="button" class="tce-quote-btn tce-quote-btn--secondary" data-action="preview-quote">Actualizar texto</button>
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

  private async buildCurrentQuote(): Promise<string> {
    await this.ensurePendingQuoteNumber();
    const subtotals = this.getTotalsByCurrency();
    const feesTotal = this.getFeesTotal();
    const primaryCurrency = this.getPrimaryCurrency(subtotals) || 'COP';
    const itemTotals = Object.fromEntries(
      this.items.map((item) => [item.id, this.getItemLineTotal(item).price])
    );
    return buildWhatsAppQuote({
      items: this.items,
      searchContext: this.headerSearchContext(),
      subtotals,
      feesTotal,
      primaryCurrency,
      quoteLines: this.quoteLines,
      quoteNumber: this.pendingQuoteNumber ?? undefined,
      advisorName: this.advisorName,
      trm: this.getEffectiveTrm() > 0 ? this.getEffectiveTrm() : undefined,
      includeUsdEquiv: this.includeUsdEquiv,
      hotelsAsOptions: this.hotelsAsOptions,
      hotelOptionGroups: this.hotelsAsOptions ? this.hotelOptionGroups : undefined,
      itemTotals,
    });
  }

  private async copyQuoteToClipboard(): Promise<void> {
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
    const statusEl = this.shadow.querySelector('.tce-quote-status');
    if (statusEl) {
      statusEl.className =
        'tce-quote-status' + (ok ? '' : ' tce-quote-status--err');
      statusEl.textContent = ok
        ? '✓ Copiado — pégalo en WhatsApp'
        : 'No se pudo copiar automático: selecciona el texto verde y Ctrl+C';
    }
    window.setTimeout(() => {
      this.quoteCopyStatus = 'idle';
    }, 4000);
  }

  private showQuotePreview(): void {
    const preview = this.shadow.querySelector('.tce-quote-preview') as HTMLTextAreaElement | null;
    if (!preview) return;
    void this.buildCurrentQuote().then((text) => {
      preview.value = text;
    });
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

    const feeRows = FEE_DEFINITIONS.map((def) => `
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
    `).join('');

    const taBlock = `
      <div class="tce-ta-block">
        <div class="tce-fee-row">
          <label for="tce-ta-type">Tipo TA</label>
          <select id="tce-ta-type" class="tce-ta-type">
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
            value="${this.copAmountToDisplay(this.taSelection.unitCop || 0)}"
          >
        </div>
        <div class="tce-ta-summary">
          TA × ${pax} pasajero${pax !== 1 ? 's' : ''} =
          <strong>${this.escape(this.formatPrice(primaryCurrency, taTotalDisplay))}</strong>
          <button type="button" class="tce-ta-suggest" data-action="ta-from-flight"
            title="Sugerir tipo según el vuelo del carrito">Según vuelo</button>
        </div>
        <div class="tce-ta-hint">${this.escape(taTypeLabel(type))}${
          type === 'internacional' && this.getEffectiveTrm() > 0
            ? ` · ${this.taConfig.internacionalUsd} USD × TRM ${Math.round(this.getEffectiveTrm()).toLocaleString('es-CO')} (día+sup.)`
            : ''
        }</div>
      </div>
    `;

    return feeRows + taBlock;
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
          <span>${Math.round(this.trmRate).toLocaleString('es-CO')} + ${Math.round(this.trmSuplemento).toLocaleString('es-CO')} = ${Math.round(eff).toLocaleString('es-CO')}</span>
        </div>
      `);
    }
    breakdownRows.push(`
      <div class="tce-total-row tce-total-row--sub">
        <span>Vista de montos</span>
        <span>Todo en ${this.displayCurrency}</span>
      </div>
    `);
    for (const [currency, value] of subtotals) {
      breakdownRows.push(`
        <div class="tce-total-row tce-total-row--sub">
          <span>Subtotal ${this.escape(currency)}</span>
          <span>${this.escape(this.formatPrice(currency, value))}</span>
        </div>
      `);
    }
    if (mayorValor > 0) {
      breakdownRows.push(`
        <div class="tce-total-row tce-total-row--sub">
          <span>Mayor valor cobrado</span>
          <span>${this.escape(this.formatPrice(primaryCurrency, mayorValor))}</span>
        </div>
      `);
    }
    if (taTotal > 0) {
      breakdownRows.push(`
        <div class="tce-total-row tce-total-row--sub">
          <span>TA × ${taPax} pax</span>
          <span>${this.escape(this.formatPrice(primaryCurrency, taTotal))}</span>
        </div>
      `);
    }

    const totalRows = Array.from(subtotals.entries()).map(([currency, value]) => {
      const total = currency === primaryCurrency ? value + feesTotal : value;
      const perPerson = Math.round(total / paxForRate);
      return { currency, total, perPerson };
    });

    const compareMode = this.hotelsAsOptions;

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
    const roundingHtml = `
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
   * Rounds this item (base + mayor valor) up to the next round unit
   * in the active display currency; stores redondeo as COP.
   */
  private async applyItemRounding(itemId: string): Promise<void> {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return;

    const base = this.getItemBasePrice(item);
    const mayorValor = this.getItemAdjustmentsDisplay(item).mayorValor;
    const beforeRound = base.price + mayorValor;
    const ROUND_UNIT = this.roundUnit();
    const rounded = Math.ceil(beforeRound / ROUND_UNIT) * ROUND_UNIT;
    const excessDisplay = Math.max(0, rounded - beforeRound);

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
      totalEl.innerHTML = `Total ítem: <strong>${this.escape(label)}</strong>`;
    }
    const priceEl = this.shadow.querySelector(
      `.tce-item[data-id="${CSS.escape(itemId)}"] .tce-item-price`
    );
    if (priceEl) priceEl.textContent = label;

    const totalsEl = this.shadow.querySelector('.tce-totals');
    if (totalsEl) totalsEl.innerHTML = this.renderTotals();
  }

  private bindEvents(root: HTMLElement): void {
    root.addEventListener('focusin', (e) => {
      const t = e.target as HTMLElement | null;
      if (
        t?.classList?.contains('tce-fee-input') ||
        t?.classList?.contains('tce-trm-input') ||
        t?.classList?.contains('tce-ta-unit') ||
        t?.classList?.contains('tce-item-adj-input') ||
        t?.classList?.contains('tce-client-input')
      ) {
        this.suppressNumberFieldRerender = true;
      }
    });
    root.addEventListener('focusout', (e) => {
      const t = e.target as HTMLElement | null;
      if (
        t?.classList?.contains('tce-fee-input') ||
        t?.classList?.contains('tce-trm-input') ||
        t?.classList?.contains('tce-ta-unit') ||
        t?.classList?.contains('tce-item-adj-input') ||
        t?.classList?.contains('tce-client-input')
      ) {
        // Defer so storage.onChanged from the last keystroke still sees the flag.
        window.setTimeout(() => {
          this.suppressNumberFieldRerender = false;
        }, 0);
      }
    });

    root.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
      if (!target) return;

      const action = target.dataset.action;
      if (action === 'toggle') {
        this.toggle();
      } else if (action === 'toggle-width') {
        this.togglePanelWidth();
      } else if (action === 'remove') {
        this.removeItem(target.dataset.id!);
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
          | 'whatsapp'
          | 'history'
          | undefined;
        if (next && next !== this.panelTab) {
          this.panelTab = next;
          this.quoteCopyStatus = 'idle';
          this.render();
        }
      } else if (action === 'refresh-trm') {
        void this.refreshTrmFromApi();
      } else if (action === 'copy-quote') {
        void this.copyQuoteToClipboard();
      } else if (action === 'preview-quote') {
        this.showQuotePreview();
      } else if (action === 'add-hotel-option') {
        this.addHotelOptionGroup();
      } else if (action === 'remove-hotel-option') {
        const optionId = target.dataset.optionId;
        if (optionId) this.removeHotelOptionGroup(optionId);
      } else if (action === 'toggle-hotel-option') {
        const optionId = target.dataset.optionId;
        const hotelId = target.dataset.hotelId;
        if (optionId && hotelId) this.toggleHotelInOption(optionId, hotelId);
      }
    });

    root.addEventListener('change', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

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

      if (!target.classList.contains('tce-quote-check')) return;
      const input = target as HTMLInputElement;
      const lineId = input.dataset.lineId;
      if (!lineId) return;
      void this.toggleQuoteLine(lineId, input.checked);
    });

    root.addEventListener('input', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target.classList.contains('tce-client-input')) {
        this.clientName = (target as HTMLInputElement).value;
        void saveClientName(this.clientName);
        return;
      }

      if (target.classList.contains('tce-trm-input')) {
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
          const taDisplay = this.copAmountToDisplay(this.getTaTotal());
          summary.innerHTML = `
            TA × ${pax} pasajero${pax !== 1 ? 's' : ''} =
            <strong>${this.escape(this.formatPrice(primaryCurrency, taDisplay))}</strong>
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
            totalEl.innerHTML = `Total ítem: <strong>${this.escape(label)}</strong>`;
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
