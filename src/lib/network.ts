import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

/**
 * Connected to a network = online. Reachability (NetInfo pings Google) is ignored on purpose:
 * networks that block that probe would look offline while our API works. Unknown = online.
 */
const isOnline = (state: NetInfoState) => state.isConnected !== false;

let started = false;

/**
 * TanStack Query follows the device's connectivity: queries pause offline and refetch on
 * reconnect (mutations fail fast: networkMode 'always' in queryClient). Call once.
 */
export function startNetworkTracking(): void {
  if (started) return;
  started = true;
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(isOnline(state))),
  );
}

/** Live online / offline (the same signal TanStack Query uses). */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  );
}
