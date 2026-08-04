export class JetSmartFlightUIInjector {
  private static readonly BTN_ID = 'tce-jetsmart-add-flight';

  injectButton(doc: Document, onAdd: () => void | Promise<void>): void {
    if (doc.getElementById(JetSmartFlightUIInjector.BTN_ID) || !doc.body) return;

    const btn = doc.createElement('button');
    btn.id = JetSmartFlightUIInjector.BTN_ID;
    btn.type = 'button';
    btn.textContent = '＋ 🛒 Agregar al Carrito GT';
    btn.title = 'Agregar vuelo JetSMART al carrito';
    btn.setAttribute(
      'style',
      [
        'position:fixed',
        'left:16px',
        'bottom:16px',
        'z-index:2147483646',
        'background:#123b70',
        'color:#fff',
        'border:2px solid #00aec7',
        'border-radius:10px',
        'padding:12px 16px',
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
        'font-size:14px',
        'font-weight:700',
        'cursor:pointer',
        'box-shadow:0 4px 16px rgba(0,0,0,0.25)',
      ].join(';')
    );

    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
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
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      btn.textContent =
        message === 'ALREADY_IN_CART'
          ? '✓ Ya está en el carrito'
          : '⚠ No se pudo leer el vuelo';
      btn.style.background = message === 'ALREADY_IN_CART' ? '#2563eb' : '#dc2626';
    }
    window.setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '#123b70';
    }, 2000);
  }
}
