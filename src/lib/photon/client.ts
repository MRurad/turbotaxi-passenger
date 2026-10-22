import { create } from 'axios';

import type { attachNetworkLogger as AttachNetworkLogger } from '@/api/devNetworkLog';
import { toApiError } from '@/api/errors';
import { PHOTON_BASE_URL, PHOTON_TIMEOUT_MS } from '@/constants/places';

/**
 * Separate axios instance for Photon (a third-party API like Google: never sends our backend
 * token). Repeated params go out as `osm_tag=a&osm_tag=b`, the way Photon expects them.
 */
export const photonClient = create({
  baseURL: PHOTON_BASE_URL,
  timeout: PHOTON_TIMEOUT_MS,
  paramsSerializer: { indexes: null },
});

// Dev-only HTTP log; the branch and its require are stripped from release bundles.
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const devLog = require('@/api/devNetworkLog') as {
    attachNetworkLogger: typeof AttachNetworkLogger;
  };
  devLog.attachNetworkLogger(photonClient, 'photon');
}

photonClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);
