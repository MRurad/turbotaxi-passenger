import type { MappedRideStatus } from '@/constants/rideStatus';
import type { LatLng } from '@/types/geo';

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
  /** Address text, when the backend has a real one. */
  pickupAddress: string | null;
  destinationAddress: string | null;
  /** Set instead when the backend's "address" is only coordinates: named on the device. */
  pickupPoint: LatLng | null;
  destinationPoint: LatLng | null;
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
