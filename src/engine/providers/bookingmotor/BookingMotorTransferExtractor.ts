import { Extractor } from '../../core/Extractor';
import { DOMTransferData } from '../../core/DOMReader';
import { TransferSearchContext } from '../../core/JSDataReader';
import { TransferProduct } from '../../core/types';
import { BookingMotorTransferDOMReader } from './BookingMotorTransferDOMReader';
import { BookingMotorTransferJSReader } from './BookingMotorTransferJSReader';

export class BookingMotorTransferExtractor extends Extractor<
  TransferSearchContext,
  DOMTransferData,
  TransferProduct
> {
  constructor() {
    super(new BookingMotorTransferJSReader(), new BookingMotorTransferDOMReader());
  }

  extract(rawJSPayload: any, domContainer: Document | HTMLElement): TransferProduct[] {
    let context: TransferSearchContext;
    try {
      context = this.jsReader.parse(rawJSPayload);
    } catch (e) {
      console.warn('[TCE] Could not parse transfer JS context payload. Using empty fallback.', e);
      context = {
        from: '',
        to: '',
        tripType: 'oneWay',
        checkIn: '',
        checkInTime: '',
        adults: 0,
        children: 0,
        childrenAges: [],
      };
    }

    const rawTransfers = this.domReader.extractAll(domContainer);

    return rawTransfers.map((transfer) => ({
      id: `bm_transfer_${transfer.transferId}_${context.checkIn || 'any'}`,
      type: 'transfer',
      provider: 'BookingMotor',
      timestamp: Date.now(),
      transferId: transfer.transferId,
      name: transfer.name,
      vehicleDescription: transfer.vehicleDescription,
      transferType: transfer.transferType,
      from: context.from,
      to: context.to,
      tripType: context.tripType,
      checkIn: context.checkIn,
      checkInTime: context.checkInTime,
      checkOut: context.checkOut,
      checkOutTime: context.checkOutTime,
      adults: context.adults,
      children: context.children,
      childrenAges: context.childrenAges,
      legs: transfer.legs,
      price: transfer.price,
      currency: transfer.currency,
      supplierName: transfer.supplierName,
      imageUrl: transfer.imageUrl,
      bookingUrl: transfer.bookingUrl,
    }));
  }
}
