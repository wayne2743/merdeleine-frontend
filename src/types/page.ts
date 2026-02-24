// src/types/page.ts
export type PageResponse<T> = {
  items: T[];
  page: number;  // 0-based
  size: number;
  total: number;
};