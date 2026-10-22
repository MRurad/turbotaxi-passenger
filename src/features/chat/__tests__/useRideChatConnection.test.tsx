import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import { AccessibilityInfo } from 'react-native';

import { queryKeys } from '@/constants/queryKeys';
import { useAuthStore } from '@/features/auth/store';
import { useRideChatConnection } from '@/features/chat/hooks/useRideChatConnection';
import { useChatStore } from '@/features/chat/store';
import type { ChatMessage } from '@/features/chat/types';
import type { ChatPages } from '@/features/chat/utils';
import { useRideStore } from '@/features/ride/store';
import { createQueryClient } from '@/providers/queryClient';
import { keepRideChatJoined, onChatMessage } from '@/realtime/chatHub';
import type { ChatMessageEvent } from '@/realtime/events';

jest.mock('@/constants/config', () => ({
  config: { API_URL: 'https://api.test', GOOGLE_MAPS_API_KEY: 'key' },
}));

const mockLeaves: jest.Mock[] = [];
const mockOffs: jest.Mock[] = [];
let mockHandler: ((event: ChatMessageEvent) => void) | null = null;
jest.mock('@/realtime/chatHub', () => ({
  keepRideChatJoined: jest.fn(() => {
    const leave = jest.fn();
    mockLeaves.push(leave);
    return leave;
  }),
  onChatMessage: jest.fn((handler: (event: ChatMessageEvent) => void) => {
    mockHandler = handler;
    const off = jest.fn(() => {
      mockHandler = null;
    });
    mockOffs.push(off);
    return off;
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const RIDE = 3;
const ME = 7;
const EMPTY: ChatPages = {
  pages: [
    { items: [], pageNumber: 1, pageSize: 30, totalCount: 0, totalPages: 1, hasNextPage: false },
  ],
  pageParams: [1],
};
const driverEvent = (id: number, overrides: Partial<ChatMessageEvent> = {}): ChatMessageEvent => ({
  id,
  rideId: RIDE,
  senderRole: 'driver',
  senderId: 4,
  text: `hello ${id}`,
  sentAtUtc: '2026-10-22T10:00:00Z',
  ...overrides,
});
const myEvent = (id: number, text: string): ChatMessageEvent =>
  driverEvent(id, { senderRole: 'user', senderId: ME, text });

function setup() {
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: { ...client.getDefaultOptions().queries, gcTime: Infinity },
  });
  client.setQueryData(queryKeys.chatMessages(RIDE), EMPTY);
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const cached = (): ChatMessage[] =>
    client.getQueryData<ChatPages>(queryKeys.chatMessages(RIDE))?.pages[0]?.items ?? [];
  return { client, wrapper, cached };
}

/** Delivers a hub event and lets the cancel → insert chain settle. */
async function receive(event: ChatMessageEvent) {
  await act(async () => {
    mockHandler?.(event);
    await new Promise<void>((resolve) => setImmediate(() => resolve()));
  });
}

const track = (phase: 'driver_assigned' | 'in_progress' = 'driver_assigned') =>
  useRideStore.setState({ phase, rideId: RIDE });
const unread = () => useChatStore.getState().unread[RIDE];

beforeEach(() => {
  jest.clearAllMocks();
  mockLeaves.length = 0;
  mockOffs.length = 0;
  mockHandler = null;
  useRideStore.getState().reset();
  useChatStore.getState().reset();
  useAuthStore.setState({
    user: { id: ME, name: '', surname: '', phoneNumber: '', email: '', createdAt: null },
  });
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useRideChatConnection — joining', () => {
  it('does not join any chat while no driver is assigned', async () => {
    useRideStore.setState({ phase: 'searching', rideId: RIDE });
    const { client, wrapper } = setup();

    await renderHook(() => useRideChatConnection(), { wrapper });

    expect(keepRideChatJoined).not.toHaveBeenCalled();
    expect(onChatMessage).not.toHaveBeenCalled();
    client.clear();
  });

  it('joins the ride chat once a driver is assigned', async () => {
    const { client, wrapper } = setup();
    await renderHook(() => useRideChatConnection(), { wrapper });

    await act(async () => track());

    expect(keepRideChatJoined).toHaveBeenCalledWith(RIDE);
    expect(onChatMessage).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('stays joined (no leave + re-join) when the ride moves to in progress', async () => {
    track('driver_assigned');
    const { client, wrapper } = setup();
    await renderHook(() => useRideChatConnection(), { wrapper });

    await act(async () => track('in_progress'));

    expect(keepRideChatJoined).toHaveBeenCalledTimes(1);
    expect(mockLeaves[0]).not.toHaveBeenCalled();
    client.clear();
  });

  it('leaves the chat, stops listening and clears its local state when the ride ends', async () => {
    track();
    const { client, wrapper } = setup();
    await renderHook(() => useRideChatConnection(), { wrapper });
    await receive(driverEvent(1));
    expect(unread()).toBe(1);

    await act(async () => useRideStore.setState({ phase: 'completed' }));

    expect(mockLeaves[0]).toHaveBeenCalledTimes(1);
    expect(mockOffs[0]).toHaveBeenCalledTimes(1);
    expect(unread()).toBeUndefined();
    client.clear();
  });

  it('leaves the chat when the signed-in layout unmounts', async () => {
    track();
    const { client, wrapper } = setup();
    const { unmount } = await renderHook(() => useRideChatConnection(), { wrapper });

    await unmount();

    expect(mockLeaves[0]).toHaveBeenCalledTimes(1);
    expect(mockOffs[0]).toHaveBeenCalledTimes(1);
    client.clear();
  });
});

describe('useRideChatConnection — incoming messages', () => {
  async function connected() {
    track();
    const ctx = setup();
    await renderHook(() => useRideChatConnection(), { wrapper: ctx.wrapper });
    return ctx;
  }

  it('puts a driver message into the cached history and counts it as unread', async () => {
    const { client, cached } = await connected();

    await receive(driverEvent(10));

    expect(cached()).toMatchObject([{ id: 10, text: 'hello 10', isMine: false }]);
    expect(unread()).toBe(1);
    client.clear();
  });

  it('counts a message the hub repeats only once', async () => {
    const { client, cached } = await connected();

    await receive(driverEvent(10));
    await receive(driverEvent(10));

    expect(cached()).toHaveLength(1);
    expect(unread()).toBe(1);
    client.clear();
  });

  it("ignores messages of another ride's chat", async () => {
    const { client, cached } = await connected();

    await receive(driverEvent(10, { rideId: RIDE + 1 }));

    expect(cached()).toEqual([]);
    expect(unread()).toBeUndefined();
    client.clear();
  });

  it('announces a driver message to the screen reader when the chat is open', async () => {
    const { client } = await connected();
    useChatStore.getState().setOpenRide(RIDE);

    await receive(driverEvent(10, { text: 'I am here' }));

    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1);
    expect(jest.mocked(AccessibilityInfo.announceForAccessibility).mock.calls[0]?.[0]).toContain(
      'I am here',
    );
    expect(unread()).toBe(0);
    client.clear();
  });

  it('does not announce when the chat is closed (the badge counts it instead)', async () => {
    const { client } = await connected();

    await receive(driverEvent(10));

    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    client.clear();
  });

  it('my own echoed message replaces its pending local copy and is not unread', async () => {
    const { client, cached } = await connected();
    useChatStore.getState().addOutgoing({
      localId: 'local-1',
      rideId: RIDE,
      text: 'coming',
      createdAt: '2026-10-22T10:00:00Z',
      status: 'pending',
    });

    await receive(myEvent(11, 'coming'));

    expect(cached()).toMatchObject([{ id: 11, isMine: true }]);
    expect(useChatStore.getState().outgoing[RIDE]).toEqual([]);
    expect(useChatStore.getState().aliases[11]?.key).toBe('local-1');
    expect(unread()).toBeUndefined();
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    client.clear();
  });

  it('re-reads the history instead when a message payload is unusable', async () => {
    const { client, cached } = await connected();
    const invalidate = jest.spyOn(client, 'invalidateQueries');

    await receive(driverEvent(12, { sentAtUtc: null }));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.chatMessages(RIDE) });
    expect(cached()).toEqual([]);
    client.clear();
  });

  it('cancels an in-flight history refetch so it cannot overwrite the new message', async () => {
    const { client, cached } = await connected();
    const cancel = jest.spyOn(client, 'cancelQueries');

    await receive(driverEvent(10));

    expect(cancel).toHaveBeenCalledWith({ queryKey: queryKeys.chatMessages(RIDE) });
    expect(cached()).toHaveLength(1);
    client.clear();
  });
});
