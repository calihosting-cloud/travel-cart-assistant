/**
 * Cart button on Wingo — only when the purchase Total bar is present
 * (passengers / payment). Never use a fixed overlay on the search form.
 */
export class WingoFlightUIInjector {
  private static readonly BTN_ID = 'tce-wingo-add-flight';
  private static readonly STYLE_ID = 'tce-wingo-add-flight-style';
  private static readonly HOST_ATTR = 'data-tce-wingo-host';

  /** True on passengers/payment or whenever the sticky Total bar exists. */
  static canShow(doc: Document): boolean {
    const href = doc.location?.href || '';
    if (/\/booking\/(passengers|payment|checkout|confirm|pay)/i.test(href)) return true;
    return !!(
      doc.querySelector('w-mo-total-purchase') ||
      doc.querySelector('w-org-summary-detail-to-pay') ||
      doc.querySelector('w-org-summary-detail-purchase')
    );
  }

  injectButton(doc: Document, onAdd: () => void | Promise<void>): void {
    if (!doc.body) return;

    this.ensureStyles(doc);

    if (!WingoFlightUIInjector.canShow(doc) || !this.findTotalPurchase(doc)) {
      this.removeButton(doc);
      return;
    }

    const existing = doc.getElementById(WingoFlightUIInjector.BTN_ID) as HTMLButtonElement | null;
    if (existing) {
      if (!existing.isConnected || !this.isInPreferredHost(existing)) {
        this.mount(doc, existing);
      }
      return;
    }

    const btn = doc.createElement('button');
    btn.id = WingoFlightUIInjector.BTN_ID;
    btn.type = 'button';
    btn.setAttribute('data-tce', 'wingo-add');
    btn.textContent = '＋ 🛒 Agregar al Carrito GT';
    btn.title = 'Travel Cart Assistant GT — agregar vuelo Wingo';

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#facc15';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#fde047';
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void this.handleClick(btn, onAdd);
    });

    this.mount(doc, btn);
    if (doc.getElementById(WingoFlightUIInjector.BTN_ID)) {
      console.log('[TCE] Wingo cart button mounted next to Total summary.');
    }
  }

  private removeButton(doc: Document): void {
    doc.getElementById(WingoFlightUIInjector.BTN_ID)?.remove();
    doc.querySelectorAll(`[${WingoFlightUIInjector.HOST_ATTR}]`).forEach((el) => {
      el.removeAttribute(WingoFlightUIInjector.HOST_ATTR);
    });
  }

  private isInPreferredHost(btn: HTMLElement): boolean {
    return !!btn.closest(`[${WingoFlightUIInjector.HOST_ATTR}]`);
  }

  private findTotalPurchase(doc: Document): Element | null {
    return (
      doc.querySelector('w-mo-total-purchase') ||
      doc.querySelector('w-org-summary-detail-purchase') ||
      this.findTotalByText(doc)
    );
  }

  private findTotalByText(doc: Document): Element | null {
    const candidates = Array.from(
      doc.querySelectorAll('div, section, aside, w-mo-summary, [class*="summary"]')
    );
    for (const el of candidates) {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!/^Total:\s*\$/i.test(text) && !/Total:\s*\$\s*[\d.,]+\s*(COP|USD)/i.test(text)) {
        continue;
      }
      // Prefer a compact node that looks like the sticky total bar.
      if (text.length < 80 && el.querySelector('.font-prices, [class*="font-prices"]')) {
        return el;
      }
      if (el.classList.contains('bg-purple-dark') || /bg-purple-dark/.test(el.className)) {
        return el;
      }
    }
    return null;
  }

  private mount(doc: Document, btn: HTMLElement): void {
    doc.querySelectorAll(`[${WingoFlightUIInjector.HOST_ATTR}]`).forEach((el) => {
      el.removeAttribute(WingoFlightUIInjector.HOST_ATTR);
    });

    const totalPurchase = this.findTotalPurchase(doc);
    if (!totalPurchase) {
      btn.remove();
      return;
    }

    const host =
      totalPurchase.closest('w-org-summary-detail-purchase') ||
      totalPurchase.parentElement ||
      totalPurchase;

    host.setAttribute(WingoFlightUIInjector.HOST_ATTR, '1');
    btn.className = 'tce-wingo-btn tce-wingo-btn--by-total';

    // Sit immediately above the Total bar in the purchase summary.
    const anchor =
      host.querySelector('w-mo-total-purchase') ||
      (totalPurchase.matches('w-mo-total-purchase') ? totalPurchase : null) ||
      totalPurchase;

    if (anchor.parentElement) {
      anchor.parentElement.insertBefore(btn, anchor);
    } else {
      host.insertBefore(btn, host.firstChild);
    }
  }

  private ensureStyles(doc: Document): void {
    if (doc.getElementById(WingoFlightUIInjector.STYLE_ID)) return;
    const style = doc.createElement('style');
    style.id = WingoFlightUIInjector.STYLE_ID;
    style.textContent = `
      .tce-wingo-btn {
        background: #fde047 !important;
        color: #1e1b4b !important;
        border: 2px solid #fff !important;
        border-radius: 10px !important;
        padding: 10px 14px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 13px !important;
        font-weight: 800 !important;
        cursor: pointer !important;
        box-shadow: 0 4px 16px rgba(0,0,0,0.35) !important;
        line-height: 1.2 !important;
        z-index: 2147483647 !important;
        pointer-events: auto !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 4px !important;
        white-space: nowrap !important;
      }
      .tce-wingo-btn--by-total {
        position: relative !important;
        width: 100% !important;
        box-sizing: border-box !important;
        margin: 0 0 8px 0 !important;
        border-radius: 10px !important;
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
      btn.style.color = '#fff';
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'ALREADY_IN_CART') {
        btn.textContent = '✓ Ya está en el carrito';
        btn.style.background = '#2563eb';
        btn.style.color = '#fff';
      } else if (msg === 'NO_TOTAL') {
        btn.textContent = '⚠ Elige ida y vuelta primero';
        btn.style.background = '#dc2626';
        btn.style.color = '#fff';
      } else {
        btn.textContent = '⚠ No se pudo leer el vuelo';
        btn.style.background = '#dc2626';
        btn.style.color = '#fff';
      }
    }
    window.setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
      btn.style.color = '';
    }, 2200);
  }
}
