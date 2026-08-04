import { UIInjector } from '../../core/UIInjector';

export class BookingMotorInsuranceUIInjector extends UIInjector {
  injectButtons(
    container: Document | HTMLElement,
    onAddClick: (productId: string, optionIndex?: number) => void
  ): void {
    const doc = container.ownerDocument || (container as Document);
    const blocks = container.querySelectorAll(
      '#list-insurance-items .list-layout-block, .bm-insurance-list .list-layout-block'
    );

    for (const block of blocks) {
      if (block.hasAttribute('data-tce-injected')) continue;
      if (block.querySelector('.btn-tce-add-cart')) continue;

      const bookingLink = block.querySelector(
        'a[href*="insurance-reservation/fill-data"]'
      ) as HTMLAnchorElement | null;
      if (!bookingLink) continue;

      const insuranceId = this.extractInsuranceId(bookingLink.href);
      if (!insuranceId) continue;

      const btn = this.createButton(doc, insuranceId, onAddClick);
      bookingLink.parentElement?.appendChild(btn) || bookingLink.after(btn);
      block.setAttribute('data-tce-injected', 'true');
    }
  }

  private extractInsuranceId(href: string): string | null {
    const match = href.match(/\/insurance-reservation\/fill-data\/[^/]+\/(\d+)/);
    return match ? match[1] : null;
  }

  private createButton(
    doc: Document,
    insuranceId: string,
    onAddClick: (productId: string, optionIndex?: number) => void
  ): HTMLButtonElement {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-info btn-tce-add-cart mt-2';
    btn.title = 'Agregar al Carrito GT';
    btn.innerHTML = '+ 🛒 GT';
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onAddClick(insuranceId);
    });
    return btn;
  }
}
