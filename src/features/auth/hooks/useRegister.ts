import { useMutation } from '@tanstack/react-query';

import type { ApiError } from '@/api/errors';
import { register } from '@/api/services/auth';
import { triggerHaptic } from '@/lib/haptics';

import type { RegisterFormValues } from '../schemas';
import { useAuthStore } from '../store';
import type { AuthSession } from '../types';
import { toRegisterInput } from '../utils/registerInput';

/** Registers (backend returns a session) and signs in; the route guard then opens the app. */
export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<AuthSession, ApiError, RegisterFormValues>({
    mutationFn: (values) => register(toRegisterInput(values)),
    onSuccess: (session) => {
      triggerHaptic('success');
      return setSession(session);
    },
    onError: () => triggerHaptic('error'),
  });
}
