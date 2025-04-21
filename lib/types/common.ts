/**
 * Common types used across the application
 */

/**
 * Generic paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  pageCount: number;
  page: number;
  pageSize: number;
}
