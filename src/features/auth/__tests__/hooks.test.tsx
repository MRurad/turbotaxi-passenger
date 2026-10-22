import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import type { PropsWithChildren } from 'react';

import { ApiError } from '@/api/errors';
import { login, register } from '@/api/services/auth';
import { SECURE_KEYS } from '@/constants/storageKeys';
import { useAuthHydration } from '@/features/auth/hooks/useAuthHydration';
import { useLogin } from '@/features/auth/hooks/useLogin';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useRegister } from '@/features/auth/hooks/useRegister';
import type { RegisterFormValues } from '@/features/auth/schemas';
import { useAuthStore } from '@/features/auth/store';
import type { AuthSession } from '@/features/auth/types';
import { triggerHaptic } from '@/lib/haptics';
import { createQueryClient } from '@/providers/queryClient';

jest.mock('@/api/services/auth', () => ({ login: jest.fn(), register: jest.fn() }));
jest.mock('@/lib/haptics', () => ({ triggerHaptic: jest.fn() }));

const secureStoreMock = SecureStore as unknown as typeof SecureStore & { __reset: () => void };
const initialState = useAuthStore.getState();

const SESSION: AuthSession = {
  user: {
    id: 7,
    name: 'Rashad',
    surname: 'Mammadov',
    phoneNumber: '+994501234567',
    email: 'r@x.az',
    createdAt: null,
  },
  tokens: { accessToken: 'token', refreshToken: 'refresh', expiresAt: null },
};

const REGISTER_VALUES: RegisterFormValues = {
  name: 'Rashad',
  surname: 'Mammadov',
  phone: '50 123 45 67',
  email: 'r@x.az',
  password: 'secret123',
  confirmPassword: 'secret123',
};

let client: QueryClient;
const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  secureStoreMock.__reset();
  useAuthStore.setState(initialState, true);
  client = createQueryClient();
  client.setDefaultOptions({
    ...client.getDefaultOptions(),
    queries: { ...client.getDefaultOptions().queries, gcTime: Infinity },
    mutations: { ...client.getDefaultOptions().mutations, gcTime: Infinity },
  });
});

afterEach(() => client.clear());

describe('useLogin', () => {
  it('sends only email and password to the service', async () => {
    jest.mocked(login).mockResolvedValue(SESSION);
    const { result } = await renderHook(() => useLogin(), { wrapper });

    await act(() => result.current.mutateAsync({ email: 'r@x.az', password: 'pw' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(login).toHaveBeenCalledWith({ email: 'r@x.az', password: 'pw' });
  });

  it('stores the session and signs in on success', async () => {
    jest.mocked(login).mockResolvedValue(SESSION);
    const { result } = await renderHook(() => useLogin(), { wrapper });

    await act(() => result.current.mutateAsync({ email: 'r@x.az', password: 'pw' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user: { id: 7 } });
    expect(await SecureStore.getItemAsync(SECURE_KEYS.accessToken)).toBe('token');
    expect(triggerHaptic).toHaveBeenCalledWith('success');
  });

  it('exposes the ApiError and stays signed out on failure', async () => {
    const error = new ApiError({ code: 'invalidCredentials' });
    jest.mocked(login).mockRejectedValue(error);
    const { result } = await renderHook(() => useLogin(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ email: 'r@x.az', password: 'bad' })).rejects.toBe(
        error,
      );
    });

    await waitFor(() => expect(result.current.error).toBe(error));
    expect(useAuthStore.getState().status).toBe('loading');
    expect(triggerHaptic).toHaveBeenCalledWith('error');
  });
});

describe('useRegister', () => {
  it('maps the form to the API input (E.164 phone, no confirmPassword)', async () => {
    jest.mocked(register).mockResolvedValue(SESSION);
    const { result } = await renderHook(() => useRegister(), { wrapper });

    await act(() => result.current.mutateAsync(REGISTER_VALUES));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(register).toHaveBeenCalledWith({
      name: 'Rashad',
      surname: 'Mammadov',
      phoneNumber: '+994501234567',
      email: 'r@x.az',
      password: 'secret123',
    });
  });

  it('signs in with the session the service returns (register, then login if needed)', async () => {
    jest.mocked(register).mockResolvedValue(SESSION);
    const { result } = await renderHook(() => useRegister(), { wrapper });

    await act(() => result.current.mutateAsync(REGISTER_VALUES));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'token',
    });
    expect(triggerHaptic).toHaveBeenCalledWith('success');
  });

  it('stays signed out and reports the error when registration fails', async () => {
    const error = new ApiError({ code: 'envelope', serverMessage: 'Email already registered' });
    jest.mocked(register).mockRejectedValue(error);
    const { result } = await renderHook(() => useRegister(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(REGISTER_VALUES)).rejects.toBe(error);
    });

    await waitFor(() => expect(result.current.error).toBe(error));
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(triggerHaptic).toHaveBeenCalledWith('error');
  });
});

describe('useLogout', () => {
  it('logs out with reason "user" and clears the stored session', async () => {
    await useAuthStore.getState().setSession(SESSION);
    const { result } = await renderHook(() => useLogout());

    await act(() => result.current());

    expect(useAuthStore.getState()).toMatchObject({
      status: 'unauthenticated',
      user: null,
      lastLogoutReason: 'user',
    });
    expect(await SecureStore.getItemAsync(SECURE_KEYS.accessToken)).toBeNull();
  });

  it('returns a stable callback across renders', async () => {
    const { result, rerender } = await renderHook(() => useLogout());
    const first = result.current;

    await rerender({});

    expect(result.current).toBe(first);
  });
});

describe('useAuthHydration', () => {
  it('reports not ready while the session is loading', async () => {
    useAuthStore.setState({ hydrate: () => new Promise<void>(() => undefined) });

    const { result } = await renderHook(() => useAuthHydration());

    expect(result.current).toBe(false);
  });

  it('restores a cached session from SecureStore', async () => {
    await useAuthStore.getState().setSession(SESSION);
    useAuthStore.setState({ status: 'loading', user: null, accessToken: null });

    const { result } = await renderHook(() => useAuthHydration());

    await waitFor(() => expect(result.current).toBe(true));
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user: { id: 7 } });
  });

  it('starts signed out when nothing is cached', async () => {
    const { result } = await renderHook(() => useAuthHydration());

    await waitFor(() => expect(result.current).toBe(true));
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('starts signed out when the cached user fails validation', async () => {
    await SecureStore.setItemAsync(SECURE_KEYS.accessToken, 'token');
    await SecureStore.setItemAsync(SECURE_KEYS.user, JSON.stringify({ id: -1 }));

    const { result } = await renderHook(() => useAuthHydration());

    await waitFor(() => expect(result.current).toBe(true));
    expect(useAuthStore.getState()).toMatchObject({ status: 'unauthenticated', user: null });
  });

  it('never leaves the splash up when restoring throws', async () => {
    useAuthStore.setState({ hydrate: () => Promise.reject(new Error('keychain broken')) });

    const { result } = await renderHook(() => useAuthHydration());

    await waitFor(() => expect(result.current).toBe(true));
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });
});
