import type { PagedResultDto } from '@/api/types';
import type { Paged } from '@/types/paged';

import { ApiError } from '../errors';

/** Swagger marks every field optional; ids we rely on must really be there. */
export function requireId(value: number | null | undefined, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ApiError({ code: 'invalidResponse', serverMessage: `missing ${field}` });
  }
  return value;
}

/** Ids the app persists (user id) must be positive, matching userSchema. */
export function requirePositiveId(value: number | null | undefined, field: string): number {
  const id = requireId(value, field);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError({ code: 'invalidResponse', serverMessage: `invalid ${field}` });
  }
  return id;
}

/** For amounts the UI must never fake (prices): missing means the response is unusable. */
export function requireNumber(value: number | null | undefined, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ApiError({ code: 'invalidResponse', serverMessage: `missing ${field}` });
  }
  return value;
}

export function requireString(value: string | null | undefined, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ApiError({ code: 'invalidResponse', serverMessage: `missing ${field}` });
  }
  return value;
}

/** Trimmed string, or null when empty/missing. */
export function optionalString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function numberOr(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function mapPaged<TDto, T>(dto: PagedResultDto<TDto>, mapItem: (item: TDto) => T): Paged<T> {
  const items = (dto.items ?? []).map(mapItem);
  const pageNumber = numberOr(dto.pageNumber, 1);
  const totalPages = numberOr(dto.totalPages, pageNumber);
  return {
    items,
    pageNumber,
    pageSize: numberOr(dto.pageSize, items.length),
    totalCount: numberOr(dto.totalCount, items.length),
    totalPages,
    hasNextPage: pageNumber < totalPages,
  };
}
