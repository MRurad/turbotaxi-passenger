import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/features/auth/store';

import { useRideStore } from '../store';
import { rideRedirect } from '../utils';

/**
 * The only place that navigates between ride phases (screens never push between them):
 * active / cancelled / no-driver → /ride, completed → /ride/summary, idle → home.
 */
export function useRideRouteGuard(): void {
  const router = useRouter();
  const segments = useSegments();
  const phase = useRideStore((s) => s.phase);
  const signedIn = useAuthStore((s) => s.status === 'authenticated');
  // Signed out: the auth guard takes the user to login; a second redirect would race it.
  const target = signedIn ? rideRedirect(phase, segments) : null;

  useEffect(() => {
    if (!target) return;
    // Pushed screens (profile → history → trip…) would otherwise stay under the new one,
    // leaving two ride screens and a back gesture into stale pages.
    if (router.canDismiss()) router.dismissAll();
    router.replace(target);
  }, [target, router]);
}
