import { config } from '@/constants/config';
import { expireSession, isSessionValid, requireAccessToken } from '@/features/auth/session';
import { requireUserId } from '@/features/auth/store';

import {
  HUBS,
  USER_HUB_EVENTS,
  USER_HUB_METHODS,
  USER_HUB_SCHEMAS,
  type UserHubEventMap,
} from './events';
import { HubConnectionManager } from './HubConnectionManager';

/** The passenger's user hub connection (ride lifecycle + driver location). */
export const userHub = new HubConnectionManager<UserHubEventMap>({
  hub: 'user',
  url: `${config.API_URL}${HUBS.user}`,
  schemas: USER_HUB_SCHEMAS,
  accessTokenFactory: requireAccessToken,
  isSessionValid: () => isSessionValid(),
  onSessionInvalid: () => {
    expireSession().catch(() => undefined);
  },
});

/**
 * Joins the signed-in user's group. userId from the auth store; argument format TODO confirm
 * with the backend (docs/BACKEND_REQUESTS.md #2): the id as a string for now.
 */
export const subscribeUser = (): Promise<unknown> =>
  userHub.invoke(USER_HUB_METHODS.subscribeUser, String(requireUserId()));

export const unsubscribeUser = (): Promise<unknown> =>
  userHub.invoke(USER_HUB_METHODS.unsubscribeUser, String(requireUserId()));

export const subscribeToDriverLocation = (driverId: number): Promise<unknown> =>
  userHub.invoke(USER_HUB_METHODS.subscribeDriverLocation, driverId);

export const unsubscribeFromDriverLocation = (driverId: number): Promise<unknown> =>
  userHub.invoke(USER_HUB_METHODS.unsubscribeDriverLocation, driverId);

export const pingUserHub = (): Promise<unknown> => userHub.invoke(USER_HUB_METHODS.ping);

type UserEvent = keyof typeof USER_HUB_EVENTS;

/**
 * Typed subscription by friendly name, e.g. `onUserHubEvent('rideStatusUpdated', handler)`.
 * Returns the unsubscribe function — return it from your useEffect.
 */
export function onUserHubEvent<K extends UserEvent>(
  event: K,
  handler: (payload: UserHubEventMap[(typeof USER_HUB_EVENTS)[K]]) => void,
): () => void {
  return userHub.on(USER_HUB_EVENTS[event], handler);
}
