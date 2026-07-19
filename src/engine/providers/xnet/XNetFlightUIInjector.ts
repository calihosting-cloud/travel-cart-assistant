import { getActiveRatePanel } from './XNetFlightReader';

/**
 * Injects "+ 🛒" next to Scape/XNet's "Reservar" inside the *active* fare tab.
 *
 * XNet clones `#divButtonReserve` / `#flightTable_N` per tariff tab (duplicate
 * ids). Injecting via document.querySelector always hit tab 0 — often hidden —
 * so the button vanished after selecting another fare.
 */
export class XNetFlightUIInjector {
  private static readonly BTN_ID = 'tce-xnet-add-flight';

  injectButton(doc: Document, onAdd: () => void | Promise<void>): void {
    const activePanel = getActiveRatePanel(doc);
    if (!activePanel) return;

    const reserveBox = activePanel.querySelector('[id="divButtonReserve"]') as HTMLElement | null;
    if (!reserveBox) return;

    // Drop orphans from other tabs / previous DOM rebuilds.
    for (const stale of Array.from(
      doc.querySelectorAll(`#${XNetFlightUIInjector.BTN_ID}, [id="${XNetFlightUIInjector.BTN_ID}"]`)
    )) {
      if (!reserveBox.contains(stale)) stale.remove();
    }

    if (reserveBox.querySelector(`#${XNetFlightUIInjector.BTN_ID}`)) return;

    const btn = doc.createElement('button');
    btn.id = XNetFlightUIInjector.BTN_ID;
    btn.type = 'button';
    btn.className = 'btn-tce-add-cart';
    btn.textContent = '+ 🛒 Agregar al Carrito GT';
    btn.setAttribute(
      'style',
      [
        'display:inline-block',
        'margin-left:10px',
        'vertical-align:middle',
        'background:#1e40af',
        'color:#fff',
        'border:none',
        'border-radius:4px',
        'padding:8px 14px',
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
        'font-size:13px',
        'font-weight:700',
        'cursor:pointer',
        'box-shadow:0 2px 6px rgba(0,0,0,0.2)',
      ].join(';')
    );

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void this.handleClick(btn, onAdd);
    });

    reserveBox.appendChild(btn);
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
      btn.style.background = '#1e40af';
    }, 1800);
  }
}
