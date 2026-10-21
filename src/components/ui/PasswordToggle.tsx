import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

export interface PasswordToggleProps {
  hidden: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
  color: string;
  testID?: string;
}

/** Eye button inside <Input secureToggle>. */
export function PasswordToggle({
  hidden,
  onToggle,
  showLabel,
  hideLabel,
  color,
  testID,
}: PasswordToggleProps) {
  const styles = useStyles();
  const { sizes } = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={sizes.icon.md / 2}
      style={styles.trailing}
      accessibilityRole="button"
      accessibilityLabel={hidden ? showLabel : hideLabel}
      testID={testID}
    >
      <Ionicons
        name={hidden ? 'eye-outline' : 'eye-off-outline'}
        size={sizes.icon.md}
        color={color}
      />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  trailing: {
    minWidth: t.sizes.touchTarget,
    minHeight: t.sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
