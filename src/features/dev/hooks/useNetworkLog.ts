import { useSyncExternalStore } from 'react';

import { networkLog, type NetworkLogEntry } from '@/api/devNetworkLog';

/** Live list of logged requests (newest first) and a way to clear it. */
export function useNetworkLog(): { entries: readonly NetworkLogEntry[]; clear: () => void } {
  const entries = useSyncExternalStore(networkLog.subscribe, networkLog.getEntries);
  return { entries, clear: networkLog.clear };
}
