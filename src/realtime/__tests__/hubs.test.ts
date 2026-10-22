import { CHAT_ACTOR_ROLE } from '@/constants/api';
import { expireSession } from '@/features/auth/session';
import { useAuthStore } from '@/features/auth/store';
import {
  chatHub,
  joinRideChat,
  keepRideChatJoined,
  leaveRideChat,
  onChatMessage,
} from '@/realtime/chatHub';
import { CHAT_HUB_EVENTS, USER_HUB_EVENTS } from '@/realtime/events';
import type { HubManagerOptions } from '@/realtime/HubConnectionManager';
import {
  onUserHubEvent,
  pingUserHub,
  subscribeToDriverLocation,
  subscribeUser,
  unsubscribeFromDriverLocation,
  unsubscribeUser,
  userHub,
} from '@/realtime/userHub';

// Each hub module builds one manager at import time; the fake records its options and calls.
interface FakeManager {
  options: HubManagerOptions<Record<string, unknown>>;
  invoke: jest.Mock<Promise<unknown>, unknown[]>;
  on: jest.Mock<() => void, [string, (payload: unknown) => void]>;
  start: jest.Mock<Promise<void>, []>;
  stop: jest.Mock<Promise<void>, []>;
  addOnConnect: jest.Mock<() => void, [() => unknown]>;
  /** The on-connect actions currently registered. */
  actions: Set<() => unknown>;
}

jest.mock('@/realtime/HubConnectionManager', () => ({
  HubConnectionManager: jest.fn().mockImplementation((options: unknown) => {
    const actions = new Set<() => unknown>();
    return {
      options,
      actions,
      invoke: jest.fn(() => Promise.resolve('ok')),
      on: jest.fn(() => jest.fn()),
      start: jest.fn(() => Promise.resolve()),
      stop: jest.fn(() => Promise.resolve()),
      addOnConnect: jest.fn((action: () => unknown) => {
        actions.add(action);
        return () => actions.delete(action);
      }),
    };
  }),
}));

jest.mock('@/constants/config', () => ({
  config: { API_URL: 'https://api.test', GOOGLE_MAPS_API_KEY: 'key' },
}));

jest.mock('@/features/auth/session', () => ({
  ...jest.requireActual<typeof import('@/features/auth/session')>('@/features/auth/session'),
  expireSession: jest.fn(() => Promise.resolve()),
}));

const user = userHub as unknown as FakeManager;
const chat = chatHub as unknown as FakeManager;
const USER_ID = 7;
const flush = () => new Promise<void>((resolve) => setImmediate(() => resolve()));

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    user: { id: USER_ID, name: '', surname: '', phoneNumber: '', email: '', createdAt: null },
    accessToken: 'jwt',
    expiresAt: null,
  });
});

describe('userHub', () => {
  it('connects to /hubs/user with the stored access token', () => {
    expect(user.options.hub).toBe('user');
    expect(user.options.url).toMatch(/\/hubs\/user$/);
    expect(user.options.accessTokenFactory()).toBe('jwt');
  });

  it('refuses to connect anonymously when there is no token', () => {
    useAuthStore.setState({ accessToken: null });

    expect(() => user.options.accessTokenFactory()).toThrow();
    expect(user.options.isSessionValid?.()).toBe(false);
  });

  it('treats an expired token as an invalid session', () => {
    useAuthStore.setState({ expiresAt: Date.now() - 1 });

    expect(user.options.isSessionValid?.()).toBe(false);
  });

  it('logs the user out when the hub reports the session invalid', () => {
    user.options.onSessionInvalid?.();

    expect(expireSession).toHaveBeenCalledTimes(1);
  });

  it('subscribes and unsubscribes the signed-in user by id as a string', async () => {
    await subscribeUser();
    await unsubscribeUser();

    expect(user.invoke).toHaveBeenNthCalledWith(1, 'SubscribeUser', String(USER_ID));
    expect(user.invoke).toHaveBeenNthCalledWith(2, 'UnsubscribeUser', String(USER_ID));
  });

  it('rejects SubscribeUser without a signed-in user instead of sending a bogus id', () => {
    useAuthStore.setState({ user: null });

    expect(() => subscribeUser()).toThrow();
    expect(user.invoke).not.toHaveBeenCalled();
  });

  it('subscribes to and from a driver location by driver id', async () => {
    await subscribeToDriverLocation(12);
    await unsubscribeFromDriverLocation(12);
    await pingUserHub();

    expect(user.invoke.mock.calls).toEqual([
      ['SubscribeToDriverLocation', 12],
      ['UnsubscribeFromDriverLocation', 12],
      ['Ping'],
    ]);
  });

  it('maps a friendly event name to the wire name and returns the unsubscribe', () => {
    const handler = jest.fn();

    const off = onUserHubEvent('driverLocationUpdated', handler);

    expect(user.on).toHaveBeenCalledWith(USER_HUB_EVENTS.driverLocationUpdated, handler);
    expect(off).toBe(user.on.mock.results[0]?.value);
  });
});

