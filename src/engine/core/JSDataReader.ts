import { Occupancy } from './types';

export interface HotelSearchContext {
  checkIn: string;
  checkOut: string;
  nights: number;
  roomsCount: number;
  occupancy: Occupancy[];
  raw?: any; // For provider-specific fallback storage
}

export interface TransferSearchContext {
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
  raw?: any;
}

export abstract class JSDataReader<T> {
  abstract parse(rawPayload: any): T;
}
