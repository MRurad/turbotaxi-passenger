import Ionicons from '@expo/vector-icons/Ionicons';

import { PressableScale, Text } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

export interface WhereToButtonProps {
  label: string;
  onPress: () => void;
}

/** Big "Where to?" field that opens the search screen. */
export function WhereToButton({ label, onPress }: WhereToButtonProps) {
  const styles = useStyles();
  const { colors, sizes } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      haptic="light"
      // It opens the search screen; "search" would announce a search field.
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.field}
      testID="home-where-to"
    >
      <Ionicons name="search" size={sizes.icon.lg} color={colors.primary} />
      <Text variant="heading" color="textSecondary" numberOfLines={1} style={styles.text}>
        {label}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    minHeight: t.sizes.button.lg,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: t.sizes.border,
    borderColor: t.colors.border,
  },
  text: { flex: 1 },
}));
