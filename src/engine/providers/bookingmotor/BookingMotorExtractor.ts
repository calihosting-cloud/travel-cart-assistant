import { Extractor } from '../../core/Extractor';
import { DOMHotelData } from '../../core/DOMReader';
import { HotelSearchContext } from '../../core/JSDataReader';
import { HotelProduct } from '../../core/types';
import { BookingMotorDOMReader } from './BookingMotorDOMReader';
import { BookingMotorJSReader } from './BookingMotorJSReader';

export class BookingMotorExtractor extends Extractor<HotelSearchContext, DOMHotelData, HotelProduct> {
  constructor() {
    super(new BookingMotorJSReader(), new BookingMotorDOMReader());
  }

  /**
   * Orchestrates the extraction. Resolves search criteria from memory variables
   * and fuses them with granular results scraped from the page's HTML structure.
   */
  extract(rawJSPayload: any, domContainer: Document | HTMLElement): HotelProduct[] {
    // 1. Extract context from JS variables (dates, passengers, etc.)
    let context: HotelSearchContext;
    try {
      context = this.jsReader.parse(rawJSPayload);
    } catch (e) {
      // Fallback context if JS payload is not yet loaded/available
      console.warn('[TCE] Could not parse JS context payload. Using empty fallback context.', e);
      context = {
        checkIn: '',
        checkOut: '',
        nights: 0,
        roomsCount: 0,
        occupancy: [],
      };
    }

    // 2. Extract hotel cards from DOM
    const rawHotels = this.domReader.extractAll(domContainer);

    // 3. Fulfill final HotelProduct domain models
    return rawHotels.map((hotel) => {
      return {
        id: `bm_hotel_${hotel.hotelId}_${context.checkIn || 'any'}_${context.checkOut || 'any'}`,
        type: 'hotel',
        provider: 'BookingMotor',
        timestamp: Date.now(),
        hotelId: hotel.hotelId,
        name: hotel.name,
        stars: hotel.stars,
        address: hotel.address,
        imageUrl: hotel.imageUrl,
        checkIn: context.checkIn,
        checkOut: context.checkOut,
        nights: context.nights,
        roomsCount: context.roomsCount,
        occupancy: context.occupancy,
        rates: hotel.rates,
      };
    });
  }
}
