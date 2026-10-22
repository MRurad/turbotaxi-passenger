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
  /** Placeholder key while there's no route yet (the query is skipped). */
  routeEstimateIdle: (vehicleType: VehicleType) =>
    ['routes', 'estimate', 'idle', vehicleType] as const,

  promos: (userId: number, activeOnly: boolean) => ['promos', userId, { activeOnly }] as const,

  tripHistory: (userId: number) => ['tripHistory', userId] as const,
  tripDetail: (tripId: number) => ['tripHistory', 'detail', tripId] as const,

  chatMessages: (rideId: number) => ['chat', 'messages', rideId] as const,
  rideDriver: (driverId: number) => ['ride', 'driver', driverId] as const,
  /** Road route for a ride leg the backend sent as a straight line. */
  rideRoad: (rideId: number, leg: 'approach' | 'trip', driverId: number | null) =>
    ['ride', 'road', rideId, leg, driverId] as const,
  rideRoadIdle: () => ['ride', 'road', 'idle'] as const,
  /** Placeholder key while no driver is assigned (the query is skipped). */
  rideDriverIdle: () => ['ride', 'driver', 'idle'] as const,
  chatConversations: () => ['chat', 'conversations'] as const,

  places: {
    all: ['places'] as const,
    autocomplete: (input: string, language: string) =>
      ['places', 'autocomplete', input, language] as const,
    details: (placeId: string, language: string) =>
      ['places', 'details', placeId, language] as const,
    reverse: (coords: LatLng, language: string) =>
      ['places', 'reverse', coords.latitude, coords.longitude, language] as const,
  },
} as const;
