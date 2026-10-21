import { useAuthStore } from './store';

// Many callers (parallel 401s, both hubs) can detect an expired session at once; log out once.
let logoutInFlight: Promise<void> | null = null;

/** Single-flight "session expired" logout, shared by the HTTP client and the SignalR hubs. */
export function expireSession(): Promise<void> {
  logoutInFlight ??= useAuthStore
    .getState()
    .logout('expired')
    .finally(() => {
      logoutInFlight = null;
    });
  return logoutInFlight;
}

/** A token exists and (if the backend told us when) it hasn't expired. */
export function isSessionValid(now: number = Date.now()): boolean {
  const { accessToken, expiresAt } = useAuthStore.getState();
  return Boolean(accessToken) && (expiresAt === null || expiresAt > now);
}

/** For SignalR's accessTokenFactory: never connect anonymously. */
export function requireAccessToken(): string {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error('no access token');
  return token;
}
