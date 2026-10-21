import type { MappedRideStatus } from '@/constants/rideStatus';
import type { VehicleType } from '@/constants/vehicles';
import type { LatLng } from '@/types/geo';

export interface CreateRideInput {
  pickup: LatLng;
  destination: LatLng;
  vehicleType: VehicleType;
}

export interface CreatedRide {
  rideId: number;
  status: MappedRideStatus;
  /** Raw backend status, kept for logging/debugging unknown values. */
  rawStatus: string | null;
  estimatedFare: number;
  originalEstimatedFare: number;
  discountAmount: number;
  promo: { code: string; remainingRides: number | null } | null;
  distanceKm: number | null;
  durationMinutes: number | null;
}

export interface CancelledRide {
  rideId: number;
  status: MappedRideStatus;
}

/** Who / what ended a cancelled ride ('unknown' when the hub didn't say). */
export type CancelReason = 'user' | 'driver' | 'unknown';

export interface RideFare {
  /** Price quoted at creation (after discount). */
  estimated: number;
  /** Before discount. */
  original: number;
  discount: number;
  promoCode: string | null;
  /** What was charged, once completed. */
  final: number | null;
}

/** Not sent by the backend yet (docs/BACKEND_REQUESTS.md #1): every field may be missing. */
export interface RideDriver {
  name: string | null;
  phoneNumber: string | null;
  plateNumber: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
}

/** Live route info carried by a RideStatusUpdated (all optional, merged into the store). */
export interface RideRouteInfo {
  driverId?: number;
  driverLocation?: LatLng;
  pickupLocation?: LatLng;
  destinationLocation?: LatLng;
  /** Encoded polyline driver → pickup. */
  toPickup?: string;
  /** Encoded polyline pickup → destination. */
  trip?: string;
  etaMinutes?: number;
  remainingKm?: number;
  driver?: RideDriver;
}
