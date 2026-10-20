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
  /** When BookingMotor shows a multi-room solution total, how many rooms it covers. */
  roomsCount?: number;
  /** Average / indicative per-room share of `price` when roomsCount > 1. */
  pricePerRoom?: number;
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
  /** WGS84 — used for compare PDF map pins. */
  latitude?: number;
  longitude?: number;
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

export interface CartItemAdjustments {
  /** Extra charged on this service (COP); added to the item line total. */
  mayorValor?: number;
  /** Rounding top-up for this service (COP); added to the item line total. */
  redondeo?: number;
  /**
   * Page URL when the item was added (search results / listing).
   * Used to reopen the same search from the cart.
   */
  sourceUrl?: string;
}

/** Wholesale hotel tier rates (SGL / DBL / TPL / CHD). See shared/occupancyRates.ts. */
export interface HotelOccupancyRates {
  currency: string;
  sglPp?: number;
  dblPp?: number;
  tplPp?: number;
  chd?: number;
  childEqualsAdult?: boolean;
  sglRoomTotal?: number;
  dblRoomTotal?: number;
  tplRoomTotal?: number;
  dblWithChildTotal?: number;
  comboDblAndChdTotal?: number;
  lastProbe?: string;
  baseline?: {
    sglPp?: number;
    dblPp?: number;
    tplPp?: number;
    chd?: number;
    childEqualsAdult?: boolean;
  };
}

export interface HotelCartItem extends CartItemAdjustments {
  type: 'hotel';
  id: string;
  hotelId: string;
  hotelName: string;
  stars?: number;
  address?: string;
  imageUrl?: string;
  /** WGS84 — used for compare PDF map pins. */
  latitude?: number;
  longitude?: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  occupancy: Occupancy[];
  selectedRate: HotelRoomRate;
  /**
   * Precios por fila de habitación en un mix BM (antes del total de la solución).
   * Paralelo a `occupancy` cuando roomsCount > 1.
   */
  occupancyRoomPrices?: number[];
  /**
   * Mayorista: tarifas por acomodación (DBL/TPL/CHD) derivadas de sondas
   * o editadas a mano. Ausente en modo minorista.
   */
  occupancyRates?: HotelOccupancyRates;
  bookingUrl?: string;
  addedAt: number;
}

export interface TransferCartItem extends CartItemAdjustments {
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
  priceUsd?: number;
  supplierName: string;
  imageUrl?: string;
  bookingUrl?: string;
  addedAt: number;
  /** Cart hotel this transfer belongs to (kit hotel + traslado). */
  linkedHotelId?: string;
  /** Hotel name kept on the transfer for grouping / WhatsApp even if the hotel row is removed. */
  linkedHotelName?: string;
}

export interface ActivityCartItem extends CartItemAdjustments {
  type: 'activity';
  id: string;
  activityId: string;
  name: string;
  description?: string;
  checkIn: string;
  checkOut?: string;
  adults: number;
  children: number;
  /** Line total for the searched party (always group total in cart math). */
  price: number;
  /** Unit price for 1 person (for mayorista / WhatsApp). */
  pricePerPerson?: number;
  currency: string;
  priceUsd?: number;
  supplierName: string;
  imageUrl?: string;
  bookingUrl?: string;
  addedAt: number;
}

/** Room mix chosen on BM tour-process (Paso 2). */
export interface TourRoomSelection {
  code: string;
  label: string;
  rooms: number;
  paxPerRoom: number;
  /** Published price per person for this occupancy (combinados / hotel packages). */
  pricePerPerson?: number;
}

/** Per-person rates by occupancy from the Paso 2 price row. */
export interface TourOccupancyRates {
  currency: string;
  sgl?: number;
  dbl?: number;
  tpl?: number;
  qdp?: number;
}

/**
 * Circuito / bloqueo / combinado cotizado en BookingMotor (`/tour-process/`).
 * - Bloqueo: cupo aéreo negociado (reemplaza vuelo suelto); tarifa plana (infantes &lt;2 gratis).
 * - Combinado: paquete hotelero; Paso 2 muestra $/persona por acomodación (SGL/DBL/TPL).
 */
