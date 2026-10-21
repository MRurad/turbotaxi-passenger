import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { makeStyles } from '@/theme';

import type { VehicleEstimate } from '../hooks/useRouteEstimates';
import { useBookingDraft } from '../store';
import { VehicleRow } from './VehicleRow';

export interface VehicleListProps {
  estimates: VehicleEstimate[];
}

/** Single-select list of vehicle classes with their estimates. */
export function VehicleList({ estimates }: VehicleListProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const vehicleType = useBookingDraft((s) => s.vehicleType);
  const selectVehicle = useBookingDraft((s) => s.selectVehicle);
  const autoSelectVehicle = useBookingDraft((s) => s.autoSelectVehicle);

  // The default class has no price (error) but another does: switch, unless the user chose.
  const selected = estimates.find((e) => e.vehicleType === vehicleType);
  const firstPriced = estimates.find((e) => e.estimate && !e.error);
  const selectedFailed = Boolean(selected?.error) && !selected?.isFetching;
  useEffect(() => {
    if (selectedFailed && firstPriced) autoSelectVehicle(firstPriced.vehicleType);
  }, [selectedFailed, firstPriced, autoSelectVehicle]);

  return (
    <Animated.View
      layout={LinearTransition}
      style={styles.list}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('booking.title')}
    >
      {estimates.map((item) => (
        <VehicleRow
          key={item.vehicleType}
          item={item}
          selected={item.vehicleType === vehicleType}
          onSelect={() => selectVehicle(item.vehicleType)}
        />
      ))}
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: t.spacing.xs },
}));
