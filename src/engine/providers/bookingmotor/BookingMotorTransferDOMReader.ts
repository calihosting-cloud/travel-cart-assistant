import { DOMReader, DOMTransferData } from '../../core/DOMReader';
import { TransferLeg } from '../../core/types';

export class BookingMotorTransferDOMReader extends DOMReader<DOMTransferData> {
  extractAll(container: Document | HTMLElement): DOMTransferData[] {
    const transfers: DOMTransferData[] = [];
    const blocks = container.querySelectorAll('.list-results.list-transfer');

    for (const block of blocks) {
      const parsed = this.parseBlock(block);
      if (parsed) transfers.push(parsed);
    }

    return transfers;
  }

  private parseBlock(block: Element): DOMTransferData | null {
    const bookingAnchor = block.querySelector('a.btn-success.btn-book') as HTMLAnchorElement | null;
    if (!bookingAnchor) return null;

    const transferId = this.extractTransferId(bookingAnchor.href);
    if (!transferId) return null;

    const name = block.querySelector('h4.name')?.textContent?.trim() || '';
    const vehicleDescription = block.querySelector('p.address span')?.textContent?.trim() || undefined;

    const nameCol = block.querySelector('h4.name')?.parentElement;
    let transferType: string | undefined;
    if (nameCol) {
      const fullText = nameCol.textContent || '';
      const typeMatch = fullText.replace(name, '').match(/\(([^)]+)\)/);
      if (typeMatch) transferType = typeMatch[1].trim();
    }

    const imgEl = block.querySelector('.item-image img, img.img-responsive') as HTMLImageElement | null;
    const imageUrl = imgEl?.src || undefined;

    const contentEl = block.querySelector('.list-results-content');
    const legs = contentEl ? this.parseLegs(contentEl) : [];

    const priceBlock = block.querySelector('.list-from-generic .price em.from, .price em.from');
    const { price, currency } = this.parsePrice(priceBlock);

    const supplierEl = block.querySelector('.list-from-generic .text-center p');
    const supplierName = supplierEl?.textContent?.trim() || '';

    return {
      transferId,
      name,
      vehicleDescription,
      transferType,
      legs,
      price,
      currency,
      supplierName,
      imageUrl,
      bookingUrl: bookingAnchor.href,
    };
  }

  private extractTransferId(href: string): string | null {
    const match = href.match(/\/transfer-reservation\/fill-data\/[^/]+\/(\d+)/);
    return match ? match[1] : null;
  }

  private parseLegs(contentEl: Element): TransferLeg[] {
    const legs: TransferLeg[] = [];
    const html = contentEl.innerHTML;
    const segments = html.split(/<br\s*\/?>/i);

    for (const segment of segments) {
      const text = segment.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!text.includes('Dirección:')) continue;

      const directionMatch = text.match(/Dirección:\s*(IN|OUT)/i);
      const dateMatch = text.match(/Fecha:\s*([^,]+)/i);
      const timeMatch = text.match(/Hora:\s*([^,]+)/i);
      const statusMatch = text.match(/Estado:\s*([^,]+)/i);
      const paxMatch = text.match(/Max paxs:\s*(\d+)/i);
      const luggageMatch = text.match(/Max luggage:\s*(\d+)/i);

      if (!directionMatch) continue;

      legs.push({
        direction: directionMatch[1].toUpperCase() === 'OUT' ? 'out' : 'in',
        date: dateMatch?.[1]?.trim() || '',
        time: timeMatch?.[1]?.trim() || '',
        status: statusMatch?.[1]?.trim() || '',
        maxPax: paxMatch ? parseInt(paxMatch[1], 10) : undefined,
        maxLuggage: luggageMatch ? parseInt(luggageMatch[1], 10) : undefined,
      });
    }

    return legs;
  }

  private parsePrice(priceEl: Element | null): { price: number; currency: string } {
    if (!priceEl) return { price: 0, currency: '' };

    const span = priceEl.querySelector('span');
    const rawText = priceEl.textContent?.replace(/\s+/g, ' ').trim() || '';
    const match = rawText.match(/([A-Z]{3})\s*([\d,.]+)/i);

    if (match) {
      const currency = match[1].toUpperCase();
      const price = parseFloat(match[2].replace(/,/g, ''));
      return { price: isNaN(price) ? 0 : price, currency };
    }

    if (span) {
      const price = parseFloat(span.textContent?.replace(/,/g, '') || '0');
      const currencyMatch = rawText.match(/([A-Z]{3})/);
      return { price: isNaN(price) ? 0 : price, currency: currencyMatch?.[1] || '' };
    }

    return { price: 0, currency: '' };
  }
}
