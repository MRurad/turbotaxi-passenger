import { StyleSheet, View } from 'react-native';

import { makeStyles, useTheme, type SpacingToken } from '@/theme';

export interface DividerProps {
  /** Vertical margin around the line. */
  spacing?: SpacingToken;
  /** Left inset (e.g. to align with list text after an icon). */
  inset?: number;
  testID?: string;
}

export function Divider({ spacing = 'md', inset = 0, testID }: DividerProps) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.line, { marginVertical: theme.spacing[spacing], marginLeft: inset }]}
    />
  );
}

const useStyles = makeStyles((t) => ({
  line: { height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border },
}));
