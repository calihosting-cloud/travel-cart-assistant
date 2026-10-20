import { HotelRoomRate } from './types';

export interface DOMHotelData {
  hotelId: string;
  name: string;
  stars?: number;
  address?: string;
  imageUrl?: string;
  /** WGS84 from BM hidden inputs `#latitud_{id}` / `#longitude_{id}`. */
  latitude?: number;
  longitude?: number;
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
  priceUsd?: number;
  supplierName: string;
  imageUrl?: string;
  bookingUrl?: string;
}

export interface DOMActivityData {
  activityId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  priceUsd?: number;
  /** True when BM showed a unit / “desde” price rather than group total. */
  priceIsPerPerson?: boolean;
  supplierName: string;
  imageUrl?: string;
  bookingUrl?: string;
}

export interface DOMInsuranceData {
  insuranceId: string;
  name: string;
  planLabel?: string;
  /** Short bullets shown on the BM card. */
  summaryLines?: string[];
  /** Full plan list from the BM modal. */
  coverageLines?: string[];
  price: number;
  currency: string;
  priceUsd?: number;
  supplierName: string;
  imageUrl?: string;
  bookingUrl?: string;
}

export interface DOMTourRoomSelection {
  code: string;
  label: string;
  rooms: number;
  paxPerRoom: number;
  pricePerPerson?: number;
}

export interface DOMTourOccupancyRates {
  currency: string;
  sgl?: number;
  dbl?: number;
  tpl?: number;
  qdp?: number;
}

/** Snapshot of a BookingMotor tour-process quote (Pasos 1–4). */
export interface DOMTourQuoteData {
  tourId: string;
  name: string;
  isBloqueo: boolean;
  isCombinado: boolean;
  originCity?: string;
  destinationCity?: string;
  departureDate: string;
  returnDate?: string;
  departureLabel?: string;
  days?: number;
  nights?: number;
  adults: number;
  children: number;
  infants: number;
  payingPax: number;
  roomsSummary?: string;
  rooms: DOMTourRoomSelection[];
  occupancyRates?: DOMTourOccupancyRates;
  price: number;
  pricePerPerson: number;
  currency: string;
  priceEstimated?: boolean;
  category?: string;
  /** e.g. "Articulo Personal 10 Kg" from BM category/options. */
  baggageNote?: string;
  /** Human return date, e.g. "Domingo, 15 noviembre 2026". */
  returnLabel?: string;
  bookingUrl?: string;
}

export abstract class DOMReader<T> {
  /**
   * Scrapes and returns all elements of type T from the DOM container.
   */
  abstract extractAll(container: Document | HTMLElement): T[];
}
