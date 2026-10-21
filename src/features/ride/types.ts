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
