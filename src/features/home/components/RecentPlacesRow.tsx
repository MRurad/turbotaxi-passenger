import { useTranslation } from 'react-i18next';
import { ScrollView, View, useWindowDimensions } from 'react-native';

import { Chip, Text } from '@/components/ui';
import { makeStyles } from '@/theme';
import type { Place } from '@/types/place';

/** How many recent places fit as chips on the home sheet (search shows all). */
const HOME_RECENTS_COUNT = 5;
/** Long (e.g. Russian) addresses truncate instead of making one chip wider than the screen. */
const CHIP_MAX_WIDTH_RATIO = 0.6;

export interface RecentPlacesRowProps {
  places: Place[];
  onSelect: (place: Place) => void;
}

/** Horizontal chips of recent destinations; tap to set the destination. */
export function RecentPlacesRow({ places, onSelect }: RecentPlacesRowProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const chipStyle = { maxWidth: width * CHIP_MAX_WIDTH_RATIO };

  return (
    <View style={styles.wrap}>
      <Text variant="label" color="textMuted">
        {t('home.recentPlaces')}
      </Text>
      {places.length === 0 ? (
        <Text variant="caption" color="textMuted">
          {t('home.noRecent')}
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {places.slice(0, HOME_RECENTS_COUNT).map((place) => (
            <Chip
              key={place.placeId ?? `${place.location.latitude},${place.location.longitude}`}
              icon="time-outline"
              label={place.title || t('home.pickupUnknown')}
              accessibilityLabel={[place.title, place.subtitle].filter(Boolean).join(', ')}
              onPress={() => onSelect(place)}
              style={chipStyle}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { gap: t.spacing.sm },
  chips: { gap: t.spacing.sm, paddingRight: t.spacing.lg },
}));
