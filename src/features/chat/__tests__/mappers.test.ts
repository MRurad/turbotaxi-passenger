import { ApiError } from '@/api/errors';
import { isSameActor, mapChatMessage, mapConversation } from '@/api/mappers/chat';

const ME = { role: 'user', id: 7 };

describe('isSameActor', () => {
  it('matches my id with the role in any letter case', () => {
    expect(isSameActor('User', 7, ME)).toBe(true);
    expect(isSameActor('USER', 7, ME)).toBe(true);
  });

  it('does not match a driver who happens to have my numeric id', () => {
    expect(isSameActor('driver', 7, ME)).toBe(false);
  });

  it('does not match a missing role or id', () => {
    expect(isSameActor(null, 7, ME)).toBe(false);
    expect(isSameActor('user', undefined, ME)).toBe(false);
  });
});

describe('mapChatMessage', () => {
  const dto = {
    id: 50,
    rideId: 2,
    senderRole: 'driver',
    senderId: 4,
    text: 'On my way',
    sentAtUtc: '2026-10-22T10:00:00Z',
  };

  it('maps a driver message as not mine', () => {
    expect(mapChatMessage(dto, ME)).toEqual({
      id: 50,
      rideId: 2,
      senderRole: 'driver',
      senderId: 4,
      text: 'On my way',
      sentAt: '2026-10-22T10:00:00Z',
      isMine: false,
    });
  });

  it('flags my own message as mine', () => {
    expect(mapChatMessage({ ...dto, senderRole: 'user', senderId: 7 }, ME).isMine).toBe(true);
  });

  it('fills safe defaults for a missing sender and text', () => {
    const message = mapChatMessage(
      { ...dto, senderRole: null, senderId: undefined, text: null },
      ME,
    );

    expect(message).toMatchObject({ senderRole: '', senderId: 0, text: '', isMine: false });
  });

  it.each([
    ['id', { id: undefined }],
    ['rideId', { rideId: undefined }],
    ['sentAtUtc', { sentAtUtc: '' }],
  ])('rejects a message without %s as an invalid response', (_field, patch) => {
    expect(() => mapChatMessage({ ...dto, ...patch }, ME)).toThrow(ApiError);
  });
});

describe('mapConversation', () => {
  it('maps a conversation, trimming the name and blank previews', () => {
    const conversation = mapConversation({
      rideId: 2,
      counterpartyRole: 'driver',
      counterpartyId: 4,
      counterpartyDisplayName: '  Elvin  ',
      lastMessagePreview: '   ',
      lastMessageAtUtc: '2026-10-22T10:00:00Z',
      lastMessageSenderRole: 'driver',
    });

    expect(conversation).toEqual({
      rideId: 2,
      counterpartyRole: 'driver',
      counterpartyId: 4,
      counterpartyName: 'Elvin',
      lastMessagePreview: null,
      lastMessageAt: '2026-10-22T10:00:00Z',
      lastMessageSenderRole: 'driver',
    });
  });

  it('defaults a conversation with no counterparty details and no messages yet', () => {
    expect(mapConversation({ rideId: 2 })).toEqual({
      rideId: 2,
      counterpartyRole: '',
      counterpartyId: 0,
      counterpartyName: '',
      lastMessagePreview: null,
      lastMessageAt: null,
      lastMessageSenderRole: null,
    });
  });

  it('rejects a conversation without a ride id', () => {
    expect(() => mapConversation({ counterpartyId: 4 })).toThrow(ApiError);
  });
});
