import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { SECURE_KEYS, STORAGE_KEYS } from '@/constants/storageKeys';
import { requireUserId, useAuthStore } from '@/features/auth/store';
import type { AuthSession } from '@/features/auth/types';

const secureStoreMock = SecureStore as unknown as typeof SecureStore & { __reset: () => void };
const initialState = useAuthStore.getState();

const HOUR_MS = 60 * 60 * 1000;

function session(overrides: Partial<AuthSession['tokens']> = {}): AuthSession {
  return {
    user: {
      id: 7,
      name: 'Rashad',
      surname: 'Mammadov',
      phoneNumber: '+994501234567',
      email: 'r@x.az',
      createdAt: null,
    },
    tokens: {
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + HOUR_MS,
      ...overrides,
    },
  };
}

async function storedUser(): Promise<unknown> {
  const raw = await SecureStore.getItemAsync(SECURE_KEYS.user);
  return raw === null ? null : JSON.parse(raw);
}

beforeEach(async () => {
  secureStoreMock.__reset();
  await AsyncStorage.clear();
  useAuthStore.setState(initialState, true);
});

describe('auth store', () => {
  it('starts in loading and hydrates to unauthenticated when nothing is stored', async () => {
    expect(useAuthStore.getState().status).toBe('loading');
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState()).toMatchObject({ status: 'unauthenticated', user: null });
  });

  it('setSession puts tokens and the user in SecureStore and nothing in AsyncStorage', async () => {
    const s = session();
    await useAuthStore.getState().setSession(s);

    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'token',
    });
    expect(await SecureStore.getItemAsync(SECURE_KEYS.accessToken)).toBe('token');
    expect(await SecureStore.getItemAsync(SECURE_KEYS.refreshToken)).toBe('refresh');
    expect(await SecureStore.getItemAsync(SECURE_KEYS.tokenExpiresAt)).toBe(
      String(s.tokens.expiresAt),
    );
    expect(await storedUser()).toEqual(s.user);
    // No PII or tokens in plain AsyncStorage.
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('hydrates a stored session', async () => {
    await useAuthStore.getState().setSession(session());
    useAuthStore.setState(initialState, true);

    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'token',
      user: { id: 7 },
    });
    expect(requireUserId()).toBe(7);
  });

  it('treats an expired token as logged out and clears storage', async () => {
    await useAuthStore.getState().setSession(session({ expiresAt: Date.now() - 1 }));
    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState()).toMatchObject({
      status: 'unauthenticated',
      lastLogoutReason: 'expired',
    });
    expect(await SecureStore.getItemAsync(SECURE_KEYS.accessToken)).toBeNull();
    expect(await storedUser()).toBeNull();
  });

  it('keeps a session with unknown expiry', async () => {
    await useAuthStore.getState().setSession(session({ expiresAt: null }));
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().status).toBe('authenticated');
  });

  it('rejects a corrupt stored user (zod) and deletes it', async () => {
    await useAuthStore.getState().setSession(session());
    await SecureStore.setItemAsync(SECURE_KEYS.user, JSON.stringify({ id: 'nope' }));
    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(await storedUser()).toBeNull();
  });

  it('rejects a stored user that is not JSON', async () => {
    await useAuthStore.getState().setSession(session());
    await SecureStore.setItemAsync(SECURE_KEYS.user, '{not json');
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('removes the legacy AsyncStorage user copy on hydrate', async () => {
    await useAuthStore.getState().setSession(session());
    await AsyncStorage.setItem(STORAGE_KEYS.legacyUser, JSON.stringify(session().user));
    useAuthStore.setState(initialState, true);

    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(await AsyncStorage.getItem(STORAGE_KEYS.legacyUser)).toBeNull();
  });

  it('logout clears memory and storage and records the reason', async () => {
    await useAuthStore.getState().setSession(session());
    await AsyncStorage.setItem(STORAGE_KEYS.legacyUser, '{}');
    await useAuthStore.getState().logout('expired');

    expect(useAuthStore.getState()).toMatchObject({
      status: 'unauthenticated',
      accessToken: null,
      user: null,
      lastLogoutReason: 'expired',
    });
    expect(await SecureStore.getItemAsync(SECURE_KEYS.accessToken)).toBeNull();
    expect(await storedUser()).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.legacyUser)).toBeNull();
    expect(() => requireUserId()).toThrow(expect.objectContaining({ code: 'sessionExpired' }));
  });

  it('updateUser replaces the cached user only while signed in', async () => {
    const s = session();
    await useAuthStore.getState().updateUser({ ...s.user, name: 'Ignored' });
    expect(useAuthStore.getState().user).toBeNull();

    await useAuthStore.getState().setSession(s);
    await useAuthStore.getState().updateUser({ ...s.user, name: 'Rəşad' });
    expect(useAuthStore.getState().user?.name).toBe('Rəşad');
    expect(await storedUser()).toMatchObject({ name: 'Rəşad' });
  });
});

