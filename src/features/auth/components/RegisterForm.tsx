import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type TextInput } from 'react-native';

import { Button } from '@/components/ui';
import { makeStyles } from '@/theme';

import { PASSWORD_MIN_LENGTH } from '../constants';
import { useAuthForm } from '../hooks/useAuthForm';
import { registerSchema, type RegisterFormValues } from '../schemas';
import { FormBanner } from './FormBanner';
import { FormInput } from './FormInput';
import { PhoneInput } from './PhoneInput';

export interface RegisterFormProps {
  onSubmit: (values: RegisterFormValues) => void;
  submitting: boolean;
  errorMessage?: string;
  onEdit?: () => void;
}

const DEFAULT_VALUES: RegisterFormValues = {
  name: '',
  surname: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
};
const RESOLVER = zodResolver(registerSchema);
const REVALIDATE = { password: 'confirmPassword' } as const;

export function RegisterForm({ onSubmit, submitting, errorMessage, onEdit }: RegisterFormProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const surnameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const { control, submit } = useAuthForm<RegisterFormValues>({
    resolver: RESOLVER,
    defaultValues: DEFAULT_VALUES,
    onSubmit,
    submitting,
    onEdit,
    revalidate: REVALIDATE,
  });
  const field = { editable: !submitting, control } as const;
  const next = { ...field, returnKeyType: 'next', submitBehavior: 'submit' } as const;
  const password = {
    ...field,
    leftIcon: 'lock-closed-outline',
    secureToggle: {
      showLabel: t('common.a11y.showPassword'),
      hideLabel: t('common.a11y.hidePassword'),
    },
    autoCapitalize: 'none',
    autoComplete: 'new-password',
    textContentType: 'newPassword',
    passwordRules: `minlength: ${PASSWORD_MIN_LENGTH};`,
  } as const;

  return (
    <View style={styles.form}>
      {errorMessage ? <FormBanner message={errorMessage} testID="register-error" /> : null}
      <View style={styles.row}>
        <FormInput
          {...next}
          name="name"
          label={t('auth.register.name')}
          autoComplete="given-name"
          textContentType="givenName"
          containerStyle={styles.half}
          onSubmitEditing={() => surnameRef.current?.focus()}
          testID="register-name"
        />
        <FormInput
          {...next}
          ref={surnameRef}
          name="surname"
          label={t('auth.register.surname')}
          autoComplete="family-name"
          textContentType="familyName"
          containerStyle={styles.half}
          onSubmitEditing={() => phoneRef.current?.focus()}
          testID="register-surname"
        />
      </View>
      <PhoneInput
        {...next}
        ref={phoneRef}
        name="phone"
        label={t('auth.register.phone')}
        placeholder={t('auth.register.phonePlaceholder')}
        onSubmitEditing={() => emailRef.current?.focus()}
        testID="register-phone"
      />
      <FormInput
        {...next}
        ref={emailRef}
        name="email"
        label={t('auth.register.email')}
        placeholder={t('auth.login.emailPlaceholder')}
        leftIcon="mail-outline"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="username"
        onSubmitEditing={() => passwordRef.current?.focus()}
        testID="register-email"
      />
      <FormInput
        {...password}
        {...next}
        ref={passwordRef}
        name="password"
        label={t('auth.register.password')}
        helper={t('auth.register.passwordHint', { count: PASSWORD_MIN_LENGTH })}
        onSubmitEditing={() => confirmRef.current?.focus()}
        testID="register-password"
      />
      <FormInput
        {...password}
        ref={confirmRef}
        name="confirmPassword"
        label={t('auth.register.confirmPassword')}
        returnKeyType="go"
        onSubmitEditing={submit}
        testID="register-confirm"
      />
      <Button
        label={t('auth.register.submit')}
        onPress={submit}
        loading={submitting}
        size="lg"
        fullWidth
        style={styles.submit}
        testID="register-submit"
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  form: { gap: t.spacing.lg },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.md },
  half: { flexGrow: 1, flexBasis: t.sizes.dialogMaxWidth / 3 },
  submit: { marginTop: t.spacing.sm },
}));
