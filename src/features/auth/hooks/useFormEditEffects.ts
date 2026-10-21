import { useEffect } from 'react';
import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';

type FormApi<T extends FieldValues> = Pick<UseFormReturn<T>, 'watch' | 'trigger' | 'getFieldState'>;

interface Options<T extends FieldValues> {
  /** Called on any edit — used to clear a stale server error banner. */
  onEdit?: () => void;
  /** When the key field changes, re-validate the value field if it was already touched. */
  revalidate?: Partial<Record<FieldPath<T>, FieldPath<T>>>;
}

/**
 * Side effects of editing a form. Cross-field rules (password ↔ confirm) are validated at
 * object level, so react-hook-form wouldn't re-check the dependent field on its own.
 */
export function useFormEditEffects<T extends FieldValues>(
  { watch, trigger, getFieldState }: FormApi<T>,
  { onEdit, revalidate }: Options<T>,
): void {
  useEffect(() => {
    const subscription = watch((_values, { name }) => {
      onEdit?.();
      const dependent = name ? revalidate?.[name] : undefined;
      if (dependent && getFieldState(dependent).isTouched)
        trigger(dependent).catch(() => undefined);
    });
    return () => subscription.unsubscribe();
  }, [watch, trigger, getFieldState, onEdit, revalidate]);
}
