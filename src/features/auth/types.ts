import type { User } from '@/types/user';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string | null;
  /** Epoch ms when the access token expires; null when the backend didn't say. */
  expiresAt: number | null;
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  surname: string;
  /** E.164, e.g. +994501234567. */
  phoneNumber: string;
  email: string;
  password: string;
}

/** Why the session ended — lets the UI explain an unexpected logout. */
export type LogoutReason = 'user' | 'expired';
