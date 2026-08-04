import { DOMHotelData, DOMReader } from '../../core/DOMReader';
import { HotelRoomRate } from '../../core/types';

export class BookingMotorDOMReader extends DOMReader<DOMHotelData> {
  /**
   * Scrapes hotel listing information from BookingMotor HTML.
   */
  extractAll(container: Document | HTMLElement): DOMHotelData[] {
    const hotels: DOMHotelData[] = [];
    // Select each hotel result container
    const hotelBlocks = container.querySelectorAll('.list-results.list-hotel');

    for (const block of hotelBlocks) {
      const hotelId = this.extractHotelId(block);
      if (!hotelId) continue;

      const header = block.querySelector(`#header_${hotelId}`) || block;
      
      // 1. Extract Name & Stars
      const nameAnchor = header.querySelector('h4.name a');
      const hotelName = nameAnchor?.textContent?.trim() || '';
      
      const starsSpan = header.querySelector('h4.name span');
      const starsText = starsSpan?.textContent || '';
      const stars = (starsText.match(/★/g) || []).length || undefined;

      // 2. Extract Address
      const address = header.querySelector('p.address span')?.textContent?.trim() || '';

      // 3. Extract Image (resolve to absolute URL using image element property)
      const imgEl = header.querySelector('.item-image img') as HTMLImageElement | null;
      const imageUrl = imgEl?.src || undefined;

      // 4. Extract Room Rates from rooms table
      const rates = this.extractRates(block, hotelId);

      hotels.push({
        hotelId,
        name: hotelName,
        stars,
        address,
        imageUrl,
        rates,
      });
    }

    return hotels;
  }

  private extractHotelId(block: Element): string | null {
    const idAttr = block.getAttribute('id'); // original_box_hotel_XXXX
    if (idAttr && idAttr.startsWith('original_box_hotel_')) {
      return idAttr.replace('original_box_hotel_', '');
    }
    // Fallback: look for a data-id or inside header attributes
    const compareAnchor = block.querySelector('.add-compare');
    if (compareAnchor) {
      return compareAnchor.getAttribute('data-id');
    }
    return null;
  }

