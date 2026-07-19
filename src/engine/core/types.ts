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

export interface FlightEndpoint {
  airportCode: string;
  airportName?: string;
  cityCode?: string;
  cityName?: string;
  date: string; // YYYY-MM-DD
  hour: string; // HH:mm
}

export interface FlightSegment {
  airlineCode?: string;
  airlineName?: string;
  flightNumber?: string; // e.g. "LA4316"
  equipment?: string; // e.g. "Airbus A320-100/200"
  cabin?: string; // e.g. "Económica"
  duration?: string; // e.g. "1h 50m"
  departure: FlightEndpoint;
  arrival: FlightEndpoint;
}

export interface FlightLeg {
  direction: 'outbound' | 'return';
  label: string; // "IDA" / "VUELTA"
  dateLabel?: string; // e.g. "Vie. 17 jul. 2026"
  routeDescription?: string; // e.g. "Medellín - San Andrés"
  duration?: string; // total leg duration, e.g. "1h 50m"
  stops: number;
  airlines: string[]; // unique airline names in the leg
  segments: FlightSegment[];
}

export interface FlightPriceBreakdownItem {
  code: string;
  amount: number;
  description: string;
}

export interface FlightProduct extends BaseProduct {
  tripId?: string;
  title: string; // e.g. "Medellín - San Andrés"
  routeType: 'oneWay' | 'roundTrip';
  origin: { code: string; name?: string };
  destination: { code: string; name?: string };
  departureDate?: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  adults: number;
  children: number;
  infants: number;
  paxSummary?: string; // e.g. "Ida y vuelta, 2 adultos, 1 menor"
  legs: FlightLeg[];
  price: number;
  currency: string;
  priceBreakdown: FlightPriceBreakdownItem[];
  bookingUrl?: string;
}

export interface FlightCartItem {
  type: 'flight';
  id: string;
  provider: string;
  tripId?: string;
  title: string;
  routeType: 'oneWay' | 'roundTrip';
  origin: { code: string; name?: string };
  destination: { code: string; name?: string };
  departureDate?: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  paxSummary?: string;
  legs: FlightLeg[];
  price: number;
  currency: string;
  priceBreakdown: FlightPriceBreakdownItem[];
  bookingUrl?: string;
  addedAt: number;
}

export type CartItem = HotelCartItem | TransferCartItem | FlightCartItem;

export interface RoomOccupancy {
  adults: number;
  children: number;
  childrenAges: number[];
}

/**
 * Normalized snapshot of a BookingMotor search form, used to carry the
 * passenger/date context from one product tab (e.g. hotels) to the next
 * (e.g. transfers) so the advisor doesn't retype it.
 *
 * The destination is stored only as a free-text hint: the real transfer
 * pickup/dropoff IDs come from the site's autocomplete and cannot be
 * reconstructed from a hotel name, so it is never auto-applied.
 */
export interface SearchContext {
  sourceType: 'hotel' | 'transfer' | 'flight';
  checkIn?: string; // DD-MM-YYYY
  checkOut?: string; // DD-MM-YYYY
  nights?: number;
  rooms: RoomOccupancy[];
  totalAdults: number;
  totalChildren: number;
  childrenAges: number[];
  nationality?: string; // option value code
  destinationText?: string;
  savedAt: number;
}

