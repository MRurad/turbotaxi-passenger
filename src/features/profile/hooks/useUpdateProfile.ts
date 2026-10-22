import { useMutation } from '@tanstack/react-query';

import type { ApiError } from '@/api/errors';
import { updateCurrentUser } from '@/api/services/users';
import { useAuthStore } from '@/features/auth/store';
import type { User } from '@/types/user';

import type { UpdateProfileInput } from '../types';

/** PUT /api/Users (id from the auth store), then the signed-in user in the store is replaced. */
export function useUpdateProfile() {
  return useMutation<User, ApiError, UpdateProfileInput>({
    mutationFn: updateCurrentUser,
    onSuccess: (user) => useAuthStore.getState().updateUser(user),
  });
}
