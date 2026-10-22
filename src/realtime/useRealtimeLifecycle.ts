import { onlineManager } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { PING_INTERVAL_MS, REALTIME_BACKGROUND_STOP_MS } from '@/constants/timeouts';
import { useAuthStore } from '@/features/auth/store';
import { logger } from '@/lib/logger';

import { chatHub } from './chatHub';
import { pingUserHub, subscribeUser, userHub } from './userHub';

export interface RealtimeLifecycleOptions {
  /** True while a ride is active: the connection is then kept in the background. */
  keepAliveInBackground?: () => boolean;
}

const noActiveRide = () => false;
const HUBS_TO_MANAGE = [userHub, chatHub] as const;

/**
 * Mounted once in the signed-in layout. Starts the user hub (SubscribeUser on every
 * connect/reconnect), pings every 30 s, stops in the background after 30 s when no ride is
 * active, restores the hubs that were wanted on foreground or when the network returns, and
 * resets all hubs on logout.
 */
export function useRealtimeLifecycle({
  keepAliveInBackground = noActiveRide,
}: RealtimeLifecycleOptions = {}): void {
  const userId = useAuthStore((s) => s.user?.id);
  const keepAlive = useRef(keepAliveInBackground);

  useEffect(() => {
    keepAlive.current = keepAliveInBackground;
  }, [keepAliveInBackground]);

  // Connect + group subscription for the signed-in user.
  useEffect(() => {
    if (userId === undefined) return;
    const removeSubscribe = userHub.addOnConnect(subscribeUser);
    userHub.start().catch(() => undefined);
    return () => {
      removeSubscribe();
      // Logout / user switch: stop every hub and drop all on-connect actions (old user's).
      HUBS_TO_MANAGE.forEach((hub) => hub.reset().catch(() => undefined));
    };
  }, [userId]);

  // Keep-alive ping while connected.
  useEffect(() => {
    if (userId === undefined) return;
    const timer = setInterval(() => {
      if (userHub.getState() !== 'connected') return;
      pingUserHub().catch((error: unknown) =>
        logger.warn('realtime: ping failed', {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }, PING_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [userId]);

  // Network back: SignalR may have given up while offline; start what is still wanted.
  useEffect(() => {
    if (userId === undefined) return;
    return onlineManager.subscribe((online) => {
      if (!online || AppState.currentState !== 'active') return;
      HUBS_TO_MANAGE.filter((hub) => hub.wasWanted()).forEach((hub) =>
        hub.start().catch(() => undefined),
      );
    });
  }, [userId]);

  // Background / foreground.
  useEffect(() => {
    if (userId === undefined) return;
    let stopTimer: ReturnType<typeof setTimeout> | null = null;
    // Hubs stopped by the background timer, to restore on foreground.
    let parked: (typeof HUBS_TO_MANAGE)[number][] = [];

    const cancelStop = () => {
      if (stopTimer) clearTimeout(stopTimer);
      stopTimer = null;
    };
    const scheduleStop = () => {
      cancelStop();
      stopTimer = setTimeout(() => {
        stopTimer = null;
        // Re-check at fire time: iOS often runs this late, right as the app becomes active,
        // and a ride may have started since we went to the background.
        if (AppState.currentState === 'active' || keepAlive.current()) return;
        parked = HUBS_TO_MANAGE.filter((hub) => hub.wasWanted());
        parked.forEach((hub) => hub.stop().catch(() => undefined));
      }, REALTIME_BACKGROUND_STOP_MS);
    };

    // Mounted while in the background (cold start from a notification).
    if (AppState.currentState === 'background') scheduleStop();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        cancelStop();
        const toRestore = parked.length > 0 ? parked : [userHub];
        parked = [];
        toRestore.forEach((hub) => hub.start().catch(() => undefined));
        return;
      }
      // 'inactive' (control center, incoming call) is too brief to bother.
      if (state === 'background' && !keepAlive.current()) scheduleStop();
    });
    return () => {
      cancelStop();
      sub.remove();
    };
  }, [userId]);
}
