import { http } from "./http";
import type {
  SellWindowSummary,
  SellWindowResponse,
  SellWindowCreateRequest,
  SellWindowUpdateRequest,
  ProductSellWindowCreateRequest,
  ProductSellWindowWithSellWindowCreateRequest,
  ProductSellWindowView,
} from "../types/domain";
import type { PageResponse } from "../types/page";
import type {
  Product,
  ProductCreateRequest,
  ProductImage,
  ProductImageUploadRequest,
  ProductImageUpdateRequest,
  ProductUpdateRequest,
  AutoGroupOrderRequest,
  AutoGroupOrderResponse,
  NextGroupOpenAtResponse,
  OpenProductSellWindowResponse,
  SellWindowNextGroupOpenAtResponse,
} from "../types/domain";

const HOME_FEATURED_STORAGE_KEY = "merdeleine.home.featuredProductIds";

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
    if (Number.isFinite(num)) {
      return num;
    }
  }
  return 0;
}

function pickNullableNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const num = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(num)) {
      return num;
    }
  }
  return null;
}

function normalizeProductSellWindowView(data: unknown): ProductSellWindowView {
  const raw = asRecord(data) ?? {};
  const sellWindow = asRecord(raw.sellWindow ?? raw.sell_window) ?? {};
  const product = asRecord(raw.product) ?? {};
  const quota = asRecord(raw.quota ?? raw.sellWindowQuota ?? raw.sell_window_quota) ?? {};

  return {
    productSellWindowId: pickString(raw.productSellWindowId, raw.product_sell_window_id, raw.id),
    sellWindowId: pickString(raw.sellWindowId, raw.sell_window_id, sellWindow.id),
    sellWindowName: pickString(raw.sellWindowName, raw.sell_window_name, sellWindow.name),
    startAt: pickString(raw.startAt, raw.start_at, sellWindow.startAt, sellWindow.start_at),
    endAt: pickString(raw.endAt, raw.end_at, sellWindow.endAt, sellWindow.end_at),
    predictedShipDate: pickNullableString(raw.predictedShipDate, raw.predicted_ship_date),
    shipDays: pickNullableNumber(raw.shipDays, raw.ship_days),
    timezone: pickString(raw.timezone, sellWindow.timezone) || "Asia/Taipei",
    paymentCloseAt: pickNullableString(raw.paymentCloseAt, raw.payment_close_at, sellWindow.paymentCloseAt, sellWindow.payment_close_at),
    status: (pickNullableString(raw.status, sellWindow.status) as ProductSellWindowView["status"]) ?? null,
    sellWindowStatus: (pickNullableString(raw.sellWindowStatus, raw.sell_window_status, sellWindow.status) as ProductSellWindowView["sellWindowStatus"]) ?? null,
    sell_window_status: (pickNullableString(raw.sell_window_status, raw.sellWindowStatus, sellWindow.status) as ProductSellWindowView["sell_window_status"]) ?? null,
    productId: pickString(raw.productId, raw.product_id, product.id),
    productName: pickString(raw.productName, raw.product_name, product.name),
    unitPriceCents: pickNumber(raw.unitPriceCents, raw.unit_price_cents, product.unitPriceCents, product.unit_price_cents),
    currency: pickString(raw.currency, product.currency) || "TWD",
    minQty: pickNumber(raw.minQty, raw.min_qty, quota.minQty, quota.min_qty),
    maxQty: pickNullableNumber(raw.maxQty, raw.max_qty, quota.maxQty, quota.max_qty),
    soldQty: pickNumber(raw.soldQty, raw.sold_qty, quota.soldQty, quota.sold_qty, quota.reservedQty, quota.reserved_qty),
    quotaStatus: pickString(raw.quotaStatus, raw.quota_status, quota.status) || "OPEN",
    quotaUpdatedAt: pickNullableString(raw.quotaUpdatedAt, raw.quota_updated_at, quota.updatedAt, quota.updated_at),
  };
}

