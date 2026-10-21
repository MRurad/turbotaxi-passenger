import type { ChatConversationItemDto, ChatMessageDto } from '@/api/types';
import type { ChatConversation, ChatMessage } from '@/features/chat/types';

import { numberOr, optionalString, requireId, requireString } from './common';

export interface ChatActor {
  role: string;
  id: number;
}

export function isSameActor(
  role: string | null | undefined,
  id: number | undefined,
  actor: ChatActor,
): boolean {
  return id === actor.id && (role ?? '').toLowerCase() === actor.role.toLowerCase();
}

export function mapChatMessage(dto: ChatMessageDto, me: ChatActor): ChatMessage {
  return {
    id: requireId(dto.id, 'message.id'),
    rideId: requireId(dto.rideId, 'message.rideId'),
    senderRole: dto.senderRole ?? '',
    senderId: numberOr(dto.senderId, 0),
    text: dto.text ?? '',
    sentAt: requireString(dto.sentAtUtc, 'message.sentAtUtc'),
    isMine: isSameActor(dto.senderRole, dto.senderId, me),
  };
}

export function mapConversation(dto: ChatConversationItemDto): ChatConversation {
  return {
    rideId: requireId(dto.rideId, 'conversation.rideId'),
    counterpartyRole: dto.counterpartyRole ?? '',
    counterpartyId: numberOr(dto.counterpartyId, 0),
    counterpartyName: dto.counterpartyDisplayName?.trim() ?? '',
    lastMessagePreview: optionalString(dto.lastMessagePreview),
    lastMessageAt: optionalString(dto.lastMessageAtUtc),
    lastMessageSenderRole: optionalString(dto.lastMessageSenderRole),
  };
}
