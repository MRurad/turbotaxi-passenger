import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Details, EdgePadding, Point, Region } from 'react-native-maps';
import { useShallow } from 'zustand/react/shallow';

import { REVERSE_GEOCODE_DEBOUNCE_MS } from '@/constants/timeouts';
import { useBookingDraft, type BookingDraftStore, type PinTarget } from '@/features/booking/store';
import type { AppMapHandle } from '@/features/map/components/AppMap';
import type { CurrentLocation } from '@/features/map/hooks/useCurrentLocation';
import { useReverseGeocode } from '@/features/map/hooks/useReverseGeocode';
import { distanceMeters } from '@/lib/geo';
import { triggerHaptic } from '@/lib/haptics';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import type { LatLng } from '@/types/geo';
import type { Place } from '@/types/place';

const toLatLng = (r: Region): LatLng => ({ latitude: r.latitude, longitude: r.longitude });
const coordKey = (c?: LatLng | null) => (c ? `${c.latitude},${c.longitude}` : '');
/** Refit only when the sheet height changes noticeably (not on every pixel). */
const PADDING_BUCKET_PX = 40;
/** Booking mode: "my location" this close to the pickup just reframes instead of re-picking. */
const SAME_PICKUP_RADIUS_M = 40;

/** What the center pin means right now; 'route' = hidden (booking frames the route). */
type PinMode = PinTarget | 'free' | 'route';
const pinModeOf = (s: Pick<BookingDraftStore, 'mapPick' | 'destination'>): PinMode =>
  s.mapPick ?? (s.destination ? 'route' : 'free');

/** A measured pin position, tagged with the mode it was measured in. */
interface PinCenter {
  point: LatLng;
  mode: PinMode;
}

interface HomeMapLayout {
  /** Where the center pin's tip is, in map view coordinates (null until laid out). */
  pinPoint: Point | null;
  /** Room to leave around framed points (overlays + margin). */
  framePadding: EdgePadding;
  /** Route to frame once a destination is set (falls back to the two endpoints). */
  routeCoords: LatLng[];
}

/**
 * Home map state. The center pin's address flows into the booking draft (the pickup in free
 * mode, or the point being chosen with "Choose on map"); draft changes move the camera.
 * With a destination the camera never moves the pickup: changing it goes through a pick with
 * a confirm step (route refits and "my location" would otherwise drag it around).
 */