function normalizeProductSellWindowCombined(data: unknown): ProductSellWindowView {
  const combined = asRecord(data) ?? {};
  const productSellWindow = asRecord(combined.productSellWindow) ?? {};
  const sellWindow = asRecord(combined.sellWindow) ?? {};
  const quota = asRecord(productSellWindow.quota ?? productSellWindow.sellWindowQuota ?? productSellWindow.sell_window_quota) ?? {};

  return {
    productSellWindowId: pickString(productSellWindow.id, productSellWindow.productSellWindowId, productSellWindow.product_sell_window_id),
    sellWindowId: pickString(sellWindow.id, sellWindow.sellWindowId, sellWindow.sell_window_id),
    sellWindowName: pickString(sellWindow.name, sellWindow.sellWindowName, sellWindow.sell_window_name),
    startAt: pickString(sellWindow.startAt, sellWindow.start_at),
    endAt: pickString(sellWindow.endAt, sellWindow.end_at),
    predictedShipDate: pickNullableString(sellWindow.predictedShipDate, sellWindow.predicted_ship_date),
    shipDays: pickNullableNumber(sellWindow.shipDays, sellWindow.ship_days),
    timezone: pickString(sellWindow.timezone) || "Asia/Taipei",
    paymentCloseAt: pickNullableString(sellWindow.paymentCloseAt, sellWindow.payment_close_at),
    status: (pickNullableString(sellWindow.status) as ProductSellWindowView["status"]) ?? null,
    sellWindowStatus: (pickNullableString(sellWindow.status) as ProductSellWindowView["sellWindowStatus"]) ?? null,
    sell_window_status: (pickNullableString(sellWindow.status) as ProductSellWindowView["sell_window_status"]) ?? null,
    productId: pickString(productSellWindow.productId, productSellWindow.product_id),
    productName: pickString(productSellWindow.productName, productSellWindow.product_name),
    unitPriceCents: pickNumber(productSellWindow.unitPriceCents, productSellWindow.unit_price_cents),
    currency: pickString(productSellWindow.currency) || "TWD",
    minQty: pickNumber(productSellWindow.minQty, productSellWindow.min_qty, quota.minQty, quota.min_qty),
    maxQty: pickNullableNumber(productSellWindow.maxQty, productSellWindow.max_qty, quota.maxQty, quota.max_qty),
    soldQty: pickNumber(productSellWindow.soldQty, productSellWindow.sold_qty, quota.soldQty, quota.sold_qty, quota.reservedQty, quota.reserved_qty),
    quotaStatus: pickString(productSellWindow.quotaStatus, productSellWindow.quota_status, quota.status) || "OPEN",
    quotaUpdatedAt: pickNullableString(productSellWindow.quotaUpdatedAt, productSellWindow.quota_updated_at, quota.updatedAt, quota.updated_at),
  };
}

function normalizeSellWindowResponse(data: unknown): SellWindowResponse {
  const raw = asRecord(data) ?? {};
  const sellWindow = asRecord(raw.sellWindow ?? raw.sell_window) ?? {};
  const status = pickNullableString(
    raw.status,
    raw.sellWindowStatus,
    raw.sell_window_status,
    sellWindow.status,
  );

  return {
    id: pickString(
      raw.id,
      raw.sellWindowId,
      raw.sell_window_id,
      sellWindow.id,
      sellWindow.sellWindowId,
      sellWindow.sell_window_id,
    ),
    name: pickString(raw.name, raw.sellWindowName, raw.sell_window_name, sellWindow.name),
    startAt: pickString(raw.startAt, raw.start_at, sellWindow.startAt, sellWindow.start_at),
    endAt: pickString(raw.endAt, raw.end_at, sellWindow.endAt, sellWindow.end_at),
    timezone: pickString(raw.timezone, sellWindow.timezone) || "Asia/Taipei",
    status: (status as SellWindowResponse["status"]) ?? "CLOSED",
    paymentTtlMinutes: pickNumber(
      raw.paymentTtlMinutes,
      raw.payment_ttl_minutes,
      sellWindow.paymentTtlMinutes,
      sellWindow.payment_ttl_minutes,
    ),
    paymentOpenAt: pickNullableString(
      raw.paymentOpenAt,
      raw.payment_open_at,
      sellWindow.paymentOpenAt,
      sellWindow.payment_open_at,
    ),
    paymentCloseAt: pickNullableString(
      raw.paymentCloseAt,
      raw.payment_close_at,
      sellWindow.paymentCloseAt,
      sellWindow.payment_close_at,
    ),
  };
}

