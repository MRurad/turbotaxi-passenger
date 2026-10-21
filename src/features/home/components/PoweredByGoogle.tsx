import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import { makeStyles } from '@/theme';

/** Required attribution when showing Places results outside a Google map. */
export function PoweredByGoogle() {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <Text variant="caption" color="textMuted" align="right" style={styles.text}>
      {t('search.poweredByGoogle')}
    </Text>
  );
}

const useStyles = makeStyles((t) => ({
  text: { paddingVertical: t.spacing.sm, paddingHorizontal: t.spacing.sm },
}));
