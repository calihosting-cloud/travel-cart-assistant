import { HotelSearchContext, JSDataReader } from '../../core/JSDataReader';
import { Occupancy } from '../../core/types';

export class BookingMotorJSReader extends JSDataReader<HotelSearchContext> {
  /**
   * Parses the raw global `data` object payload from BookingMotor.
   */
  parse(rawPayload: any): HotelSearchContext {
    if (!rawPayload || !rawPayload.searchhotel) {
      throw new Error('Invalid BookingMotor JS payload: searchhotel key is missing');
    }

    const sh = rawPayload.searchhotel;

    // Parse listrooms array to match domain Occupancy interface
    const occupancy: Occupancy[] = [];
    if (Array.isArray(sh.listrooms)) {
      for (const r of sh.listrooms) {
        const adults = parseInt(r.adults || '0', 10);
        const children = parseInt(r.children || '0', 10);
        let childrenAges: number[] = [];
        
        if (Array.isArray(r.childrenages)) {
          // BM sends either numbers/strings or `{ age: "10" }` objects.
          childrenAges = r.childrenages
            .map((entry: unknown) => {
              if (entry != null && typeof entry === 'object' && 'age' in entry) {
                return parseInt(String((entry as { age: unknown }).age), 10);
              }
              return parseInt(String(entry), 10);
            })
            .filter((age: number) => !isNaN(age));
        }

        occupancy.push({
          adults,
          children,
          childrenAges,
        });
      }
    }

    return {
      checkIn: sh.checkin || '',
      checkOut: sh.checkout || '',
      nights: typeof sh.nights === 'number' ? sh.nights : parseInt(sh.nights || '0', 10),
      roomsCount: typeof sh.rooms === 'number' ? sh.rooms : parseInt(sh.rooms || '0', 10),
      occupancy,
      raw: rawPayload,
    };
  }
}
