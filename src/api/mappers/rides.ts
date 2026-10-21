import type { CancelRideResponse, CreateRideRequest, CreateRideResponse } from '@/api/types';
import { mapBackendStatus } from '@/constants/rideStatus';
import type { CancelledRide, CreatedRide, CreateRideInput } from '@/features/ride/types';

import { numberOr, optionalString, requireId, requireNumber } from './common';

export function toCreateRideRequest(input: CreateRideInput, userId: number): CreateRideRequest {
  return {
    pickupLat: input.pickup.latitude,
    pickupLng: input.pickup.longitude,
    destinationLat: input.destination.latitude,
    destinationLng: input.destination.longitude,
    vehicleType: input.vehicleType,
    userId,
  };
}

export function mapCreatedRide(dto: CreateRideResponse): CreatedRide {
  const estimatedFare = requireNumber(dto.estimatedFare, 'estimatedFare');
  const promoCode = dto.promoApplied ? optionalString(dto.promoCode) : null;
  return {
    rideId: requireId(dto.rideId, 'rideId'),
    status: mapBackendStatus(dto.status),
    rawStatus: dto.status ?? null,
    estimatedFare,
    originalEstimatedFare: numberOr(dto.originalEstimatedFare, estimatedFare),
    discountAmount: numberOr(dto.discountAmount, 0),
    promo: promoCode ? { code: promoCode, remainingRides: dto.promoRemainingRides ?? null } : null,
    distanceKm: dto.distanceKm ?? null,
    durationMinutes: dto.durationMinutes ?? null,
  };
}

export function mapCancelledRide(dto: CancelRideResponse, fallbackRideId: number): CancelledRide {
  return {
    rideId: numberOr(dto.rideId, fallbackRideId),
    // An empty status after a successful cancel call still means cancelled.
    status: dto.status ? mapBackendStatus(dto.status) : 'cancelled',
  };
}
