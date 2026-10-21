/** Animation constants shared by all components. */
export const motion = {
  pressScale: 0.97,
  pressSpring: { damping: 18, stiffness: 320, mass: 0.6 },
  duration: { fast: 150, normal: 250, slow: 400 },
  shimmerDuration: 1200,
  disabledOpacity: 0.5,
  pressedOpacity: 0.85,
} as const;

export type Motion = typeof motion;
