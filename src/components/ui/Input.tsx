import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, useState } from 'react';
import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { MAX_FONT_SCALE, makeStyles, useTheme } from '@/theme';

import { PasswordToggle } from './PasswordToggle';
import { Text } from './Text';
import type { IconName } from './types';

type FocusEvent = Parameters<NonNullable<TextInputProps['onFocus']>>[0];
type BlurEvent = Parameters<NonNullable<TextInputProps['onBlur']>>[0];

export interface InputProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  /** Fixed text before the value, e.g. "+994" (not part of the value). */
  prefix?: string;
  /** Enables password masking with a show/hide toggle. Labels are required for a11y. */
  secureToggle?: { showLabel: string; hideLabel: string };
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    helper,
    leftIcon,
    rightIcon,
    prefix,
    secureToggle,
    containerStyle,
    testID,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const styles = useStyles();
  const { colors, sizes, isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const iconColor = error ? colors.danger : focused ? colors.primary : colors.textMuted;

  const handleFocus = (e: FocusEvent) => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur = (e: BlurEvent) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text variant="caption" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View style={[styles.field, focused && styles.focused, error ? styles.errored : null]}>
        {leftIcon ? <Ionicons name={leftIcon} size={sizes.icon.md} color={iconColor} /> : null}
        {prefix ? (
          <Text variant="body" color="textSecondary" importantForAccessibility="no">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          testID={testID}
          {...rest}
          accessibilityLabel={rest.accessibilityLabel ?? [label, prefix].filter(Boolean).join(', ')}
          accessibilityHint={error || rest.accessibilityHint}
          secureTextEntry={secureToggle ? hidden : false}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={styles.input}
        />
        {secureToggle ? (
          <PasswordToggle
            hidden={hidden}
            onToggle={() => setHidden((h) => !h)}
            showLabel={secureToggle.showLabel}
            hideLabel={secureToggle.hideLabel}
            color={iconColor}
            testID={testID && `${testID}-toggle`}
          />
        ) : rightIcon ? (
          <Ionicons name={rightIcon} size={sizes.icon.md} color={iconColor} />
        ) : null}
      </View>
      {error || helper ? (
        <Text variant="caption" color={error ? 'dangerText' : 'textMuted'} style={styles.message}>
          {error || helper}
        </Text>
      ) : null}
    </View>
  );
});

const useStyles = makeStyles((t) => ({
  container: { gap: t.spacing.xs },
  label: { fontFamily: t.typography.bodyStrong.fontFamily, marginLeft: t.spacing.xxs },
  field: {
    minHeight: t.sizes.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radii.lg,
    borderWidth: t.sizes.focusBorder,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  focused: { borderColor: t.colors.primary, backgroundColor: t.colors.surfaceElevated },
  errored: { borderColor: t.colors.danger },
  input: {
    flex: 1,
    // No lineHeight: on iOS it offsets single-line TextInput text and caret.
    fontFamily: t.typography.body.fontFamily,
    fontSize: t.typography.body.fontSize,
    color: t.colors.textPrimary,
    paddingVertical: t.spacing.md,
  },
  message: { marginLeft: t.spacing.xxs },
}));
