import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

export interface FormBannerProps {
  message: string;
  /** danger: server/network error (announced as an alert); info: notices like "session expired". */
  tone?: 'danger' | 'info';
  testID?: string;
}

/** Inline message above a form. */
export function FormBanner({ message, tone = 'danger', testID }: FormBannerProps) {
  const styles = useStyles();
  const { colors, sizes, motion } = useTheme();
  const danger = tone === 'danger';

  return (
    <Animated.View
      testID={testID}
      entering={FadeIn.duration(motion.duration.normal)}
      accessibilityRole={danger ? 'alert' : 'text'}
      accessibilityLiveRegion={danger ? 'assertive' : 'polite'}
      style={[styles.base, danger ? styles.danger : styles.info]}
    >
      <Ionicons
        name={danger ? 'alert-circle' : 'information-circle'}
        size={sizes.icon.md}
        color={danger ? colors.dangerText : colors.primaryText}
        style={styles.icon}
      />
      <Text variant="caption" color={danger ? 'dangerText' : 'primaryText'} style={styles.text}>
        {message}
      </Text>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  // flex-start keeps the icon on the first line of long (e.g. Russian/backend) messages.
  base: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.spacing.sm,
    padding: t.spacing.md,
    borderRadius: t.radii.md,
  },
  danger: { backgroundColor: t.colors.dangerSoft },
  info: { backgroundColor: t.colors.primarySoft },
  icon: { marginTop: t.spacing.xxs / 2 },
  text: { flex: 1, fontFamily: t.typography.bodyStrong.fontFamily },
}));
