/** Longest message the input accepts. */
export const CHAT_MAX_LENGTH = 1000;

/** Prefix of optimistic (not yet confirmed) message ids. */
export const OUTGOING_ID_PREFIX = 'local-';

/** Bubbles never take more of the row than this (keeps the sender side readable). */
export const BUBBLE_MAX_WIDTH = '78%';

/** Start loading older messages this close (as a share of the list height) to the top. */
export const LOAD_MORE_THRESHOLD = 0.3;

/** Loading placeholder bubbles. */
export const SKELETON_BUBBLES = { count: 4, width: '60%' } as const;
