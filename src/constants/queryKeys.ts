import type { LatLng } from '@/types/geo';

import type { VehicleType } from './vehicles';

export interface RouteEstimateKeyParams {
  origin: LatLng;
  destination: LatLng;
  vehicleType: VehicleType;
  promoCode?: string;
}

/** TanStack Query key factory. Always build keys here, never inline arrays. */
export const queryKeys = {
  all: ['turbotaxi'] as const,

  user: (userId: number) => ['user', userId] as const,

  routeEstimate: (params: RouteEstimateKeyParams) => ['routes', 'estimate', params] as const,

  promos: (userId: number, activeOnly: boolean) => ['promos', userId, { activeOnly }] as const,

  tripHistory: (userId: number) => ['tripHistory', userId] as const,
  tripDetail: (tripId: number) => ['tripHistory', 'detail', tripId] as const,

  chatMessages: (rideId: number) => ['chat', 'messages', rideId] as const,
  chatConversations: () => ['chat', 'conversations'] as const,

  places: {
    all: ['places'] as const,
    autocomplete: (input: string, language: string) =>
      ['places', 'autocomplete', input, language] as const,
    details: (placeId: string) => ['places', 'details', placeId] as const,
    reverse: (coords: LatLng, language: string) =>
      ['places', 'reverse', coords.latitude, coords.longitude, language] as const,
  },
} as const;
