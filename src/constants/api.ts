/** Default page size for paged list endpoints (trip history, promos, conversations). */
export const DEFAULT_PAGE_SIZE = 20;

/** Page size for chat history (older messages load on scroll). */
export const CHAT_PAGE_SIZE = 30;

/** First page index used by the backend's paged endpoints. */
export const FIRST_PAGE = 1;

/**
 * Chat `actorRole` for the passenger. The backend writes roles in lower case (captured chat
 * messages carry `senderRole: "driver"`), so the passenger is "user".
 * TODO confirm with backend (docs/BACKEND_REQUESTS.md #7).
 */
export const CHAT_ACTOR_ROLE = 'user';

/**
 * Backend `PromoDiscountType` int enum.
 * TODO confirm with backend (docs/BACKEND_REQUESTS.md #16): assumed 0 = percentage, 1 = fixed amount.
 */
export const PROMO_DISCOUNT_TYPE = {
  Percentage: 0,
  Amount: 1,
} as const;
