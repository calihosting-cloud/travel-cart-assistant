import { UIInjector } from '../../core/UIInjector';

export class BookingMotorActivityUIInjector extends UIInjector {
  injectButtons(
    container: Document | HTMLElement,
    onAddClick: (productId: string, optionIndex?: number) => void
  ): void {
    const doc = container.ownerDocument || (container as Document);
    const blocks = container.querySelectorAll('.list-results.list-activity');

    for (const block of blocks) {
      const roomsTable = block.querySelector('table.list-results-rooms');
      if (roomsTable) {
        this.injectOptionRows(doc, block, roomsTable, onAddClick);
        continue;
      }
      this.injectCollapsed(doc, block, onAddClick);
    }
  }

  private injectCollapsed(
    doc: Document,
    block: Element,
    onAddClick: (productId: string, optionIndex?: number) => void
  ): void {
    if (block.hasAttribute('data-tce-injected')) return;
    if (block.querySelector('.btn-tce-add-cart')) return;

    const bookingLink = block.querySelector(
      'a.btn-success[href*="activity-option"], a.btn-success[href*="activity-reservation"]'
    ) as HTMLAnchorElement | null;
    if (!bookingLink) return;

    const activityId = this.extractActivityId(bookingLink.href);
    if (!activityId) return;

    bookingLink.after(this.createButton(doc, activityId, onAddClick));
    block.setAttribute('data-tce-injected', 'true');
  }

  private injectOptionRows(
    doc: Document,
    block: Element,
    roomsTable: Element,
    onAddClick: (productId: string, optionIndex?: number) => void
  ): void {
    let optionIndex = 0;
    for (const row of roomsTable.querySelectorAll('tbody tr')) {
      if (row.hasAttribute('data-tce-injected')) {
        optionIndex++;
        continue;
      }

      const desktop = row.querySelector('td.hidden-phone-table.textcenter a.btn-success') as
        | HTMLAnchorElement
        | null;
      const mobile = row.querySelector('td.show-phone-table a.btn-success') as HTMLAnchorElement | null;
      const link = desktop || mobile;
      if (!link) {
        optionIndex++;
        continue;
      }

      const activityId = this.extractActivityId(link.href);
      if (!activityId) {
        optionIndex++;
        continue;
      }

      let injected = false;
      if (desktop && !desktop.parentElement?.querySelector('.btn-tce-add-cart')) {
        desktop.after(this.createButton(doc, activityId, onAddClick, optionIndex));
        injected = true;
      }
      if (mobile && !mobile.parentElement?.querySelector('.btn-tce-add-cart')) {
        const btn = this.createButton(doc, activityId, onAddClick, optionIndex);
        btn.style.marginLeft = '8px';
        mobile.after(btn);
        injected = true;
      }

      if (injected) row.setAttribute('data-tce-injected', 'true');
      optionIndex++;
    }

    block.setAttribute('data-tce-injected', 'true');
  }

  private extractActivityId(href: string): string | null {
    const option = href.match(/\/activity-option\/index\/[^/]+\/(\d+)/);
    if (option) return option[1];
    const fill = href.match(/\/activity-reservation\/fill-data\/[^/]+\/(\d+)/);
    return fill ? fill[1] : null;
  }

  private createButton(
    doc: Document,
    activityId: string,
    onAddClick: (productId: string, optionIndex?: number) => void,
    optionIndex?: number
  ): HTMLButtonElement {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-xs btn-info btn-tce-add-cart';
    btn.title = 'Agregar al Carrito GT';
    btn.innerHTML = '<i class="fa-regular fa-plus"></i> + 🛒 GT';
    btn.style.marginLeft = '5px';
    btn.style.padding = '1px 5px';
    btn.style.fontSize = '11px';
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onAddClick(activityId, optionIndex);
    });
    return btn;
  }
}
