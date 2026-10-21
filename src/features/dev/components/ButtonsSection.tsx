import { useState } from 'react';

import { Button, IconButton } from '@/components/ui';
import { useTimeout } from '@/features/dev/hooks/useTimeout';

import { UI_KIT_COPY } from '../uiKitCopy';
import { Section } from './Section';

const FAKE_LOADING_MS = 1500;
const noop = () => undefined;

export function ButtonsSection() {
  const [loading, setLoading] = useState(false);
  const c = UI_KIT_COPY.buttons;
  const i = UI_KIT_COPY.iconButtons;

  useTimeout(() => setLoading(false), loading ? FAKE_LOADING_MS : null);

  return (
    <>
      <Section title={UI_KIT_COPY.sections.buttons}>
        <Button
          label={c.primary}
          rightIcon="arrow-forward"
          fullWidth
          size="lg"
          onPress={() => setLoading(true)}
          loading={loading}
        />
        <Button label={c.secondary} leftIcon="add" variant="secondary" fullWidth onPress={noop} />
        <Button
          label={c.danger}
          leftIcon="close-circle-outline"
          variant="danger"
          fullWidth
          onPress={noop}
          haptic="warning"
        />
        <Button label={c.ghost} variant="ghost" onPress={noop} />
        <Button label={c.loading} loading onPress={noop} />
        <Button label={c.disabled} disabled onPress={noop} />
        <Button label={c.small} size="sm" variant="secondary" onPress={noop} />
      </Section>
      <Section title={UI_KIT_COPY.sections.iconButtons} row>
        <IconButton icon="locate" variant="surface" accessibilityLabel={i.locate} onPress={noop} />
        <IconButton icon="call" variant="filled" accessibilityLabel={i.call} onPress={noop} />
        <IconButton icon="chatbubble-ellipses" accessibilityLabel={i.chat} onPress={noop} />
        <IconButton icon="close" variant="ghost" accessibilityLabel={i.close} onPress={noop} />
        <IconButton
          icon="navigate"
          variant="filled"
          size="lg"
          accessibilityLabel={i.locate}
          onPress={noop}
        />
        <IconButton icon="call" disabled accessibilityLabel={i.call} onPress={noop} />
      </Section>
    </>
  );
}
