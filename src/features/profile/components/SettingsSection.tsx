import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { makeStyles } from '@/theme';

/** A titled group on the settings screen. */
export function SettingsSection({ title, children }: PropsWithChildren<{ title: string }>) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text variant="label" color="textMuted" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  section: { gap: t.spacing.sm },
}));
