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
  /** Dev-only design-system showcase. */
  devUiKit: '/dev/ui-kit',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
