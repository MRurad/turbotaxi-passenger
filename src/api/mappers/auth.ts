import type { AuthResponseData, UserDto, UserListItemDto } from '@/api/types';
import type { AuthSession } from '@/features/auth/types';
import type { User } from '@/types/user';

import { optionalString, requirePositiveId, requireString } from './common';

const MS_PER_SECOND = 1000;

export function mapUser(dto: UserDto | UserListItemDto): User {
  return {
    id: requirePositiveId(dto.id, 'user.id'),
    name: dto.name?.trim() ?? '',
    surname: dto.surname?.trim() ?? '',
    phoneNumber: dto.phoneNumber?.trim() ?? '',
    email: dto.email?.trim() ?? '',
    createdAt: optionalString(dto.createdAt),
  };
}

/** `now` is injectable for tests. expiresIn is in seconds. */
export function mapAuthSession(data: AuthResponseData, now: number = Date.now()): AuthSession {
  const tokens = data.tokens;
  const user = data.user;
  return {
    user: mapUser(user ?? {}),
    tokens: {
      accessToken: requireString(tokens?.accessToken, 'tokens.accessToken'),
      refreshToken: optionalString(tokens?.refreshToken),
      expiresAt:
        tokens?.expiresIn && tokens.expiresIn > 0 ? now + tokens.expiresIn * MS_PER_SECOND : null,
    },
  };
}
