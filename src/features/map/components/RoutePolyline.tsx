import { useMemo } from 'react';
import { Polyline } from 'react-native-maps';

import { decodePolyline } from '@/lib/polyline';
import { useTheme } from '@/theme';
import type { LatLng } from '@/types/geo';

export interface RoutePolylineProps {
  /** Google encoded polyline (from the estimate / ride payload). */
  encoded?: string | null;
  /** Or already-decoded points. */
  coordinates?: LatLng[];
}

/** Route in the theme's route color, drawn over a wider outline so it reads on any tile. */
export function RoutePolyline({ encoded, coordinates }: RoutePolylineProps) {
  const { colors, sizes } = useTheme();
  const points = useMemo(() => coordinates ?? decodePolyline(encoded), [coordinates, encoded]);
  if (points.length < 2) return null;

  return (
    <>
      <Polyline
        coordinates={points}
        strokeColor={colors.surfaceElevated}
        strokeWidth={sizes.route.outline}
        lineCap="round"
        lineJoin="round"
        zIndex={1}
      />
      <Polyline
        coordinates={points}
        strokeColor={colors.mapRoute}
        strokeWidth={sizes.route.line}
        lineCap="round"
        lineJoin="round"
        zIndex={2}
      />
    </>
  );
}
