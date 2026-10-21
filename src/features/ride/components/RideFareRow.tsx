import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { VEHICLES } from '@/constants/vehicles';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { formatMoney } from '@/lib/format';
import { makeStyles, useTheme } from '@/theme';

import { useRideStore } from '../store';

/** "🚗 Comfort ……… 8,40 ₼": the ordered class and its price. */
export function RideFareRow() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { language } = useChangeLanguage();
  const { colors, sizes } = useTheme();
  const vehicleType = useRideStore((s) => s.vehicleType);
  const fare = useRideStore((s) => s.fare);
  const vehicle = VEHICLES[vehicleType];
  const label = t(vehicle.labelKey);
  const price = fare ? formatMoney(fare.final ?? fare.estimated, language) : null;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={[label, price].filter(Boolean).join(', ')}
    >
      <Ionicons name={vehicle.icon} size={sizes.icon.lg} color={colors.primary} />
      <Text variant="bodyStrong" style={styles.label}>
        {label}
      </Text>
      {price ? <Text variant="bodyStrong">{price}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  label: { flex: 1 },
}));
