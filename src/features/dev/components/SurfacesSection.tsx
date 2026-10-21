import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Avatar, Badge, Card, Chip, Divider, ListItem, Text } from '@/components/ui';
import { VEHICLE_TYPE, VEHICLE_TYPES, VEHICLES, type VehicleType } from '@/constants/vehicles';
import { formatMoney, formatRelative } from '@/lib/format';
import { makeStyles, useTheme } from '@/theme';

import { Section } from './Section';

const SAMPLE_PRICE = 8.4;
const SAMPLE_TRIP_PRICE = 24;
// Fixed dates keep the demo deterministic (shows "yesterday at …").
const SAMPLE_TRIP_UTC = '2026-01-15T14:40:00Z';
const SAMPLE_NOW = new Date('2026-01-16T09:00:00Z');
const noop = () => undefined;

export function SurfacesSection() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { sizes, spacing } = useTheme();
  const [vehicle, setVehicle] = useState<VehicleType>(VEHICLE_TYPE.Comfort);
  // Align dividers with the text column after the 44pt icon.
  const listInset = sizes.avatar.md + spacing.md + spacing.sm;
  const tripDate = formatRelative(SAMPLE_TRIP_UTC, SAMPLE_NOW);

  return (
    <>
      <Section title={t('dev.uiKit.sections.cards')}>
        <Card animated>
          <View style={styles.cardRow}>
            <View style={styles.flex}>
              <Text variant="heading">{t('booking.vehicle.comfort')}</Text>
              <Text variant="caption" color="textSecondary">
                {t('dev.uiKit.card.subtitle')}
              </Text>
            </View>
            <Text variant="heading" color="primary">
              {formatMoney(SAMPLE_PRICE)}
            </Text>
          </View>
        </Card>
        <Card variant="outlined" onPress={noop} accessibilityLabel={t('dev.uiKit.card.pressable')}>
          <Text variant="bodyStrong">{t('dev.uiKit.card.pressable')}</Text>
        </Card>
        <Card variant="soft">
          <Text variant="bodyStrong" color="primary">
            {t('dev.uiKit.card.soft')}
          </Text>
        </Card>
      </Section>
      <Section title={t('dev.uiKit.sections.list')}>
        <Card padding="xs">
          <ListItem
            icon="home-outline"
            title={t('dev.uiKit.list.home')}
            subtitle={t('dev.uiKit.list.homeAddress')}
            onPress={noop}
          />
          <Divider spacing="xxs" inset={listInset} />
          <ListItem
            icon="briefcase-outline"
            title={t('dev.uiKit.list.work')}
            subtitle={t('dev.uiKit.list.workAddress')}
            onPress={noop}
          />
          <Divider spacing="xxs" inset={listInset} />
          <ListItem
            left={<Avatar name={t('dev.uiKit.avatarName')} size="md" />}
            title={t('dev.uiKit.list.trip')}
            subtitle={tripDate}
            value={formatMoney(SAMPLE_TRIP_PRICE)}
          />
        </Card>
      </Section>
      <Section title={t('dev.uiKit.sections.badges')} row>
        <Badge label={t('dev.uiKit.badges.scheduled')} />
        <Badge label={t('ride.status.driver_assigned')} tone="primary" icon="car" />
        <Badge label={t('ride.status.completed')} tone="success" icon="checkmark" />
        <Badge label={t('dev.uiKit.badges.waiting')} tone="warning" />
        <Badge label={t('ride.status.cancelled')} tone="danger" />
      </Section>
      <Section title={t('dev.uiKit.sections.chips')} row>
        {VEHICLE_TYPES.map((type) => (
          <Chip
            key={type}
            icon={VEHICLES[type].icon}
            label={t(VEHICLES[type].labelKey)}
            selected={vehicle === type}
            onPress={() => setVehicle(type)}
          />
        ))}
        <Chip label={t('dev.uiKit.buttons.disabled')} disabled onPress={noop} />
      </Section>
      <Section title={t('dev.uiKit.sections.avatars')} row>
        <Avatar name={t('dev.uiKit.avatarName')} size="sm" />
        <Avatar name={t('dev.uiKit.avatarName')} size="md" />
        <Avatar name={t('dev.uiKit.avatarName')} size="lg" />
      </Section>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  flex: { flex: 1, gap: t.spacing.xxs },
}));