describe('auth store ordering', () => {
  it('a logout right after setSession leaves storage empty', async () => {
    const writing = useAuthStore.getState().setSession(session());
    const clearing = useAuthStore.getState().logout('user');
    await Promise.all([writing, clearing]);

    expect(await SecureStore.getItemAsync(SECURE_KEYS.accessToken)).toBeNull();
    expect(await storedUser()).toBeNull();
  });

  it('an updateUser queued before logout cannot re-create the user after it', async () => {
    await useAuthStore.getState().setSession(session());
    const updating = useAuthStore.getState().updateUser({ ...session().user, name: 'Late' });
    const clearing = useAuthStore.getState().logout('user');
    await Promise.all([updating, clearing]);

    expect(await storedUser()).toBeNull();
  });

  it('hydrate does not override a login that happened while it was reading', async () => {
    const hydrating = useAuthStore.getState().hydrate(); // storage is empty
    await useAuthStore.getState().setSession(session());
    await hydrating;

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(await SecureStore.getItemAsync(SECURE_KEYS.accessToken)).toBe('token');
    expect(await storedUser()).toMatchObject({ id: 7 });
  });
});

describe('auth store edge cases', () => {
  it('removes a stale refresh token when the new session has none', async () => {
    await useAuthStore.getState().setSession(session());

    await useAuthStore.getState().setSession(session({ refreshToken: null }));

    expect(await SecureStore.getItemAsync(SECURE_KEYS.refreshToken)).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });

  it('removes a stale expiry when the new session has none', async () => {
    await useAuthStore.getState().setSession(session());

    await useAuthStore.getState().setSession(session({ expiresAt: null }));

    expect(await SecureStore.getItemAsync(SECURE_KEYS.tokenExpiresAt)).toBeNull();
  });

  it('treats an unparsable stored expiry as unknown (stays signed in)', async () => {
    await useAuthStore.getState().setSession(session({ expiresAt: null }));
    await SecureStore.setItemAsync(SECURE_KEYS.tokenExpiresAt, 'not-a-number');
    useAuthStore.setState(initialState, true);

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', expiresAt: null });
  });

  it('signs out when a user is cached but the access token is missing', async () => {
    await useAuthStore.getState().setSession(session());
    await SecureStore.deleteItemAsync(SECURE_KEYS.accessToken);
    useAuthStore.setState(initialState, true);

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState()).toMatchObject({
      status: 'unauthenticated',
      lastLogoutReason: null,
    });
    expect(await storedUser()).toBeNull();
  });

  it('ignores updateUser for a different user id', async () => {
    const s = session();
    await useAuthStore.getState().setSession(s);

    await useAuthStore.getState().updateUser({ ...s.user, id: 99, name: 'Someone else' });

    expect(useAuthStore.getState().user).toMatchObject({ id: 7, name: 'Rashad' });
    expect(await storedUser()).toMatchObject({ id: 7, name: 'Rashad' });
  });

  it('a new login clears the previous logout reason', async () => {
    await useAuthStore.getState().logout('expired');

    await useAuthStore.getState().setSession(session());

    expect(useAuthStore.getState().lastLogoutReason).toBeNull();
  });

  it('hydrate does not override a logout that happened while it was reading', async () => {
    await useAuthStore.getState().setSession(session());
    useAuthStore.setState(initialState, true);
    const hydrating = useAuthStore.getState().hydrate();

    await useAuthStore.getState().logout('user');
    await hydrating;

    expect(useAuthStore.getState()).toMatchObject({ status: 'unauthenticated', user: null });
  });
});
