import {
  formatPhoneInput,
  formatPhoneMask,
  isValidAzMobile,
  toE164,
  toNationalDigits,
} from '@/features/auth/utils/phone';

describe('phone utils', () => {
  it('extracts national digits from typed or pasted input', () => {
    expect(toNationalDigits('50 123 45 67')).toBe('501234567');
    expect(toNationalDigits('+994 50 123-45-67')).toBe('501234567');
    expect(toNationalDigits('994501234567')).toBe('501234567');
    expect(toNationalDigits('0501234567')).toBe('501234567');
    expect(toNationalDigits('50123456789')).toBe('501234567'); // capped at 9
  });

  it('masks as 5X XXX XX XX, including partial input', () => {
    expect(formatPhoneMask('501234567')).toBe('50 123 45 67');
    expect(formatPhoneMask('5012')).toBe('50 12');
    expect(formatPhoneMask('5')).toBe('5');
    expect(formatPhoneMask('')).toBe('');
  });

  it('validates AZ mobile prefixes and length', () => {
    expect(isValidAzMobile('501234567')).toBe(true);
    expect(isValidAzMobile('991234567')).toBe(true);
    expect(isValidAzMobile('121234567')).toBe(false); // Baku landline
    expect(isValidAzMobile('50123456')).toBe(false); // too short
  });

  it('builds the +994XXXXXXXXX value sent to the backend', () => {
    expect(toE164('50 123 45 67')).toBe('+994501234567');
  });
});

describe('formatPhoneInput', () => {
  it('handles a full international paste/autofill (no native maxLength)', () => {
    expect(formatPhoneInput('+994 50 123 45 67', '')).toBe('50 123 45 67');
    expect(formatPhoneInput('+994501234567', '')).toBe('50 123 45 67');
    expect(formatPhoneInput('050 123 45 67', '')).toBe('50 123 45 67');
  });

  it('backspacing over a mask space deletes the digit before it', () => {
    // Caret after the space in "50 |123 45" + backspace → removes the "0".
    expect(formatPhoneInput('50123 45', '50 123 45')).toBe('51 234 5');
    // A later space: "50 123 |45" + backspace → removes the "3" (spaces aren't digits).
    expect(formatPhoneInput('50 12345', '50 123 45')).toBe('50 124 5');
    // Ordinary backspace at the end still removes the last digit.
    expect(formatPhoneInput('50 12', '50 123')).toBe('50 12');
  });
});
