/**
 * Floating is wrong UX — mount the cart button in the sidebar cost summary,
 * immediately above / under the Total bar (after flights are selected).
 */
export class JetSmartFlightUIInjector {
  private static readonly BTN_ID = 'tce-jetsmart-add-flight';
  private static readonly STYLE_ID = 'tce-jetsmart-add-flight-style';
  private static readonly HOST_ATTR = 'data-tce-jetsmart-host';

  static canShow(doc: Document): boolean {
    return !!doc.querySelector(
      '[data-test-id="sidebar-total-amount-value-with-currency-sign"]'
    );
  }

  injectButton(doc: Document, onAdd: () => void | Promise<void>): void {
    if (!doc.body) return;
    this.ensureStyles(doc);

    if (!JetSmartFlightUIInjector.canShow(doc)) {
      this.removeButton(doc);
      return;
    }

    const existing = doc.getElementById(JetSmartFlightUIInjector.BTN_ID) as HTMLButtonElement | null;
    if (existing) {
      if (!existing.isConnected || !existing.closest(`[${JetSmartFlightUIInjector.HOST_ATTR}]`)) {
        this.mount(doc, existing);
      }
      return;
    }

    const btn = doc.createElement('button');
    btn.id = JetSmartFlightUIInjector.BTN_ID;
    btn.type = 'button';
    btn.className = 'tce-jetsmart-btn';
    btn.textContent = '＋ 🛒 Agregar al Carrito GT';
    btn.title = 'Agregar vuelo JetSMART al carrito';

    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void this.handleClick(btn, onAdd);
    });

    this.mount(doc, btn);
  }

  private removeButton(doc: Document): void {
    doc.getElementById(JetSmartFlightUIInjector.BTN_ID)?.remove();
    doc.querySelectorAll(`[${JetSmartFlightUIInjector.HOST_ATTR}]`).forEach((el) => {
      el.removeAttribute(JetSmartFlightUIInjector.HOST_ATTR);
    });
  }

  private findTotalAnchor(doc: Document): Element | null {
    const totalValue = doc.querySelector(
      '[data-test-id="sidebar-total-amount-value-with-currency-sign"]'
    );
    if (!totalValue) return null;
    return (
      totalValue.closest('ac-total') ||
      totalValue.closest('[class*="rounded-b-xl"]') ||
      totalValue.parentElement ||
      totalValue
    );
  }

  private mount(doc: Document, btn: HTMLElement): void {
    doc.querySelectorAll(`[${JetSmartFlightUIInjector.HOST_ATTR}]`).forEach((el) => {
      el.removeAttribute(JetSmartFlightUIInjector.HOST_ATTR);
    });

    const anchor = this.findTotalAnchor(doc);
    if (!anchor) {
      btn.remove();
      return;
    }

    const host = anchor.parentElement || anchor;
    host.setAttribute(JetSmartFlightUIInjector.HOST_ATTR, '1');

    // Sit just above the Total bar in the cost summary.
    if (anchor.parentElement) {
      anchor.parentElement.insertBefore(btn, anchor);
    } else {
      host.insertBefore(btn, host.firstChild);
    }
  }

  private ensureStyles(doc: Document): void {
    if (doc.getElementById(JetSmartFlightUIInjector.STYLE_ID)) return;
    const style = doc.createElement('style');
    style.id = JetSmartFlightUIInjector.STYLE_ID;
    style.textContent = `
      .tce-jetsmart-btn {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        margin: 0 0 8px 0 !important;
        background: #123b70 !important;
        color: #fff !important;
        border: 2px solid #00aec7 !important;
        border-radius: 10px !important;
        padding: 10px 14px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 13px !important;
        font-weight: 800 !important;
        cursor: pointer !important;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25) !important;
        line-height: 1.2 !important;
        z-index: 2147483646 !important;
        pointer-events: auto !important;
        text-align: center !important;
      }
      .tce-jetsmart-btn:hover {
        background: #0c2a52 !important;
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
      btn.style.borderColor = '#16a34a';
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      btn.textContent =
        message === 'ALREADY_IN_CART'
          ? '✓ Ya está en el carrito'
          : '⚠ No se pudo leer el vuelo';
      btn.style.background = message === 'ALREADY_IN_CART' ? '#2563eb' : '#dc2626';
      btn.style.borderColor = btn.style.background;
    }
    window.setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
      btn.style.borderColor = '';
    }, 2000);
  }
}
