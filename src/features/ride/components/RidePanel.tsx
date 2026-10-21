import Animated, { FadeIn } from 'react-native-reanimated';

import { BottomPanel } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

import { useRideStore } from '../store';
import { CancelledContent } from './CancelledContent';
import { DriverContent } from './DriverContent';
import { InProgressContent } from './InProgressContent';
import { NoDriverContent } from './NoDriverContent';
import { SearchingContent } from './SearchingContent';

export interface RidePanelProps {
  onHeightChange: (height: number) => void;
}

/**
 * The ride screen's sheet: one content per phase (completed has its own summary screen).
 * Scrollable, so nothing is cut off on small phones with long (ru/az) text or large type.
 */
export function RidePanel({ onHeightChange }: RidePanelProps) {
  const styles = useStyles();
  const { motion } = useTheme();
  const phase = useRideStore((s) => s.phase);

  return (
    <BottomPanel onHeightChange={onHeightChange} scrollable testID="ride-sheet">
      <Animated.View
        key={phase}
        entering={FadeIn.duration(motion.duration.normal)}
        style={styles.content}
      >
        {phase === 'searching' ? <SearchingContent /> : null}
        {phase === 'driver_assigned' || phase === 'driver_arrived' ? <DriverContent /> : null}
        {phase === 'in_progress' ? <InProgressContent /> : null}
        {phase === 'no_driver' ? <NoDriverContent /> : null}
        {phase === 'cancelled' ? <CancelledContent /> : null}
      </Animated.View>
    </BottomPanel>
  );
}

const useStyles = makeStyles((t) => ({
  content: { gap: t.spacing.lg },
}));
