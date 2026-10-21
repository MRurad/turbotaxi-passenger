import { keepPreviousData, queryOptions, skipToken, useQueries } from '@tanstack/react-query';

import type { ApiError } from '@/api/errors';
import { estimateRoute } from '@/api/services/routes';
import { queryKeys } from '@/constants/queryKeys';
import { ROUTE_ESTIMATE_STALE_TIME_MS } from '@/constants/timeouts';
import { VEHICLE_TYPES, type VehicleType } from '@/constants/vehicles';
import { roundCoords } from '@/lib/geo';

import { useBookingDraft } from '../store';
import type { RouteEstimate } from '../types';

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
        placeholderData: keepPreviousData,
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
