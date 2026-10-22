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

  /** Every route estimate (prefix). */
  routeEstimateAll: () => ['routes', 'estimate'] as const,
  routeEstimate: (params: RouteEstimateKeyParams) => ['routes', 'estimate', params] as const,
  /** Placeholder key while there's no route yet (the query is skipped). */
  routeEstimateIdle: (vehicleType: VehicleType) =>
    ['routes', 'estimate', 'idle', vehicleType] as const,

  promos: (userId: number, activeOnly: boolean) => ['promos', userId, { activeOnly }] as const,
  /** Paged list of all the user's promo codes (My promo codes screen; infinite data). */
  promoList: (userId: number) => ['promoList', userId] as const,
  /** Prefixes invalidated after a ride (a promo may have been used). */
  promosAll: () => ['promos'] as const,
  promoListAll: () => ['promoList'] as const,

  tripHistory: (userId: number) => ['tripHistory', userId] as const,
  tripHistoryAll: () => ['tripHistory'] as const,

  chatMessages: (rideId: number) => ['chat', 'messages', rideId] as const,
  rideDriver: (driverId: number) => ['ride', 'driver', driverId] as const,
  /** Road route for a ride leg (straight from the backend, or re-routed when the car left it). */
  rideRoad: (rideId: number, leg: 'approach' | 'trip', driverId: number | null, reroute = 0) =>
    ['ride', 'road', rideId, leg, driverId, reroute] as const,
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
