import type { MappedRideStatus } from '@/constants/rideStatus';

export interface TripDriver {
  name: string;
  surname: string;
  phoneNumber: string | null;
}

export interface TripVehicle {
  plateNumber: string | null;
  /** Backend sends a string here (unlike the 0–3 int elsewhere). */
  type: string | null;
  brand: string | null;
  model: string | null;
}

export interface Trip {
  rideId: number;
  driver: TripDriver | null;
  vehicle: TripVehicle | null;
  pickupAddress: string | null;
  destinationAddress: string | null;
  /** Price before discount. */
  fare: number;
  discountAmount: number;
  /** What the passenger paid. */
  finalFare: number;
  hasDiscount: boolean;
  /** ISO UTC timestamp, or null if unknown. */
  date: string | null;
  status: MappedRideStatus;
}
