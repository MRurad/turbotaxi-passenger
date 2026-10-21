import { useEffect, useState } from 'react';

import { BANNER_MIN_VISIBLE_MS, BANNER_SHOW_DELAY_MS } from '@/constants/timeouts';

import type { HubConnectionManager } from './HubConnectionManager';
import { useHubState } from './useHubState';

/** What a connection banner should show. */
export type HubBannerStatus = 'hidden' | 'reconnecting' | 'lost';

function toBannerStatus(state: ReturnType<typeof useHubState>): HubBannerStatus {
  if (state === 'reconnecting') return 'reconnecting';
  if (state === 'disconnected') return 'lost';
  return 'hidden';
}

/**
 * Hub state for a banner without flicker: a drop must last BANNER_SHOW_DELAY_MS before the
 * banner appears (Wi-Fi ↔ cell handoffs, short backgrounding), and once shown it stays at least
 * BANNER_MIN_VISIBLE_MS.
 */
export function useDebouncedHubStatus<M extends Record<string, unknown>>(
  hub: HubConnectionManager<M>,
): HubBannerStatus {
  const raw = toBannerStatus(useHubState(hub));
  const [shown, setShown] = useState<HubBannerStatus>('hidden');
  const [shownAt, setShownAt] = useState(0);

  useEffect(() => {
    if (raw === shown) return;
    let delay = 0;
    if (shown === 'hidden') delay = BANNER_SHOW_DELAY_MS;
    else if (raw === 'hidden') delay = Math.max(0, shownAt + BANNER_MIN_VISIBLE_MS - Date.now());
    const timer = setTimeout(() => {
      if (shown === 'hidden') setShownAt(Date.now());
      setShown(raw);
    }, delay);
    return () => clearTimeout(timer);
  }, [raw, shown, shownAt]);

  return shown;
}
