export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const PAGINATED_BRAND = Symbol('paginated');

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
  /** When set, the response `data` becomes `{ items, ...extra }` (e.g. report summaries). */
  extra?: Record<string, unknown>;
  [PAGINATED_BRAND]: true;
}

export const paginated = <T>(items: T[], total: number, page: number, limit: number, extra?: Record<string, unknown>): Paginated<T> => ({
  items,
  meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  extra,
  [PAGINATED_BRAND]: true,
});

export const isPaginated = (value: unknown): value is Paginated<unknown> =>
  typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[PAGINATED_BRAND] === true;
