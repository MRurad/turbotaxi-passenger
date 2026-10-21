import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { unwrapEnvelope } from '@/api/errors';
import { mapEstimate, toEstimateRequest } from '@/api/mappers/routes';
import type { RouteEstimateResponse } from '@/api/types';
import { requireUserId } from '@/features/auth/store';
import type { EstimateInput, RouteEstimate } from '@/features/booking/types';

export async function estimateRoute(input: EstimateInput): Promise<RouteEstimate> {
  const { data } = await apiClient.post<RouteEstimateResponse>(
    ENDPOINTS.routes.estimate,
    toEstimateRequest(input, requireUserId()),
  );
  return mapEstimate(unwrapEnvelope(data));
}
