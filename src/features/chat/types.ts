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
