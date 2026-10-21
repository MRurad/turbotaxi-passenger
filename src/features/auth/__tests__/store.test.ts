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

  it('setSession puts tokens in SecureStore and the user in AsyncStorage only', async () => {
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

    const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.user);
    expect(JSON.parse(storedUser ?? '{}')).toEqual(s.user);
    expect(storedUser).not.toContain('token');
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
  });

  it('keeps a session with unknown expiry', async () => {
    await useAuthStore.getState().setSession(session({ expiresAt: null }));
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().status).toBe('authenticated');
  });

  it('rejects a corrupt stored user', async () => {
    await useAuthStore.getState().setSession(session());
    await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify({ id: 'nope' }));
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(await AsyncStorage.getItem(STORAGE_KEYS.user)).toBeNull();
  });

  it('logout clears memory and storage and records the reason', async () => {
    await useAuthStore.getState().setSession(session());
    await useAuthStore.getState().logout('expired');

    expect(useAuthStore.getState()).toMatchObject({
      status: 'unauthenticated',
      accessToken: null,
      user: null,
      lastLogoutReason: 'expired',
    });
    expect(await SecureStore.getItemAsync(SECURE_KEYS.accessToken)).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.user)).toBeNull();
    expect(() => requireUserId()).toThrow(expect.objectContaining({ code: 'sessionExpired' }));
  });

  it('updateUser replaces the cached user only while signed in', async () => {
    const s = session();
    await useAuthStore.getState().updateUser({ ...s.user, name: 'Ignored' });
    expect(useAuthStore.getState().user).toBeNull();

    await useAuthStore.getState().setSession(s);
    await useAuthStore.getState().updateUser({ ...s.user, name: 'Rəşad' });
    expect(useAuthStore.getState().user?.name).toBe('Rəşad');
    expect(await AsyncStorage.getItem(STORAGE_KEYS.user)).toContain('Rəşad');
  });
});

describe('auth store ordering', () => {
  it('a logout right after setSession leaves storage empty', async () => {
    const s = session();
    const writing = useAuthStore.getState().setSession(s);
    const clearing = useAuthStore.getState().logout('user');
    await Promise.all([writing, clearing]);

    expect(await SecureStore.getItemAsync(SECURE_KEYS.accessToken)).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.user)).toBeNull();
  });

  it('hydrate does not override a login that happened while it was reading', async () => {
    const hydrating = useAuthStore.getState().hydrate(); // storage is empty
    await useAuthStore.getState().setSession(session());
    await hydrating;

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(await SecureStore.getItemAsync(SECURE_KEYS.accessToken)).toBe('token');
  });
});
