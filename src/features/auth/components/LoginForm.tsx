import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type TextInput } from 'react-native';

import { Button } from '@/components/ui';
import { makeStyles } from '@/theme';

import { useAuthForm } from '../hooks/useAuthForm';
import { loginSchema, type LoginFormValues } from '../schemas';
import { FormBanner } from './FormBanner';
import { FormInput } from './FormInput';

export interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => void;
  submitting: boolean;
  /** Translated server/network error to show above the fields. */
  errorMessage?: string;
  /** Shown when the previous session expired. */
  notice?: string;
  /** Any field edit (clears a stale server error). */
  onEdit?: () => void;
}

const DEFAULT_VALUES: LoginFormValues = { email: '', password: '' };
const RESOLVER = zodResolver(loginSchema);

export function LoginForm({ onSubmit, submitting, errorMessage, notice, onEdit }: LoginFormProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const passwordRef = useRef<TextInput>(null);
  const { control, submit } = useAuthForm<LoginFormValues>({
    resolver: RESOLVER,
    defaultValues: DEFAULT_VALUES,
    onSubmit,
    submitting,
    onEdit,
  });

  return (
    <View style={styles.form}>
      {errorMessage ? <FormBanner message={errorMessage} testID="login-error" /> : null}
      {!errorMessage && notice ? <FormBanner message={notice} tone="info" /> : null}
      <FormInput
        control={control}
        name="email"
        label={t('auth.login.email')}
        placeholder={t('auth.login.emailPlaceholder')}
        leftIcon="mail-outline"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        // "username" (not emailAddress) lets iOS Keychain pair it with the password.
        textContentType="username"
        returnKeyType="next"
        submitBehavior="submit"
        editable={!submitting}
        onSubmitEditing={() => passwordRef.current?.focus()}
        testID="login-email"
      />
      <FormInput
        ref={passwordRef}
        control={control}
        name="password"
        label={t('auth.login.password')}
        leftIcon="lock-closed-outline"
        secureToggle={{
          showLabel: t('common.a11y.showPassword'),
          hideLabel: t('common.a11y.hidePassword'),
        }}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        editable={!submitting}
        onSubmitEditing={submit}
        testID="login-password"
      />
      <Button
        label={t('auth.login.submit')}
        onPress={submit}
        loading={submitting}
        size="lg"
        fullWidth
        style={styles.submit}
        testID="login-submit"
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  form: { gap: t.spacing.lg },
  submit: { marginTop: t.spacing.sm },
}));