function normalizeProduct(data: unknown): Product {
  const raw = asRecord(data) ?? {};
  const rawStatus = pickString(raw.status).toUpperCase();
  const status: Product["status"] =
    rawStatus === "ACTIVE" || rawStatus === "DRAFT" || rawStatus === "INACTIVE"
      ? rawStatus
      : "DRAFT";

  return {
    id: pickString(raw.id, raw.productId, raw.product_id),
    name: pickString(raw.name, raw.productName, raw.product_name),
    description: pickNullableString(raw.description),
    unitPriceCents: pickNullableNumber(raw.unitPriceCents, raw.unit_price_cents),
    currency: pickNullableString(raw.currency),
    status,
    defaultMinQty: pickNullableNumber(raw.defaultMinQty, raw.default_min_qty),
    defaultMaxQty: pickNullableNumber(raw.defaultMaxQty, raw.default_max_qty),
    defaultOpenDays: pickNullableNumber(raw.defaultOpenDays, raw.default_open_days),
    defaultLeadDays: pickNullableNumber(raw.defaultLeadDays, raw.default_lead_days),
    defaultShipDays: pickNullableNumber(raw.defaultShipDays, raw.default_ship_days),
  };
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

function readHomeFeaturedProductIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(HOME_FEATURED_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, 3);
  } catch {
    return [];
  }
}

function writeHomeFeaturedProductIds(productIds: string[]): void {
  if (typeof window === "undefined") return;

  const normalized = Array.from(new Set(productIds.filter((item) => typeof item === "string" && item.trim().length > 0))).slice(0, 3);
  window.localStorage.setItem(HOME_FEATURED_STORAGE_KEY, JSON.stringify(normalized));
}