describe('chatHub', () => {
  it('connects to /hubs/chat and logs out on an invalid session', () => {
    expect(chat.options.hub).toBe('chat');
    expect(chat.options.url).toMatch(/\/hubs\/chat$/);

    chat.options.onSessionInvalid?.();

    expect(expireSession).toHaveBeenCalledTimes(1);
  });

  it('joins a ride chat as the passenger with the id from the auth store', async () => {
    await joinRideChat(3);
    await leaveRideChat(3);

    expect(chat.invoke.mock.calls).toEqual([
      ['JoinRideChat', 3, CHAT_ACTOR_ROLE, USER_ID],
      ['LeaveRideChat', 3],
    ]);
  });

  it('subscribes to ReceiveChatMessage', () => {
    const handler = jest.fn();

    onChatMessage(handler);

    expect(chat.on).toHaveBeenCalledWith(CHAT_HUB_EVENTS.receiveMessage, handler);
  });

  it('keepRideChatJoined starts the hub and re-joins on every (re)connect', async () => {
    const leave = keepRideChatJoined(3);
    expect(chat.start).toHaveBeenCalledTimes(1);
    expect(chat.actions.size).toBe(1);

    // What the manager does after each connect / reconnect.
    for (const action of chat.actions) await action();
    for (const action of chat.actions) await action();

    expect(chat.invoke).toHaveBeenCalledTimes(2);
    expect(chat.invoke).toHaveBeenCalledWith('JoinRideChat', 3, CHAT_ACTOR_ROLE, USER_ID);
    leave();
    await flush();
  });

  it('cleanup leaves the chat, forgets the re-join and stops the hub', async () => {
    const leave = keepRideChatJoined(3);

    leave();
    await flush();

    expect(chat.actions.size).toBe(0);
    expect(chat.invoke).toHaveBeenCalledWith('LeaveRideChat', 3);
    expect(chat.stop).toHaveBeenCalledTimes(1);
  });

  it('cleanup is idempotent: a second call neither leaves nor stops again', async () => {
    const leave = keepRideChatJoined(3);

    leave();
    leave();
    await flush();

    expect(chat.invoke).toHaveBeenCalledTimes(1);
    expect(chat.stop).toHaveBeenCalledTimes(1);
  });

  it('keeps the hub running while another ride chat is still open', async () => {
    const leaveA = keepRideChatJoined(3);
    const leaveB = keepRideChatJoined(4);

    leaveA();
    await flush();
    expect(chat.stop).not.toHaveBeenCalled();

    leaveB();
    await flush();
    expect(chat.stop).toHaveBeenCalledTimes(1);
  });

  it('does not stop the hub when a new chat opens before the leave settles', async () => {
    let settleLeave: () => void = () => undefined;
    chat.invoke.mockReturnValueOnce(new Promise((resolve) => (settleLeave = () => resolve('ok'))));
    const leaveA = keepRideChatJoined(3);
    leaveA();

    const leaveB = keepRideChatJoined(4);
    settleLeave();
    await flush();

    expect(chat.stop).not.toHaveBeenCalled();
    leaveB();
    await flush();
  });

  it('still stops the hub when LeaveRideChat fails (e.g. not connected)', async () => {
    chat.invoke.mockRejectedValueOnce(new Error('chat hub not connected'));
    const leave = keepRideChatJoined(3);

    leave();
    await flush();

    expect(chat.stop).toHaveBeenCalledTimes(1);
  });
});
