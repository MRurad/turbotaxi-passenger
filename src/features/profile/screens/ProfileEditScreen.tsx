import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Header, Screen, useToast } from '@/components/ui';
import { useAuthStore } from '@/features/auth/store';
import type { ProfileFormValues } from '@/features/auth/schemas';
import { authErrorMessage } from '@/features/auth/utils/errors';
import {
  formatPhoneMask,
  isValidAzMobile,
  toE164,
  toNationalDigits,
} from '@/features/auth/utils/phone';

import { ProfileForm } from '../components/ProfileForm';
import { useUpdateProfile } from '../hooks/useUpdateProfile';

/** Edit name, surname, phone and email (PUT /api/Users); success updates the signed-in user. */
export function ProfileEditScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const update = useUpdateProfile();

  const defaultValues = useMemo<ProfileFormValues>(
    () => ({
      name: user?.name ?? '',
      surname: user?.surname ?? '',
      // A stored number that isn't an AZ mobile stays empty (validation asks for one) rather
      // than being cut to 9 digits and saved back wrong.
      phone:
        user?.phoneNumber && isValidAzMobile(toNationalDigits(user.phoneNumber))
          ? formatPhoneMask(toNationalDigits(user.phoneNumber))
          : '',
      email: user?.email ?? '',
    }),
    [user],
  );

  const submit = (values: ProfileFormValues) =>
    update.mutate(
      {
        name: values.name,
        surname: values.surname,
        phoneNumber: toE164(values.phone),
        email: values.email,
      },
      {
        onSuccess: () => {
          toast.show({ message: t('profile.saved'), tone: 'success' });
          router.back();
        },
      },
    );

  return (
    <Screen
      scroll
      keyboardAvoiding
      header={
        <Header
          title={t('profile.edit')}
          onBack={() => router.back()}
          backLabel={t('common.a11y.back')}
        />
      }
      testID="profile-edit-screen"
    >
      <ProfileForm
        defaultValues={defaultValues}
        onSubmit={submit}
        submitting={update.isPending}
        errorMessage={update.error ? authErrorMessage(update.error, t) : undefined}
        onEdit={update.reset}
      />
    </Screen>
  );
}
