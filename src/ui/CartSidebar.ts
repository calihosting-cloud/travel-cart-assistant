import { CartItem, HotelCartItem, TransferCartItem } from '../engine/core/types';

const STORAGE_KEY = 'tce_cart_items';

export class CartSidebar {
  private host: HTMLDivElement;
  private shadow: ShadowRoot;
  private items: CartItem[] = [];
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
    this.injectStyles();
    this.render();
    this.loadFromStorage();
  }

  async addItem(item: CartItem): Promise<void> {
    this.items.push(item);
    await this.saveToStorage();
    this.isOpen = true;
    this.render();
    this.highlightLatest();
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
    `;
    this.shadow.appendChild(style);
  }

  private renderItem(item: CartItem): string {
    if (item.type === 'transfer') return this.renderTransferItem(item);
    return this.renderHotelItem(item);
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

    const totals = this.getTotalsByCurrency();
    const totalsHtml = Array.from(totals.entries())
      .map(([currency, total]) => `
        <div class="tce-total-row">
          <span>Total ${currency}</span>
          <span>${this.escape(this.formatPrice(currency, total))}</span>
        </div>
      `)
      .join('');

    const itemsHtml = this.items.length === 0
      ? `<div class="tce-empty">
           <div class="tce-empty-icon">🛒</div>
           <p>Tu carrito está vacío.<br>Usa <strong>+ 🛒</strong> en una tarifa para agregar opciones.</p>
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
        <div class="tce-body">${itemsHtml}</div>
        ${this.items.length > 0 ? `
          <div class="tce-footer">
            ${totalsHtml}
            <button class="tce-clear" data-action="clear">Vaciar carrito</button>
          </div>
        ` : ''}
      </div>
    `;

    this.shadow.appendChild(root);
    this.bindEvents(root);
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
      }
    });
  }
}
