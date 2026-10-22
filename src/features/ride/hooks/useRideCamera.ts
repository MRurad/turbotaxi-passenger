import { useEffect, useRef, type RefObject } from 'react';
import type { EdgePadding } from 'react-native-maps';
import { useShallow } from 'zustand/react/shallow';

import type { AppMapHandle } from '@/features/map/components/AppMap';
import type { LatLng } from '@/types/geo';

import { RIDE_FRAME_BUCKET_PX } from '../constants';
import { useRideStore } from '../store';
import { framePoints } from '../utils';
import { useRideRoute } from './useRideRoute';

const coordKey = (c?: LatLng | null) => (c ? `${c.latitude},${c.longitude}` : '');

/**
 * Ride map camera: the pickup while searching (or after the ride ended), the car + pickup
 * while the driver comes, the car + destination during the trip. Refits when the phase,
 * the route or the sheet height changes — not on every car move (that would never settle).
 */
export function useRideCamera(
  mapRef: RefObject<AppMapHandle | null>,
  framePadding: EdgePadding,
  /** The map view has been laid out (a fit before that is lost). */
  ready: boolean,
) {
  const { phase, pickup, destination, car } = useRideStore(
    useShallow((s) => ({
      phase: s.phase,
      pickup: s.pickup?.location ?? null,
      destination: s.destination?.location ?? null,
      car: s.driverLocation,
    })),
  );
  const route = useRideRoute();
  const latest = useRef({ phase, pickup, destination, car, route, framePadding });

  useEffect(() => {
    latest.current = { phase, pickup, destination, car, route, framePadding };
  }, [phase, pickup, destination, car, route, framePadding]);

  const bucket = Math.round(framePadding.bottom / RIDE_FRAME_BUCKET_PX);
  const focusKey = [
    ready,
    phase,
    coordKey(pickup),
    coordKey(destination),
    car !== null, // the first car position, then not on every move
    `${coordKey(route[0])}>${coordKey(route.at(-1))}`,
    bucket,
  ].join('|');

  useEffect(() => {
    if (!ready) return;
    const now = latest.current;
    const points = [...framePoints(now.phase, now), ...now.route];
    if (points.length > 1) {
      mapRef.current?.fitToCoordinates(points, now.framePadding);
    } else if (now.pickup) {
      mapRef.current?.animateTo(now.pickup);
    }
    // focusKey captures exactly the changes that should move the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);
}
