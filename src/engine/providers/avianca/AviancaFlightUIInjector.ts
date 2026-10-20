import { AviancaFlightReader } from './AviancaFlightReader';

/**
 * "Agregar al Carrito GT" on Avianca trip-summary
 * (`/av/booking/trip?cartId=…`). Prefers placement near trip totals;
 * fixed fallback bottom-right when no anchor is visible.
 */
export class AviancaFlightUIInjector {
  private static readonly BTN_ID = 'tce-avianca-add-flight';
  private static readonly STYLE_ID = 'tce-avianca-add-flight-style';
  private static readonly HOST_ATTR = 'data-tce-avianca-host';

  injectButton(doc: Document, onAdd: () => void | Promise<void>): void {
    if (!doc.body) return;
    this.ensureStyles(doc);

    if (!AviancaFlightReader.hasTripSummary(doc)) {
      this.removeButton(doc);
      return;
    }

    const existing = doc.getElementById(AviancaFlightUIInjector.BTN_ID) as HTMLButtonElement | null;
    if (existing) {
      if (
        !existing.isConnected ||
        !this.isInPreferredHost(existing) ||
        !this.isVisible(existing)
      ) {
        this.mount(doc, existing);
      }
      return;
    }

    const btn = doc.createElement('button');
    btn.id = AviancaFlightUIInjector.BTN_ID;
    btn.type = 'button';
    btn.className = 'tce-avianca-btn';
    btn.textContent = '＋ 🛒 Agregar al Carrito GT';
    btn.title = 'Travel Cart Assistant GT — agregar vuelo Avianca';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void this.handleClick(btn, onAdd);
    });

    this.mount(doc, btn);
    if (doc.getElementById(AviancaFlightUIInjector.BTN_ID)) {
      console.log('[TCE] Avianca cart button mounted.');
    }
  }

  private removeButton(doc: Document): void {
    doc.getElementById(AviancaFlightUIInjector.BTN_ID)?.remove();
    doc.querySelectorAll(`[${AviancaFlightUIInjector.HOST_ATTR}]`).forEach((el) => {
      el.removeAttribute(AviancaFlightUIInjector.HOST_ATTR);
    });
  }

  private isInPreferredHost(btn: HTMLElement): boolean {
    if (btn.classList.contains('tce-avianca-btn--fixed')) return true;
    return !!btn.closest(`[${AviancaFlightUIInjector.HOST_ATTR}]`);
  }

  private isVisible(el: HTMLElement): boolean {
    if (!el.isConnected) return false;
    const view = el.ownerDocument.defaultView;
    if (!view) return true;
    const st = view.getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  }

  private findAnchor(doc: Document): Element | null {
    const selectors = [
      '.direct-book-container',
      '.trip-summary-block',
      '.price-section',
      '.economic-fare-footer-card:not(.resume-mobile)',
      '.trip-summary-content .resume',
      '.general-trip-summary-title',
      'trip-summary-page bound-displayer-pres:last-of-type .economic-fare-footer-card',
      '.resume-mobile-price',
    ];
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (el && this.isVisible(el as HTMLElement)) return el;
    }
    return null;
  }

  private mount(doc: Document, btn: HTMLButtonElement): void {
    doc.querySelectorAll(`[${AviancaFlightUIInjector.HOST_ATTR}]`).forEach((el) => {
      el.removeAttribute(AviancaFlightUIInjector.HOST_ATTR);
    });

    btn.classList.remove('tce-avianca-btn--fixed');
    btn.removeAttribute('style');

    const anchor = this.findAnchor(doc);
    if (anchor?.parentElement) {
      const host = anchor.closest('.trip-summary-block, .direct-book-container, trip-summary-page') || anchor;
      host.setAttribute(AviancaFlightUIInjector.HOST_ATTR, '1');
      btn.className = 'tce-avianca-btn tce-avianca-btn--inline';

      const wrap = doc.createElement('div');
      wrap.className = 'tce-avianca-btn-wrap';
      wrap.appendChild(btn);

      if (anchor.matches('.direct-book-container')) {
        anchor.insertBefore(wrap, anchor.firstChild);
      } else if (anchor.matches('.general-trip-summary-title')) {
        anchor.parentElement?.insertBefore(wrap, anchor.nextSibling);
      } else {
        anchor.parentElement.insertBefore(wrap, anchor.nextSibling);
      }
      return;
    }

    this.mountFixed(doc, btn);
  }

  private mountFixed(doc: Document, btn: HTMLButtonElement): void {
    btn.className = 'tce-avianca-btn tce-avianca-btn--fixed';
    doc.body.appendChild(btn);
  }

  private ensureStyles(doc: Document): void {
    if (doc.getElementById(AviancaFlightUIInjector.STYLE_ID)) return;
    const style = doc.createElement('style');
    style.id = AviancaFlightUIInjector.STYLE_ID;
    style.textContent = `
      .tce-avianca-btn {
        background: #da291c !important;
        color: #fff !important;
        border: none !important;
        border-radius: 10px !important;
        padding: 12px 16px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25) !important;
        line-height: 1.2 !important;
        pointer-events: auto !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        white-space: nowrap !important;
      }
      .tce-avianca-btn:hover { background: #b01f16 !important; }
      .tce-avianca-btn-wrap {
        margin: 8px 0;
        text-align: right;
        position: relative;
        z-index: 2;
      }
      .tce-avianca-btn--inline { margin: 0 !important; }
      .tce-avianca-btn--fixed {
        position: fixed !important;
        bottom: 24px !important;
        right: 24px !important;
        left: auto !important;
        top: auto !important;
        z-index: 2147483647 !important;
      }
    `;
    (doc.head || doc.documentElement).appendChild(style);
  }

  private async handleClick(
    btn: HTMLButtonElement,
    onAdd: () => void | Promise<void>
  ): Promise<void> {
    const original = btn.textContent;
    try {
      await onAdd();
      btn.textContent = '✓ Vuelo agregado';
      btn.style.background = '#16a34a';
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'ALREADY_IN_CART') {
        btn.textContent = '✓ Ya está en el carrito';
        btn.style.background = '#2563eb';
      } else {
        btn.textContent = '⚠ No se pudo leer el vuelo';
        btn.style.background = '#dc2626';
      }
    }
    window.setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
    }, 1800);
  }
}