export interface TourCartItem extends CartItemAdjustments {
  type: 'tour';
  id: string;
  tourId: string;
  name: string;
  /** Seat-block package (name/style typically includes "BLOQUEO"). */
  isBloqueo: boolean;
  /** Hotel package (name typically includes "COMBINADO"). */
  isCombinado: boolean;
  originCity?: string;
  destinationCity?: string;
  /** DD-MM-YYYY */
  departureDate: string;
  /** DD-MM-YYYY */
  returnDate?: string;
  /** Human label from BM, e.g. "Jueves, 1 octubre 2026". */
  departureLabel?: string;
  days?: number;
  nights?: number;
  adults: number;
  children: number;
  infants: number;
  /** Pax that pay (age ≥ 2). */
  payingPax: number;
  roomsSummary?: string;
  rooms?: TourRoomSelection[];
  /** Published $/persona by occupancy (mainly combinados). */
  occupancyRates?: TourOccupancyRates;
  /** Group total from Paso 4, or estimate from occupancyRates × mix. */
  price: number;
  /** Primary $/persona (DBL preferred, else total/payingPax). */
  pricePerPerson: number;
  currency: string;
  /** True when Paso 4 had no total and price was estimated from occupancy rates. */
  priceEstimated?: boolean;
  category?: string;
  /** Seat-block baggage / personal item note for itinerary text. */
  baggageNote?: string;
  /** Human return date (Spanish long), when known. */
  returnLabel?: string;
  bookingUrl?: string;
  addedAt: number;
}

export interface InsuranceCartItem extends CartItemAdjustments {
  type: 'insurance';
  id: string;
  insuranceId: string;
  name: string;
  planLabel?: string;
  /** Short bullets from the BM card (WhatsApp). */
  summaryLines?: string[];
  /** Full coverage from the BM modal (PDF annex). */
  coverageLines?: string[];
  checkIn: string;
  checkOut?: string;
  passengers: number;
  price: number;
  currency: string;
  priceUsd?: number;
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
  /** Included baggage for this direction (ida/regreso may differ). */
  baggageIncluded?: string[];
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
  /** Baggage/services explicitly included in the selected fare. */
  baggageIncluded?: string[];
  bookingUrl?: string;
}

export interface FlightCartItem extends CartItemAdjustments {
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
  /** Baggage/services explicitly included in the selected fare. */
  baggageIncluded?: string[];
  bookingUrl?: string;
  addedAt: number;
}

export type CartItem =
  | HotelCartItem
  | TransferCartItem
  | FlightCartItem
  | ActivityCartItem
  | TourCartItem
  | InsuranceCartItem;

export interface RoomOccupancy {
  adults: number;
  children: number;
  childrenAges: number[];
}

/** Mix SGL/DBL/TPL del viaje real (briefing). El niño extra se queda en esa hab, no arma TPL. */
export type BriefingRoomKind = 'SGL' | 'DBL' | 'TPL' | 'QPL';

export interface BriefingRoom {
  kind: BriefingRoomKind;
  children: number;
  /** One age (0–17) per child in this room; length should match `children`. */
  childrenAges?: number[];
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
  /**
   * `briefing` = sticky trip profile edited by the advisor (origen/destino/fechas/pax).
   * Survives inflated BM probe searches used for wholesale DBL/TPL/CHD.
   */
  sourceType: 'hotel' | 'transfer' | 'flight' | 'activity' | 'insurance' | 'briefing';
  checkIn?: string; // DD-MM-YYYY
  checkOut?: string; // DD-MM-YYYY
  nights?: number;
  rooms: RoomOccupancy[];
  totalAdults: number;
  totalChildren: number;
  childrenAges: number[];
  /** Acomodación comercial (DBL/TPL + niños en hab). Si falta, no hay total de grupo. */
  roomPlan?: BriefingRoom[];
  nationality?: string; // option value code
  destinationText?: string;
  /**
   * When true, BM hotel searches must not overwrite destinationText.
   * Advisor can still edit manually or unpin.
   */
  destinationPinned?: boolean;
  /** Departure city / airport (from flights; not used for hotel-only searches). */
  originText?: string;
  /**
   * Hotel name to put in traslado «Hasta» so the advisor picks that hotel
   * in BookingMotor autocomplete (dropoff ID cannot be invented).
   */
  transferHotelHint?: string;
  /** Cart hotel id waiting for the next transfer add. */
  pendingHotelCartId?: string;
  savedAt: number;
}

