import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { ApiError } from '@/api/errors';
import { sendChatMessage } from '@/api/services/chat';
import { queryKeys } from '@/constants/queryKeys';
import { useSendChatMessage } from '@/features/chat/hooks/useSendChatMessage';
import { useChatStore } from '@/features/chat/store';
import type { ChatMessage } from '@/features/chat/types';
import type { ChatPages } from '@/features/chat/utils';
import { createQueryClient } from '@/providers/queryClient';

jest.mock('@/api/services/chat', () => ({ sendChatMessage: jest.fn() }));

const RIDE = 2;
const SENT: ChatMessage = {
  id: 50,
  rideId: RIDE,
  senderRole: 'User',
  senderId: 7,
  text: "I'm coming",
  sentAt: '2026-10-22T10:00:00Z',
  isMine: true,
};
const EMPTY: ChatPages = {
  pages: [
    { items: [], pageNumber: 1, pageSize: 30, totalCount: 0, totalPages: 1, hasNextPage: false },
  ],
  pageParams: [1],
};

function setup() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { gcTime: Infinity } });
  client.setQueryData(queryKeys.chatMessages(RIDE), EMPTY);
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

const outgoing = () => useChatStore.getState().outgoing[RIDE] ?? [];

beforeEach(() => {
  jest.clearAllMocks();
  useChatStore.getState().reset();
});

describe('useSendChatMessage (optimistic)', () => {
  it('shows the message at once, then swaps it for the server copy', async () => {
    let resolve: (m: ChatMessage) => void = () => undefined;
    jest.mocked(sendChatMessage).mockReturnValue(new Promise((r) => (resolve = r)));
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useSendChatMessage(RIDE), { wrapper });

    await act(async () => result.current.send("  I'm coming  "));
    expect(outgoing()).toMatchObject([{ text: "I'm coming", status: 'pending' }]);

    await act(async () => resolve(SENT));
    expect(outgoing()).toEqual([]);
    const data = client.getQueryData<ChatPages>(queryKeys.chatMessages(RIDE));
    expect(data?.pages[0]?.items).toEqual([SENT]);
    client.clear();
  });

  it('marks a failed send and retries it on tap', async () => {
    jest.mocked(sendChatMessage).mockRejectedValueOnce(new ApiError({ code: 'network' }));
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useSendChatMessage(RIDE), { wrapper });

    await act(async () => result.current.send('hello'));
    expect(outgoing()).toMatchObject([{ status: 'failed' }]);

    jest.mocked(sendChatMessage).mockResolvedValueOnce({ ...SENT, text: 'hello' });
    const failed = outgoing()[0];
    if (!failed) throw new Error('no outgoing message');
    // A double tap sends once.
    await act(async () => {
      result.current.retry(failed.localId);
      result.current.retry(failed.localId);
    });
    expect(outgoing()).toEqual([]);
    expect(sendChatMessage).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it('ignores blank messages', async () => {
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useSendChatMessage(RIDE), { wrapper });
    await act(async () => result.current.send('   '));
    expect(sendChatMessage).not.toHaveBeenCalled();
    client.clear();
  });
});

describe('unread counter', () => {
  it('counts driver messages only while that chat is not open, and clears on open', () => {
    const store = useChatStore.getState;
    store().messageReceived(RIDE);
    store().messageReceived(RIDE);
    expect(store().unread[RIDE]).toBe(2);

    store().setOpenRide(RIDE);
    expect(store().unread[RIDE]).toBe(0);
    store().messageReceived(RIDE);
    expect(store().unread[RIDE]).toBe(0);

    store().setOpenRide(null);
    store().messageReceived(RIDE);
    expect(store().unread[RIDE]).toBe(1);
  });
});

describe('reconciling my messages', () => {
  const pending = (text: string, createdAt: string) => ({
    localId: `local-${text}`,
    rideId: RIDE,
    text,
    createdAt,
    status: 'pending' as const,
  });

  it('a confirmed copy (hub or refetch) replaces the local one: no duplicate bubble', () => {
    const store = useChatStore.getState;
    store().addOutgoing(pending("I'm coming", '2026-10-22T10:00:00Z'));
    store().addOutgoing(pending('hello', '2026-10-22T10:00:05Z'));
    store().reconcileOutgoing(RIDE, [SENT]);
    expect(outgoing().map((m) => m.text)).toEqual(['hello']);
  });

  it("doesn't match the driver's messages or a same text from long ago", () => {
    const store = useChatStore.getState;
    store().addOutgoing(pending("I'm coming", '2026-10-22T12:00:00Z'));
    store().reconcileOutgoing(RIDE, [{ ...SENT, isMine: false }, SENT]);
    expect(outgoing()).toHaveLength(1);
  });

  it('clears a ride when it ends', () => {
    const store = useChatStore.getState;
    store().addOutgoing(pending('x', '2026-10-22T10:00:00Z'));
    store().messageReceived(RIDE);
    store().clearRide(RIDE);
    expect(store().outgoing[RIDE]).toBeUndefined();
    expect(store().unread[RIDE]).toBeUndefined();
  });
});
