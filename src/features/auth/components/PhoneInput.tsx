import type { FieldValues } from 'react-hook-form';

import { PHONE_COUNTRY_CODE } from '../constants';
import { formatPhoneInput } from '../utils/phone';
import { FormInput, type FormInputProps } from './FormInput';

type PhoneInputProps<T extends FieldValues> = Omit<
  FormInputProps<T>,
  'format' | 'prefix' | 'keyboardType' | 'maxLength'
>;

/**
 * +994 phone field: digits only, masked as "5X XXX XX XX"; the form value is the masked text.
 * No native maxLength on purpose: it would truncate a pasted/autofilled "+994 50 123 45 67"
 * before formatting. toNationalDigits already caps the result at 9 digits.
 */
export function PhoneInput<T extends FieldValues>(props: PhoneInputProps<T>) {
  return (
    <FormInput
      {...props}
      prefix={PHONE_COUNTRY_CODE}
      format={formatPhoneInput}
      keyboardType="phone-pad"
      autoComplete="tel"
      textContentType="telephoneNumber"
    />
  );
}
