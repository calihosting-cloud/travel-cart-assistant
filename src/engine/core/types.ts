export type ProductType = 'hotel' | 'flight' | 'tour' | 'transfer' | 'insurance';

export interface BaseProduct {
  id: string;
  type: ProductType;
  provider: string; // The OTA vendor e.g. 'BookingMotor'
  timestamp: number;
}

export interface Occupancy {
  adults: number;
  children: number;
  childrenAges: number[];
}

export interface HotelRoomRate {
  roomType: string;
  boardBasis: string; // e.g. "Solo alojamiento", "Desayuno incluido"
  price: number;
  currency: string;
  originalPrice?: number;
  originalCurrency?: string;
  supplierName: string; // The backend provider e.g. "TBO Holidays", "Hotelbeds"
  status: 'available' | 'onRequest' | 'soldOut';
  bookingUrl?: string;
}

export interface HotelProduct extends BaseProduct {
  hotelId: string;
  name: string;
  stars?: number;
  address?: string;
  imageUrl?: string;
  checkIn: string; // DD-MM-YYYY
  checkOut: string; // DD-MM-YYYY
  nights: number;
  roomsCount: number;
  occupancy: Occupancy[];
  rates: HotelRoomRate[];
}

export interface TransferLeg {
  direction: 'in' | 'out';
  date: string;
  time: string;
  status: string;
  maxPax?: number;
  maxLuggage?: number;
}

export interface TransferProduct extends BaseProduct {
  transferId: string;
  name: string;
  vehicleDescription?: string;
  transferType?: string;
  from: string;
  to: string;
  tripType: 'oneWay' | 'roundTrip';
  checkIn: string;
  checkInTime: string;
  checkOut?: string;
  checkOutTime?: string;
  adults: number;
  children: number;
  childrenAges: number[];
  legs: TransferLeg[];
  price: number;
  currency: string;
  supplierName: string;
  imageUrl?: string;
  bookingUrl?: string;
}

export interface HotelCartItem {
  type: 'hotel';
  id: string;
  hotelId: string;
  hotelName: string;
  stars?: number;
  address?: string;
  imageUrl?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  occupancy: Occupancy[];
  selectedRate: HotelRoomRate;
  addedAt: number;
}

export interface TransferCartItem {
  type: 'transfer';
  id: string;
  transferId: string;
  name: string;
  vehicleDescription?: string;
  transferType?: string;
  from: string;
  to: string;
  tripType: 'oneWay' | 'roundTrip';
  checkIn: string;
  checkInTime: string;
  checkOut?: string;
  checkOutTime?: string;
  adults: number;
  children: number;
  legs: TransferLeg[];
  price: number;
  currency: string;
  supplierName: string;
  imageUrl?: string;
  bookingUrl?: string;
  addedAt: number;
}

export type CartItem = HotelCartItem | TransferCartItem;