export function useHomeMap(
  mapRef: RefObject<AppMapHandle | null>,
  location: CurrentLocation,
  layout: HomeMapLayout,
) {
  const [dragging, setDragging] = useState(false);
  // null until the map has settled once — no billed geocode of the Baku fallback on launch.
  const [center, setCenter] = useState<PinCenter | null>(null);
  const centeredOnUser = useRef(false);
  // Apple Maps never reports details.isGesture, so detect user touches ourselves.
  const touched = useRef(false);
  const framePadding = useRef(layout.framePadding);
  const routeCoords = useRef(layout.routeCoords);
  // While picking a point: where the pin should sit — the point's current place, then wherever
  // the user moves it (tagged with the pick it belongs to).
  const pickTarget = useRef<{ target: PinTarget; point: LatLng } | null>(null);
  const { mapPick, pickup, destination, pickupLocked } = useBookingDraft(
    useShallow((s) => ({
      mapPick: s.mapPick,
      pickup: s.pickup,
      destination: s.destination,
      pickupLocked: s.pickupLocked,
    })),
  );
  const setPickupFromPin = useBookingDraft((s) => s.setPickupFromPin);
  const unlockPickup = useBookingDraft((s) => s.unlockPickup);
  const startPinPicking = useBookingDraft((s) => s.startPinPicking);

  useEffect(() => {
    framePadding.current = layout.framePadding;
    routeCoords.current = layout.routeCoords;
  }, [layout.framePadding, layout.routeCoords]);

  useEffect(() => {
    if (pickTarget.current?.target !== mapPick) pickTarget.current = null;
  }, [mapPick]);

  const pinMode = pinModeOf({ mapPick, destination });
  const debouncedCenter = useDebouncedValue(center, REVERSE_GEOCODE_DEBOUNCE_MS);
  const settled = !dragging && debouncedCenter !== null && debouncedCenter === center;
  // Only a position measured in the current mode counts: entering a pick must not offer the
  // last booking-mode camera center (the route's middle) as the new pickup. Hidden pin → no
  // (billed) geocode either.
  const pinCoord =
    settled && pinMode !== 'route' && debouncedCenter.mode === pinMode
      ? debouncedCenter.point
      : null;
  const pinAddress = useReverseGeocode(pinCoord);
  const geocoded = pinAddress.data;
  const geocodeFailed = pinAddress.isError;

  // The pin's place, only once settled (never a stale address). Location is the exact pin
  // point; the geocode itself is cached by a rounded key. No address → "Unnamed location".
  const pinnedPlace = useMemo<Place | null>(() => {
    if (!pinCoord) return null;
    if (geocoded) return { ...geocoded, location: pinCoord };
    if (geocodeFailed || geocoded === null) {
      return { placeId: null, title: '', subtitle: '', location: pinCoord };
    }
    return null;
  }, [pinCoord, geocoded, geocodeFailed]);

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

  // Camera follows the draft: frame pickup + destination, show a fixed (searched) pickup, or
  // put the pin on the pickup being changed. Booking and pickup-picking also re-run when the
  // sheet height settles, so nothing is framed against the previous sheet.
  const paddingBucket = Math.round(layout.framePadding.bottom / PADDING_BUCKET_PX);
  // Route identity (not just "has a route"): the estimates keep the previous route while the
  // new one loads, so a changed pickup must refit again once its own route arrives.
  const route = layout.routeCoords;
  const routeKey = route.length > 1 ? `${coordKey(route[0])}>${coordKey(route.at(-1))}` : '';
  const frameDetail = destination && mapPick === null ? `|${routeKey}|${paddingBucket}` : '';
  const pickDetail = mapPick ? `|${paddingBucket}` : '';
  const focusKey = `${mapPick}|${coordKey(destination?.location)}|${
    pickupLocked ? coordKey(pickup?.location) : ''
  }${frameDetail}${pickDetail}`;
  const focusPickup = pickup?.location;
  const focusDestination = destination?.location;
  useEffect(() => {
    if (mapPick) {
      // Start on the point being changed (e.g. the current destination), not where the
      // route framing left the camera. Choosing a first destination leaves the camera be.
      const target =
        pickTarget.current?.target === mapPick
          ? pickTarget.current.point
          : mapPick === 'pickup'
            ? focusPickup
            : focusDestination;
      if (target) mapRef.current?.animateTo(target);
      return;
    }
    if (mapPick !== null || !focusPickup) return;
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
      .then(
        (c) =>
          c &&
          setCenter((prev) => prev ?? { point: c, mode: pinModeOf(useBookingDraft.getState()) }),
      )
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
      // Hand-dragging in free mode means "pickup is here" (the store ignores other modes).
      if (byUser) unlockPickup();
      // The mode is read when the measurement lands (it may have changed meanwhile).
      const settle = (c: LatLng) => {
        const mode = pinModeOf(useBookingDraft.getState());
        setCenter({ point: c, mode });
        if (byUser && (mode === 'pickup' || mode === 'destination')) {
          pickTarget.current = { target: mode, point: c };
        }
      };
      const fallback = toLatLng(region);
      if (!layout.pinPoint) {
        settle(fallback);
        return;
      }
      mapRef.current
        ?.coordinateAt(layout.pinPoint)
        .then((c) => settle(c ?? fallback))
        .catch(() => settle(fallback));
    },
    [layout.pinPoint, mapRef, unlockPickup],
  );

  const myLocationStartsPick =
    destination !== null &&
    mapPick === null &&
    location.coords !== null &&
    pickup !== null &&
    distanceMeters(location.coords, pickup.location) > SAME_PICKUP_RADIUS_M;

  const goToMyLocation = useCallback(() => {
    if (!location.coords) {
      location.refresh().catch(() => undefined);
      return;
    }
    if (destination && mapPick === null) {
      if (myLocationStartsPick) {
        // Away from the pickup: "pick me up here?" — pin on the user, confirm in the sheet.
        triggerHaptic('light');
        pickTarget.current = { target: 'pickup', point: location.coords };
        startPinPicking('pickup');
      } else {
        // Already picked up here: just show the whole trip again.
        const coords = routeCoords.current;
        mapRef.current?.fitToCoordinates(
          coords.length > 1 ? coords : [location.coords, destination.location],
          framePadding.current,
        );
      }
      return;
    }
    if (mapPick) pickTarget.current = { target: mapPick, point: location.coords };
    unlockPickup();
    mapRef.current?.animateTo(location.coords);
  }, [location, mapRef, destination, mapPick, myLocationStartsPick, unlockPickup, startPinPicking]);

  return {
    dragging,
    mapPick,
    pinnedPlace,
    /** True while the pin's address isn't known for its current position. */
    pinLoading: !pinCoord || pinAddress.isFetching,
    /** The my-location button will open "pick me up here" (label it accordingly). */
    myLocationStartsPick,
    onTouchStart,
    onRegionChange,
    onRegionChangeComplete,
    goToMyLocation,
  };
}
