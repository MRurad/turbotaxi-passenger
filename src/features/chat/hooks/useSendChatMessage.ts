import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { sendChatMessage } from '@/api/services/chat';
import { queryKeys } from '@/constants/queryKeys';

import { OUTGOING_ID_PREFIX } from '../constants';
import { useChatStore } from '../store';
import type { OutgoingMessage } from '../types';
import { insertMessage, type ChatPages } from '../utils';

let nextLocalId = 1;

export interface SendChatMessage {
  send: (text: string) => void;
  retry: (localId: string) => void;
}

/**
 * Optimistic send: the message shows at once as "pending"; on success it is replaced by the
 * server's message (de-duplicated with the hub copy by id); on failure it stays "failed" and
 * `retry` sends it again (a double tap sends once).
 */
export function useSendChatMessage(rideId: number): SendChatMessage {
  const queryClient = useQueryClient();

  const deliver = useCallback(
    async (message: OutgoingMessage) => {
      const key = queryKeys.chatMessages(rideId);
      try {
        const sent = await sendChatMessage(rideId, message.text);
        // A refetch in flight would overwrite the insert with data from before the send.
        await queryClient.cancelQueries({ queryKey: key });
        queryClient.setQueryData<ChatPages>(key, (data) => insertMessage(data, sent));
        useChatStore.getState().removeOutgoing(rideId, message.localId);
      } catch {
        useChatStore.getState().setOutgoingStatus(rideId, message.localId, 'failed');
      }
    },
    [rideId, queryClient],
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const message: OutgoingMessage = {
        localId: `${OUTGOING_ID_PREFIX}${nextLocalId++}`,
        rideId,
        text: trimmed,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
      useChatStore.getState().addOutgoing(message);
      deliver(message).catch(() => undefined);
    },
    [rideId, deliver],
  );

  const retry = useCallback(
    (localId: string) => {
      const store = useChatStore.getState();
      const message = (store.outgoing[rideId] ?? []).find((m) => m.localId === localId);
      // Only a failed message, and only once: the status flips to pending first.
      if (!message || message.status !== 'failed') return;
      if (!store.setOutgoingStatus(rideId, localId, 'pending')) return;
      deliver(message).catch(() => undefined);
    },
    [rideId, deliver],
  );

  return { send, retry };
}
