import { useRef, useState } from 'react';

import { Button, Chip, ConfirmDialog, Sheet, Text, useToast, type SheetRef } from '@/components/ui';

import { UI_KIT_COPY } from '../uiKitCopy';
import { Section } from './Section';

export function OverlaysSection() {
  const sheetRef = useRef<SheetRef>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const toast = useToast();
  const c = UI_KIT_COPY.overlays;

  return (
    <Section title={UI_KIT_COPY.sections.overlays}>
      <Button
        label={c.openSheet}
        variant="secondary"
        leftIcon="layers-outline"
        onPress={() => sheetRef.current?.present()}
      />
      <Button
        label={c.openDialog}
        variant="secondary"
        leftIcon="alert-circle-outline"
        onPress={() => setDialogOpen(true)}
      />
      <Button
        label={c.toastInfo}
        variant="ghost"
        onPress={() => toast.show({ message: c.toastInfoMessage })}
      />
      <Button
        label={c.toastSuccess}
        variant="ghost"
        onPress={() => toast.show({ message: c.toastSuccessMessage, tone: 'success' })}
      />
      <Button
        label={c.toastDanger}
        variant="ghost"
        onPress={() => toast.show({ message: c.toastDangerMessage, tone: 'danger' })}
      />

      <Sheet ref={sheetRef}>
        <Text variant="title">{c.sheetTitle}</Text>
        <Text variant="body" color="textSecondary">
          {c.sheetBody}
        </Text>
        <Chip label={UI_KIT_COPY.chips.comfort} selected onPress={() => undefined} />
        <Button
          label={c.sheetClose}
          fullWidth
          size="lg"
          onPress={() => sheetRef.current?.dismiss()}
        />
      </Sheet>

      <ConfirmDialog
        visible={dialogOpen}
        destructive
        title={c.dialogTitle}
        message={c.dialogMessage}
        confirmLabel={c.dialogConfirm}
        cancelLabel={c.dialogCancel}
        onConfirm={() => setDialogOpen(false)}
        onCancel={() => setDialogOpen(false)}
      />
    </Section>
  );
}
