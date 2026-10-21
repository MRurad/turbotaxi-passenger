import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { mapPaged } from '@/api/mappers/common';
import { mapPromoApplication, mapUserPromo } from '@/api/mappers/promo';
import type {
  ApplyPromoCodeRequest,
  ApplyPromoCodeResponse,
  RequestOptions,
  UserPromoCodeDtoPagedResult,
} from '@/api/types';
import { DEFAULT_PAGE_SIZE, FIRST_PAGE } from '@/constants/api';
import { requireUserId } from '@/features/auth/store';
import type { PromoApplication, UserPromo } from '@/features/promo/types';
import type { Paged } from '@/types/paged';

export interface GetUserPromosParams extends RequestOptions {
  activeOnly: boolean;
  pageNumber?: number;
}

export async function getUserPromos({
  activeOnly,
  pageNumber = FIRST_PAGE,
  signal,
}: GetUserPromosParams): Promise<Paged<UserPromo>> {
  const { data } = await apiClient.get<UserPromoCodeDtoPagedResult>(
    ENDPOINTS.promo.user(requireUserId()),
    { params: { activeOnly, pageNumber, pageSize: DEFAULT_PAGE_SIZE }, signal },
  );
  return mapPaged(data, mapUserPromo);
}

export async function applyPromo(
  promoCodeId: number,
  originalFare: number,
): Promise<PromoApplication> {
  const body: ApplyPromoCodeRequest = { userId: requireUserId(), promoCodeId, originalFare };
  const { data } = await apiClient.post<ApplyPromoCodeResponse>(ENDPOINTS.promo.apply, body);
  return mapPromoApplication(data, { promoCodeId, originalFare });
}
