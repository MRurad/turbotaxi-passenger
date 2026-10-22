import { skipToken, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { ApiError } from '@/api/errors';
import { estimateRoute } from '@/api/services/routes';
import { queryKeys } from '@/constants/queryKeys';
import type { RouteEstimate } from '@/features/booking/types';
import { roundCoords } from '@/lib/geo';
import { logger } from '@/lib/logger';
import { decodePolyline } from '@/lib/polyline';

import { useRideStore } from '../store';
import { activePolyline } from '../utils';

/** A polyline with fewer points is a straight segment, not a road route. */
const MIN_ROAD_POINTS = 3;
/** A failed road route is retried (it is fetched once per leg, never refreshed otherwise). */
const ROAD_RETRIES = 3;
const ROAD_RETRY_BASE_MS = 2_000;

/**
 * The encoded route to draw for the current leg. The backend's approach polyline is a straight
 * driver → pickup segment (docs/BACKEND_REQUESTS.md #28), so when a leg comes without road
 * geometry the road route is fetched once per ride / leg / driver from POST /api/Routes/estimate
 * (stop-gap), from where the car is at that moment — not again as it moves. Nothing is drawn
 * rather than a straight line; a failed fetch is retried with backoff.
 */
export function useRideRoute(): string | null {
  const { phase, polylines, rideId, driverId, car, pickup, destination, vehicleType } =
    useRideStore(
      useShallow((s) => ({
        phase: s.phase,
        polylines: s.polylines,
        rideId: s.rideId,
        driverId: s.driverId,
        car: s.driverLocation,
        pickup: s.pickup?.location ?? null,
        destination: s.destination?.location ?? null,
        vehicleType: s.vehicleType,
      })),
    );
  const encoded = activePolyline(phase, polylines);
  const hasRoad = useMemo(() => decodePolyline(encoded).length >= MIN_ROAD_POINTS, [encoded]);
  const approaching = phase === 'driver_assigned';
  const leg = approaching ? 'approach' : 'trip';
  const from = approaching ? car : pickup;
  const to = approaching ? pickup : destination;
  const needsRoad = encoded !== null && !hasRoad && rideId !== null && from && to;

  const road = useQuery<RouteEstimate, ApiError>({
    // Keyed by the leg and driver, not the car position: fetched once, not on every move.
    // The trip leg starts at the pickup, whoever drives: only the approach depends on the driver.
    queryKey: needsRoad
      ? queryKeys.rideRoad(rideId, leg, approaching ? driverId : null)
      : queryKeys.rideRoadIdle(),
    queryFn: needsRoad
      ? ({ signal }) =>
          estimateRoute(
            { origin: roundCoords(from), destination: roundCoords(to), vehicleType },
            { signal },
          )
      : skipToken,
    staleTime: Infinity,
    retry: ROAD_RETRIES,
    retryDelay: (attempt) => ROAD_RETRY_BASE_MS * 2 ** attempt,
  });

  useEffect(() => {
    if (road.error) logger.warn('ride: road route unavailable', { code: road.error.code });
  }, [road.error]);

  if (hasRoad) return encoded;
  return needsRoad ? (road.data?.encodedPolyline ?? null) : null;
}
