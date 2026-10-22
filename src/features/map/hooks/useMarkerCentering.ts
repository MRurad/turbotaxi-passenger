import { useCallback, useEffect, useRef, useState } from 'react';
import type { View } from 'react-native';
import type { Point } from 'react-native-maps';

import { MARKER_SNAPSHOT_MS } from '@/constants/timeouts';
import type { LatLng } from '@/types/geo';

import { IS_GOOGLE_MAP } from '../constants';
import { useMapProjection } from '../mapProjection';

/** Errors below this many points are left alone (no endless nudging). */
const TOLERANCE_PT = 1;
const NO_OFFSET: Point = { x: 0, y: 0 };

/** Where the view is (window rect) vs where its point is: the corrected offset, or null if fine. */
export function correctedOffset(
  current: Point,
  view: { x: number; y: number; width: number; height: number },
  point: Point,
): Point | null {
  const dx = point.x - (view.x + view.width / 2);
  const dy = point.y - (view.y + view.height / 2);
  if (Math.abs(dx) < TOLERANCE_PT && Math.abs(dy) < TOLERANCE_PT) return null;
  return { x: current.x + dx, y: current.y + dy };
}

/**
 * Apple Maps only: keeps a custom marker's centre exactly on its coordinate. MapKit places a
 * react-native-maps custom marker by a size that doesn't always match the drawn view (more so
 * for large ones), so it lands a fixed distance off the point at every zoom. This measures
 * where the view really is, asks the map where the point is, and moves the marker by the
 * difference (centerOffset). Re-checked whenever the map settles and when the view resizes.
 * Google places markers by `anchor` correctly, so there it does nothing.
 */
export function useMarkerCentering(coordinate: LatLng) {
  const projection = useMapProjection();
  const ref = useRef<View>(null);
  const [offset, setOffset] = useState<Point>(NO_OFFSET);
  const target = useRef(coordinate);

  useEffect(() => {
    target.current = coordinate;
  }, [coordinate]);

  const check = useCallback(() => {
    const view = ref.current;
    if (IS_GOOGLE_MAP || !projection || !view) return;
    view.measureInWindow((x, y, width, height) => {
      if (!width || !height) return;
      projection
        .pointForCoordinate(target.current)
        .then((point) => {
          if (!point) return;
          setOffset(
            (current) => correctedOffset(current, { x, y, width, height }, point) ?? current,
          );
        })
        .catch(() => undefined);
    });
  }, [projection]);

  // Each time the camera settles (zoom / pan / framing done), and once the coordinate moved.
  useEffect(() => projection?.onIdle(check), [projection, check]);
  useEffect(() => {
    const timer = setTimeout(check, MARKER_SNAPSHOT_MS);
    return () => clearTimeout(timer);
  }, [check, coordinate]);

  /** After a size change (e.g. the bubble appeared): measure again once it has been placed. */
  const onLayout = useCallback(() => {
    setTimeout(check, MARKER_SNAPSHOT_MS);
  }, [check]);

  return { ref, offset: IS_GOOGLE_MAP ? undefined : offset, onLayout };
}
