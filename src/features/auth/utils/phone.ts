import {
  AZ_MOBILE_PREFIXES,
  PHONE_COUNTRY_CODE,
  PHONE_MASK_GROUPS,
  PHONE_NATIONAL_LENGTH,
} from '../constants';

const COUNTRY_DIGITS = PHONE_COUNTRY_CODE.replace('+', '');

/**
 * National digits from anything the user typed or pasted: strips spaces/dashes, a leading
 * +994 / 994 or trunk 0, and caps the length.
 */
export function toNationalDigits(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith(COUNTRY_DIGITS) && digits.length > PHONE_NATIONAL_LENGTH) {
    digits = digits.slice(COUNTRY_DIGITS.length);
  }
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, PHONE_NATIONAL_LENGTH);
}

/** "501234567" → "50 123 45 67" (works on partial input while typing). */
export function formatPhoneMask(nationalDigits: string): string {
  const parts: string[] = [];
  let index = 0;
  for (const size of PHONE_MASK_GROUPS) {
    const part = nationalDigits.slice(index, index + size);
    if (!part) break;
    parts.push(part);
    index += size;
  }
  return parts.join(' ');
}

export function isValidAzMobile(nationalDigits: string): boolean {
  return (
    nationalDigits.length === PHONE_NATIONAL_LENGTH &&
    AZ_MOBILE_PREFIXES.some((prefix) => nationalDigits.startsWith(prefix))
  );
}

/** "50 123 45 67" → "+994501234567" (what the backend stores). */
export function toE164(nationalDigits: string): string {
  return `${PHONE_COUNTRY_CODE}${toNationalDigits(nationalDigits)}`;
}

/**
 * onChangeText formatter for the masked field. Backspacing over a mask space leaves the digits
 * unchanged, which re-masking would undo; in that case drop the digit before the space instead.
 */
export function formatPhoneInput(text: string, previous: string): string {
  const digits = toNationalDigits(text);
  const deletedSeparator = text.length < previous.length && digits === toNationalDigits(previous);
  if (!deletedSeparator) return formatPhoneMask(digits);

  // Where the edit happened, and how many digits precede it.
  let edit = 0;
  while (edit < text.length && text[edit] === previous[edit]) edit += 1;
  const digitsBefore = previous.slice(0, edit).replace(/\D/g, '').length;
  const withoutDigit = digits.slice(0, Math.max(0, digitsBefore - 1)) + digits.slice(digitsBefore);
  return formatPhoneMask(withoutDigit);
}
