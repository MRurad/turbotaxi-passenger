import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type TextInput } from 'react-native';

import { Button } from '@/components/ui';
import { FormBanner } from '@/features/auth/components/FormBanner';
import { FormInput } from '@/features/auth/components/FormInput';
import { PhoneInput } from '@/features/auth/components/PhoneInput';
import { useAuthForm } from '@/features/auth/hooks/useAuthForm';
import { profileSchema, type ProfileFormValues } from '@/features/auth/schemas';
import { makeStyles } from '@/theme';

export interface ProfileFormProps {
  defaultValues: ProfileFormValues;
  onSubmit: (values: ProfileFormValues) => void;
  submitting: boolean;
  errorMessage?: string;
  onEdit?: () => void;
}

const RESOLVER = zodResolver(profileSchema);

/** Name, surname, phone, email — the same rules as registration. */
export function ProfileForm({
  defaultValues,
  onSubmit,
  submitting,
  errorMessage,
  onEdit,
}: ProfileFormProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const surnameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const { control, submit } = useAuthForm<ProfileFormValues>({
    resolver: RESOLVER,
    defaultValues,
    onSubmit,
    submitting,
    onEdit,
  });
  const field = { editable: !submitting, control } as const;
  const next = { ...field, returnKeyType: 'next', submitBehavior: 'submit' } as const;

  return (
    <View style={styles.form}>
      {errorMessage ? <FormBanner message={errorMessage} /> : null}
      <FormInput
        {...next}
        name="name"
        label={t('profile.name')}
        leftIcon="person-outline"
        autoComplete="given-name"
        textContentType="givenName"
        onSubmitEditing={() => surnameRef.current?.focus()}
        testID="profile-name"
      />
      <FormInput
        {...next}
        ref={surnameRef}
        name="surname"
        label={t('profile.surname')}
        leftIcon="person-outline"
        autoComplete="family-name"
        textContentType="familyName"
        onSubmitEditing={() => phoneRef.current?.focus()}
        testID="profile-surname"
      />
      <PhoneInput
        {...next}
        ref={phoneRef}
        name="phone"
        label={t('profile.phone')}
        leftIcon="call-outline"
        onSubmitEditing={() => emailRef.current?.focus()}
        testID="profile-phone"
      />
      <FormInput
        {...field}
        ref={emailRef}
        name="email"
        label={t('profile.email')}
        leftIcon="mail-outline"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="done"
        onSubmitEditing={submit}
        testID="profile-email"
      />
      <Button
        label={t('common.actions.save')}
        size="lg"
        fullWidth
        loading={submitting}
        onPress={submit}
        testID="profile-save"
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  form: { gap: t.spacing.lg },
}));
