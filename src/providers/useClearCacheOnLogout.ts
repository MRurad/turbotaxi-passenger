import type { QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuthStore } from '@/features/auth/store';

/** Drops all cached server data when the session ends or the account changes. */
export function useClearCacheOnLogout(queryClient: QueryClient): void {
  useEffect(
    () =>
      useAuthStore.subscribe((state, prev) => {
        const signedOut = prev.status === 'authenticated' && state.status !== 'authenticated';
        // A different account signing in directly (no unauthenticated step in between).
        const switchedUser = Boolean(prev.user) && state.user?.id !== prev.user?.id;
        if (signedOut || switchedUser) {
          queryClient.clear();
        }
      }),
    [queryClient],
  );
}
