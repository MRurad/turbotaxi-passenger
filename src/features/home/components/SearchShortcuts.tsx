import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { Divider, ListItem, Text } from '@/components/ui';
import { makeStyles } from '@/theme';
import type { Place } from '@/types/place';

export interface SearchShortcutsProps {
  recents: Place[];
  onChooseOnMap: () => void;
  onSelectRecent: (place: Place) => void;
}

/** Shown before the user has typed enough: "Choose on map" and recent places. */
export function SearchShortcuts({ recents, onChooseOnMap, onSelectRecent }: SearchShortcutsProps) {
  const styles = useStyles();
  const { t } = useTranslation();

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <ListItem
        icon="map-outline"
        title={t('search.chooseOnMap')}
        onPress={onChooseOnMap}
        testID="search-choose-on-map"
      />
      <Divider spacing="sm" />
      <Text variant="label" color="textMuted" style={styles.heading}>
        {t('search.recent')}
      </Text>
      {recents.length === 0 ? (
        <Text variant="caption" color="textMuted" style={styles.heading}>
          {t('home.noRecent')}
        </Text>
      ) : (
        recents.map((place) => (
          <ListItem
            key={place.placeId ?? `${place.location.latitude},${place.location.longitude}`}
            icon="time-outline"
            title={place.title || t('home.pickupUnknown')}
            subtitle={place.subtitle || undefined}
            showChevron={false}
            onPress={() => onSelectRecent(place)}
          />
        ))
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  content: { paddingBottom: t.spacing.xxl },
  heading: { paddingHorizontal: t.spacing.sm, paddingVertical: t.spacing.xs },
}));
