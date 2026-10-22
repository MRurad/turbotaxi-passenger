import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

import { chatMessageFromEvent } from '@/api/services/chat';
import { queryKeys } from '@/constants/queryKeys';
import { TRACKING_PHASES, useRideStore } from '@/features/ride/store';
import { i18n } from '@/i18n';
import { logger } from '@/lib/logger';
import { keepRideChatJoined, onChatMessage } from '@/realtime/chatHub';

import { useChatStore } from '../store';
import { insertMessage, type ChatPages } from '../utils';

/**
 * Mounted once in the signed-in layout. While a driver is assigned the ride's chat is joined
 * (JoinRideChat, re-joined after every reconnect; LeaveRideChat when the ride ends), so
 * driver messages reach the cache and the unread badge even when the chat screen is closed.
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
      try {
        const message = chatMessageFromEvent(event);
        // Only once it's usable: a complete repeat of a broken payload still counts.
        seen.add(event.id);
        // A refetch in flight would overwrite this insert with older data.
        queryClient
          .cancelQueries({ queryKey: key })
          .finally(() => {
            queryClient.setQueryData<ChatPages>(key, (data) => insertMessage(data, message));
            // After the insert, so a local copy never vanishes before its confirmed one shows.
            if (message.isMine) useChatStore.getState().reconcileOutgoing(rideId, [message]);
          })
          .catch(() => undefined);
        if (!message.isMine) {
          // Open chat: a screen reader wouldn't notice the new row; closed: the badge counts it.
          if (useChatStore.getState().openRideId === rideId) {
            AccessibilityInfo.announceForAccessibility(
              i18n.t('chat.a11y.incoming', { text: message.text }),
            );
          }
          useChatStore.getState().messageReceived(rideId);
        }
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
