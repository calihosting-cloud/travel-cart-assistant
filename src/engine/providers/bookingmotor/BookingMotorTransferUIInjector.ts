import { UIInjector } from '../../core/UIInjector';

export class BookingMotorTransferUIInjector extends UIInjector {
  injectButtons(
    container: Document | HTMLElement,
    onAddClick: (productId: string, optionIndex?: number) => void
  ): void {
    const doc = container.ownerDocument || (container as Document);
    const blocks = container.querySelectorAll('.list-results.list-transfer');

    for (const block of blocks) {
      if (block.hasAttribute('data-tce-injected')) continue;

      const bookingLink = block.querySelector('a.btn-success.btn-book') as HTMLAnchorElement | null;
      if (!bookingLink || block.querySelector('.btn-tce-add-cart')) continue;

      const transferId = this.extractTransferId(bookingLink.href);
      if (!transferId) continue;

      const btn = this.createButton(doc, transferId, onAddClick);
      btn.style.marginLeft = '8px';
      bookingLink.after(btn);
      block.setAttribute('data-tce-injected', 'true');
    }
  }

  private extractTransferId(href: string): string | null {
    const match = href.match(/\/transfer-reservation\/fill-data\/[^/]+\/(\d+)/);
    return match ? match[1] : null;
  }

  private createButton(
    doc: Document,
    transferId: string,
    onAddClick: (productId: string, optionIndex?: number) => void
  ): HTMLButtonElement {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-xs btn-info btn-tce-add-cart';
    btn.title = 'Agregar al Carrito GT';
    btn.setAttribute('aria-label', 'Agregar al Carrito GT');
    btn.innerHTML = '<i class="fa-regular fa-plus"></i> + 🛒 GT';
    btn.style.marginLeft = '5px';
    btn.style.padding = '1px 5px';
    btn.style.fontSize = '11px';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.gap = '3px';
    btn.style.cursor = 'pointer';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onAddClick(transferId);
    });

    return btn;
  }
}
