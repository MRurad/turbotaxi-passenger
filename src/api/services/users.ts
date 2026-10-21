import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { mapUser } from '@/api/mappers/auth';
import type { RequestOptions, UserListItemDto, UserUpdateRequest } from '@/api/types';
import { requireUserId } from '@/features/auth/store';
import type { UpdateProfileInput } from '@/features/profile/types';
import type { User } from '@/types/user';

/** The signed-in user's profile (no /me endpoint yet — docs/BACKEND_REQUESTS.md #12). */
export async function getCurrentUser({ signal }: RequestOptions = {}): Promise<User> {
  const { data } = await apiClient.get<UserListItemDto>(ENDPOINTS.users.byId(requireUserId()), {
    signal,
  });
  return mapUser(data);
}

export async function updateCurrentUser(input: UpdateProfileInput): Promise<User> {
  const body: UserUpdateRequest = {
    id: requireUserId(),
    name: input.name.trim(),
    surname: input.surname.trim(),
    phoneNumber: input.phoneNumber.trim(),
    email: input.email.trim(),
  };
  const { data } = await apiClient.put<UserListItemDto>(ENDPOINTS.users.update, body);
  return mapUser(data);
}
