import type { Ref } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { TextInput } from 'react-native';

import { Input, type InputProps } from '@/components/ui';

import { fieldErrorText } from '../utils/errors';

export interface FormInputProps<T extends FieldValues> extends Omit<
  InputProps,
  'value' | 'onChangeText' | 'onBlur' | 'error'
> {
  control: Control<T>;
  name: FieldPath<T>;
  /** React 19: ref is a regular prop (no forwardRef needed). */
  ref?: Ref<TextInput>;
  /** Transforms typed text before it reaches the form (e.g. phone masking). */
  format?: (text: string, previous: string) => string;
}

/** react-hook-form-bound <Input>; zod messages (i18n keys) are translated here. */
export function FormInput<T extends FieldValues>({
  control,
  name,
  format,
  ref,
  ...inputProps
}: FormInputProps<T>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const value = typeof field.value === 'string' ? field.value : '';
        return (
          <Input
            ref={ref}
            {...inputProps}
            value={value}
            onChangeText={(text) => field.onChange(format ? format(text, value) : text)}
            onBlur={field.onBlur}
            error={fieldErrorText(t, fieldState.error?.message)}
          />
        );
      }}
    />
  );
}
