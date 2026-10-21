import { useMemo } from 'react';

import { decodePolyline } from '@/lib/polyline';
import type { LatLng } from '@/types/geo';

import { useBookingDraft } from '../store';
import { useRouteEstimates } from './useRouteEstimates';

/**
 * Decoded route for the map: the selected vehicle's polyline, else any loaded estimate's
 * (the road route is the same for every class), so the line doesn't vanish on a failed class.
 */
export function useRoutePolyline(): LatLng[] {
  const vehicleType = useBookingDraft((s) => s.vehicleType);
  const estimates = useRouteEstimates();
  const encoded =
    estimates.find((e) => e.vehicleType === vehicleType)?.estimate?.encodedPolyline ??
    estimates.find((e) => e.estimate?.encodedPolyline)?.estimate?.encodedPolyline ??
    null;
  return useMemo(() => decodePolyline(encoded), [encoded]);
}
