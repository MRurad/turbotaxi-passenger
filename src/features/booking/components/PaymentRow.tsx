import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

/** Payment method — cash only for now (no card payments in the backend yet). Not tappable. */
export function PaymentRow() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors, sizes } = useTheme();
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${t('booking.payment.title')}: ${t('booking.payment.cash')}`}
      testID="payment-cash"
    >
      <View style={styles.icon}>
        <Ionicons name="cash-outline" size={sizes.icon.md} color={colors.successText} />
      </View>
      <View style={styles.text}>
        <Text variant="label" color="textMuted">
          {t('booking.payment.title')}
        </Text>
        <Text variant="bodyStrong">{t('booking.payment.cash')}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    minHeight: t.sizes.touchTarget + t.spacing.sm,
    paddingHorizontal: t.spacing.sm,
  },
  icon: {
    width: t.sizes.avatar.md,
    height: t.sizes.avatar.md,
    borderRadius: t.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.successSoft,
  },
  text: { flex: 1, gap: t.spacing.xxs },
}));
