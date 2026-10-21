import type { RouteEstimateData, RouteEstimateRequest } from '@/api/types';
import type { EstimateInput, RouteEstimate } from '@/features/booking/types';

import { numberOr, optionalString, requireNumber } from './common';

const DEFAULT_CURRENCY = 'AZN';

export function toEstimateRequest(input: EstimateInput, userId: number): RouteEstimateRequest {
  return {
    origin: { latitude: input.origin.latitude, longitude: input.origin.longitude },
    destination: { latitude: input.destination.latitude, longitude: input.destination.longitude },
    vehicleType: input.vehicleType,
    promoCode: input.promoCode?.trim() || null,
    userId,
  };
}

export function mapEstimate(dto: RouteEstimateData): RouteEstimate {
  // Never show a made-up 0 ₼ fare: a missing final price makes the estimate unusable.
  const final = requireNumber(dto.price?.final, 'price.final');
  const discount = numberOr(dto.price?.discount, 0);
  // Some responses omit `original`; reconstruct it so the struck-through price stays correct.
  const original = numberOr(dto.price?.original, final + discount);
  return {
    distanceKm: numberOr(dto.distanceKm, 0),
    durationMinutes: numberOr(dto.durationMinutes, 0),
    price: {
      original,
      discount,
      final,
      currency: optionalString(dto.price?.currency) ?? DEFAULT_CURRENCY,
      hasDiscount: discount > 0 && original > final,
    },
    encodedPolyline: optionalString(dto.encodedPolyline),
  };
}
