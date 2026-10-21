import { z } from 'zod';

import type { TranslationKey } from '@/i18n/types';

import { PASSWORD_MIN_LENGTH } from './constants';
import { isValidAzMobile, toNationalDigits } from './utils/phone';

/** zod messages are i18n keys; forms translate them (see fieldErrorText). */
const msg = (key: TranslationKey) => ({ message: key });

// Letters in any script (az/ru/en names), plus spaces, hyphens and apostrophes.
const NAME_PATTERN = /^[\p{L}][\p{L}\s'’-]*$/u;

const email = z
  .string()
  .trim()
  .min(1, msg('errors.validation.required'))
  .pipe(z.email(msg('errors.validation.email')));

const name = z
  .string()
  .trim()
  .min(1, msg('errors.validation.required'))
  .regex(NAME_PATTERN, msg('errors.validation.name'));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, msg('errors.validation.required')),
});

export const registerSchema = z
  .object({
    name,
    surname: name,
    /** National digits as typed/masked, e.g. "50 123 45 67". */
    phone: z
      .string()
      .min(1, msg('errors.validation.required'))
      .refine((value) => isValidAzMobile(toNationalDigits(value)), msg('errors.validation.phone')),
    email,
    password: z
      .string()
      .min(1, msg('errors.validation.required'))
      .min(PASSWORD_MIN_LENGTH, msg('errors.validation.minLength')),
    confirmPassword: z.string().min(1, msg('errors.validation.required')),
  })
  .refine((values) => values.password === values.confirmPassword, {
    ...msg('errors.validation.passwordsMismatch'),
    path: ['confirmPassword'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
