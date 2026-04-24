import { http } from "./http";
import type { PageResponse } from "../types/page";
import type { ProductionBatch, ProductionBatchCreateRequest, ProductionBatchUpdateRequest } from "../types/domain";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function pickNullableString(...values: unknown[]): string | null {
  const value = pickString(...values);
  return value || null;
}

function pickNumber(...values: unknown[]): number {
  for (const value of values) {
    const num = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
}

function pickBoolean(...values: unknown[]): boolean {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return false;
}

function normalizePageResponse<T>(data: unknown, fallbackPage: number, fallbackSize: number): PageResponse<T> {
  if (Array.isArray((data as { items?: unknown[] } | null | undefined)?.items)) {
    return data as PageResponse<T>;
  }

  if (Array.isArray((data as { content?: unknown[] } | null | undefined)?.content)) {
    const raw = data as {
      content: T[];
      number?: number;
      page?: number;
      size?: number;
      totalElements?: number;
      total?: number;
    };

    return {
      items: raw.content,
      page: Number(raw.number ?? raw.page ?? fallbackPage),
      size: Number(raw.size ?? fallbackSize),
      total: Number(raw.totalElements ?? raw.total ?? raw.content.length),
    };
  }

  if (Array.isArray(data)) {
    return {
      items: data as T[],
      page: fallbackPage,
      size: fallbackSize,
      total: (data as T[]).length,
    };
  }

  throw new Error("API returned unexpected page format.");
}

function normalizeBatch(data: unknown): ProductionBatch {
  const raw = asRecord(data) ?? {};
  return {
    id: pickString(raw.id, raw.batchId, raw.batch_id),
    sellWindowId: pickString(raw.sellWindowId, raw.sell_window_id),
    productId: pickString(raw.productId, raw.product_id),
    targetQty: pickNumber(raw.targetQty, raw.target_qty),
    status: pickString(raw.status) || "CREATED",
    createdAt: pickNullableString(raw.createdAt, raw.created_at),
    confirmedAt: pickNullableString(raw.confirmedAt, raw.confirmed_at),
    orderLinkCount: pickNumber(raw.orderLinkCount, raw.order_link_count),
    hasSchedule: pickBoolean(raw.hasSchedule, raw.has_schedule),
  };
}

function ensureNotHtml(data: unknown) {
  if (typeof data === "string" && data.trim().startsWith("<!doctype html")) {
    throw new Error("API returned HTML. Proxy/baseURL is wrong.");
  }
}

export const planningApi = {
  async pageBatches(page: number, size: number): Promise<PageResponse<ProductionBatch>> {
    const { data } = await http.get(`/api/production-planning/batches?page=${page}&size=${size}`);
    ensureNotHtml(data);

    const response = normalizePageResponse<unknown>(data, page, size);
    return {
      ...response,
      items: response.items.map((item) => normalizeBatch(item)),
    };
  },

  async createBatch(req: ProductionBatchCreateRequest): Promise<ProductionBatch> {
    const { data } = await http.post(`/api/production-planning/batches`, req);
    ensureNotHtml(data);
    return normalizeBatch(data);
  },

  async updateBatch(batchId: string, req: ProductionBatchUpdateRequest): Promise<ProductionBatch> {
    const payload: Record<string, unknown> = {};

    if (req.sellWindowId !== undefined) payload.sellWindowId = req.sellWindowId;
    if (req.productId !== undefined) payload.productId = req.productId;
    if (req.targetQty !== undefined) payload.targetQty = req.targetQty;

    const { data } = await http.put(`/api/production-planning/batches/${batchId}`, payload);
    ensureNotHtml(data);
    return normalizeBatch(data);
  },

  async deleteBatch(batchId: string): Promise<void> {
    await http.delete(`/api/production-planning/batches/${batchId}`);
  },

  async confirmBatch(batchId: string): Promise<{ ok: boolean }> {
    const { data } = await http.post(`/api/production-planning/batches/${batchId}/confirm`);
    ensureNotHtml(data);

    if (typeof data === "object" && data !== null && "ok" in data) {
      return data as { ok: boolean };
    }

    return { ok: true };
  },
};