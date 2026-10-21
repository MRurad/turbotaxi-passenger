import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, IconButton } from '@/components/ui';
import { useTimeout } from '@/features/dev/hooks/useTimeout';
import { formatMoney } from '@/lib/format';

import { Section } from './Section';

const FAKE_LOADING_MS = 1500;
const SAMPLE_PRICE = 8.4;
const noop = () => undefined;

export function ButtonsSection() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  useTimeout(() => setLoading(false), loading ? FAKE_LOADING_MS : null);

  const orderLabel = t('booking.order', { vehicle: t('booking.vehicle.comfort') });

  return (
    <>
      <Section title={t('dev.uiKit.sections.buttons')}>
        <Button
          label={orderLabel}
          value={formatMoney(SAMPLE_PRICE)}
          fullWidth
          size="lg"
          onPress={() => setLoading(true)}
          loading={loading}
        />
        <Button
          label={t('dev.uiKit.buttons.secondary')}
          leftIcon="add"
          variant="secondary"
          fullWidth
          onPress={noop}
        />
        <Button
          label={t('ride.cancel.action')}
          leftIcon="close-circle-outline"
          variant="danger"
          fullWidth
          onPress={noop}
          haptic="warning"
        />
        <Button label={t('common.actions.skip')} variant="ghost" onPress={noop} />
        <Button label={t('dev.uiKit.buttons.loading')} loading onPress={noop} />
        <Button label={t('dev.uiKit.buttons.disabled')} disabled onPress={noop} />
        <Button label={t('dev.uiKit.buttons.small')} size="sm" onPress={noop} />
      </Section>
      <Section title={t('dev.uiKit.sections.iconButtons')} row>
        <IconButton
          icon="locate"
          variant="surface"
          accessibilityLabel={t('home.myLocation')}
          onPress={noop}
        />
        <IconButton
          icon="call"
          variant="filled"
          accessibilityLabel={t('ride.driver.call')}
          onPress={noop}
        />
        <IconButton
          icon="chatbubble-ellipses"
          accessibilityLabel={t('ride.driver.chat')}
          onPress={noop}
        />
        <IconButton
          icon="close"
          variant="ghost"
          accessibilityLabel={t('common.a11y.close')}
          onPress={noop}
        />
        <IconButton
          icon="call"
          disabled
          accessibilityLabel={t('ride.driver.call')}
          onPress={noop}
        />
      </Section>
    </>
  );
}
