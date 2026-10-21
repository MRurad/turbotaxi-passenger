import { useTranslation } from 'react-i18next';

import { ListItem } from '@/components/ui';
import { formatDate, formatDistance, formatDuration, formatMoney } from '@/lib/format';

import { Section } from './Section';

const SAMPLE = {
  price: 1234.5,
  shortKm: 0.85,
  longKm: 12.37,
  minutes: 85,
  dateUtc: '2026-01-15T12:00:00',
  seats: 4,
  ridesLeft: 3,
};

/** Live preview of formatters and plurals in the current language. */
export function FormatsSection() {
  const { t } = useTranslation();

  return (
    <Section title={t('dev.uiKit.sections.formats')}>
      <ListItem
        icon="cash-outline"
        title={formatMoney(SAMPLE.price)}
        subtitle={t('common.labels.price')}
      />
      <ListItem
        icon="navigate-outline"
        title={`${formatDistance(SAMPLE.shortKm)} · ${formatDistance(SAMPLE.longKm)}`}
        subtitle={t('common.labels.distance')}
      />
      <ListItem
        icon="time-outline"
        title={formatDuration(SAMPLE.minutes)}
        subtitle={t('common.labels.duration')}
      />
      <ListItem
        icon="calendar-outline"
        title={formatDate(SAMPLE.dateUtc)}
        subtitle={t('history.detail.date')}
      />
      <ListItem
        icon="people-outline"
        title={t('booking.seats', { count: SAMPLE.seats })}
        subtitle={t('promo.ridesLeft', { count: SAMPLE.ridesLeft })}
      />
    </Section>
  );
}
