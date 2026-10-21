import { create } from 'zustand';

import { ApiError } from '@/api/errors';
import { SECURE_KEYS, STORAGE_KEYS } from '@/constants/storageKeys';
import { getSecureItem, removeSecureItem, setSecureItem } from '@/lib/secureStorage';
import { getJSON, removeItem, setJSON } from '@/lib/storage';
import { userSchema, type User } from '@/types/user';

import type { AuthSession, AuthStatus, LogoutReason } from './types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  status: AuthStatus;
  /** Set by logout(); lets the login screen say "session expired". Cleared on next login. */
  lastLogoutReason: LogoutReason | null;
}

interface AuthActions {
  /** Restores the session from SecureStore (tokens) + AsyncStorage (user). Call once at startup. */
  hydrate: () => Promise<void>;
  setSession: (session: AuthSession) => Promise<void>;
  /** Replaces the cached user (e.g. after a profile update). */
  updateUser: (user: User) => Promise<void>;
  logout: (reason?: LogoutReason) => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

const SIGNED_OUT: Omit<AuthState, 'lastLogoutReason'> = {
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  status: 'unauthenticated',
};

async function clearPersistedSession(): Promise<void> {
  await Promise.all([
    removeSecureItem(SECURE_KEYS.accessToken),
    removeSecureItem(SECURE_KEYS.refreshToken),
    removeSecureItem(SECURE_KEYS.tokenExpiresAt),
    removeItem(STORAGE_KEYS.user),
  ]);
}

function parseExpiresAt(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * Storage writes run strictly in call order, so a logout can never be overtaken by the
 * still-pending writes of an earlier setSession (which would resurrect the session on relaunch).
 */
let persistQueue: Promise<void> = Promise.resolve();
function enqueuePersist(op: () => Promise<unknown>): Promise<void> {
  const next = persistQueue.then(op, op).then(() => undefined);
  persistQueue = next.catch(() => undefined);
  return next;
}

/** Bumped by setSession/logout; hydrate discards its result if a newer session change happened. */
let sessionGeneration = 0;

export const useAuthStore = create<AuthStore>()((set, get) => ({
  ...SIGNED_OUT,
  status: 'loading',
  lastLogoutReason: null,

  hydrate: async () => {
    const generation = sessionGeneration;
    const [accessToken, refreshToken, expiresAtRaw, user] = await Promise.all([
      getSecureItem(SECURE_KEYS.accessToken),
      getSecureItem(SECURE_KEYS.refreshToken),
      getSecureItem(SECURE_KEYS.tokenExpiresAt),
      getJSON(STORAGE_KEYS.user, userSchema),
    ]);
    const expiresAt = parseExpiresAt(expiresAtRaw);
    // No refresh endpoint yet: an expired token means logging in again.
    const expired = expiresAt !== null && expiresAt <= Date.now();
    // The user logged in/out while we were reading: their action wins.
    if (generation !== sessionGeneration) return;

    if (!accessToken || !user || expired) {
      set({ ...SIGNED_OUT, lastLogoutReason: expired ? 'expired' : null });
      await enqueuePersist(clearPersistedSession);
      return;
    }
    set({ user, accessToken, refreshToken, expiresAt, status: 'authenticated' });
  },

  setSession: async ({ user, tokens }) => {
    sessionGeneration += 1;
    set({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      status: 'authenticated',
      lastLogoutReason: null,
    });
    // If the keychain write fails the session still works for this launch; the user just has to
    // log in again next time (hydrate finds no token).
    await enqueuePersist(() =>
      Promise.all([
        setSecureItem(SECURE_KEYS.accessToken, tokens.accessToken),
        tokens.refreshToken
          ? setSecureItem(SECURE_KEYS.refreshToken, tokens.refreshToken)
          : removeSecureItem(SECURE_KEYS.refreshToken),
        tokens.expiresAt !== null
          ? setSecureItem(SECURE_KEYS.tokenExpiresAt, String(tokens.expiresAt))
          : removeSecureItem(SECURE_KEYS.tokenExpiresAt),
        setJSON(STORAGE_KEYS.user, user),
      ]),
    );
  },

  updateUser: async (user) => {
    if (get().status !== 'authenticated') return;
    set({ user });
    await enqueuePersist(() => setJSON(STORAGE_KEYS.user, user));
  },

  logout: async (reason = 'user') => {
    sessionGeneration += 1;
    set({ ...SIGNED_OUT, lastLogoutReason: reason });
    await enqueuePersist(clearPersistedSession);
  },
}));

/**
 * The signed-in user's id for request bodies/paths. Services call this — never accept a
 * userId from screens or user input.
 */
export function requireUserId(): number {
  const id = useAuthStore.getState().user?.id;
  if (id === undefined) throw new ApiError({ code: 'sessionExpired' });
  return id;
}
