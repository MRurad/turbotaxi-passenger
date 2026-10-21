import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { REALTIME_BACKGROUND_STOP_MS } from '@/constants/timeouts';
import { useAuthStore } from '@/features/auth/store';
import { useRealtimeLifecycle } from '@/realtime/useRealtimeLifecycle';

function mockHub() {
  let wanted = false;
  return {
    start: jest.fn(() => {
      wanted = true;
      return Promise.resolve();
    }),
    stop: jest.fn(() => {
      wanted = false;
      return Promise.resolve();
    }),
    reset: jest.fn(() => {
      wanted = false;
      return Promise.resolve();
    }),
    addOnConnect: jest.fn(() => jest.fn()),
    getState: jest.fn(() => 'connected'),
    wasWanted: jest.fn(() => wanted),
  };
}

jest.mock('@/realtime/userHub', () => {
  const hub = mockHub();
  return {
    userHub: hub,
    subscribeUser: jest.fn(() => Promise.resolve()),
    pingUserHub: jest.fn(() => Promise.resolve()),
  };
});
jest.mock('@/realtime/chatHub', () => ({ chatHub: mockHub() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { userHub, subscribeUser } = require('@/realtime/userHub');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chatHub } = require('@/realtime/chatHub');

let appStateListener: ((state: AppStateStatus) => void) | null = null;
let currentState: AppStateStatus = 'active';

function setAppState(state: AppStateStatus) {
  currentState = state;
  appStateListener?.(state);
}

const USER = { id: 7, name: 'R', surname: 'M', phoneNumber: '', email: '', createdAt: null };

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  currentState = 'active';
  Object.defineProperty(AppState, 'currentState', {
    get: () => currentState,
    configurable: true,
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener as (state: AppStateStatus) => void;
    return { remove: () => (appStateListener = null) } as ReturnType<
      typeof AppState.addEventListener
    >;
  });
  useAuthStore.setState({ user: USER, status: 'authenticated', accessToken: 'jwt' });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('useRealtimeLifecycle', () => {
  it('starts the user hub with SubscribeUser as an on-connect action', async () => {
    await renderHook(() => useRealtimeLifecycle());
    expect(userHub.addOnConnect).toHaveBeenCalledWith(subscribeUser);
    expect(userHub.start).toHaveBeenCalled();
  });

  it('stops the hubs 30 s after going to the background, unless back before that', async () => {
    await renderHook(() => useRealtimeLifecycle());

    setAppState('background');
    await act(() => jest.advanceTimersByTimeAsync(REALTIME_BACKGROUND_STOP_MS - 1));
    setAppState('active');
    await act(() => jest.advanceTimersByTimeAsync(REALTIME_BACKGROUND_STOP_MS));
    expect(userHub.stop).not.toHaveBeenCalled();

    setAppState('background');
    await act(() => jest.advanceTimersByTimeAsync(REALTIME_BACKGROUND_STOP_MS));
    expect(userHub.stop).toHaveBeenCalledTimes(1);
  });

  it('two background events in a row do not leak a timer that fires in the foreground', async () => {
    await renderHook(() => useRealtimeLifecycle());
    setAppState('background');
    setAppState('background');
    setAppState('active');
    await act(() => jest.advanceTimersByTimeAsync(REALTIME_BACKGROUND_STOP_MS * 2));
    expect(userHub.stop).not.toHaveBeenCalled();
  });

  it('ignores "inactive" and keeps the connection during an active ride', async () => {
    let rideActive = true;
    await renderHook(() => useRealtimeLifecycle({ keepAliveInBackground: () => rideActive }));

    setAppState('inactive');
    await act(() => jest.advanceTimersByTimeAsync(REALTIME_BACKGROUND_STOP_MS));
    setAppState('background');
    await act(() => jest.advanceTimersByTimeAsync(REALTIME_BACKGROUND_STOP_MS));
    expect(userHub.stop).not.toHaveBeenCalled();

    rideActive = false;
    setAppState('active');
    setAppState('background');
    await act(() => jest.advanceTimersByTimeAsync(REALTIME_BACKGROUND_STOP_MS));
    expect(userHub.stop).toHaveBeenCalledTimes(1);
  });

  it('restores the hubs that were connected before backgrounding', async () => {
    await renderHook(() => useRealtimeLifecycle());
    await chatHub.start(); // e.g. a ride chat was open
    setAppState('background');
    await act(() => jest.advanceTimersByTimeAsync(REALTIME_BACKGROUND_STOP_MS));
    expect(chatHub.stop).toHaveBeenCalled();

    chatHub.start.mockClear();
    setAppState('active');
    expect(userHub.start).toHaveBeenCalled();
    expect(chatHub.start).toHaveBeenCalledTimes(1);
  });

  it('resets every hub on logout', async () => {
    const { unmount } = await renderHook(() => useRealtimeLifecycle());
    await act(async () => {
      useAuthStore.setState({ user: null, status: 'unauthenticated', accessToken: null });
    });
    expect(userHub.reset).toHaveBeenCalled();
    expect(chatHub.reset).toHaveBeenCalled();
    await unmount();
  });
});
