import { create } from 'zustand';

import { parseApiDate } from '@/lib/format';

import type { ChatMessage, OutgoingMessage } from './types';

/** A confirmed message of mine this close (in time) to a local one with the same text is it. */
const RECONCILE_WINDOW_MS = 2 * 60_000;

interface ChatState {
  /** Ride whose chat screen is open (its messages don't count as unread). */
  openRideId: number | null;
  /** Driver messages that arrived while that ride's chat wasn't open. */
  unread: Readonly<Record<number, number>>;
  /** Sent but not yet confirmed (pending) or failed messages, per ride. */
  outgoing: Readonly<Record<number, readonly OutgoingMessage[]>>;
}

interface ChatActions {
  /** The chat screen for `rideId` opened (clears its unread count) or closed (null). */
  setOpenRide: (rideId: number | null) => void;
  /** A new driver message arrived; counts only if that chat isn't open. */
  messageReceived: (rideId: number) => void;
  addOutgoing: (message: OutgoingMessage) => void;
  /**
   * Moves a local message to `pending` / `failed`. Returns false when it is gone (already
   * confirmed) or, for a retry, already pending — so a double tap never sends twice.
   */
  setOutgoingStatus: (
    rideId: number,
    localId: string,
    status: OutgoingMessage['status'],
  ) => boolean;
  /** The server confirmed it (the real message is in the query cache now). */
  removeOutgoing: (rideId: number, localId: string) => void;
  /**
   * My messages the server already has (hub, send response or a refetch) replace their local
   * copy: same text, written within RECONCILE_WINDOW_MS. No duplicate bubble, no re-send.
   */
  reconcileOutgoing: (rideId: number, confirmed: readonly ChatMessage[]) => void;
  /** The ride ended: drop its unread count and any local messages. */
  clearRide: (rideId: number) => void;
  reset: () => void;
}

const INITIAL: ChatState = { openRideId: null, unread: {}, outgoing: {} };

const timeOf = (iso: string) => parseApiDate(iso)?.getTime() ?? 0;

const without = <T>(record: Readonly<Record<number, T>>, key: number) =>
  Object.fromEntries(Object.entries(record).filter(([k]) => Number(k) !== key));

/** In-memory chat UI state: which chat is open, unread counts, optimistic messages. */
export const useChatStore = create<ChatState & ChatActions>()((set, get) => ({
  ...INITIAL,
  setOpenRide: (rideId) =>
    set((s) =>
      rideId === null
        ? { openRideId: null }
        : { openRideId: rideId, unread: { ...s.unread, [rideId]: 0 } },
    ),
  messageReceived: (rideId) => {
    if (get().openRideId === rideId) return;
    set((s) => ({ unread: { ...s.unread, [rideId]: (s.unread[rideId] ?? 0) + 1 } }));
  },
  addOutgoing: (message) =>
    set((s) => ({
      outgoing: {
        ...s.outgoing,
        [message.rideId]: [...(s.outgoing[message.rideId] ?? []), message],
      },
    })),
  setOutgoingStatus: (rideId, localId, status) => {
    const current = (get().outgoing[rideId] ?? []).find((m) => m.localId === localId);
    if (!current || (status === 'pending' && current.status === 'pending')) return false;
    set((s) => ({
      outgoing: {
        ...s.outgoing,
        [rideId]: (s.outgoing[rideId] ?? []).map((m) =>
          m.localId === localId ? { ...m, status } : m,
        ),
      },
    }));
    return true;
  },
  removeOutgoing: (rideId, localId) =>
    set((s) => ({
      outgoing: {
        ...s.outgoing,
        [rideId]: (s.outgoing[rideId] ?? []).filter((m) => m.localId !== localId),
      },
    })),
  reconcileOutgoing: (rideId, confirmed) => {
    const local = get().outgoing[rideId] ?? [];
    if (local.length === 0) return;
    const remaining = [...local];
    for (const message of confirmed) {
      if (!message.isMine) continue;
      const index = remaining.findIndex(
        (m) =>
          m.text === message.text.trim() &&
          Math.abs(timeOf(m.createdAt) - timeOf(message.sentAt)) <= RECONCILE_WINDOW_MS,
      );
      if (index >= 0) remaining.splice(index, 1);
    }
    if (remaining.length !== local.length) {
      set((s) => ({ outgoing: { ...s.outgoing, [rideId]: remaining } }));
    }
  },
  clearRide: (rideId) =>
    set((s) => ({ unread: without(s.unread, rideId), outgoing: without(s.outgoing, rideId) })),
  reset: () => set(INITIAL),
}));
