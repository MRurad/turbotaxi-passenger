import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { chatMessageFromEvent } from '@/api/services/chat';
import { queryKeys } from '@/constants/queryKeys';
import { TRACKING_PHASES, useRideStore } from '@/features/ride/store';
import { logger } from '@/lib/logger';
import { keepRideChatJoined, onChatMessage } from '@/realtime/chatHub';

import { useChatStore } from '../store';
import { insertMessage, type ChatPages } from '../utils';

/**
 * Mounted once in the signed-in layout. While a driver is assigned the ride's chat is joined
 * (JoinRideChat, re-joined after every reconnect; LeaveRideChat when the ride ends), so
 * driver messages reach the cache and the unread badge even when the chat screen is closed.
 * The badge depends on the hub's chat event, still unconfirmed (docs/BACKEND_REQUESTS.md #29).
 */
export function useRideChatConnection(): void {
  const queryClient = useQueryClient();
  const rideId = useRideStore((s) => (TRACKING_PHASES.has(s.phase) ? s.rideId : null));

  useEffect(() => {
    if (rideId === null) return;
    const key = queryKeys.chatMessages(rideId);
    // Each message counts once, however often the hub repeats it.
    const seen = new Set<number>();
    const leave = keepRideChatJoined(rideId);
    const off = onChatMessage((event) => {
      if (event.rideId !== rideId || seen.has(event.id)) return;
      seen.add(event.id);
      try {
        const message = chatMessageFromEvent(event);
        // A refetch in flight would overwrite this insert with older data.
        queryClient
          .cancelQueries({ queryKey: key })
          .finally(() =>
            queryClient.setQueryData<ChatPages>(key, (data) => insertMessage(data, message)),
          )
          .catch(() => undefined);
        const chat = useChatStore.getState();
        if (message.isMine) chat.reconcileOutgoing(rideId, [message]);
        else chat.messageReceived(rideId);
      } catch (error) {
        // Incomplete payload: fall back to re-reading the history.
        logger.warn('chat: unusable message event', {
          message: error instanceof Error ? error.message : String(error),
        });
        queryClient.invalidateQueries({ queryKey: key }).catch(() => undefined);
      }
    });
    return () => {
      off();
      leave();
      useChatStore.getState().clearRide(rideId);
    };
  }, [rideId, queryClient]);
}
