/** A page of a backend list, normalized. */
export interface Paged<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  /** `useInfiniteQuery` getNextPageParam: `page.hasNextPage ? page.pageNumber + 1 : undefined`. */
  hasNextPage: boolean;
}
