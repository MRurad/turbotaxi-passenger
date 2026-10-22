import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import type { ApiError } from '@/api/errors';
import { deleteCurrentUser } from '@/api/services/users';
import { useAuthStore } from '@/features/auth/store';

/** DELETE /api/Users/{id}, then sign out (the session belongs to a deleted account). */
export function useDeleteAccount(): UseMutationResult<void, ApiError, void> {
  return useMutation<void, ApiError, void>({
    mutationFn: deleteCurrentUser,
    onSuccess: () => useAuthStore.getState().logout('user'),
  });
}
