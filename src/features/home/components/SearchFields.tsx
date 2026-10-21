import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card, Divider, Input } from '@/components/ui';
import { makeStyles } from '@/theme';

export type SearchField = 'pickup' | 'destination';

export interface SearchFieldsProps {
  pickupQuery: string;
  destinationQuery: string;
  /** Current pickup address, shown as the pickup placeholder. */
  pickupPlaceholder?: string;
  /** Which input gets the keyboard when the screen opens. */
  initialField: SearchField;
  onChange: (field: SearchField, text: string) => void;
  onFocus: (field: SearchField) => void;
}

/** Pickup + destination inputs; the focused one drives the suggestion list. */
export function SearchFields({
  pickupQuery,
  destinationQuery,
  pickupPlaceholder,
  initialField,
  onChange,
  onFocus,
}: SearchFieldsProps) {
  const styles = useStyles();
  const { t } = useTranslation();

  return (
    <Card variant="outlined" padding="sm" style={styles.card}>
      <Input
        value={pickupQuery}
        onChangeText={(text) => onChange('pickup', text)}
        onFocus={() => onFocus('pickup')}
        placeholder={pickupPlaceholder || t('search.pickupPlaceholder')}
        accessibilityLabel={t('common.labels.pickup')}
        leftIcon="radio-button-on"
        returnKeyType="search"
        autoCorrect={false}
        autoFocus={initialField === 'pickup'}
        containerStyle={styles.input}
        testID="search-pickup"
      />
      <View style={styles.divider}>
        <Divider spacing="xxs" />
      </View>
      <Input
        value={destinationQuery}
        onChangeText={(text) => onChange('destination', text)}
        onFocus={() => onFocus('destination')}
        placeholder={t('search.destinationPlaceholder')}
        accessibilityLabel={t('common.labels.destination')}
        leftIcon="flag-outline"
        returnKeyType="search"
        autoCorrect={false}
        autoFocus={initialField === 'destination'}
        containerStyle={styles.input}
        testID="search-destination"
      />
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.xs },
  input: { gap: 0 },
  divider: { paddingHorizontal: t.spacing.lg },
}));
