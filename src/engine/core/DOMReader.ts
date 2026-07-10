import { HotelRoomRate } from './types';

export interface DOMHotelData {
  hotelId: string;
  name: string;
  stars?: number;
  address?: string;
  imageUrl?: string;
  rates: HotelRoomRate[];
}

import { TransferLeg } from './types';

export interface DOMTransferData {
  transferId: string;
  name: string;
  vehicleDescription?: string;
  transferType?: string;
  legs: TransferLeg[];
  price: number;
  currency: string;
  supplierName: string;
  imageUrl?: string;
  bookingUrl?: string;
}

export abstract class DOMReader<T> {
  /**
   * Scrapes and returns all elements of type T from the DOM container.
   */
  abstract extractAll(container: Document | HTMLElement): T[];
}
