/**
 * Route paths used for navigation. Add each route here when its screen is built,
 * so typed routes and redirects never use inline strings.
 */
export const ROUTES = {
  home: '/',
  welcome: '/welcome',
  login: '/login',
  register: '/register',
  search: '/search',
  /** Active ride (searching → in progress), cancelled and no-driver states. */
  ride: '/ride',
  rideSummary: '/ride/summary',
  /** In-ride chat; push with `{ pathname: ROUTES.chat, params: { rideId } }`. */
  chat: '/chat/[rideId]',
  /** Account (reachable from the avatar, also during a ride). */
  profile: '/profile',
  profileEdit: '/profile/edit',
  history: '/history',
  /** Push with `{ pathname: ROUTES.tripDetail, params: { rideId } }`. */
  tripDetail: '/history/[rideId]',
  promos: '/promos',
  settings: '/settings',
  /** Dev-only design-system showcase. */
  devUiKit: '/dev/ui-kit',
  /** Dev-only SignalR inspector. */
  devRealtime: '/dev/realtime',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/** expo-router segments of the routes above (route guards compare against these). */
export const ROUTE_SEGMENTS = {
  signedIn: '(app)',
  ride: 'ride',
  rideSummary: 'summary',
  chat: 'chat',
  profile: 'profile',
  history: 'history',
  promos: 'promos',
  settings: 'settings',
} as const;
