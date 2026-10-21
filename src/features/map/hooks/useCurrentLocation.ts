import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { LatLng } from '@/types/geo';

export type LocationStatus = 'checking' | 'granted' | 'denied' | 'unavailable';

export interface CurrentLocation {
  status: LocationStatus;
  coords: LatLng | null;
  /** Denied, but the OS still lets us show the prompt again (e.g. first refusal on Android). */
  canAskAgain: boolean;
  /** Shows the system permission prompt (only useful while canAskAgain). */
  request: () => Promise<void>;
  /** Re-checks permission (asking if still undetermined) and re-reads the position. */
  refresh: () => Promise<void>;
}

const toLatLng = ({ coords }: Location.LocationObject): LatLng => ({
  latitude: coords.latitude,
  longitude: coords.longitude,
});

/**
 * Foreground location only (never background). Re-checks when the app returns to the
 * foreground, so granting permission in Settings takes effect without a restart.
 */
export function useCurrentLocation(): CurrentLocation {
  const [permission, requestPermission, getPermission] = Location.useForegroundPermissions();
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [positionFailed, setPositionFailed] = useState(false);
  // Bumped to re-read the position (refresh, app back in foreground).
  const [readCount, setReadCount] = useState(0);
  const granted = permission?.granted ?? false;

  // Ask once when the user hasn't decided yet.
  useEffect(() => {
    if (permission?.status === Location.PermissionStatus.UNDETERMINED && permission.canAskAgain) {
      requestPermission().catch(() => undefined);
    }
  }, [permission, requestPermission]);

  // Last known position is instant; the fresh fix replaces it a moment later.
  useEffect(() => {
    if (!granted) return;
    let cancelled = false;
    Location.getLastKnownPositionAsync()
      .then((last) => {
        if (last && !cancelled) setCoords(toLatLng(last));
      })
      .catch(() => undefined);
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then((fresh) => {
        if (cancelled) return;
        setCoords(toLatLng(fresh));
        setPositionFailed(false);
      })
      // Location services off, no fix indoors, simulator without a location…
      .catch(() => {
        if (!cancelled) setPositionFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [granted, readCount]);

  const request = useCallback(async () => {
    await requestPermission();
    setReadCount((n) => n + 1);
  }, [requestPermission]);

  const refresh = useCallback(async () => {
    const current = await getPermission();
    if (current.status === Location.PermissionStatus.UNDETERMINED && current.canAskAgain) {
      await requestPermission();
    }
    setReadCount((n) => n + 1);
  }, [getPermission, requestPermission]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh().catch(() => undefined);
    });
    return () => sub.remove();
  }, [refresh]);

  const status: LocationStatus = !permission
    ? 'checking'
    : granted
      ? positionFailed && !coords
        ? 'unavailable'
        : 'granted'
      : permission.canAskAgain && permission.status === Location.PermissionStatus.UNDETERMINED
        ? 'checking'
        : 'denied';

  return { status, coords, canAskAgain: permission?.canAskAgain ?? false, request, refresh };
}
