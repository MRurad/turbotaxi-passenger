import type { QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuthStore } from '@/features/auth/store';
import { useBookingDraft } from '@/features/booking/store';
import { useRecentPlaces } from '@/features/home/recentPlaces';
import { clearPersistedRide } from '@/features/ride/persistence';
import { useRideStore } from '@/features/ride/store';

/**
 * Drops everything tied to the previous account when the session ends or the account changes:
 * cached server data, the booking draft, recent places (home/work addresses) and the ride.
 */
export function useClearCacheOnLogout(queryClient: QueryClient): void {
  useEffect(
    () =>
      useAuthStore.subscribe((state, prev) => {
        const signedOut = prev.status === 'authenticated' && state.status !== 'authenticated';
        // A different account signing in directly (no unauthenticated step in between).
        const switchedUser = Boolean(prev.user) && state.user?.id !== prev.user?.id;
        if (signedOut || switchedUser) {
          queryClient.clear();
          useBookingDraft.getState().reset();
          useRideStore.getState().reset();
          clearPersistedRide().catch(() => undefined);
          useRecentPlaces
            .getState()
            .clear()
            .catch(() => undefined);
        }
      }),
    [queryClient],
  );
}
