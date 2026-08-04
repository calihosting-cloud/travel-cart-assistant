/**
 * Floating "Agregar al Carrito GT" on Avianca trip-summary
 * (`/av/booking/trip?cartId=…`).
 */
export class AviancaFlightUIInjector {
  private static readonly BTN_ID = 'tce-avianca-add-flight';

  injectButton(doc: Document, onAdd: () => void | Promise<void>): void {
    if (doc.getElementById(AviancaFlightUIInjector.BTN_ID)) return;
    if (!doc.body) return;

    const btn = doc.createElement('button');
    btn.id = AviancaFlightUIInjector.BTN_ID;
    btn.type = 'button';
    btn.textContent = '＋ 🛒 Agregar al Carrito GT';
    btn.setAttribute(
      'style',
      [
        'position:fixed',
        'left:16px',
        'bottom:16px',
        'z-index:2147483646',
        'background:#da291c',
        'color:#fff',
        'border:none',
        'border-radius:10px',
        'padding:12px 16px',
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
        'font-size:14px',
        'font-weight:700',
        'cursor:pointer',
        'box-shadow:0 4px 16px rgba(0,0,0,0.25)',
        'transition:background 0.2s,transform 0.1s',
      ].join(';')
    );

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#b01f16';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#da291c';
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void this.handleClick(btn, onAdd);
    });

    doc.body.appendChild(btn);
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
      btn.style.background = '#da291c';
    }, 1800);
  }
}
