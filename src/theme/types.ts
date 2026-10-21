import type { ColorTokens } from './colors';
import type { Motion } from './motion';
import type { Radii } from './radii';
import type { Shadows } from './shadows';
import type { Sizes } from './sizes';
import type { Spacing } from './spacing';
import type { Typography } from './typography';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value);
}

export interface Theme {
  scheme: ColorScheme;
  isDark: boolean;
  colors: ColorTokens;
  spacing: Spacing;
  radii: Radii;
  sizes: Sizes;
  typography: Typography;
  shadows: Shadows;
  motion: Motion;
}
