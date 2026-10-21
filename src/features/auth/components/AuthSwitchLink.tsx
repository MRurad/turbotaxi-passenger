import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { makeStyles } from '@/theme';

export interface AuthSwitchLinkProps {
  question: string;
  action: string;
  onPress: () => void;
  testID?: string;
}

/** "Don't have an account? Sign up" row under the auth forms. */
export function AuthSwitchLink({ question, action, onPress, testID }: AuthSwitchLinkProps) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text variant="body" color="textSecondary">
        {question}
      </Text>
      <Button
        label={action}
        variant="ghost"
        onPress={onPress}
        style={styles.action}
        testID={testID}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xxs,
  },
  // Same 16 pt text as the question; tighter padding so it reads as an inline link.
  action: { paddingHorizontal: t.spacing.sm },
}));
