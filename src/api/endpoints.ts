/**
 * Every passenger REST endpoint. Paths match Swagger exactly (case included).
 * Driver, debug and admin endpoints are intentionally absent — this app must not call them.
 */
export const ENDPOINTS = {
  auth: {
    login: '/api/Auth/login',
    register: '/api/Auth/register',
    // TODO(refresh): '/api/Auth/refresh' once it exists (docs/BACKEND_REQUESTS.md #11).
  },
  rides: {
    create: '/api/Rides',
    cancelByUser: (rideId: number) => `/api/Rides/${rideId}/cancel-by-user`,
  },
  routes: {
    estimate: '/api/Routes/estimate',
  },
  chat: {
    messages: (rideId: number) => `/api/Chat/rides/${rideId}/messages`,
    conversations: '/api/Chat/conversations',
  },
  tripHistory: {
    user: (userId: number) => `/api/TripHistory/user/${userId}`,
  },
  promo: {
    user: (userId: number) => `/api/PromoCodes/user/${userId}`,
    apply: '/api/PromoCodes/apply',
  },
  users: {
    byId: (id: number) => `/api/Users/${id}`,
    update: '/api/Users',
  },
} as const;
