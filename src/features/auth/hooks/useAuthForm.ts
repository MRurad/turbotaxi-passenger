import { Keyboard } from 'react-native';
import {
  useForm,
  type DefaultValues,
  type FieldPath,
  type FieldValues,
  type Resolver,
} from 'react-hook-form';

import { useFormEditEffects } from './useFormEditEffects';

interface UseAuthFormOptions<T extends FieldValues> {
  resolver: Resolver<T>;
  defaultValues: DefaultValues<T>;
  onSubmit: (values: T) => void;
  /** While true, submit (button or keyboard "go") is ignored: no duplicate login/register. */
  submitting: boolean;
  onEdit?: () => void;
  revalidate?: Partial<Record<FieldPath<T>, FieldPath<T>>>;
}

/** Shared wiring for the auth forms: validation, guarded submit, edit side effects. */
export function useAuthForm<T extends FieldValues>({
  resolver,
  defaultValues,
  onSubmit,
  submitting,
  onEdit,
  revalidate,
}: UseAuthFormOptions<T>) {
  const form = useForm<T>({ resolver, defaultValues, mode: 'onTouched' });
  useFormEditEffects(form, { onEdit, revalidate });

  const submit = form.handleSubmit((values) => {
    if (submitting) return;
    // Hide the keyboard so the result (error banner or next screen) is visible.
    Keyboard.dismiss();
    onSubmit(values);
  });

  return { control: form.control, submit };
}
