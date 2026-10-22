import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { mapChatMessage, mapConversation, type ChatActor } from '@/api/mappers/chat';
import { mapPaged } from '@/api/mappers/common';
import type {
  ChatConversationItemDtoPagedResult,
  ChatMessageDto,
  ChatMessageDtoPagedResult,
  RequestOptions,
  SendChatMessageRequest,
} from '@/api/types';
import { CHAT_ACTOR_ROLE, CHAT_PAGE_SIZE, DEFAULT_PAGE_SIZE, FIRST_PAGE } from '@/constants/api';
import { requireUserId } from '@/features/auth/store';
import type { ChatConversation, ChatMessage } from '@/features/chat/types';
import type { ChatMessageEvent } from '@/realtime/events';
import type { Paged } from '@/types/paged';

/** The passenger as a chat actor; the backend takes identity from the request (see #8). */
export function currentChatActor(): ChatActor {
  return { role: CHAT_ACTOR_ROLE, id: requireUserId() };
}

export async function getChatMessages(
  rideId: number,
  pageNumber: number = FIRST_PAGE,
  { signal }: RequestOptions = {},
): Promise<Paged<ChatMessage>> {
  const me = currentChatActor();
  const { data } = await apiClient.get<ChatMessageDtoPagedResult>(ENDPOINTS.chat.messages(rideId), {
    params: { actorRole: me.role, actorId: me.id, pageNumber, pageSize: CHAT_PAGE_SIZE },
    signal,
  });
  return mapPaged(data, (dto) => mapChatMessage(dto, me));
}

export async function sendChatMessage(rideId: number, text: string): Promise<ChatMessage> {
  const me = currentChatActor();
  const body: SendChatMessageRequest = { actorRole: me.role, actorId: me.id, text: text.trim() };
  const { data } = await apiClient.post<ChatMessageDto>(ENDPOINTS.chat.messages(rideId), body);
  return mapChatMessage(data, me);
}

export async function getChatConversations(
  pageNumber: number = FIRST_PAGE,
  { signal }: RequestOptions = {},
): Promise<Paged<ChatConversation>> {
  const me = currentChatActor();
  const { data } = await apiClient.get<ChatConversationItemDtoPagedResult>(
    ENDPOINTS.chat.conversations,
    {
      params: { actorRole: me.role, actorId: me.id, pageNumber, pageSize: DEFAULT_PAGE_SIZE },
      signal,
    },
  );
  return mapPaged(data, mapConversation);
}

/** A hub chat message as a domain message (throws when the payload is incomplete). */
export function chatMessageFromEvent(event: ChatMessageEvent): ChatMessage {
  return mapChatMessage(
    {
      ...event,
      senderId: event.senderId ?? undefined,
      sentAtUtc: event.sentAtUtc ?? undefined,
    },
    currentChatActor(),
  );
}
