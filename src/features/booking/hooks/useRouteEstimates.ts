import {
  queryOptions,
  skipToken,
  useQueries,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import type { ApiError } from '@/api/errors';
import { estimateRoute } from '@/api/services/routes';
import { queryKeys } from '@/constants/queryKeys';
import { ROUTE_ESTIMATE_STALE_TIME_MS } from '@/constants/timeouts';
import { VEHICLE_TYPES, type VehicleType } from '@/constants/vehicles';
import { roundCoords } from '@/lib/geo';

import { useBookingDraft } from '../store';
import type { RouteEstimate } from '../types';

/**
 * The most recent cached price of this class, shown while a new key loads. (keepPreviousData
 * does nothing inside useQueries: a changed key gets a fresh observer with no previous data.)
 */
function latestEstimate(client: QueryClient, vehicleType: VehicleType): RouteEstimate | undefined {
  let latest: { at: number; data: RouteEstimate } | undefined;
  for (const query of client.getQueryCache().findAll({ queryKey: queryKeys.routeEstimateAll() })) {
    const params = query.queryKey[2];
    const data = query.state.data as RouteEstimate | undefined;
    const sameClass =
      typeof params === 'object' && params !== null && 'vehicleType' in params
        ? params.vehicleType === vehicleType
        : false;
    if (sameClass && data && (!latest || query.state.dataUpdatedAt > latest.at)) {
      latest = { at: query.state.dataUpdatedAt, data };
    }
  }
  return latest?.data;
}

export interface VehicleEstimate {
  vehicleType: VehicleType;
  estimate: RouteEstimate | undefined;
  isLoading: boolean;
  /** Showing the previous key's estimate while the new one loads (e.g. after a promo change). */
  isRefreshing: boolean;
  /** Any request in flight, including a retry after an error. */
  isFetching: boolean;
  error: ApiError | null;
  refetch: () => void;
}

/**
 * POST /api/Routes/estimate for every vehicle type in parallel, for the draft's pickup →
 * destination (+ promo code). userId is added by the service from the auth store.
 */
export function useRouteEstimates(): VehicleEstimate[] {
  const pickup = useBookingDraft((s) => s.pickup?.location);
  const destination = useBookingDraft((s) => s.destination?.location);
  const promoCode = useBookingDraft((s) => s.promo?.code);
  const queryClient = useQueryClient();

  const results = useQueries({
    queries: VEHICLE_TYPES.map((vehicleType) => {
      // ≈1 m: float noise from the map pin doesn't create a new key (and a new POST).
      const params =
        pickup && destination
          ? {
              origin: roundCoords(pickup),
              destination: roundCoords(destination),
              vehicleType,
              promoCode,
            }
          : null;
      return queryOptions<RouteEstimate, ApiError>({
        queryKey: params
          ? queryKeys.routeEstimate(params)
          : queryKeys.routeEstimateIdle(vehicleType),
        queryFn: params ? ({ signal }) => estimateRoute(params, { signal }) : skipToken,
        // Several components observe these queries and the sheet remounts on mode changes:
        // a fresh observer must reuse the price instead of POSTing the same payload again.
        staleTime: ROUTE_ESTIMATE_STALE_TIME_MS,
        // Promo change / pickup tweak: keep showing the old prices while the new ones load
        // (no skeleton flash, no disabled Order button, no vanishing route).
        placeholderData: params ? () => latestEstimate(queryClient, vehicleType) : undefined,
      });
    }),
  });

  return VEHICLE_TYPES.map((vehicleType, index) => {
    const result = results[index];
    return {
      vehicleType,
      estimate: result?.data,
      isLoading: result?.isLoading ?? false,
      isRefreshing: result?.isPlaceholderData ?? false,
      isFetching: result?.isFetching ?? false,
      error: result?.error ?? null,
      refetch: () => {
        result?.refetch().catch(() => undefined);
      },
    };
  });
}
