import { JSDataReader, TransferSearchContext } from '../../core/JSDataReader';

export class BookingMotorTransferJSReader extends JSDataReader<TransferSearchContext> {
  parse(rawPayload: any): TransferSearchContext {
    if (!rawPayload || !rawPayload.searchtransfer) {
      throw new Error('Invalid BookingMotor JS payload: searchtransfer key is missing');
    }

    const st = rawPayload.searchtransfer;
    const typeVal = parseInt(st.type || '1', 10);

    let childrenAges: number[] = [];
    if (Array.isArray(st.childrenages)) {
      childrenAges = st.childrenages
        .map((age: any) => parseInt(age, 10))
        .filter((age: number) => !isNaN(age));
    }

    return {
      from: st.from || '',
      to: st.to || '',
      tripType: typeVal === 2 ? 'roundTrip' : 'oneWay',
      checkIn: st.checkin || '',
      checkInTime: st.checkintime || '',
      checkOut: st.checkout || undefined,
      checkOutTime: st.checkouttime || undefined,
      adults: parseInt(st.adults || '0', 10),
      children: parseInt(st.children || '0', 10),
      childrenAges,
      raw: rawPayload,
    };
  }
}
