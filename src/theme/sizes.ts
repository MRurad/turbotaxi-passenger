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
} as const;

export type Sizes = typeof sizes;
