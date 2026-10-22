import { QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { ApiError } from '@/api/errors';
import { getChatMessages } from '@/api/services/chat';
import { CHAT_REFETCH_MS } from '@/constants/timeouts';
import { useChatMessages } from '@/features/chat/hooks/useChatMessages';
import { useChatStore } from '@/features/chat/store';
import type { ChatMessage } from '@/features/chat/types';
import { createQueryClient } from '@/providers/queryClient';
import type { Paged } from '@/types/paged';

jest.mock('@/api/services/chat', () => ({ getChatMessages: jest.fn() }));

const RIDE = 2;
const msg = (id: number, minute: number, isMine = false): ChatMessage => ({
  id,
  rideId: RIDE,
  senderRole: isMine ? 'user' : 'driver',
  senderId: isMine ? 7 : 4,
  text: `m${id}`,
  sentAt: `2026-10-22T10:${String(minute).padStart(2, '0')}:00Z`,
  isMine,
});
const page = (
  items: ChatMessage[],
  pageNumber: number,
  totalPages: number,
): Paged<ChatMessage> => ({
  items,
  pageNumber,
  pageSize: 30,
  totalCount: items.length,
  totalPages,
  hasNextPage: pageNumber < totalPages,
});

function setup() {
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: { ...client.getDefaultOptions().queries, gcTime: Infinity },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

const ids = (messages: readonly ChatMessage[]) => messages.map((m) => m.id);

beforeEach(() => {
  jest.clearAllMocks();
  useChatStore.getState().reset();
});

afterEach(() => {
  jest.useRealTimers();
  onlineManager.setOnline(true);
});

describe('useChatMessages', () => {
  it('loads the first page of a ride chat, oldest message first', async () => {
    jest.mocked(getChatMessages).mockResolvedValue(page([msg(3, 3), msg(1, 1), msg(2, 2)], 1, 1));
    const { client, wrapper } = setup();

    const { result } = await renderHook(() => useChatMessages(RIDE), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(ids(result.current.messages)).toEqual([1, 2, 3]);
    expect(getChatMessages).toHaveBeenCalledWith(RIDE, 1, expect.anything());
    client.clear();
  });

  it('loadMore fetches the next (older) page and merges it without duplicates', async () => {
    jest
      .mocked(getChatMessages)
      .mockResolvedValueOnce(page([msg(4, 4), msg(3, 3)], 1, 2))
      .mockResolvedValueOnce(page([msg(3, 3), msg(2, 2), msg(1, 1)], 2, 2));
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useChatMessages(RIDE), { wrapper });
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    await act(async () => result.current.loadMore());

    await waitFor(() => expect(ids(result.current.messages)).toEqual([1, 2, 3, 4]));
    expect(getChatMessages).toHaveBeenLastCalledWith(RIDE, 2, expect.anything());
    client.clear();
  });

  it('loadMore does nothing when there is no older page', async () => {
    jest.mocked(getChatMessages).mockResolvedValue(page([msg(1, 1)], 1, 1));
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useChatMessages(RIDE), { wrapper });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    await act(async () => result.current.loadMore());

    expect(getChatMessages).toHaveBeenCalledTimes(1);
    expect(result.current.isLoadingMore).toBe(false);
    client.clear();
  });

  it('replaces a pending local message once the history contains it', async () => {
    useChatStore.getState().addOutgoing({
      localId: 'local-1',
      rideId: RIDE,
      text: 'm5',
      createdAt: '2026-10-22T10:05:00Z',
      status: 'pending',
    });
    jest.mocked(getChatMessages).mockResolvedValue(page([msg(5, 5, true)], 1, 1));
    const { client, wrapper } = setup();

    const { result } = await renderHook(() => useChatMessages(RIDE), { wrapper });

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(useChatStore.getState().outgoing[RIDE]).toEqual([]);
    expect(useChatStore.getState().aliases[5]?.key).toBe('local-1');
    client.clear();
  });

  it('exposes a load error and recovers on refetch', async () => {
    const failure = new ApiError({ code: 'forbidden', status: 403 });
    jest.mocked(getChatMessages).mockRejectedValueOnce(failure);
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useChatMessages(RIDE), { wrapper });
    await waitFor(() => expect(result.current.error).toBe(failure));

    jest.mocked(getChatMessages).mockResolvedValueOnce(page([msg(1, 1)], 1, 1));
    await act(async () => result.current.refetch());

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(result.current.error).toBeNull();
    client.clear();
  });

  it('reports offline (not empty) when started without a network', async () => {
    onlineManager.setOnline(false);
    jest.mocked(getChatMessages).mockResolvedValue(page([], 1, 1));
    const { client, wrapper } = setup();

    const { result } = await renderHook(() => useChatMessages(RIDE), { wrapper });

    expect(result.current.isOffline).toBe(true);
    expect(getChatMessages).not.toHaveBeenCalled();
    client.clear();
  });

  it('re-reads the history every CHAT_REFETCH_MS while mounted', async () => {
    jest.useFakeTimers();
    jest.mocked(getChatMessages).mockResolvedValue(page([msg(1, 1)], 1, 1));
    const { client, wrapper } = setup();
    const { unmount } = await renderHook(() => useChatMessages(RIDE), { wrapper });
    await act(async () => jest.advanceTimersByTimeAsync(0));
    expect(getChatMessages).toHaveBeenCalledTimes(1);

    await act(async () => jest.advanceTimersByTimeAsync(CHAT_REFETCH_MS));
    expect(getChatMessages).toHaveBeenCalledTimes(2);

    await unmount();
    await act(async () => jest.advanceTimersByTimeAsync(CHAT_REFETCH_MS * 2));
    expect(getChatMessages).toHaveBeenCalledTimes(2);
    client.clear();
  });
});