export const catalogApi = {
  // 你可以讓 GW/BFF 提供一個整合端點，前端就不用跨服務
  async listSellWindows(): Promise<SellWindowSummary[]> {
    const { data } = await http.get("/api/catalog/sell-windows");
    
    if (typeof data === "string" && data.trim().startsWith("<!doctype html")) {
      throw new Error("API returned HTML. Proxy/baseURL is wrong.");
    }
    console.log("listSellWindows raw data:", data);
    return data;
  },

  async getSellWindow(sellWindowId: string): Promise<SellWindowSummary> {
    const { data } = await http.get(`/api/catalog/sell-windows/${sellWindowId}`);

    if (typeof data === "string" && data.trim().startsWith("<!doctype html")) {
      throw new Error("API returned HTML. Proxy/baseURL is wrong.");
    }

    console.log("getSellWindow raw data:", data);
    return data;
  },

  
  
  async pageProductSellWindows(page: number, size: number): Promise<PageResponse<ProductSellWindowView>> {
    const { data } = await http.get(`/api/catalog/product-sell-windows/page?page=${page}&size=${size}`);

    if (typeof data === "string" && data.trim().startsWith("<!doctype html")) {
      throw new Error("API returned HTML. Proxy/baseURL is wrong.");
    }

    const response = normalizePageResponse<unknown>(data, page, size);
    return {
      ...response,
      items: response.items.map((item) => normalizeProductSellWindowView(item)),
    };
  },

  async pageProductSellWindowViews(page: number, size: number): Promise<PageResponse<ProductSellWindowView>> {
    const { data } = await http.get(`/api/catalog/views/product-sell-windows?page=${page}&size=${size}`);

    if (typeof data === "string" && data.trim().startsWith("<!doctype html")) {
      throw new Error("API returned HTML. Proxy/baseURL is wrong.");
    }

    const response = normalizePageResponse<unknown>(data, page, size);
    return {
      ...response,
      items: response.items.map((item) => normalizeProductSellWindowView(item)),
    };
  },

  async pageProductSellWindowsCombined(page: number, size: number): Promise<PageResponse<ProductSellWindowView>> {
    const { data } = await http.get(`/api/product-sell-windows/combined/page?page=${page}&size=${size}`);

    if (typeof data === "string" && data.trim().startsWith("<!doctype html")) {
      throw new Error("API returned HTML. Proxy/baseURL is wrong.");
    }

    const response = normalizePageResponse<unknown>(data, page, size);
    return {
      ...response,
      items: response.items.map((item) => normalizeProductSellWindowCombined(item)),
    };
  },

  async createProductSellWindow(req: ProductSellWindowCreateRequest): Promise<ProductSellWindowView> {
    const payload = {
      productId: req.productId,
      sellWindowId: req.sellWindowId,
      minTotalQty: req.minTotalQty,
      maxTotalQty: req.maxTotalQty ?? req.minTotalQty,
      leadDays: req.leadDays ?? null,
      shipDays: req.shipDays ?? null,
      isClosed: req.isClosed ?? false,
    };

    const { data } = await http.post(`/api/catalog/product-sell-windows`, payload);

    if (typeof data === "string" && data.trim().startsWith("<!doctype html")) {
      throw new Error("API returned HTML. Proxy/baseURL is wrong.");
    }

    return normalizeProductSellWindowView(data);
  },

  async createProductSellWindowWithSellWindow(
    req: ProductSellWindowWithSellWindowCreateRequest,
  ): Promise<ProductSellWindowView> {
    const payload = {
      productId: req.productId,
      sellWindow: {
        name: req.sellWindow.name,
        startAt: req.sellWindow.startAt,
        endAt: req.sellWindow.endAt,
        timezone: req.sellWindow.timezone,
        predictedPaymentDate: req.sellWindow.predictedPaymentDate ?? null,
        predictedProdDate: req.sellWindow.predictedProdDate ?? null,
        predictedShipDate: req.sellWindow.predictedShipDate ?? null,
      },
      minTotalQty: req.minTotalQty,
      maxTotalQty: req.maxTotalQty ?? req.minTotalQty,
      leadDays: req.leadDays ?? null,
      shipDays: req.shipDays ?? null,
      isClosed: req.isClosed ?? false,
    };

    const { data } = await http.post(`/api/catalog/product-sell-windows/with-sell-window`, payload);

    if (typeof data === "string" && data.trim().startsWith("<!doctype html")) {
      throw new Error("API returned HTML. Proxy/baseURL is wrong.");
    }

    return normalizeProductSellWindowView(data);
  },

  async getProductSellWindowView(productSellWindowId: string): Promise<ProductSellWindowView> {
    const { data } = await http.get(`/api/catalog/views/product-sell-windows/${productSellWindowId}`);
    if (typeof data === "string" && data.trim().startsWith("<!doctype html")) {
      throw new Error("API returned HTML. Proxy/baseURL is wrong.");
    }
    return normalizeProductSellWindowView(data);
  },

  async listProducts(): Promise<Product[]> {
    const { data } = await http.get<unknown>("/api/catalog/products");
    return Array.isArray(data) ? data.map((item) => normalizeProduct(item)) : [];
  },

  async pageProducts(params: {
    page: number;
    size: number;
    status?: Product["status"];
    sort?: string;
  }): Promise<PageResponse<Product>> {
    const query = new URLSearchParams({
      page: String(params.page),
      size: String(params.size),
    });

    if (params.status) query.set("status", params.status);
    if (params.sort) query.set("sort", params.sort);

    const { data } = await http.get<unknown>(`/api/catalog/products/page?${query.toString()}`);

    if (typeof data === "string" && data.trim().startsWith("<!doctype html")) {
      throw new Error("API returned HTML. Proxy/baseURL is wrong.");
    }

    const response = normalizePageResponse<unknown>(data, params.page, params.size);
    return {
      ...response,
      items: response.items.map((item) => normalizeProduct(item)),
    };
  },

  async createProduct(req: ProductCreateRequest): Promise<Product> {
    const { data } = await http.post<unknown>("/api/catalog/products", req);
    return normalizeProduct(data);
  },

  async updateProduct(productId: string, req: ProductUpdateRequest): Promise<Product> {
    const { data } = await http.put<unknown>(`/api/catalog/products/${productId}`, req);
    return normalizeProduct(data);
  },

  async deleteProduct(productId: string): Promise<void> {
    await http.delete(`/api/catalog/products/${productId}`);
  },

  getHomeFeaturedProductIds(): string[] {
    return readHomeFeaturedProductIds();
  },

  saveHomeFeaturedProductIds(productIds: string[]): void {
    writeHomeFeaturedProductIds(productIds);
  },

  async listRawSellWindows(): Promise<SellWindowResponse[]> {
    const { data } = await http.get<SellWindowResponse[]>("/api/catalog/sell-windows");
    return Array.isArray(data) ? data.map((item) => normalizeSellWindowResponse(item)) : [];
  },

  async createSellWindow(req: SellWindowCreateRequest): Promise<SellWindowResponse> {
    const { data } = await http.post<SellWindowResponse>("/api/catalog/sell-windows", req);
    return normalizeSellWindowResponse(data);
  },

  async updateSellWindow(id: string, req: SellWindowUpdateRequest): Promise<SellWindowResponse> {
    const { data } = await http.put<SellWindowResponse>(`/api/catalog/sell-windows/${id}`, req);
    return normalizeSellWindowResponse(data);
  },

  async deleteSellWindow(id: string): Promise<void> {
    await http.delete(`/api/catalog/sell-windows/${id}`);
  },

  async listProductImages(productId: string): Promise<ProductImage[]> {
    const { data } = await http.get<ProductImage[]>(`/api/catalog/products/${productId}/images`);
    return data;
  },

  async uploadProductImage(productId: string, req: ProductImageUploadRequest): Promise<ProductImage> {
    const formData = new FormData();
    formData.append("file", req.file);
    formData.append("imageType", req.imageType);
    formData.append("sortOrder", String(req.sortOrder));
    formData.append("isPrimary", String(req.isPrimary));
    formData.append("isActive", String(req.isActive));

    const { data } = await http.post<ProductImage>(
      `/api/catalog/products/${productId}/images`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return data;
  },

  async updateProductImage(productId: string, imageId: string, req: ProductImageUpdateRequest): Promise<ProductImage> {
    const payload = {
      sortOrder: req.sortOrder,
      isActive: req.isActive,
    };

    const attempts = [
      () => http.patch<ProductImage>(`/api/catalog/products/${productId}/images/${imageId}`, payload),
      () => http.put<ProductImage>(`/api/catalog/products/${productId}/images/${imageId}`, payload),
      () => http.patch<ProductImage>(`/api/catalog/images/${imageId}`, payload),
      () => http.put<ProductImage>(`/api/catalog/images/${imageId}`, payload),
    ];

    let lastError: unknown;
    for (const attempt of attempts) {
      try {
        const { data } = await attempt();
        return data;
      } catch (e: any) {
        const status = e?.response?.status;
        if (status !== 404 && status !== 405) {
          throw e;
        }
        lastError = e;
      }
    }

    throw lastError ?? new Error("更新圖片失敗");
  },

  async autoGroupOrder(req: AutoGroupOrderRequest): Promise<AutoGroupOrderResponse> {
    const { data } = await http.post<AutoGroupOrderResponse>(
      "/api/catalog/customer/auto-group-orders",
      req
    );
    return data;
  },

  async getNextGroupOpenAt(productId: string): Promise<NextGroupOpenAtResponse> {
    const { data } = await http.get<NextGroupOpenAtResponse>(
      `/api/catalog/products/${productId}/next-group-open-at`
    );
    return data;
  },

  async getNextSellWindowOpenAt(): Promise<SellWindowNextGroupOpenAtResponse> {
    const { data } = await http.get<SellWindowNextGroupOpenAtResponse>(
      "/api/catalog/sell-windows/next-group-open-at"
    );
    return data;
  },

  async getOpenProductSellWindow(productId: string): Promise<OpenProductSellWindowResponse> {
    const { data } = await http.get<OpenProductSellWindowResponse>(
      `/api/catalog/products/${productId}/open-product-sell-window`
    );
    return data;
  },

};