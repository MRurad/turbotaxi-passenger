import {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  type PropsWithChildren,
  type Ref,
} from 'react';
import { StyleSheet } from 'react-native';
import MapView, {
  type Details,
  type EdgePadding,
  type MapViewProps,
  type Point,
  type Region,
} from 'react-native-maps';

import { MAP_ANIMATION_MS, MAP_FOCUS_CORRECTION_MS } from '@/constants/timeouts';
import { mapStyles, useTheme } from '@/theme';
import type { LatLng } from '@/types/geo';

import { IS_GOOGLE_MAP, MAP_PROVIDER, USER_ZOOM_DELTA } from '../constants';
import { appleFocusShift, focusError } from '../focus';

export interface AppMapHandle {
  /** Frame several points (pickup + destination, route) leaving room for overlays. */
  fitToCoordinates: (coords: LatLng[], padding: EdgePadding) => void;
  /** Put a point exactly under the focus point (the center pin); zoom as a region delta. */
  animateTo: (coord: LatLng, zoomDelta?: number) => void;
  /**
   * Map coordinate under a screen point (map view coordinates). Used for the center pin: exact
   * on every provider, independent of how padding is applied.
   */
  coordinateAt: (point: Point) => Promise<LatLng | null>;
}

export interface AppMapProps extends Omit<
  MapViewProps,
  'provider' | 'customMapStyle' | 'userInterfaceStyle' | 'ref' | 'mapPadding'
> {
  ref?: Ref<AppMapHandle>;
  /**
   * Area covered by overlays (top cards, bottom sheet). The focus point (center pin) is the
   * middle of the remaining area. Google: applied as mapPadding. Apple Maps (iOS Expo Go):
   * animateTo offsets the camera instead.
   */
  overlayInsets: EdgePadding;
  /** Map view size, needed to locate the focus point. */
  viewWidth: number;
  viewHeight: number;
  testID?: string;
}

export function AppMap({
  ref,
  overlayInsets,
  viewWidth,
  viewHeight,
  onRegionChangeComplete,
  children,
  style,
  ...props
}: PropsWithChildren<AppMapProps>) {
  const { scheme, isDark } = useTheme();
  const mapRef = useRef<MapView>(null);
  // Target of the last animateTo, checked once the camera settles.
  const pendingFocus = useRef<LatLng | null>(null);
  const focusPoint = useMemo<Point>(
    () => ({ x: viewWidth / 2, y: (overlayInsets.top + viewHeight - overlayInsets.bottom) / 2 }),
    [viewWidth, viewHeight, overlayInsets.top, overlayInsets.bottom],
  );

  useImperativeHandle(ref, () => ({
    fitToCoordinates: (coords, padding) =>
      mapRef.current?.fitToCoordinates(coords, { edgePadding: padding, animated: true }),
    animateTo: (coord, zoomDelta = USER_ZOOM_DELTA) => {
      pendingFocus.current = coord;
      const shift = IS_GOOGLE_MAP
        ? 0
        : appleFocusShift({ coord, viewWidth, viewHeight, overlayInsets, span: zoomDelta });
      mapRef.current?.animateToRegion(
        {
          latitude: coord.latitude - shift,
          longitude: coord.longitude,
          latitudeDelta: zoomDelta,
          longitudeDelta: zoomDelta,
        },
        MAP_ANIMATION_MS,
      );
    },
    coordinateAt: async (point) => {
      try {
        return (await mapRef.current?.coordinateForPoint(point)) ?? null;
      } catch {
        return null;
      }
    },
  }));

  /**
   * After an animateTo settles, measure what is really under the pin and nudge the camera by
   * the difference (once). Fixes any provider rounding/fit so "my location" lands on the tip.
   */
  const correctFocus = useCallback(async () => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    const map = mapRef.current;
    if (!target || !map || viewHeight <= 0) return;
    try {
      const [underPin, camera] = await Promise.all([
        map.coordinateForPoint(focusPoint),
        map.getCamera(),
      ]);
      const error = focusError(target, underPin);
      if (!error) return;
      map.animateCamera(
        {
          center: {
            latitude: camera.center.latitude + error.latitude,
            longitude: camera.center.longitude + error.longitude,
          },
        },
        { duration: MAP_FOCUS_CORRECTION_MS },
      );
    } catch {
      // Measuring failed (map not ready): keep the computed position.
    }
  }, [focusPoint, viewHeight]);

  const handleRegionChangeComplete = (region: Region, details: Details) => {
    if (pendingFocus.current) correctFocus().catch(() => undefined);
    onRegionChangeComplete?.(region, details);
  };

  return (
    <MapView
      ref={mapRef}
      provider={MAP_PROVIDER}
      customMapStyle={IS_GOOGLE_MAP ? mapStyles[scheme] : undefined}
      userInterfaceStyle={isDark ? 'dark' : 'light'}
      // Google: keeps the camera center and the Google logo inside the uncovered area.
      mapPadding={IS_GOOGLE_MAP ? overlayInsets : undefined}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      pitchEnabled={false}
      // Apple Maps can't rotate markers with the map: keep it north-up so the car points right.
      rotateEnabled={IS_GOOGLE_MAP}
      style={[StyleSheet.absoluteFill, style]}
      onRegionChangeComplete={handleRegionChangeComplete}
      {...props}
    >
      {children}
    </MapView>
  );
}
