import { DOMReader, DOMActivityData } from '../../core/DOMReader';

export class BookingMotorActivityDOMReader extends DOMReader<DOMActivityData> {
  extractAll(container: Document | HTMLElement): DOMActivityData[] {
    const out: DOMActivityData[] = [];
    const seen = new Set<string>();
    const blocks = container.querySelectorAll('.list-results.list-activity');

    for (const block of blocks) {
      const roomsTable = block.querySelector('table.list-results-rooms');
      if (roomsTable) {
        for (const row of roomsTable.querySelectorAll('tbody tr')) {
          const parsed = this.parseOptionRow(block, row);
          if (!parsed) continue;
          const key = `${parsed.activityId}|${parsed.bookingUrl || ''}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(parsed);
        }
        continue;
      }

      const parsed = this.parseCollapsedBlock(block);
      if (!parsed) continue;
      const key = `${parsed.activityId}|${parsed.bookingUrl || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(parsed);
    }

    return out;
  }

  private parseCollapsedBlock(block: Element): DOMActivityData | null {
    const bookingAnchor = block.querySelector(
      'a.btn-success[href*="activity-option"], a.btn-success[href*="activity-reservation"]'
    ) as HTMLAnchorElement | null;
    if (!bookingAnchor) return null;

    const activityId = this.extractActivityId(bookingAnchor.href);
    if (!activityId) return null;

    const name =
      block.querySelector('h4.name a, h4.name')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const description =
      block.querySelector('.info span')?.textContent?.replace(/\s+/g, ' ').trim() || undefined;
    const imgEl = block.querySelector('.item-image img, img.img-responsive') as HTMLImageElement | null;
    const supplierName =
      block.querySelector('.list-from-generic .text-center p')?.textContent?.trim() || '';

    const { price, currency, priceUsd } = this.parseFromPrices(block);

    return {
      activityId,
      name,
      description,
      price,
      currency,
      priceUsd,
      supplierName,
      imageUrl: imgEl?.src || undefined,
      bookingUrl: bookingAnchor.href,
    };
  }

  private parseOptionRow(block: Element, row: Element): DOMActivityData | null {
    const bookingAnchor = row.querySelector(
      'td.hidden-phone-table.textcenter a.btn-success, a[id^="linkBook_"]'
    ) as HTMLAnchorElement | null;
    if (!bookingAnchor?.href) return null;

    const activityId = this.extractActivityId(bookingAnchor.href);
    if (!activityId) return null;

    const name =
      block.querySelector('h4.name a, h4.name')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const modality =
      row.querySelector('td.hidden-phone-table')?.textContent?.replace(/\s+/g, ' ').trim() ||
      undefined;
    const imgEl = block.querySelector('.item-image img, img.img-responsive') as HTMLImageElement | null;
    const supplierName =
      block.querySelector('.list-from-generic .text-center p')?.textContent?.trim() || 'Grupos Travel';

    const priceSpan = row.querySelector('td.prices span, span[id^="price_"]');
    const priceText = priceSpan?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const currencyMatch =
      row.querySelector('td.prices')?.textContent?.match(/([A-Z]{3})/i) ||
      priceText.match(/([A-Z]{3})/i);
    const amount = parseFloat(priceText.replace(/,/g, ''));

    return {
      activityId,
      name: modality ? `${name} · ${modality.slice(0, 80)}` : name,
      description: modality,
      price: Number.isFinite(amount) ? amount : 0,
      currency: (currencyMatch?.[1] || 'COP').toUpperCase(),
      supplierName,
      imageUrl: imgEl?.src || undefined,
      bookingUrl: bookingAnchor.href,
    };
  }

  private extractActivityId(href: string): string | null {
    const option = href.match(/\/activity-option\/index\/[^/]+\/(\d+)/);
    if (option) return option[1];
    const fill = href.match(/\/activity-reservation\/fill-data\/[^/]+\/(\d+)/);
    return fill ? fill[1] : null;
  }

  private parseFromPrices(block: Element): {
    price: number;
    currency: string;
    priceUsd?: number;
  } {
    const fromEl = block.querySelector('.price em.from, em.from');
    const usdEl = block.querySelector('.price em.supplier, em.supplier');
    const fromText = fromEl?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const usdText = usdEl?.textContent?.replace(/\s+/g, ' ').trim() || '';

    const main = fromText.match(/([A-Z]{3})\s*([\d.,]+)/i);
    const usd = usdText.match(/USD\s*([\d.,]+)/i);

    const currency = (main?.[1] || 'COP').toUpperCase();
    const price = main ? parseFloat(main[2].replace(/,/g, '')) : 0;
    const priceUsd = usd ? parseFloat(usd[1].replace(/,/g, '')) : undefined;

    return {
      price: Number.isFinite(price) ? price : 0,
      currency,
      priceUsd: priceUsd !== undefined && Number.isFinite(priceUsd) ? priceUsd : undefined,
    };
  }
}
