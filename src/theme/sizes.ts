/** Fixed component dimensions (touch targets, icons, avatars). */
export const sizes = {
  /** Minimum touch target (Apple HIG). */
  touchTarget: 44,
  border: 1,
  focusBorder: 1.5,
  icon: { xs: 12, sm: 16, md: 20, lg: 24, xl: 32 },
  avatar: { sm: 32, md: 44, lg: 64 },
  button: { sm: 44, md: 50, lg: 56 },
  input: 52,
  emptyIcon: 72,
  dialogMaxWidth: 360,
  /** Welcome hero: car mark tile, its icon, and the decorative rings. */
  hero: { mark: 96, icon: 56, ringLarge: 320, ringSmall: 180, ringStroke: 24 },
  chipHeight: 36,
  /** Extends 36pt chips to the 44pt touch target. */
  chipHitSlop: 4,
  sheetHandle: 40,
  zIndexToast: 1000,
  /** Map pins (center pin, place markers). */
  pin: { head: 36, stem: 14, stemWidth: 3, lift: 14, shadow: 18 },
  /**
   * Time bubble marker box. Kept within ~180×55 pt: Apple Maps (react-native-maps, new
   * architecture) places larger custom markers off their point. gap = pointer tip to the dot.
   */
  timeBubble: { width: 168, height: 40, gap: 4 },
  /** Skeleton placeholder widths. */
  skeleton: { price: 56 },
  /** Route polyline stroke widths. */
  route: { line: 5, outline: 9 },
  /** Floating map controls (top bar, my-location button). */
  mapControl: 48,
  /** Driver car on the map, seen from above (rotates with the direction of travel). */
  car: {
    /** On-map size (the vector car is drawn in a 40 × 80 box, nose up). */
    width: 24,
    height: 48,
    /** Above the pickup / destination pins (the car ends up on the pickup). */
    zIndex: 10,
  },
  /** Chat: widest a bubble gets, tallest the input grows, and the bubble's squared "tail" corner. */
  chatBubbleMaxWidth: 280,
  chatInputMaxHeight: 120,
  chatTailRadius: 4,
  /** Searching: pulse ring diameter around the pickup. */
  searchPulse: 160,
  /** Driver card: plate number badge border. */
  plateBorder: 2,
} as const;

export type Sizes = typeof sizes;
