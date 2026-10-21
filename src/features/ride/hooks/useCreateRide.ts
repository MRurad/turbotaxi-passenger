import { useMutation } from '@tanstack/react-query';

import type { ApiError } from '@/api/errors';
import { cancelRide, createRide } from '@/api/services/rides';
import { useAuthStore } from '@/features/auth/store';
import { triggerHaptic } from '@/lib/haptics';

import { useRideStore, type RideDraft } from '../store';
import type { CreatedRide } from '../types';

/**
 * POST /api/Rides → ride store `startSearching` + success haptic. userId comes from the auth
 * store. If the app can't take the new ride (signed out meanwhile, another ride already active)
 * it is cancelled right away instead of being left searching on the backend.
 */
export function useCreateRide() {
  return useMutation<CreatedRide, ApiError, RideDraft>({
    mutationFn: (draft) =>
      createRide({
        pickup: draft.pickup.location,
        destination: draft.destination.location,
        vehicleType: draft.vehicleType,
      }),
    onSuccess: (created, draft) => {
      const signedIn = useAuthStore.getState().status === 'authenticated';
      if (!signedIn || !useRideStore.getState().startSearching(created, draft)) {
        if (signedIn) cancelRide(created.rideId).catch(() => undefined);
        return;
      }
      triggerHaptic('success');
    },
  });
}
