import { create } from 'zustand';

import type { HubName } from './events';

/** How many received events the dev screen keeps. */
export const REALTIME_DEBUG_MAX_EVENTS = 50;

export interface RealtimeDebugEvent {
  id: number;
  hub: HubName;
  name: string;
  args: unknown[];
  /** Has a registered handler / known name in events.ts. */
  known: boolean;
  /** Epoch ms. */
  at: number;
}

interface RealtimeDebugStore {
  events: RealtimeDebugEvent[];
  record: (event: Omit<RealtimeDebugEvent, 'id' | 'at'>) => void;
  clear: () => void;
}

let nextId = 1;

/**
 * Dev-only ring buffer of everything the hubs received, for /dev/realtime (discovering the real
 * event names with the backend). Nothing is recorded in release builds.
 */
export const useRealtimeDebug = create<RealtimeDebugStore>()((set) => ({
  events: [],
  record: (event) => {
    if (!__DEV__) return;
    const entry = { ...event, id: nextId++, at: Date.now() };
    set((s) => ({ events: [entry, ...s.events].slice(0, REALTIME_DEBUG_MAX_EVENTS) }));
  },
  clear: () => set({ events: [] }),
}));
