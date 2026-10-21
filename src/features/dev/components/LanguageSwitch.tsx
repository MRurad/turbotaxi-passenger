import { View } from 'react-native';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { makeStyles } from '@/theme';

export function LanguageSwitch() {
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      <LanguageSwitcher />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { paddingVertical: t.spacing.xs },
}));
