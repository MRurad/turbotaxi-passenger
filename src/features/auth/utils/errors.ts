import type { TFunction } from 'i18next';

import { ApiError, toApiError } from '@/api/errors';
import { i18n } from '@/i18n';
import type { TranslationKey } from '@/i18n/types';

import { PASSWORD_MIN_LENGTH } from '../constants';

/**
 * Message for a failed login/register. The backend's `{ success:false, message }` text is
 * shown as-is when present (e.g. "This email is already registered"); otherwise the
 * translated message for the error code.
 */
export function authErrorMessage(error: unknown, t: TFunction): string {
  const apiError = error instanceof ApiError ? error : toApiError(error);
  return apiError.envelopeMessage ?? t(apiError.messageKey);
}

function isTranslationKey(value: string): value is TranslationKey {
  // count: plural-only keys (minLength_one/_other) don't exist without it.
  return i18n.exists(value, { count: PASSWORD_MIN_LENGTH });
}

/** Translates a zod message key from a form field. `count` feeds the minLength plurals. */
export function fieldErrorText(t: TFunction, message: string | undefined): string | undefined {
  if (!message) return undefined;
  return isTranslationKey(message)
    ? t(message, { count: PASSWORD_MIN_LENGTH })
    : t('errors.validation.required');
}
