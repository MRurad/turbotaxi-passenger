import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

import type { ApiError } from '@/api/errors';
import { getChatMessages } from '@/api/services/chat';
import { FIRST_PAGE } from '@/constants/api';
import { queryKeys } from '@/constants/queryKeys';
import { CHAT_REFETCH_MS } from '@/constants/timeouts';
import type { Paged } from '@/types/paged';

import { useChatStore } from '../store';
import type { ChatMessage } from '../types';
import { mergeMessagePages, type ChatPages } from '../utils';

export interface ChatMessagesState {
  messages: ChatMessage[];
  isLoading: boolean;
  /** Started offline: nothing loaded yet, waiting for the network (show offline, not empty). */
  isOffline: boolean;
  error: ApiError | null;
  refetch: () => void;
  loadMore: () => void;
  isLoadingMore: boolean;
}

/**
 * Chat history of a ride (GET /api/Chat/rides/{rideId}/messages), paged; `loadMore` fetches
 * the next page when the user scrolls up (assumes newest-first pages — BACKEND_REQUESTS #29).
 * Merged, de-duplicated and sorted on the client. Re-fetched every CHAT_REFETCH_MS while open.
 */
export function useChatMessages(rideId: number): ChatMessagesState {
  const query = useInfiniteQuery<
    Paged<ChatMessage>,
    ApiError,
    ChatPages,
    ReturnType<typeof queryKeys.chatMessages>,
    number
  >({
    queryKey: queryKeys.chatMessages(rideId),
    queryFn: ({ pageParam, signal }) => getChatMessages(rideId, pageParam, { signal }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (last) => (last.hasNextPage ? last.pageNumber + 1 : undefined),
    refetchInterval: CHAT_REFETCH_MS,
  });

  const messages = useMemo(() => mergeMessagePages(query.data?.pages ?? []), [query.data]);

  // My messages the server already has replace their local (pending / failed) copies.
  useEffect(() => {
    useChatStore.getState().reconcileOutgoing(rideId, messages);
  }, [rideId, messages]);

  const { hasNextPage, isFetchingNextPage, fetchNextPage, refetch: refetchQuery } = query;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage().catch(() => undefined);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const refetch = useCallback(() => {
    refetchQuery().catch(() => undefined);
  }, [refetchQuery]);

  return {
    messages,
    isLoading: query.isLoading,
    isOffline: query.isPending && query.fetchStatus === 'paused',
    error: query.error,
    refetch,
    loadMore,
    isLoadingMore: isFetchingNextPage,
  };
}
