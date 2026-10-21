import { useCallback } from 'react';

import { useAuthStore } from '../store';

/** Manual logout; the route guard returns the user to the welcome screen. */
export function useLogout(): () => Promise<void> {
  const logout = useAuthStore((s) => s.logout);
  return useCallback(() => logout('user'), [logout]);
}
