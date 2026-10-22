import { useShallow } from 'zustand/react/shallow';

import { CLOCK_TICK_MS } from '@/constants/timeouts';
import { useNow } from '@/lib/hooks/useNow';

import { useRideStore } from '../store';
import { remainingEtaMinutes } from '../utils';

/** Minutes left on the current leg, counting down between hub updates (null = unknown). */
export function useLiveEta(): number | null {
  const now = useNow(CLOCK_TICK_MS);
  const { etaMinutes, etaAt } = useRideStore(
    useShallow((s) => ({ etaMinutes: s.etaMinutes, etaAt: s.etaAt })),
  );
  return remainingEtaMinutes(etaMinutes, etaAt, now);
}
