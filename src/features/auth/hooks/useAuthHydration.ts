import { useEffect } from 'react';

import { useAuthStore } from '../store';

/** Restores the saved session once at startup; true when auth status is known. */
export function useAuthHydration(): boolean {
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    // Never leave the splash up forever: if restoring fails, start signed out.
    hydrate().catch(() => useAuthStore.setState({ status: 'unauthenticated' }));
  }, [hydrate]);

  return status !== 'loading';
}
