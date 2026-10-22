import { CHAT_ACTOR_ROLE } from '@/constants/api';
import { config } from '@/constants/config';
import { expireSession, isSessionValid, requireAccessToken } from '@/features/auth/session';
import { requireUserId } from '@/features/auth/store';

import {
  CHAT_HUB_EVENTS,
  CHAT_HUB_METHODS,
  CHAT_HUB_SCHEMAS,
  HUBS,
  type ChatHubEventMap,
} from './events';
import { HubConnectionManager } from './HubConnectionManager';

/** Chat hub — connected only while at least one ride chat is open. */
export const chatHub = new HubConnectionManager<ChatHubEventMap>({
  hub: 'chat',
  url: `${config.API_URL}${HUBS.chat}`,
  schemas: CHAT_HUB_SCHEMAS,
  accessTokenFactory: requireAccessToken,
  isSessionValid: () => isSessionValid(),
  onSessionInvalid: () => {
    expireSession().catch(() => undefined);
  },
});

/** actorId always from the auth store; actorRole TODO confirm (docs/BACKEND_REQUESTS.md #7). */
export const joinRideChat = (rideId: number): Promise<unknown> =>
  chatHub.invoke(CHAT_HUB_METHODS.joinRideChat, rideId, CHAT_ACTOR_ROLE, requireUserId());

export const leaveRideChat = (rideId: number): Promise<unknown> =>
  chatHub.invoke(CHAT_HUB_METHODS.leaveRideChat, rideId);

let openChats = 0;

/**
 * Join a ride chat now and again after every reconnect; starts the chat hub if needed.
 * Returns a cleanup that leaves the chat and stops the hub when no chat is open anymore.
 */
export function keepRideChatJoined(rideId: number): () => void {
  openChats += 1;
  const remove = chatHub.addOnConnect(() => joinRideChat(rideId));
  chatHub.start().catch(() => undefined);
  let cleaned = false;
  return () => {
    if (cleaned) return;
    cleaned = true;
    remove();
    openChats = Math.max(0, openChats - 1);
    const leave = leaveRideChat(rideId).catch(() => undefined);
    // Re-checked when the leave settles: another chat may have started in the meantime.
    leave.finally(() => {
      if (openChats === 0) chatHub.stop().catch(() => undefined);
    });
  };
}

export function onChatMessage(
  handler: (payload: ChatHubEventMap[typeof CHAT_HUB_EVENTS.receiveMessage]) => void,
): () => void {
  return chatHub.on(CHAT_HUB_EVENTS.receiveMessage, handler);
}
