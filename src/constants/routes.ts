/**
 * Route paths used for navigation. Add each route here when its screen is built,
 * so typed routes and redirects never use inline strings.
 */
export const ROUTES = {
  home: '/',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
