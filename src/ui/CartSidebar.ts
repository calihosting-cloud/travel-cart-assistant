import {
  CartItem,
  FlightCartItem,
  HotelCartItem,
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
import { buildWhatsAppQuote } from './QuoteBuilder';

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
  private fees: Record<string, number> = {};
  private quoteLines: QuoteLine[] = defaultQuoteLines();
  private quoteOpen = false;
  private quoteCopyStatus: 'idle' | 'ok' | 'err' = 'idle';
  private isOpen = false;

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
    this.loadSearchContext();
    this.watchSearchContext();
    this.loadFees();
    void this.loadQuoteLinesFromStorage();
    this.watchQuoteLines();
  }

  private defaultFees(): Record<string, number> {
    const fees: Record<string, number> = {};
    for (const def of FEE_DEFINITIONS) fees[def.id] = def.defaultValue;
    return fees;
  }

  async addItem(item: CartItem): Promise<void> {
    this.items.push(item);
    await this.saveToStorage();
    this.isOpen = true;
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
   * Updates the cart header summary in-memory only (does not write
   * `tce_last_search`, so BookingMotor hotel↔transfer sync is preserved).
   */
  setSearchContext(ctx: SearchContext): void {
    this.searchContext = ctx;
    this.render();
  }

  async removeItem(id: string): Promise<void> {
    this.items = this.items.filter((i) => i.id !== id);
    await this.saveToStorage();
    this.render();
  }

  async clearCart(): Promise<void> {
    this.items = [];
    await this.saveToStorage();
    this.render();
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
        this.items = stored.map((item) =>
          item.type ? item : { ...item, type: 'hotel' as const }
        );
        this.render();
      }
    } catch {
      // storage unavailable (e.g. test harness)
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
      const result = await chrome.storage.local.get(SEARCH_KEY);
      const stored = result[SEARCH_KEY] as SearchContext | undefined;
      if (stored) {
        this.searchContext = stored;
        this.render();
      }
    } catch {
      // storage unavailable
    }
  }

  private watchSearchContext(): void {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes[SEARCH_KEY]) return;
        this.searchContext = (changes[SEARCH_KEY].newValue as SearchContext) ?? null;
        this.render();
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

      const migrated = this.defaultFees();
      if (typeof stored[MAYOR_VALOR_ID] === 'number') {
        migrated[MAYOR_VALOR_ID] = Math.max(0, stored[MAYOR_VALOR_ID]);
      } else if (typeof stored.fee_ejemplo_1 === 'number') {
        // Legacy: rounding used to overwrite mayor valor — keep it there as advisor amount.
        migrated[MAYOR_VALOR_ID] = Math.max(0, stored.fee_ejemplo_1);
      }
      if (typeof stored[REDONDEO_ID] === 'number') {
        migrated[REDONDEO_ID] = Math.max(0, stored[REDONDEO_ID]);
      }
      this.fees = migrated;

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
    return FEE_DEFINITIONS.reduce((sum, def) => sum + (this.fees[def.id] || 0), 0);
  }

  /** Currency the fees are applied to: the one with the largest item subtotal. */
  private getPrimaryCurrency(subtotals: Map<string, number>): string {
    let best = '';
    let bestValue = -Infinity;
    for (const [currency, value] of subtotals) {
      if (value > bestValue) {
        bestValue = value;
        best = currency;
      }
    }
    return best;
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

  private formatSearchSummary(ctx: SearchContext): string {
    const parts: string[] = [];

    if (ctx.destinationText) parts.push(this.escape(ctx.destinationText));

    if (ctx.checkIn) {
      const dates = ctx.checkOut
        ? `${this.escape(ctx.checkIn)} → ${this.escape(ctx.checkOut)}`
        : this.escape(ctx.checkIn);
      parts.push(dates);
    }

    const nights = ctx.nights && ctx.nights > 0 ? ctx.nights : this.computeNights(ctx.checkIn, ctx.checkOut);
    if (nights && nights > 0) {
      parts.push(`${nights} noche${nights !== 1 ? 's' : ''}`);
    }

    const pax: string[] = [];
    if (ctx.totalAdults > 0) {
      pax.push(`${ctx.totalAdults} adulto${ctx.totalAdults !== 1 ? 's' : ''}`);
    }
    if (ctx.totalChildren > 0) {
      pax.push(`${ctx.totalChildren} niño${ctx.totalChildren !== 1 ? 's' : ''}`);
    }
    if (pax.length) parts.push(pax.join(', '));

    return parts.join(' · ');
  }

  private highlightLatest(): void {
    const card = this.shadow.querySelector('.tce-item:last-child');
    if (!card) return;
    card.classList.add('tce-item--new');
    setTimeout(() => card.classList.remove('tce-item--new'), 1200);
  }

  private formatPrice(currency: string, price: number): string {
    return `${currency} ${price.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  private formatOccupancy(item: HotelCartItem): string {
    const adults = item.occupancy.reduce((sum, o) => sum + o.adults, 0);
    const children = item.occupancy.reduce((sum, o) => sum + o.children, 0);
    const parts = [`${adults} adulto${adults !== 1 ? 's' : ''}`];
    if (children > 0) parts.push(`${children} niño${children !== 1 ? 's' : ''}`);
    return parts.join(', ');
  }

  private getItemPrice(item: CartItem): { currency: string; price: number } {
    if (item.type === 'hotel') {
      return { currency: item.selectedRate.currency, price: item.selectedRate.price };
    }
    return { currency: item.currency, price: item.price };
  }

  private getTotalsByCurrency(): Map<string, number> {
    const totals = new Map<string, number>();
    for (const item of this.items) {
      const { currency, price } = this.getItemPrice(item);
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
        transition: background 0.2s;
        letter-spacing: 0.5px;
      }
      .tce-tab:hover { background: #1d4ed8; }
      .tce-tab--open { right: 340px; }

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
        transition: transform 0.25s ease;
      }
      .tce-panel--open { transform: translateX(0); }

      .tce-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px;
        background: #1e40af;
        color: #fff;
        flex-shrink: 0;
      }
      .tce-header h2 {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
      }
      .tce-header span { font-size: 13px; opacity: 0.85; }
      .tce-close {
        background: rgba(255,255,255,0.15);
        border: none;
        color: #fff;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
      }
      .tce-close:hover { background: rgba(255,255,255,0.25); }

      .tce-search-summary {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 8px 18px;
        background: #eff6ff;
        border-bottom: 1px solid #dbeafe;
        flex-shrink: 0;
      }
      .tce-search-summary-label {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #2563eb;
      }
      .tce-search-summary-text {
        font-size: 12px;
        color: #1e3a8a;
        line-height: 1.4;
      }

      .tce-body {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
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
      .tce-item--new {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59,130,246,0.25);
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
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px dashed #e2e8f0;
      }
      .tce-quote-toggle {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 8px;
        color: #1e40af;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
      }
      .tce-quote-toggle:hover { background: #dbeafe; }
      .tce-quote-body { margin-top: 8px; }
      .tce-quote-hint {
        font-size: 11px;
        color: #64748b;
        margin: 0 0 8px;
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
        margin-top: 8px;
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
        margin-top: 6px;
        min-height: 14px;
      }
      .tce-quote-status--err { color: #dc2626; }
      .tce-quote-preview {
        width: 100%;
        min-height: 200px;
        max-height: 280px;
        margin: 0 0 8px;
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
        margin: 0 0 4px;
      }
      .tce-quote-checks {
        max-height: 140px;
        overflow-y: auto;
        margin-bottom: 8px;
        padding: 6px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
      }
    `;
    this.shadow.appendChild(style);
  }

  private renderItem(item: CartItem): string {
    if (item.type === 'transfer') return this.renderTransferItem(item);
    if (item.type === 'flight') return this.renderFlightItem(item);
    return this.renderHotelItem(item);
  }

  private renderFlightItem(item: FlightCartItem): string {
    const tripLabel = item.routeType === 'roundTrip' ? 'Ida y vuelta' : 'Solo ida';

    const pax: string[] = [`${item.adults} adulto${item.adults !== 1 ? 's' : ''}`];
    if (item.children > 0) pax.push(`${item.children} niño${item.children !== 1 ? 's' : ''}`);
    if (item.infants > 0) pax.push(`${item.infants} bebé${item.infants !== 1 ? 's' : ''}`);

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

    return `
      <div class="tce-item" data-id="${this.escape(item.id)}">
        <div class="tce-item-type">Vuelo · ${this.escape(item.provider)}</div>
        <div class="tce-item-top">
          <div class="tce-item-img tce-item-img--placeholder">✈️</div>
          <div>
            <p class="tce-item-name">${this.escape(item.title)}</p>
            <p class="tce-item-address">${this.escape(tripLabel)} · ${this.escape(pax.join(', '))}</p>
          </div>
        </div>
        ${dateRange ? `<div class="tce-dates"><strong>${this.escape(dateRange)}</strong></div>` : ''}
        ${legsHtml}
        <div class="tce-item-footer">
          <div>
            <div class="tce-price">${this.escape(this.formatPrice(item.currency, item.price))}</div>
            ${breakdownHtml}
          </div>
          <button class="tce-remove" data-action="remove" data-id="${this.escape(item.id)}" title="Quitar">✕</button>
        </div>
      </div>
    `;
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

    return `
      <div class="tce-item" data-id="${this.escape(item.id)}">
        <div class="tce-item-type">Hotel</div>
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
          &nbsp;·&nbsp; ${this.escape(this.formatOccupancy(item))}
        </div>
        <p class="tce-detail"><span class="tce-detail-label">Habitación:</span> ${this.escape(roomShort)}</p>
        ${rate.boardBasis ? `<p class="tce-detail"><span class="tce-detail-label">Régimen:</span> ${this.escape(rate.boardBasis)}</p>` : ''}
        <div class="tce-item-footer">
          <div>
            <div class="tce-price">${this.escape(this.formatPrice(rate.currency, rate.price))}</div>
            <div class="tce-supplier">${this.escape(rate.supplierName)}</div>
          </div>
          <button class="tce-remove" data-action="remove" data-id="${this.escape(item.id)}" title="Quitar">✕</button>
        </div>
      </div>
    `;
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

    return `
      <div class="tce-item" data-id="${this.escape(item.id)}">
        <div class="tce-item-type">Traslado</div>
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
            <div class="tce-price">${this.escape(this.formatPrice(item.currency, item.price))}</div>
            <div class="tce-supplier">${this.escape(item.supplierName)}</div>
          </div>
          <button class="tce-remove" data-action="remove" data-id="${this.escape(item.id)}" title="Quitar">✕</button>
        </div>
      </div>
    `;
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
           <p>Tu carrito está vacío.<br>Agrega hoteles/traslados con <strong>+ 🛒</strong>, o un vuelo desde el checkout de Despegar.</p>
         </div>`
      : this.items.map((item) => this.renderItem(item)).join('');

    root.innerHTML = `
      <button class="tce-tab ${this.isOpen ? 'tce-tab--open' : ''}" data-action="toggle">
        🛒 Carrito
        ${this.items.length > 0 ? `<span class="tce-badge">${this.items.length}</span>` : ''}
      </button>
      <div class="tce-panel ${this.isOpen ? 'tce-panel--open' : ''}">
        <div class="tce-header">
          <div>
            <h2>Mi Carrito</h2>
            <span>${this.items.length} producto${this.items.length !== 1 ? 's' : ''}</span>
          </div>
          <button class="tce-close" data-action="toggle" title="Cerrar">✕</button>
        </div>
        ${this.searchContext && this.formatSearchSummary(this.searchContext)
          ? `<div class="tce-search-summary">
               <span class="tce-search-summary-label">Búsqueda actual</span>
               <span class="tce-search-summary-text">${this.formatSearchSummary(this.searchContext)}</span>
             </div>`
          : ''}
        <div class="tce-body">${itemsHtml}</div>
        ${this.items.length > 0 ? `
          <div class="tce-footer">
            <div class="tce-fees">${this.renderFees()}</div>
            <div class="tce-totals">${this.renderTotals()}</div>
            <div class="tce-quote">${this.renderQuoteSection()}</div>
            <button class="tce-clear" data-action="clear">Vaciar carrito</button>
          </div>
        ` : ''}
      </div>
    `;

    this.shadow.appendChild(root);
    this.bindEvents(root);
    if (this.quoteOpen) {
      this.showQuotePreview();
    }
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
      <button type="button" class="tce-quote-toggle" data-action="toggle-quote">
        <span>📋 Cotización WhatsApp</span>
        <span>${this.quoteOpen ? '▲' : '▼'}</span>
      </button>
      ${
        this.quoteOpen
          ? `
        <div class="tce-quote-body">
          <p class="tce-quote-hint">
            Abajo está el <strong>mensaje listo para WhatsApp</strong> (gran total).
            Usa <strong>Copiar WhatsApp</strong> o selecciona el texto verde y Ctrl+C.
          </p>
          <p class="tce-quote-preview-label">Texto para pegar en el chat</p>
          <textarea class="tce-quote-preview" readonly></textarea>
          <div class="tce-quote-actions">
            <button type="button" class="tce-quote-btn" data-action="copy-quote">Copiar WhatsApp</button>
            <button type="button" class="tce-quote-btn tce-quote-btn--secondary" data-action="preview-quote">Actualizar texto</button>
          </div>
          ${status}
          <p class="tce-quote-hint" style="margin-top:10px">Qué incluir en el mensaje (editar líneas en el popup → Config):</p>
          <div class="tce-quote-checks">
            ${group('include', 'Tarifa incluye')}
            ${group('exclude', 'Plan no incluye')}
            ${group('policy', 'Nota importante')}
          </div>
        </div>`
          : ''
      }
    `;
  }

  private buildCurrentQuote(): string {
    const subtotals = this.getTotalsByCurrency();
    const feesTotal = this.getFeesTotal();
    const primaryCurrency = this.getPrimaryCurrency(subtotals) || 'COP';
    return buildWhatsAppQuote({
      items: this.items,
      searchContext: this.searchContext,
      subtotals,
      feesTotal,
      primaryCurrency,
      quoteLines: this.quoteLines,
    });
  }

  private async copyQuoteToClipboard(): Promise<void> {
    const text = this.buildCurrentQuote();
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
    if (preview) preview.value = this.buildCurrentQuote();
  }

  private async toggleQuoteLine(lineId: string, enabled: boolean): Promise<void> {
    this.quoteLines = this.quoteLines.map((l) =>
      l.id === lineId ? { ...l, enabled } : l
    );
    await saveQuoteLines(this.quoteLines);
    this.showQuotePreview();
  }

  private renderFees(): string {
    return FEE_DEFINITIONS.map((def) => `
      <div class="tce-fee-row">
        <label for="tce-fee-${def.id}">${this.escape(def.label)}</label>
        <input
          type="number"
          min="0"
          step="0.01"
          id="tce-fee-${def.id}"
          class="tce-fee-input"
          data-fee-id="${def.id}"
          value="${this.fees[def.id] ?? 0}"
        >
      </div>
    `).join('');
  }

  private renderTotals(): string {
    const subtotals = this.getTotalsByCurrency();
    const feesTotal = this.getFeesTotal();
    const primaryCurrency = this.getPrimaryCurrency(subtotals);
    const mayorValor = this.fees[MAYOR_VALOR_ID] || 0;
    const redondeo = this.fees[REDONDEO_ID] || 0;

    const excessHtml = `
      <div class="tce-rounding-row">
        <div class="tce-rounding-excess">
          Redondeo:
          <strong>${this.escape(this.formatPrice(primaryCurrency || '', redondeo))}</strong>
        </div>
        <button type="button" class="tce-round-btn" data-action="round" title="Calcula el excedente hasta la siguiente decena de mil y lo guarda en Redondeo (no toca Mayor valor cobrado)">
          Redondear
        </button>
      </div>
    `;

    const breakdownRows: string[] = [];
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
    if (redondeo > 0) {
      breakdownRows.push(`
        <div class="tce-total-row tce-total-row--sub">
          <span>Redondeo</span>
          <span>${this.escape(this.formatPrice(primaryCurrency, redondeo))}</span>
        </div>
      `);
    }

    const showBreakdown = feesTotal > 0;
    const subtotalHtml = showBreakdown ? breakdownRows.join('') : '';

    const totalHtml = Array.from(subtotals.entries())
      .map(([currency, value]) => {
        const total = currency === primaryCurrency ? value + feesTotal : value;
        return `
          <div class="tce-total-row">
            <span>Total ${this.escape(currency)}</span>
            <span>${this.escape(this.formatPrice(currency, total))}</span>
          </div>
        `;
      })
      .join('');

    return excessHtml + subtotalHtml + totalHtml;
  }

  /**
   * Rounds (items + mayor valor cobrado) up to the next 10.000 and stores
   * the difference in "Redondeo". Does not modify "Mayor valor cobrado".
   * Example: items 1.950.000 + mayor 36.700 = 1.986.700 → redondeo 3.300 → total 1.990.000.
   */
  private async applyRounding(): Promise<void> {
    const subtotals = this.getTotalsByCurrency();
    if (subtotals.size === 0) return;

    const primaryCurrency = this.getPrimaryCurrency(subtotals);
    const itemsTotal = subtotals.get(primaryCurrency) || 0;
    const mayorValor = this.fees[MAYOR_VALOR_ID] || 0;
    const base = itemsTotal + mayorValor;
    const ROUND_UNIT = 10_000;
    const rounded = Math.ceil(base / ROUND_UNIT) * ROUND_UNIT;
    const excess = Math.max(0, rounded - base);

    this.fees[REDONDEO_ID] = excess;
    await this.saveFees();

    const feeInput = this.shadow.querySelector(
      `#tce-fee-${REDONDEO_ID}`
    ) as HTMLInputElement | null;
    if (feeInput) feeInput.value = String(excess);

    const feesEl = this.shadow.querySelector('.tce-fees');
    if (feesEl) feesEl.innerHTML = this.renderFees();
    const totalsEl = this.shadow.querySelector('.tce-totals');
    if (totalsEl) totalsEl.innerHTML = this.renderTotals();
    if (this.quoteOpen) this.showQuotePreview();
  }

  private bindEvents(root: HTMLElement): void {
    root.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
      if (!target) return;

      const action = target.dataset.action;
      if (action === 'toggle') {
        this.toggle();
      } else if (action === 'remove') {
        this.removeItem(target.dataset.id!);
      } else if (action === 'clear') {
        this.clearCart();
      } else if (action === 'round') {
        void this.applyRounding();
      } else if (action === 'toggle-quote') {
        this.quoteOpen = !this.quoteOpen;
        this.quoteCopyStatus = 'idle';
        this.render();
      } else if (action === 'copy-quote') {
        void this.copyQuoteToClipboard();
      } else if (action === 'preview-quote') {
        this.showQuotePreview();
      }
    });

    root.addEventListener('change', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target || !target.classList.contains('tce-quote-check')) return;
      const input = target as HTMLInputElement;
      const lineId = input.dataset.lineId;
      if (!lineId) return;
      void this.toggleQuoteLine(lineId, input.checked);
    });

    root.addEventListener('input', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target || !target.classList.contains('tce-fee-input')) return;

      const input = target as HTMLInputElement;
      const feeId = input.dataset.feeId;
      if (!feeId) return;

      const parsed = parseFloat(input.value);
      this.fees[feeId] = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      void this.saveFees();

      // Update only the totals so the input keeps focus while typing.
      const totalsEl = this.shadow.querySelector('.tce-totals');
      if (totalsEl) totalsEl.innerHTML = this.renderTotals();
      if (this.quoteOpen) this.showQuotePreview();
    });
  }
}
