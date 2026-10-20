import { UIInjector } from '../../core/UIInjector';
import { tourMarkKey, wireBmAddButton } from './BookingMotorInCartBadge';

/**
 * Injects "+ 🛒 GT" on BookingMotor tour-process Paso 4 (`#buttonBlock`),
 * next to Cotización / Pre Reserva, once a quote total is available.
 */
export class BookingMotorTourProcessUIInjector extends UIInjector {
  injectButtons(
    container: Document | HTMLElement,
    onAddClick: (productId: string, optionIndex?: number) => void
  ): void {
    const doc = container.ownerDocument || (container as Document);
    const block = doc.querySelector('#buttonBlock');
    if (!block) return;
    if (block.hasAttribute('data-tce-injected')) return;
    if (block.querySelector('.btn-tce-add-cart')) return;

    const hasDate = !!doc.querySelector('#dateOutput')?.textContent?.trim();
    const hasTotal = /Total/i.test(doc.querySelector('#quotationDetail')?.textContent || '');
    const hasRates = Array.from(doc.querySelectorAll('table')).some(
      (t) =>
        t.querySelector('select[id^="roomSelected-"]') &&
        /([A-Z]{3})\s*[\d.,]+/i.test(t.textContent || '')
    );
    if (!hasDate || (!hasTotal && !hasRates)) return;

    const tourId = this.extractTourId(doc);
    if (!tourId) return;

    const btn = this.createButton(doc, tourId, block, onAddClick);
    const anchor =
      block.querySelector('#sendByEmail') ||
      block.querySelector('#requestBook') ||
      block.querySelector('button, a.btn');
    if (anchor) {
      anchor.after(btn);
    } else {
      block.appendChild(btn);
    }
    block.setAttribute('data-tce-injected', 'true');
  }

  private extractTourId(doc: Document): string | null {
    const path = typeof location !== 'undefined' ? location.pathname : '';
    const fromPath = path.match(/\/tour-process\/[^/]+\/([^/?#]+)/i);
    return fromPath?.[1] || 'tour';
  }

  private createButton(
    doc: Document,
    tourId: string,
    block: Element,
    onAddClick: (productId: string, optionIndex?: number) => void
  ): HTMLButtonElement {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-tce-add-cart';
    btn.textContent = '+ 🛒 GT';
    btn.title = 'Agregar circuito / bloqueo / combinado al carrito GT';
    btn.style.marginLeft = '8px';
    wireBmAddButton(btn, block, doc, [tourMarkKey(tourId)], () => onAddClick(tourId));
    return btn;
  }
}
