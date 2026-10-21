import { useImperativeHandle, useRef, type PropsWithChildren, type Ref } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { type EdgePadding, type MapViewProps, type Point } from 'react-native-maps';

import { MAP_ANIMATION_MS } from '@/constants/timeouts';
import { mapStyles, useTheme } from '@/theme';
import type { LatLng } from '@/types/geo';

import { IS_GOOGLE_MAP, MAP_PROVIDER, USER_ZOOM_DELTA } from '../constants';

export interface AppMapHandle {
  /** Frame several points (pickup + destination, route) leaving room for overlays. */
  fitToCoordinates: (coords: LatLng[], padding: EdgePadding) => void;
  /** Put a point under the focus point (the center pin) at street-level zoom. */
  animateTo: (coord: LatLng) => void;
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
   * Area covered by overlays (top cards, bottom sheet). Google: applied as mapPadding, so the
   * camera center *is* the focus point. Apple Maps (iOS Expo Go): not applied to the camera;
   * animateTo offsets the region instead so the point still lands under the pin.
   */
  overlayInsets: EdgePadding;
  /** Map view height, needed for the Apple Maps offset. */
  viewHeight: number;
  testID?: string;
}

export function AppMap({
  ref,
  overlayInsets,
  viewHeight,
  children,
  style,
  ...props
}: PropsWithChildren<AppMapProps>) {
  const { scheme, isDark } = useTheme();
  const mapRef = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    fitToCoordinates: (coords, padding) =>
      mapRef.current?.fitToCoordinates(coords, { edgePadding: padding, animated: true }),
    animateTo: (coord) => {
      // Apple: the region center is the view center, but the pin sits in the middle of the
      // uncovered area. Shift south by that difference (a latitudeDelta spans the view height).
      const shift =
        IS_GOOGLE_MAP || viewHeight <= 0
          ? 0
          : ((overlayInsets.bottom - overlayInsets.top) / 2 / viewHeight) * USER_ZOOM_DELTA;
      mapRef.current?.animateToRegion(
        {
          latitude: coord.latitude - shift,
          longitude: coord.longitude,
          latitudeDelta: USER_ZOOM_DELTA,
          longitudeDelta: USER_ZOOM_DELTA,
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
      style={[StyleSheet.absoluteFill, style]}
      {...props}
    >
      {children}
    </MapView>
  );
}
