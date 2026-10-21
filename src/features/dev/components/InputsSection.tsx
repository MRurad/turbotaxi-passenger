import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui';

import { Section } from './Section';

export function InputsSection() {
  const { t } = useTranslation();
  const secureToggle = {
    showLabel: t('common.a11y.showPassword'),
    hideLabel: t('common.a11y.hidePassword'),
  };

  return (
    <Section title={t('dev.uiKit.sections.inputs')}>
      <Input
        label={t('auth.login.email')}
        placeholder={t('auth.login.emailPlaceholder')}
        leftIcon="mail-outline"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <Input
        label={t('auth.login.password')}
        leftIcon="lock-closed-outline"
        secureToggle={secureToggle}
        autoComplete="password"
      />
      <Input
        placeholder={t('home.whereTo')}
        leftIcon="search"
        accessibilityLabel={t('home.whereTo')}
      />
      <Input
        label={t('auth.register.phone')}
        placeholder={t('auth.register.phonePlaceholder')}
        leftIcon="call-outline"
        error={t('errors.validation.phone')}
        keyboardType="phone-pad"
      />
      <Input
        label={t('auth.register.phone')}
        placeholder={t('auth.register.phonePlaceholder')}
        leftIcon="call-outline"
        helper={t('dev.uiKit.phoneHelper')}
        keyboardType="phone-pad"
      />
    </Section>
  );
}
