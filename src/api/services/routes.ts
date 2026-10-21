import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { unwrapEnvelope } from '@/api/errors';
import { mapEstimate, toEstimateRequest } from '@/api/mappers/routes';
import type { RequestOptions, RouteEstimateResponse } from '@/api/types';
import { requireUserId } from '@/features/auth/store';
import type { EstimateInput, RouteEstimate } from '@/features/booking/types';

export async function estimateRoute(
  input: EstimateInput,
  { signal }: RequestOptions = {},
): Promise<RouteEstimate> {
  const { data } = await apiClient.post<RouteEstimateResponse>(
    ENDPOINTS.routes.estimate,
    toEstimateRequest(input, requireUserId()),
    { signal },
  );
  return mapEstimate(unwrapEnvelope(data));
}
