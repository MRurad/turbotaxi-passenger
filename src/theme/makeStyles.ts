import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import type { Theme } from './types';
import { useTheme } from './useTheme';

type NamedStyles<T> = StyleSheet.NamedStyles<T>;

/**
 * Creates a `useStyles()` hook whose styles are rebuilt only when the theme changes.
 *
 * const useStyles = makeStyles((t) => ({ root: { padding: t.spacing.lg } }));
 */
export function makeStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T): () => T {
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}
