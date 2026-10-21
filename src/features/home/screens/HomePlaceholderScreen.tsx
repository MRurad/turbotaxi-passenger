import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { UI_KIT_COPY } from '@/features/dev/uiKitCopy';
import { makeStyles } from '@/theme';

/** Temporary placeholder until the home map screen is built (Prompt 6). */
export function HomePlaceholderScreen() {
  const styles = useStyles();
  const router = useRouter();

  return (
    <Screen contentStyle={styles.container}>
      <View style={styles.center}>
        {/* TODO(i18n): replaced by translated UI in Prompt 3 */}
        <Text variant="display" color="primary">
          {UI_KIT_COPY.appName}
        </Text>
      </View>
      {__DEV__ ? (
        <Button
          label={UI_KIT_COPY.openUiKit}
          leftIcon="color-palette-outline"
          variant="secondary"
          fullWidth
          onPress={() => router.push(ROUTES.devUiKit)}
          testID="open-ui-kit"
        />
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  container: { paddingBottom: t.spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
}));
