import { createContext, useContext } from 'react';
import type { Point } from 'react-native-maps';

import type { LatLng } from '@/types/geo';

/** What a marker can ask the map it lives in (provided by AppMap). */
export interface MapProjection {
  /** Where a coordinate is on screen (window points; the map fills the screen). */
  pointForCoordinate: (coordinate: LatLng) => Promise<Point | null>;
  /** Called each time the camera settles; returns the unsubscribe function. */
  onIdle: (listener: () => void) => () => void;
}

export const MapProjectionContext = createContext<MapProjection | null>(null);

export const useMapProjection = (): MapProjection | null => useContext(MapProjectionContext);
