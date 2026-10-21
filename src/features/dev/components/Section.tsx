import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { makeStyles } from '@/theme';

interface SectionProps {
  title: string;
  /** Lay children out in a wrapping row. */
  row?: boolean;
}

export function Section({ title, row = false, children }: PropsWithChildren<SectionProps>) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text variant="label" color="textMuted">
        {title}
      </Text>
      <View style={row ? styles.row : styles.column}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  section: { gap: t.spacing.md, paddingVertical: t.spacing.lg },
  column: { gap: t.spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.spacing.sm },
}));
