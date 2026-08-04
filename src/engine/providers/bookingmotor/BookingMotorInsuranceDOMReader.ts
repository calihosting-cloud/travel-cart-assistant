import { DOMReader, DOMInsuranceData } from '../../core/DOMReader';

export class BookingMotorInsuranceDOMReader extends DOMReader<DOMInsuranceData> {
  extractAll(container: Document | HTMLElement): DOMInsuranceData[] {
    const out: DOMInsuranceData[] = [];
    const blocks = container.querySelectorAll(
      '#list-insurance-items .list-layout-block, .bm-insurance-list .list-layout-block'
    );
    for (const block of blocks) {
      const parsed = this.parseBlock(block);
      if (parsed) out.push(parsed);
    }
    return out;
  }

  private parseBlock(block: Element): DOMInsuranceData | null {
    const bookingAnchor = block.querySelector(
      'a[href*="insurance-reservation/fill-data"]'
    ) as HTMLAnchorElement | null;
    if (!bookingAnchor) return null;

    const insuranceId = this.extractInsuranceId(bookingAnchor.href);
    if (!insuranceId) return null;

    const name =
      block.querySelector('h4')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const planLabel =
      block.querySelector('.summary .fw-medium')?.textContent?.replace(/\s+/g, ' ').trim() ||
      undefined;
    const supplierName =
      block.querySelector('.fw-medium')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const imgEl = block.querySelector('img.img-responsive') as HTMLImageElement | null;

    const { price, currency, priceUsd } = this.parsePrices(block);

    return {
      insuranceId,
      name,
      planLabel,
      price,
      currency,
      priceUsd,
      supplierName: supplierName && supplierName !== 'Desde' ? supplierName : '',
      imageUrl: imgEl?.src || undefined,
      bookingUrl: bookingAnchor.href,
    };
  }

  private extractInsuranceId(href: string): string | null {
    const match = href.match(/\/insurance-reservation\/fill-data\/[^/]+\/(\d+)/);
    return match ? match[1] : null;
  }

  private parsePrices(block: Element): {
    price: number;
    currency: string;
    priceUsd?: number;
  } {
    const priceBox = block.querySelector('.price');
    const text = priceBox?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const main = text.match(/([A-Z]{3})\s*([\d.,]+)/i);
    const usd = text.match(/USD\s*([\d.,]+)/i);

    return {
      currency: (main?.[1] || 'COP').toUpperCase(),
      price: main ? parseFloat(main[2].replace(/,/g, '')) || 0 : 0,
      priceUsd: usd ? parseFloat(usd[1].replace(/,/g, '')) : undefined,
    };
  }
}
