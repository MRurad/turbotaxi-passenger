import { Children, type ReactNode } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { getLanguage, toUpperCaseFor } from '@/i18n';
import {
  MAX_FONT_SCALE,
  UPPERCASE_VARIANTS,
  useTheme,
  type ColorToken,
  type TypographyVariant,
} from '@/theme';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: TextStyle['textAlign'];
}

/** Plain text of string/number children, for a screen-reader label in normal casing. */
function plainText(children: ReactNode): string | undefined {
  const parts = Children.toArray(children);
  return parts.every((c) => typeof c === 'string' || typeof c === 'number')
    ? parts.join('')
    : undefined;
}

export function Text({
  variant = 'body',
  color = 'textPrimary',
  align,
  style,
  maxFontSizeMultiplier = MAX_FONT_SCALE,
  children,
  accessibilityLabel,
  ...rest
}: TextProps) {
  const { typography, colors } = useTheme();
  const uppercase = UPPERCASE_VARIANTS.has(variant);
  const language = getLanguage();
  const content = uppercase
    ? Children.map(children, (c) => (typeof c === 'string' ? toUpperCaseFor(c, language) : c))
    : children;

  return (
    <RNText
      {...rest}
      // VoiceOver may spell all-caps words letter by letter; read the original casing instead.
      accessibilityLabel={accessibilityLabel ?? (uppercase ? plainText(children) : undefined)}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[typography[variant], { color: colors[color], textAlign: align }, style]}
    >
      {content}
    </RNText>
  );
}
