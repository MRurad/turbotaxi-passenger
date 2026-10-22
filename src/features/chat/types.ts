export interface ChatMessage {
  id: number;
  rideId: number;
  senderRole: string;
  senderId: number;
  text: string;
  /** ISO UTC timestamp. */
  sentAt: string;
  /** Sent by the signed-in passenger. */
  isMine: boolean;
}

export interface ChatConversation {
  rideId: number;
  counterpartyRole: string;
  counterpartyId: number;
  counterpartyName: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  lastMessageSenderRole: string | null;
}

/** A message the passenger sent that the server hasn't confirmed yet (optimistic). */
export interface OutgoingMessage {
  /** Local id until the server assigns one. */
  localId: string;
  rideId: number;
  text: string;
  /** ISO UTC, when it was written (orders it among the server messages). */
  createdAt: string;
  status: 'pending' | 'failed';
}

/** One row of the (inverted) message list. */
export type ChatListItem =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'message'; key: string; message: ChatMessage }
  | { kind: 'outgoing'; key: string; message: OutgoingMessage };
