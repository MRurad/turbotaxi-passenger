import { useBookingDraft } from '../store';
import { useRouteEstimates, type VehicleEstimate } from './useRouteEstimates';

/** The estimate for the vehicle currently selected in the draft (queries are shared/cached). */
export function useSelectedEstimate(): VehicleEstimate | undefined {
  const vehicleType = useBookingDraft((s) => s.vehicleType);
  return useRouteEstimates().find((e) => e.vehicleType === vehicleType);
}
