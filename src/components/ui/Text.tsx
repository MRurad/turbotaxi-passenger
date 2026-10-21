import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { MAX_FONT_SCALE, useTheme, type ColorToken, type TypographyVariant } from '@/theme';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: TextStyle['textAlign'];
}

export function Text({
  variant = 'body',
  color = 'textPrimary',
  align,
  style,
  maxFontSizeMultiplier = MAX_FONT_SCALE,
  ...rest
}: TextProps) {
  const { typography, colors } = useTheme();
  return (
    <RNText
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[typography[variant], { color: colors[color], textAlign: align }, style]}
    />
  );
}
