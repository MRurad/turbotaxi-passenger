import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import type { TextStyle } from 'react-native';

/** Passed to `useFonts` in the root layout. Keys become the fontFamily names. */
export const INTER_FONTS = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
};

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

type TypographyStyle = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'textTransform'
>;

export const typography = {
  display: { fontFamily: fontFamily.bold, fontSize: 32, lineHeight: 40, letterSpacing: -0.5 },
  title: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 32, letterSpacing: -0.3 },
  heading: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TypographyStyle>;

export type Typography = typeof typography;
export type TypographyVariant = keyof Typography;

/** Caps Dynamic Type scaling so layouts don't break at accessibility sizes. */
export const MAX_FONT_SCALE = 1.4;
