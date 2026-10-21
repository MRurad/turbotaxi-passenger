/** Azerbaijan country code; the app only registers AZ numbers. */
export const PHONE_COUNTRY_CODE = '+994';

/** National significant number length after +994 (e.g. 50 123 45 67). */
export const PHONE_NATIONAL_LENGTH = 9;

/** Digit groups of the display mask "5X XXX XX XX". */
export const PHONE_MASK_GROUPS = [2, 3, 2, 2] as const;

/** Mobile operator prefixes (Azercell, Bakcell, Nar, Naxtel). */
export const AZ_MOBILE_PREFIXES = ['10', '50', '51', '55', '60', '70', '77', '99'] as const;

/** TODO confirm with backend: minimum password length enforced by /api/Auth/register. */
export const PASSWORD_MIN_LENGTH = 6;
