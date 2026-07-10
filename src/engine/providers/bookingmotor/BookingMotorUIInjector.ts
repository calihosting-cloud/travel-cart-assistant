import { UIInjector } from '../../core/UIInjector';

export class BookingMotorUIInjector extends UIInjector {
  /**
   * Scans hotel results and injects '+ 🛒' buttons in room rate rows.
   */
  injectButtons(
    container: Document | HTMLElement,
    onAddClick: (productId: string, optionIndex?: number) => void
  ): void {
    const doc = container.ownerDocument || (container as Document);
    const hotelBlocks = container.querySelectorAll('.list-results.list-hotel');

    for (const block of hotelBlocks) {
      const hotelId = this.extractHotelId(block);
      if (!hotelId) continue;

      const roomsTable = block.querySelector('table.list-results-rooms');
      if (!roomsTable) continue;

      // Select all rows inside room table body
      const rows = roomsTable.querySelectorAll('tbody tr');
      let rateIndex = 0;

      for (const row of rows) {
        // Ensure this row contains actual rate details (has desktop cells)
        const desktopCells = row.querySelectorAll('td.hidden-phone-table');
        if (desktopCells.length < 5) continue;

        const alreadyInjected = row.hasAttribute('data-tce-injected');
        let injected = false;

        if (!alreadyInjected) {
          // 1. Inject in Desktop cell
          const desktopActionCell = row.querySelector('td.hidden-phone-table.textcenter');
          if (desktopActionCell) {
            const bookingLink = desktopActionCell.querySelector('a.btn-success');
            if (bookingLink && !desktopActionCell.querySelector('.btn-tce-add-cart')) {
              const btn = this.createButton(doc, hotelId, rateIndex, onAddClick);
              bookingLink.after(btn);
              injected = true;
            }
          }

          // 2. Inject in Mobile cell
          const mobileActionCell = row.querySelector('td.show-phone-table');
          if (mobileActionCell) {
            const bookingLink = mobileActionCell.querySelector('a.btn-success');
            if (bookingLink && !mobileActionCell.querySelector('.btn-tce-add-cart')) {
              const btn = this.createButton(doc, hotelId, rateIndex, onAddClick);
              btn.style.marginLeft = '8px';
              bookingLink.after(btn);
              injected = true;
            }
          }

          if (injected) {
            row.setAttribute('data-tce-injected', 'true');
          }
        }

        // Increment rateIndex for the next rate option in this hotel block
        rateIndex++;
      }
    }
  }

  private extractHotelId(block: Element): string | null {
    const idAttr = block.getAttribute('id');
    if (idAttr && idAttr.startsWith('original_box_hotel_')) {
      return idAttr.replace('original_box_hotel_', '');
    }
    const compareAnchor = block.querySelector('.add-compare');
    if (compareAnchor) {
      return compareAnchor.getAttribute('data-id');
    }
    return null;
  }

  private createButton(
    doc: Document,
    hotelId: string,
    rateIndex: number,
    onAddClick: (productId: string, optionIndex?: number) => void
  ): HTMLButtonElement {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-xs btn-info btn-tce-add-cart';
    btn.innerHTML = '<i class="fa-regular fa-plus"></i> + 🛒';
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
      onAddClick(hotelId, rateIndex);
    });

    return btn;
  }
}
