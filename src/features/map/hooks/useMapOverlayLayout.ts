import { useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import type { EdgePadding, Point } from 'react-native-maps';

import { useTheme } from '@/theme';

export interface MapOverlayLayoutOptions {
  /** Bottom edge of overlays covering the top of the map (0 when none). */
  overlayTop: number;
  /** Top edge a framed route must stay below (e.g. under the top buttons). */
  frameTop: number;
}

/**
 * Geometry of a full-screen map with a bottom sheet over it: the view size, the sheet height,
 * the insets AppMap needs, the padding for framing points and where the center pin sits.
 */
export function useMapOverlayLayout({ overlayTop, frameTop }: MapOverlayLayoutOptions) {
  const { spacing } = useTheme();
  const [view, setView] = useState({ width: 0, height: 0 });
  const [sheetHeight, setSheetHeight] = useState(0);

  const overlays = useMemo<EdgePadding>(
    () => ({ top: overlayTop, bottom: sheetHeight, left: 0, right: 0 }),
    [overlayTop, sheetHeight],
  );
  const framePadding = useMemo<EdgePadding>(
    () => ({
      top: Math.max(overlayTop, frameTop) + spacing.xl,
      bottom: sheetHeight + spacing.xl,
      left: spacing.xxl,
      right: spacing.xxl,
    }),
    [overlayTop, frameTop, sheetHeight, spacing],
  );
  // Midway between the top overlays and the sheet: where AppMap.animateTo puts a point.
  const pinPoint = useMemo<Point | null>(
    () =>
      view.height ? { x: view.width / 2, y: (overlayTop + view.height - sheetHeight) / 2 } : null,
    [view, overlayTop, sheetHeight],
  );

  const onLayout = (e: LayoutChangeEvent) =>
    setView({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });

  return { view, onLayout, sheetHeight, setSheetHeight, overlays, framePadding, pinPoint };
}
