import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Chip, ConfirmDialog, Sheet, Text, useToast, type SheetRef } from '@/components/ui';

import { Section } from './Section';

export function OverlaysSection() {
  const { t } = useTranslation();
  const sheetRef = useRef<SheetRef>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const toast = useToast();

  return (
    <Section title={t('dev.uiKit.sections.overlays')}>
      <Button
        label={t('dev.uiKit.overlays.openSheet')}
        variant="secondary"
        leftIcon="layers-outline"
        onPress={() => sheetRef.current?.present()}
      />
      <Button
        label={t('dev.uiKit.overlays.openDialog')}
        variant="secondary"
        leftIcon="alert-circle-outline"
        onPress={() => setDialogOpen(true)}
      />
      <Button
        label={t('dev.uiKit.overlays.toastInfo')}
        variant="ghost"
        onPress={() => toast.show({ message: t('dev.uiKit.overlays.toastInfoMessage') })}
      />
      <Button
        label={t('dev.uiKit.overlays.toastSuccess')}
        variant="ghost"
        onPress={() =>
          toast.show({ message: t('dev.uiKit.overlays.toastSuccessMessage'), tone: 'success' })
        }
      />
      <Button
        label={t('dev.uiKit.overlays.toastDanger')}
        variant="ghost"
        onPress={() => toast.show({ message: t('errors.server'), tone: 'danger' })}
      />

      <Sheet ref={sheetRef}>
        <Text variant="title">{t('booking.title')}</Text>
        <Text variant="body" color="textSecondary">
          {t('dev.uiKit.overlays.sheetBody')}
        </Text>
        <Chip label={t('booking.vehicle.comfort')} selected onPress={() => undefined} />
        <Button
          label={t('common.actions.done')}
          fullWidth
          size="lg"
          onPress={() => sheetRef.current?.dismiss()}
        />
      </Sheet>

      <ConfirmDialog
        visible={dialogOpen}
        destructive
        title={t('ride.cancel.title')}
        message={t('ride.cancel.message')}
        confirmLabel={t('ride.cancel.confirm')}
        cancelLabel={t('ride.cancel.keep')}
        onConfirm={() => setDialogOpen(false)}
        onCancel={() => setDialogOpen(false)}
      />
    </Section>
  );
}
