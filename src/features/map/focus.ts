import type { EdgePadding } from 'react-native-maps';

import type { LatLng } from '@/types/geo';

const DEG = Math.PI / 180;

/** Below this (≈2 m) a correction nudge isn't worth a camera move. */
export const FOCUS_TOLERANCE_DEG = 0.00002;

interface AppleShiftInput {
  coord: LatLng;
  viewWidth: number;
  viewHeight: number;
  overlayInsets: EdgePadding;
  /** Requested latitudeDelta = longitudeDelta of the region. */
  span: number;
}

/**
 * Apple Maps: how far south of `coord` the region center must be so that `coord` appears at the
 * focus point (middle of the area between the top and bottom overlays).
 *
 * MapKit widens the requested region to fit the view, so the real latitude span on a tall
 * portrait screen is larger than `span`. On Web Mercator a pixel covers the same longitude
 * everywhere but cos(lat) × that in latitude; the requested spans must both fit, so the scale
 * (px per degree of longitude) is the smaller of the two constraints.
 */
export function appleFocusShift({
  coord,
  viewWidth,
  viewHeight,
  overlayInsets,
  span,
}: AppleShiftInput): number {
  if (viewWidth <= 0 || viewHeight <= 0 || span <= 0) return 0;
  const cosLat = Math.cos(coord.latitude * DEG);
  const pxPerLngDeg = Math.min(viewWidth / span, (viewHeight * cosLat) / span);
  const latDegPerPx = cosLat / pxPerLngDeg;
  // The focus point sits this many px above the view center.
  const offsetPx = (overlayInsets.bottom - overlayInsets.top) / 2;
  return offsetPx * latDegPerPx;
}

/** How far the point under the pin is from the target; null when within tolerance. */
export function focusError(target: LatLng, underPin: LatLng): LatLng | null {
  const latitude = target.latitude - underPin.latitude;
  const longitude = target.longitude - underPin.longitude;
  return Math.abs(latitude) < FOCUS_TOLERANCE_DEG && Math.abs(longitude) < FOCUS_TOLERANCE_DEG
    ? null
    : { latitude, longitude };
}
