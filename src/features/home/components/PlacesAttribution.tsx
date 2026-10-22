import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import { PLACES_PROVIDER } from '@/constants/places';
import { makeStyles } from '@/theme';

/** Required attribution under search results: Google, or Photon + OpenStreetMap. */
export function PlacesAttribution() {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <Text variant="caption" color="textMuted" align="right" style={styles.text}>
      {PLACES_PROVIDER === 'google' ? t('search.poweredByGoogle') : t('search.poweredByOsm')}
    </Text>
  );
}

const useStyles = makeStyles((t) => ({
  text: { paddingVertical: t.spacing.sm, paddingHorizontal: t.spacing.sm },
}));
