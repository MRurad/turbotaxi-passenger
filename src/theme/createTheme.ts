import { darkColors, lightColors } from './colors';
import { motion } from './motion';
import { radii } from './radii';
import { getShadows } from './shadows';
import { sizes } from './sizes';
import { spacing } from './spacing';
import type { ColorScheme, Theme } from './types';
import { typography } from './typography';

function createTheme(scheme: ColorScheme): Theme {
  const isDark = scheme === 'dark';
  return {
    scheme,
    isDark,
    colors: isDark ? darkColors : lightColors,
    spacing,
    radii,
    sizes,
    typography,
    shadows: getShadows(isDark),
    motion,
  };
}

/** Prebuilt so theme identity is stable (makeStyles memoizes on it). */
export const themes: Readonly<Record<ColorScheme, Theme>> = {
  light: createTheme('light'),
  dark: createTheme('dark'),
};