  private extractRates(block: Element, hotelId: string): HotelRoomRate[] {
    const rates: HotelRoomRate[] = [];
    const roomsTable = block.querySelector('table.list-results-rooms');
    if (!roomsTable) return rates;

    // We only select rows that are NOT marked for mobile viewing to prevent double extraction
    // Mobile rows contain a single colspan=6 cell and show-phone-table class.
    // Desktop rows contain td.hidden-phone-table.
    const rows = roomsTable.querySelectorAll('tbody tr:not(.show-phone-table)');
    // Multi-room solutions list N per-room rows then one solution-total row
    // (empty first cell + Reservar). Keep every row for rateIndex alignment
    // with BookingMotorUIInjector, but enrich the total row from the group.
    let groupRooms: HotelRoomRate[] = [];

    for (const row of rows) {
      const cells = row.querySelectorAll('td.hidden-phone-table');
      if (cells.length < 5) continue; // Expecting at least 5 desktop cells: [room, passengers, status, nightly, total, action/supplier]

      // Cell 0: Room & Board
      const roomTd = cells[0];
      const pl0Div = roomTd.querySelector('div.pl0');
      let roomType = '';
      let boardBasis = '';

      if (pl0Div) {
        const roomClone = pl0Div.cloneNode(true) as HTMLElement;
        
        // Extract & remove board (span.meal)
        const mealSpan = roomClone.querySelector('span.meal');
        if (mealSpan) {
          boardBasis = mealSpan.textContent?.replace(/\s+/g, ' ').trim() || '';
          boardBasis = boardBasis.replace(/^[,;\s]+/, ''); // Clean leading punctuation
          mealSpan.remove();
        }

        // Remove promo remarks (div.remarks)
        const remarksDiv = roomClone.querySelector('.remarks');
        if (remarksDiv) {
          remarksDiv.remove();
        }

        roomType = roomClone.textContent?.replace(/\s+/g, ' ').trim() || '';
      }

      // Cell 2: Status
      const statusText = cells[2]?.textContent?.trim() || '';
      let status: HotelRoomRate['status'] = 'onRequest';
      if (statusText.toLowerCase().includes('disponible')) {
        status = 'available';
      } else if (statusText.toLowerCase().includes('agotado') || statusText.toLowerCase().includes('no disponible')) {
        status = 'soldOut';
      }

      // Cell 3 & 4: Nightly & Total Price
      const totalRaw = cells[4]?.textContent || '';
      const totalData = this.parsePrice(totalRaw);

      // Cell 5: Supplier Name & booking url
      const actionTd = cells[5] || cells[4]; // Fallback in case columns shift
      const bookingAnchor = actionTd.querySelector('a.btn-success') as HTMLAnchorElement | null;
      const bookingUrl = bookingAnchor?.href || undefined;

      // Extract Supplier Name by cloning cell and removing the button/links
      const actionClone = actionTd.cloneNode(true) as HTMLElement;
      const links = actionClone.querySelectorAll('a, button');
      links.forEach((l) => l.remove());
      const supplierName = actionClone.textContent?.replace(/\s+/g, ' ').trim() || '';

      const isSolutionTotal = !pl0Div && !!bookingUrl && groupRooms.length > 0;
      if (isSolutionTotal) {
        const roomsCount = groupRooms.length;
        const first = groupRooms[0];
        const uniqueTypes = Array.from(
          new Set(groupRooms.map((r) => r.roomType).filter(Boolean))
        );
        rates.push({
          roomType:
            uniqueTypes.length === 1
              ? `${roomsCount} x ${uniqueTypes[0].replace(/^1\s*x\s*/i, '')}`
              : `${roomsCount} habitaciones`,
          boardBasis: first.boardBasis || boardBasis,
          price: totalData.price,
          currency: totalData.currency,
          roomsCount,
          pricePerRoom: totalData.price > 0 ? totalData.price / roomsCount : undefined,
          status: first.status,
          supplierName: supplierName || first.supplierName,
          bookingUrl,
        });
        groupRooms = [];
        continue;
      }

      const rate: HotelRoomRate = {
        roomType,
        boardBasis,
        price: totalData.price,
        currency: totalData.currency,
        roomsCount: pl0Div ? 1 : undefined,
        status,
        supplierName,
        bookingUrl,
      };
      if (pl0Div) groupRooms.push(rate);
      else groupRooms = [];
      rates.push(rate);
    }

    return rates;
  }

  private parsePrice(rawText: string): { price: number; currency: string } {
    const cleaned = rawText.replace(/\s+/g, ' ').trim();
    // Match "COP 177,103.93" or "USD 150"
    const match = cleaned.match(/^([A-Z]{3})\s*([\d,.]+)/i);
    if (match) {
      const currency = match[1].toUpperCase();
      const priceVal = parseLocalizedAmount(match[2]);
      return { price: isNaN(priceVal) ? 0 : priceVal, currency };
    }
    return { price: 0, currency: '' };
  }
}

function parseLocalizedAmount(raw: string): number {
  const cleaned = raw.replace(/[^\d.,-]/g, '');
  if (!cleaned) return 0;
  if (cleaned.includes('.') && cleaned.includes(',')) {
    // Last separator is decimal: supports 4,083,779.45 and 4.083.779,45.
    return cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')
      ? Number(cleaned.replace(/,/g, '')) || 0
      : Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  const separator = cleaned.includes('.') ? '.' : cleaned.includes(',') ? ',' : '';
  if (!separator) return Number(cleaned) || 0;
  const parts = cleaned.split(separator);
  if (parts.length === 2 && parts[1].length <= 2) {
    return Number(`${parts[0]}.${parts[1]}`) || 0;
  }
  return Number(parts.join('')) || 0;
}
