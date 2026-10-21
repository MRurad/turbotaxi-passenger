import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Details, EdgePadding, Point, Region } from 'react-native-maps';
import { useShallow } from 'zustand/react/shallow';

import { REVERSE_GEOCODE_DEBOUNCE_MS } from '@/constants/timeouts';
import { useBookingDraft } from '@/features/booking/store';
import type { AppMapHandle } from '@/features/map/components/AppMap';
import type { CurrentLocation } from '@/features/map/hooks/useCurrentLocation';
import { useReverseGeocode } from '@/features/map/hooks/useReverseGeocode';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import type { LatLng } from '@/types/geo';
import type { Place } from '@/types/place';

const toLatLng = (r: Region): LatLng => ({ latitude: r.latitude, longitude: r.longitude });
const coordKey = (c?: LatLng | null) => (c ? `${c.latitude},${c.longitude}` : '');
/** Refit only when the sheet height changes noticeably (not on every pixel). */
const PADDING_BUCKET_PX = 40;

interface HomeMapLayout {
  /** Where the center pin's tip is, in map view coordinates (null until laid out). */
  pinPoint: Point | null;
  /** Room to leave around framed points (overlays + margin). */
  framePadding: EdgePadding;
  /** Route to frame once a destination is set (falls back to the two endpoints). */
  routeCoords: LatLng[];
}

/**
 * Home map state. The center pin's address flows into the booking draft (pickup, or the pending
 * destination while choosing on the map); draft changes move the camera.
 */
export function useHomeMap(
  mapRef: RefObject<AppMapHandle | null>,
  location: CurrentLocation,
  layout: HomeMapLayout,
) {
  const [dragging, setDragging] = useState(false);
  // null until the map has settled once — no billed geocode of the Baku fallback on launch.
  const [center, setCenter] = useState<LatLng | null>(null);
  const centeredOnUser = useRef(false);
  // Apple Maps never reports details.isGesture, so detect user touches ourselves.
  const touched = useRef(false);
  const framePadding = useRef(layout.framePadding);
  const routeCoords = useRef(layout.routeCoords);
  const { pinTarget, pickup, destination, pickupLocked } = useBookingDraft(
    useShallow((s) => ({
      pinTarget: s.pinTarget,
      pickup: s.pickup,
      destination: s.destination,
      pickupLocked: s.pickupLocked,
    })),
  );
  const setPickupFromPin = useBookingDraft((s) => s.setPickupFromPin);
  const unlockPickup = useBookingDraft((s) => s.unlockPickup);

  useEffect(() => {
    framePadding.current = layout.framePadding;
    routeCoords.current = layout.routeCoords;
  }, [layout.framePadding, layout.routeCoords]);

  const debouncedCenter = useDebouncedValue(center, REVERSE_GEOCODE_DEBOUNCE_MS);
  const settled = !dragging && debouncedCenter !== null && debouncedCenter === center;
  const pinAddress = useReverseGeocode(settled ? debouncedCenter : null);
  const geocoded = pinAddress.data;
  const geocodeFailed = pinAddress.isError;

  // The pin's place, only once settled (never a stale address). Location is the exact pin
  // point; the geocode itself is cached by a rounded key. No address → "Unnamed location".
  const pinnedPlace = useMemo<Place | null>(() => {
    if (!settled || !debouncedCenter) return null;
    if (geocoded) return { ...geocoded, location: debouncedCenter };
    if (geocodeFailed || geocoded === null) {
      return { placeId: null, title: '', subtitle: '', location: debouncedCenter };
    }
    return null;
  }, [settled, geocoded, geocodeFailed, debouncedCenter]);

  // First fix: jump from Baku to the user (unless they already chose a pickup).
  useEffect(() => {
    if (location.coords && !centeredOnUser.current && !pickupLocked) {
      centeredOnUser.current = true;
      mapRef.current?.animateTo(location.coords);
    }
  }, [location.coords, pickupLocked, mapRef]);

  useEffect(() => {
    if (pinnedPlace) setPickupFromPin(pinnedPlace);
  }, [pinnedPlace, setPickupFromPin]);

  // Camera follows the draft: frame pickup + destination, or show a fixed (searched) pickup.
  // With a destination, also refit when the route arrives and when the (taller) booking sheet
  // settles, so the route is never framed against the old, shorter sheet.
  const frameDetail = destination
    ? `|${layout.routeCoords.length > 1}|${Math.round(layout.framePadding.bottom / PADDING_BUCKET_PX)}`
    : '';
  const focusKey = `${pinTarget}|${coordKey(destination?.location)}|${
    pickupLocked ? coordKey(pickup?.location) : ''
  }${frameDetail}`;
  const focusPickup = pickup?.location;
  const focusDestination = destination?.location;
  useEffect(() => {
    if (pinTarget !== 'pickup' || !focusPickup) return;
    if (focusDestination) {
      const route = routeCoords.current;
      mapRef.current?.fitToCoordinates(
        route.length > 1 ? route : [focusPickup, focusDestination],
        framePadding.current,
      );
    } else if (pickupLocked) {
      mapRef.current?.animateTo(focusPickup);
    }
    // focusKey captures exactly the changes that should move the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  // No GPS fix coming (denied/unavailable): read the pin once so Baku still gets a pickup.
  const noFix = location.status === 'denied' || location.status === 'unavailable';
  useEffect(() => {
    if (!noFix || center || !layout.pinPoint) return;
    mapRef.current
      ?.coordinateAt(layout.pinPoint)
      .then((c) => c && setCenter((prev) => prev ?? c))
      .catch(() => undefined);
  }, [noFix, center, layout.pinPoint, mapRef]);

  const onTouchStart = useCallback(() => {
    touched.current = true;
  }, []);
  const onRegionChange = useCallback(() => setDragging(true), []);
  const onRegionChangeComplete = useCallback(
    (region: Region, details?: Details) => {
      setDragging(false);
      const byUser = details?.isGesture ?? touched.current;
      touched.current = false;
      // Hand-dragging in pickup mode means "pickup is here" (store ignores other modes).
      if (byUser && !destination) unlockPickup();
      const fallback = toLatLng(region);
      if (!layout.pinPoint) {
        setCenter(fallback);
        return;
      }
      mapRef.current
        ?.coordinateAt(layout.pinPoint)
        .then((c) => setCenter(c ?? fallback))
        .catch(() => setCenter(fallback));
    },
    [layout.pinPoint, mapRef, destination, unlockPickup],
  );

  const goToMyLocation = useCallback(() => {
    if (!location.coords) {
      location.refresh().catch(() => undefined);
      return;
    }
    if (!destination) unlockPickup();
    mapRef.current?.animateTo(location.coords);
  }, [location, mapRef, destination, unlockPickup]);

  return {
    dragging,
    pinTarget,
    pinnedPlace,
    /** True while the pin's address isn't known for its current position. */
    pinLoading: !settled || pinAddress.isFetching,
    onTouchStart,
    onRegionChange,
    onRegionChangeComplete,
    goToMyLocation,
  };
}
