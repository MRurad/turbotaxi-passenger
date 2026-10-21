import { Input } from '@/components/ui';

import { UI_KIT_COPY } from '../uiKitCopy';
import { Section } from './Section';

export function InputsSection() {
  const c = UI_KIT_COPY.inputs;
  return (
    <Section title={UI_KIT_COPY.sections.inputs}>
      <Input
        label={c.email}
        placeholder={c.emailPlaceholder}
        leftIcon="mail-outline"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <Input
        label={c.password}
        leftIcon="lock-closed-outline"
        secureToggle={{ showLabel: c.showPassword, hideLabel: c.hidePassword }}
        autoComplete="password"
      />
      <Input placeholder={c.search} leftIcon="search" accessibilityLabel={c.search} />
      <Input
        label={c.error}
        leftIcon="call-outline"
        defaultValue="+994 50"
        error={c.errorMessage}
        keyboardType="phone-pad"
      />
      <Input label={c.error} leftIcon="call-outline" helper={c.helper} keyboardType="phone-pad" />
    </Section>
  );
}
