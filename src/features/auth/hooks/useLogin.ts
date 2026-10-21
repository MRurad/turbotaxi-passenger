import { useMutation } from '@tanstack/react-query';

import type { ApiError } from '@/api/errors';
import { login } from '@/api/services/auth';
import { triggerHaptic } from '@/lib/haptics';

import type { LoginFormValues } from '../schemas';
import { useAuthStore } from '../store';
import type { AuthSession } from '../types';

/**
 * Logs in and stores the session. Navigation is automatic: the root Stack.Protected guard
 * switches from (auth) to (app) as soon as the store becomes authenticated.
 */
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<AuthSession, ApiError, LoginFormValues>({
    mutationFn: ({ email, password }) => login({ email, password }),
    onSuccess: (session) => {
      triggerHaptic('success');
      return setSession(session);
    },
    onError: () => triggerHaptic('error'),
  });
}
