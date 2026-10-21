import { AxiosHeaders, create, isAxiosError, type InternalAxiosRequestConfig } from 'axios';

import { config } from '@/constants/config';
import { API_TIMEOUT_MS } from '@/constants/timeouts';
import { expireSession } from '@/features/auth/session';
import { useAuthStore } from '@/features/auth/store';
import { getAcceptLanguage } from '@/i18n';

import type { attachNetworkLogger as AttachNetworkLogger } from './devNetworkLog';
import { ENDPOINTS } from './endpoints';
import { ApiError, toApiError } from './errors';

/** The app's only axios instance (Google APIs use their own client in src/lib/google). */
export const apiClient = create({
  baseURL: config.API_URL,
  timeout: API_TIMEOUT_MS,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

// Dev-only HTTP log (/dev/realtime → Network + one Console line per request). Must be attached
// before the interceptors below; the branch and its require are stripped from release bundles.
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const devLog = require('./devNetworkLog') as { attachNetworkLogger: typeof AttachNetworkLogger };
  devLog.attachNetworkLogger(apiClient, 'api');
}

/** Public endpoints: never send a (possibly stale) token, so a 401 means wrong credentials. */
const PUBLIC_PATHS: ReadonlySet<string> = new Set([ENDPOINTS.auth.login, ENDPOINTS.auth.register]);

const bearer = (token: string) => `Bearer ${token}`;

apiClient.interceptors.request.use((request: InternalAxiosRequestConfig) => {
  const headers = AxiosHeaders.from(request.headers);
  const token = useAuthStore.getState().accessToken;
  if (token && !PUBLIC_PATHS.has(request.url ?? '')) headers.set('Authorization', bearer(token));
  headers.set('Accept-Language', getAcceptLanguage());
  request.headers = headers;
  return request;
});

function sentAuthorization(error: unknown): string {
  if (!isAxiosError(error)) return '';
  const value = error.config?.headers?.Authorization;
  return typeof value === 'string' ? value : '';
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const apiError = toApiError(error);
    if (apiError.status !== 401) return Promise.reject(apiError);

    const sent = sentAuthorization(error);
    if (!sent) {
      // Login/register: a 401 means wrong credentials, not an expired session.
      return Promise.reject(
        new ApiError({
          code: 'invalidCredentials',
          status: apiError.status,
          serverMessage: apiError.serverMessage,
          envelopeMessage: apiError.envelopeMessage,
          cause: error,
        }),
      );
    }

    // Only end the session the request was made with. A late 401 for an old token must not
    // log out a newer session, nor relabel a manual logout as "expired".
    const current = useAuthStore.getState().accessToken;
    if (current && sent === bearer(current)) {
      // TODO(refresh): when POST /api/Auth/refresh exists (docs/BACKEND_REQUESTS.md #11), try
      // refreshing here once, retry the original request, and only log out if that fails.
      await expireSession();
    }
    return Promise.reject(apiError);
  },
);
