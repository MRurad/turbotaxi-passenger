import { useMutation } from '@tanstack/react-query';

import type { ApiError } from '@/api/errors';
import { cancelRide } from '@/api/services/rides';

import { useRideStore } from '../store';
import type { CancelledRide } from '../types';

/** POST /api/Rides/{id}/cancel-by-user → `rideCancelled('user')` for that same ride. */
export function useCancelRide() {
  return useMutation<CancelledRide, ApiError, number>({
    mutationFn: (rideId) => cancelRide(rideId),
    onSuccess: (_result, rideId) => {
      const store = useRideStore.getState();
      if (store.rideId === rideId) store.rideCancelled('user');
    },
  });
}
