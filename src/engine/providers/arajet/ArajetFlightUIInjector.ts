/**
 * Mount "Agregar al Carrito GT" in the Arajet booking cost/actions area
 * (above Continuar / Siguiente), not as a fixed left overlay.
 */
export class ArajetFlightUIInjector {
  private static readonly BTN_ID = 'tce-arajet-add-flight';
  private static readonly STYLE_ID = 'tce-arajet-add-flight-style';
  private static readonly HOST_ATTR = 'data-tce-arajet-host';
  private static readonly BRAND = '#5b21b6';

  static canShow(doc: Document): boolean {
    const href = doc.location?.href || '';
    if (!/arajet\.com/i.test(href) || !/\/booking/i.test(href)) return false;
    const text = (doc.body?.innerText || '').replace(/\s+/g, ' ');
    if (/(Basic|Comfort|Extra)\s*\$[\d.,]+/i.test(text) && /EDITAR/i.test(text)) {
      return true;
    }
    const step = Number(new URL(href).searchParams.get('step') || 0);
    return step >= 3;
  }

  injectButton(doc: Document, onAdd: () => void | Promise<void>): void {
    if (!doc.body) return;
    this.ensureStyles(doc);

    if (!ArajetFlightUIInjector.canShow(doc)) {
      this.removeButton(doc);
      return;
    }

    const existing = doc.getElementById(ArajetFlightUIInjector.BTN_ID) as HTMLButtonElement | null;
    if (existing) {
      if (!existing.isConnected || !existing.closest(`[${ArajetFlightUIInjector.HOST_ATTR}]`)) {
        this.mount(doc, existing);
      }
      return;
    }

    const btn = doc.createElement('button');
    btn.id = ArajetFlightUIInjector.BTN_ID;
    btn.type = 'button';
    btn.className = 'tce-arajet-btn';
    btn.textContent = '＋ 🛒 Agregar al Carrito GT';
    btn.title = 'Travel Cart Assistant GT — agregar vuelo Arajet';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void this.handleClick(btn, onAdd);
    });

    this.mount(doc, btn);
  }

  private removeButton(doc: Document): void {
    doc.getElementById(ArajetFlightUIInjector.BTN_ID)?.remove();
    doc.querySelectorAll(`[${ArajetFlightUIInjector.HOST_ATTR}]`).forEach((el) => {
      el.removeAttribute(ArajetFlightUIInjector.HOST_ATTR);
    });
  }

  /** Prefer the flights action bar (Siguiente/Continuar); else selected Extra/Basic summary. */
  private findAnchor(doc: Document): Element | null {
    const actions =
      doc.querySelector('arajet-available-flights-actions') ||
      doc.querySelector('[class*="available-flights-actions"]');
    if (actions) return actions;

    const nextBtn = Array.from(doc.querySelectorAll('button, a')).find((el) =>
      /Siguiente|Continuar|Confirmar/i.test((el.textContent || '').trim())
    );
    if (nextBtn) {
      return (
        nextBtn.closest('arajet-available-flights-actions') ||
        nextBtn.closest('div.flex, div.grid, section, footer') ||
        nextBtn.parentElement
      );
    }

    // Selected fare chip: "Extra $353.04 EDITAR"
    const edit = Array.from(doc.querySelectorAll('button, a, span, div')).find((el) => {
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      return /^EDITAR$/i.test(t) || (/EDITAR/i.test(t) && t.length < 40);
    });
    if (edit) {
      return edit.closest('summary-card, [class*="summary"], [class*="selected"]') || edit.parentElement;
    }

    return null;
  }

  private mount(doc: Document, btn: HTMLElement): void {
    doc.querySelectorAll(`[${ArajetFlightUIInjector.HOST_ATTR}]`).forEach((el) => {
      el.removeAttribute(ArajetFlightUIInjector.HOST_ATTR);
    });

    const anchor = this.findAnchor(doc);
    if (!anchor) {
      // Last resort: fixed bottom bar (still not left floating)
      btn.classList.add('tce-arajet-btn--dock');
      doc.body.appendChild(btn);
      return;
    }

    btn.classList.remove('tce-arajet-btn--dock');
    const host = anchor.parentElement || anchor;
    host.setAttribute(ArajetFlightUIInjector.HOST_ATTR, '1');

    // Insert immediately above the Continuar/Siguiente action strip.
    if (anchor.parentElement) {
      anchor.parentElement.insertBefore(btn, anchor);
    } else {
      host.insertBefore(btn, host.firstChild);
    }
  }

  private ensureStyles(doc: Document): void {
    if (doc.getElementById(ArajetFlightUIInjector.STYLE_ID)) return;
    const style = doc.createElement('style');
    style.id = ArajetFlightUIInjector.STYLE_ID;
    style.textContent = `
      .tce-arajet-btn {
        display: block !important;
        width: 100% !important;
        max-width: 720px !important;
        box-sizing: border-box !important;
        margin: 8px auto !important;
        background: ${ArajetFlightUIInjector.BRAND} !important;
        color: #fff !important;
        border: 2px solid #fff !important;
        border-radius: 10px !important;
        padding: 12px 16px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 14px !important;
        font-weight: 800 !important;
        cursor: pointer !important;
        box-shadow: 0 4px 16px rgba(0,0,0,0.28) !important;
        line-height: 1.2 !important;
        z-index: 2147483646 !important;
        pointer-events: auto !important;
        text-align: center !important;
      }
      .tce-arajet-btn:hover {
        background: #4c1d95 !important;
      }
      .tce-arajet-btn--dock {
        position: fixed !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        bottom: 72px !important;
        width: calc(100% - 32px) !important;
        max-width: 480px !important;
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
      } else if (msg === 'NO_TOTAL') {
        btn.textContent = '⚠ Elige tarifa Extra/ida+vuelta';
        btn.style.background = '#dc2626';
      } else {
        btn.textContent = '⚠ No se pudo leer el vuelo';
        btn.style.background = '#dc2626';
      }
    }
    window.setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
    }, 2000);
  }
}
