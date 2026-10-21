import { useSyncExternalStore } from 'react';

import type { HubConnectionManager, HubState } from './HubConnectionManager';

/** Current connection state of a hub, re-rendering on change (for banners / dev screen). */
export function useHubState<M extends Record<string, unknown>>(
  hub: HubConnectionManager<M>,
): HubState {
  return useSyncExternalStore(
    (listener) => hub.subscribe(listener),
    () => hub.getState(),
  );
}
