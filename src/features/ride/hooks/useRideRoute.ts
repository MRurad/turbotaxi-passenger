import { skipToken, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import type { ApiError } from '@/api/errors';
import { estimateRoute } from '@/api/services/routes';
import { queryKeys } from '@/constants/queryKeys';
import { REROUTE_MIN_INTERVAL_MS } from '@/constants/timeouts';
import type { RouteEstimate } from '@/features/booking/types';
import { distanceMeters, roundCoords, routeAhead } from '@/lib/geo';
import { logger } from '@/lib/logger';
import { decodePolyline } from '@/lib/polyline';
import type { LatLng } from '@/types/geo';

import { useRideStore } from '../store';
import { activePolyline } from '../utils';

/** A polyline with fewer points is a straight segment, not a road route. */
const MIN_ROAD_POINTS = 3;
/** A failed road route is retried (it is fetched once per leg, never refreshed otherwise). */
const ROAD_RETRIES = 3;
const ROAD_RETRY_BASE_MS = 2_000;
/** The car this far from the drawn route has left it (GPS noise stays well below). */
const OFF_ROUTE_M = 120;
/** One stable "no route" (a fresh [] each render would re-run everything that depends on it). */
const NO_ROUTE: LatLng[] = [];

interface Reroute {
  /** The leg it belongs to; a reroute of another leg is ignored. */
  leg: string;
  seq: number;
  from: LatLng;
  at: number;
}

/** The last route drawn for a leg: shown while a reroute loads or after one failed. */
interface LastRoute {
  leg: string;
  route: LatLng[];
}

/** Shared by every useRideRoute (map + camera), so they agree on one route. */
const useReroute = create<{ reroute: Reroute | null; last: LastRoute | null }>(() => ({
  reroute: null,
  last: null,
}));

/** Test-only: forget reroutes. */
export function resetRideReroute(): void {
  useReroute.setState({ reroute: null, last: null });
}

/**
 * Re-route from `from` — unless this leg was re-routed less than a minute ago, or the car is
 * still near where the last reroute started (a car parked off the road, or an estimate that
 * snaps to a road far away, would otherwise re-route every minute for nothing).
 */
function requestReroute(leg: string, from: LatLng): void {
  const current = useReroute.getState().reroute;
  const now = Date.now();
  if (current?.leg === leg) {
    if (now - current.at < REROUTE_MIN_INTERVAL_MS) return;
    if (distanceMeters(current.from, from) < OFF_ROUTE_M) return;
  }
  useReroute.setState({
    reroute: { leg, seq: current?.leg === leg ? current.seq + 1 : 1, from, at: now },
  });
}

/**
 * The route to draw for the current leg, decoded. The backend's approach polyline is a straight
 * driver → pickup segment (docs/BACKEND_REQUESTS.md #28), so a leg without road geometry is
 * routed with POST /api/Routes/estimate (stop-gap) from where the car is — once, not on every
 * move. After an app reload (no polyline until the next hub update) the same, and its duration
 * fills in the missing ETA. When the car leaves the route (wrong turn, detour) it is routed
 * again from the car, at most once a minute. Nothing is drawn rather than a straight line.
 */
export function useRideRoute(): LatLng[] {
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
  const backendRoute = useMemo(() => decodePolyline(encoded), [encoded]);
  const hasRoad = backendRoute.length >= MIN_ROAD_POINTS;
  const approaching = phase === 'driver_assigned';
  const onLeg = (approaching || phase === 'in_progress') && rideId !== null;
  const leg = approaching ? 'approach' : 'trip';
  const legId = onLeg ? `${rideId}:${leg}:${approaching ? driverId : ''}` : null;
  const stored = useReroute((s) => s.reroute);
  const reroute = stored && stored.leg === legId ? stored : null;
  // No polyline at all = restored after a reload: route the rest of the trip from the car.
  const from = reroute?.from ?? (approaching || encoded === null ? car : pickup);
  const to = approaching ? pickup : destination;
  const needsRoad = onLeg && (reroute !== null || !hasRoad) && from && to;

  const road = useQuery<RouteEstimate, ApiError>({
    // Keyed by leg, driver and reroute, not the car position: fetched once, not on every move.
    // The trip leg starts at the pickup, whoever drives: only the approach depends on the driver.
    queryKey: needsRoad
      ? queryKeys.rideRoad(rideId, leg, approaching ? driverId : null, reroute?.seq ?? 0)
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
    // While a reroute loads, keep showing the old route of the same leg and driver.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === rideId &&
      previousQuery.queryKey[3] === leg &&
      previousQuery.queryKey[4] === (approaching ? driverId : null)
        ? previous
        : undefined,
  });

  useEffect(() => {
    if (road.error) logger.warn('ride: road route unavailable', { code: road.error.code });
  }, [road.error]);

  // After a reload the hub hasn't re-sent the ETA yet: use the road route's duration meanwhile.
  const roadMinutes = needsRoad && !road.isPlaceholderData ? road.data?.durationMinutes : undefined;
  useEffect(() => {
    if (roadMinutes === undefined) return;
    const store = useRideStore.getState();
    if (store.etaMinutes === null) store.updateRoute({ etaMinutes: roadMinutes });
  }, [roadMinutes]);

  const roadEncoded = needsRoad ? (road.data?.encodedPolyline ?? null) : null;
  const roadRoute = useMemo(() => decodePolyline(roadEncoded), [roadEncoded]);
  const last = useReroute((s) => s.last);
  const fresh = needsRoad && roadRoute.length >= 2 ? roadRoute : hasRoad ? backendRoute : NO_ROUTE;
  // Loading or failed (reroute or road fetch): keep the leg's last route rather than nothing.
  const route = fresh.length >= 2 || last?.leg !== legId ? fresh : last.route;

  useEffect(() => {
    if (legId && fresh.length >= 2) useReroute.setState({ last: { leg: legId, route: fresh } });
  }, [legId, fresh]);

  // The car far off the drawn route: route again from where it is.
  useEffect(() => {
    if (!legId || !car || route.length < 2) return;
    if (routeAhead(route, car).offRouteMeters > OFF_ROUTE_M) requestReroute(legId, car);
  }, [legId, car, route]);

  return route;
}
