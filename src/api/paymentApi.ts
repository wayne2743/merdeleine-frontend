import { http } from "./http";
import type { PaymentCreateRequest, PaymentInfo, PaymentUpdateRequest } from "../types/domain";
import type { PageResponse } from "../types/page";

type CreatePaypalPaymentResponse = {
  approveUrl?: string;
  approvalUrl?: string;
  redirectUrl?: string;
  url?: string;
  [key: string]: unknown;
};

export type BankTransferReportRequest = {
  orderId: string;
  bankAccountLast5: string;
  remittedAt: string;
};

const LOCAL_PAYMENT_STORAGE_KEY = "merdeleine.payment.records";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickNullableString(...values: unknown[]): string | null {
  const value = pickString(...values);
  return value || null;
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

function normalizePaymentProvider(...values: unknown[]): PaymentInfo["provider"] {
  const raw = pickString(...values);
  const normalized = raw.replace(/[\s-]+/g, "_").toUpperCase();

  if (normalized === "BANK_TRANSFER" || normalized === "BANKTRANSFER" || raw.includes("銀行轉帳")) {
    return "BANK_TRANSFER";
  }
  if (normalized === "PAYPAL") {
    return "PAYPAL";
  }
  if (normalized === "ECPAY" || normalized === "EC_PAY" || raw.toLowerCase().includes("ecpay") || raw.includes("綠界")) {
    return "ECPAY";
  }

  if (normalized === "CREDIT_CARD" || normalized === "CREDITCARD" || raw.includes("信用卡")) {
    return "CREDIT_CARD";
  }

  if (normalized === "NEWEBPAY" || normalized === "NEWEB_PAY" || raw.includes("藍新")) {
    return "NEWEBPAY";
  }

  return "BANK_TRANSFER";
}

function normalizePaymentStatus(...values: unknown[]): PaymentInfo["status"] {
  const raw = pickString(...values);
  const normalized = raw.replace(/[\s-]+/g, "_").toUpperCase();

  if (["INIT", "PENDING", "WAITING", "UNPAID", "CREATED"].includes(normalized) || raw.includes("待付款")) {
    return "INIT";
  }
  if (["SUCCEEDED", "SUCCESS", "PAID", "COMPLETED", "CAPTURED"].includes(normalized) || raw.includes("已付款")) {
    return "SUCCEEDED";
  }
  if (["FAILED", "FAIL", "DECLINED", "ERROR"].includes(normalized) || raw.includes("失敗")) {
    return "FAILED";
  }
  if (["EXPIRED", "TIMEOUT", "CANCELLED", "CANCELED"].includes(normalized) || raw.includes("逾期")) {
    return "EXPIRED";
  }

  return "INIT";
}

function isFallbackStatus(status?: number): boolean {
  return status === 404 || status === 405 || status === 501;
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

function createLocalPaymentId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `payment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePaymentInfo(data: unknown): PaymentInfo {
  const raw = asRecord(data) ?? {};
  const payInfo = asRecord(raw.payInfo ?? raw.pay_info) ?? {};

  return {
    paymentId: pickString(raw.paymentId, raw.payment_id, raw.id),
    orderId: pickString(raw.orderId, raw.order_id),
    provider: normalizePaymentProvider(raw.provider, raw.paymentProvider, raw.payment_provider, payInfo.provider, payInfo.paymentProvider),
    status: normalizePaymentStatus(raw.status, payInfo.status),
    amountCents: pickNullableNumber(raw.amountCents, raw.amount_cents),
    currency: pickNullableString(raw.currency) ?? "TWD",
    providerPaymentId: pickNullableString(raw.providerPaymentId, raw.provider_payment_id),
    providerCaptureId: pickNullableString(raw.providerCaptureId, raw.provider_capture_id),
    approveUrl: pickNullableString(raw.approveUrl, raw.approve_url),
    expireAt: pickString(raw.expireAt, raw.expire_at) || new Date().toISOString(),
    expiredAt: pickNullableString(raw.expiredAt, raw.expired_at),
    bankAccountLast5: pickNullableString(raw.bankAccountLast5, raw.bank_account_last5, raw.bankLastFive, raw.bank_last_five, payInfo.bankAccountLast5, payInfo.bank_account_last5, payInfo.bankLastFive, payInfo.bank_last_five),
    remittedAt: pickNullableString(raw.remittedAt, raw.remitted_at, raw.transferAt, raw.transfer_at, payInfo.remittedAt, payInfo.remitted_at, payInfo.transferAt, payInfo.transfer_at),
    note: pickNullableString(raw.note, payInfo.note),
    createdAt: pickNullableString(raw.createdAt, raw.created_at),
    updatedAt: pickNullableString(raw.updatedAt, raw.updated_at),
    sellWindowId: pickNullableString(raw.sellWindowId, raw.sell_window_id),
    sellWindowName: pickNullableString(raw.sellWindowName, raw.sell_window_name),
    customerId: pickNullableString(raw.customerId, raw.customer_id, payInfo.customerId, payInfo.customer_id),
    customerName: pickNullableString(raw.customerName, raw.customer_name, raw.contactName, raw.contact_name, payInfo.customerName, payInfo.customer_name, payInfo.contactName, payInfo.contact_name),
    customerPhone: pickNullableString(raw.customerPhone, raw.customer_phone, raw.contactPhone, raw.contact_phone, payInfo.customerPhone, payInfo.customer_phone, payInfo.contactPhone, payInfo.contact_phone),
    customerEmail: pickNullableString(raw.customerEmail, raw.customer_email, raw.contactEmail, raw.contact_email, payInfo.customerEmail, payInfo.customer_email, payInfo.contactEmail, payInfo.contact_email),
    payInfo: payInfo as Record<string, any>,
  };
}

function readLocalPayments(): PaymentInfo[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_PAYMENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => normalizePaymentInfo(item)) : [];
  } catch {
    return [];
  }
}

function writeLocalPayments(items: PaymentInfo[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_PAYMENT_STORAGE_KEY, JSON.stringify(items));
}

function sortPayments(items: PaymentInfo[]): PaymentInfo[] {
  return [...items].sort((a, b) => {
    const byExpire = (b.expireAt ?? "").localeCompare(a.expireAt ?? "");
    if (byExpire !== 0) return byExpire;
    return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
  });
}

function mergeLocalPayments(records: PaymentInfo[]): PaymentInfo[] {
  const map = new Map<string, PaymentInfo>();

  readLocalPayments().forEach((item) => {
    map.set(item.paymentId, item);
  });

  records.forEach((item) => {
    map.set(item.paymentId, item);
  });

  const merged = sortPayments(Array.from(map.values()));
  writeLocalPayments(merged);
  return merged;
}

function upsertLocalPayment(record: PaymentInfo): PaymentInfo {
  mergeLocalPayments([record]);
  return record;
}

function pickApproveUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const raw = payload as Record<string, unknown>;
  const nested = (raw.data && typeof raw.data === "object") ? (raw.data as Record<string, unknown>) : null;
  const candidates = [
    raw.approveUrl,
    raw.approvalUrl,
    raw.redirectUrl,
    raw.url,
    nested?.approveUrl,
    nested?.approvalUrl,
    nested?.redirectUrl,
    nested?.url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export const paymentApi = {
  async getPaymentByOrder(orderId: string): Promise<PaymentInfo> {
    const { data } = await http.get(`/api/payment/payments/orders/${encodeURIComponent(orderId)}`);
    const normalized = normalizePaymentInfo(data);
    upsertLocalPayment(normalized);
    return normalized;
  },

  async pagePayments(page: number, size: number): Promise<PageResponse<PaymentInfo>> {
    const sliceLocalPage = (source: PaymentInfo[]): PageResponse<PaymentInfo> => {
      const sorted = sortPayments(source);
      const start = page * size;
      return {
        items: sorted.slice(start, start + size),
        page,
        size,
        total: sorted.length,
      };
    };

    try {
      const { data } = await http.get(`/api/payment/payments/enriched?page=${page}&size=${size}`);
      const response = normalizePageResponse<unknown>(data, page, size);
      const items = response.items.map((item) => normalizePaymentInfo(item));
      const merged = mergeLocalPayments(items);

      const returnedPage = Number.isFinite(response.page) ? response.page : page;
      const looksUnpaged = items.length > size || (response.total > size && items.length === response.total);
      const pageMismatch = page > 0 && returnedPage !== page;

      if (looksUnpaged || pageMismatch) {
        const fallbackSize = Math.max(size * (page + 1), 100);
        const { data: allData } = await http.get(`/api/payment/payments/enriched?page=0&size=${fallbackSize}`);
        const allResponse = normalizePageResponse<unknown>(allData, 0, fallbackSize);
        const allItems = allResponse.items.map((item) => normalizePaymentInfo(item));

        if (allItems.length > 0) {
          const localMerged = mergeLocalPayments(allItems);
          const sorted = sortPayments(localMerged);
          const start = page * size;
          return {
            items: sorted.slice(start, start + size),
            page,
            size,
            total: Math.max(Number(allResponse.total ?? 0), sorted.length),
          };
        }
      }

      return {
        ...response,
        page: returnedPage,
        size: Number.isFinite(response.size) ? response.size : size,
        total: Math.max(Number(response.total ?? 0), merged.length),
        items: sortPayments(items),
      };
    } catch (e: any) {
      if (!isFallbackStatus(e?.response?.status)) throw e;
      return sliceLocalPage(readLocalPayments());
    }
  },

  async listPayments(): Promise<PaymentInfo[]> {
    const response = await this.pagePayments(0, 1000);
    return response.items;
  },

  async createPayment(req: PaymentCreateRequest): Promise<PaymentInfo> {
    const payload = {
      ...req,
      bankAccountLast5: req.bankAccountLast5 ?? null,
      bank_account_last5: req.bankAccountLast5 ?? null,
      remittedAt: req.remittedAt ?? null,
      remitted_at: req.remittedAt ?? null,
      note: req.note ?? null,
      payInfo: req.payInfo ?? {},
      pay_info: req.payInfo ?? {},
    };

    try {
      const { data } = await http.post("/api/payment/payments", payload);
      const normalized = normalizePaymentInfo(data);
      upsertLocalPayment(normalized);
      return normalized;
    } catch (e: any) {
      if (!isFallbackStatus(e?.response?.status)) throw e;

      const now = new Date().toISOString();
      const created = normalizePaymentInfo({
        paymentId: createLocalPaymentId(),
        orderId: req.orderId,
        provider: req.provider,
        status: req.status ?? "INIT",
        expireAt: req.expireAt,
        bankAccountLast5: req.bankAccountLast5 ?? null,
        remittedAt: req.remittedAt ?? null,
        note: req.note ?? null,
        createdAt: now,
        updatedAt: now,
        payInfo: req.payInfo ?? {},
      });

      return upsertLocalPayment(created);
    }
  },

  async updatePayment(paymentId: string, req: PaymentUpdateRequest): Promise<PaymentInfo> {
    const payload = {
      ...req,
      ...(req.bankAccountLast5 !== undefined ? { bankAccountLast5: req.bankAccountLast5, bank_account_last5: req.bankAccountLast5 } : {}),
      ...(req.remittedAt !== undefined ? { remittedAt: req.remittedAt, remitted_at: req.remittedAt } : {}),
      ...(req.payInfo !== undefined ? { payInfo: req.payInfo, pay_info: req.payInfo } : {}),
    };

    try {
      const { data } = await http.put(`/api/payment/payments/${paymentId}`, payload);
      const normalized = normalizePaymentInfo(data);
      upsertLocalPayment(normalized);
      return normalized;
    } catch (e: any) {
      if (!isFallbackStatus(e?.response?.status)) throw e;

      const existing = readLocalPayments().find((item) => item.paymentId === paymentId);
      if (!existing) throw e;

      const updated = normalizePaymentInfo({
        ...existing,
        ...req,
        paymentId,
        updatedAt: new Date().toISOString(),
        payInfo: req.payInfo ?? existing.payInfo,
      });

      return upsertLocalPayment(updated);
    }
  },

  async approvePayment(paymentId: string): Promise<PaymentInfo> {
    try {
      const { data } = await http.patch(`/api/payment/payments/${encodeURIComponent(paymentId)}/approve`);

      if (data && typeof data === "object") {
        const normalized = normalizePaymentInfo(data);
        return upsertLocalPayment(normalized);
      }

      const existing = readLocalPayments().find((item) => item.paymentId === paymentId);
      const updated = normalizePaymentInfo({
        ...(existing ?? {}),
        paymentId,
        status: "SUCCEEDED",
        updatedAt: new Date().toISOString(),
      });
      return upsertLocalPayment(updated);
    } catch (e: any) {
      if (!isFallbackStatus(e?.response?.status)) throw e;

      const existing = readLocalPayments().find((item) => item.paymentId === paymentId);
      if (!existing) throw e;

      const updated = normalizePaymentInfo({
        ...existing,
        paymentId,
        status: "SUCCEEDED",
        updatedAt: new Date().toISOString(),
      });
      return upsertLocalPayment(updated);
    }
  },

  async deletePayment(paymentId: string): Promise<void> {
    try {
      await http.delete(`/api/payment/payments/${paymentId}`);
    } catch (e: any) {
      if (!isFallbackStatus(e?.response?.status)) throw e;
    }

    const next = readLocalPayments().filter((item) => item.paymentId !== paymentId);
    writeLocalPayments(next);
  },

  async createPaypalPayment(orderId: string): Promise<CreatePaypalPaymentResponse & { approveUrl: string }> {
    const { data } = await http.post<CreatePaypalPaymentResponse>("/api/payment/paypal/create", { orderId });
    const approveUrl = pickApproveUrl(data);

    if (!approveUrl) {
      throw new Error("建立 PayPal 付款失敗：缺少 approveUrl");
    }

    return {
      ...((data && typeof data === "object") ? data : {}),
      approveUrl,
    };
  },

  getNewebPayCheckoutUrl(paymentId: string): string {
    const path = `/api/payment/payments/newebpay/checkout/${encodeURIComponent(paymentId)}`;
    const baseUrl = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
    return `${baseUrl}${path}`;
  },

  async capturePaypalPayment(paypalOrderId: string): Promise<unknown> {
    const { data } = await http.post(`/api/payment/paypal/capture/${encodeURIComponent(paypalOrderId)}`);
    return data;
  },

  async submitBankTransferReport(req: BankTransferReportRequest): Promise<unknown> {
    const payload = {
      bankLastFive: req.bankAccountLast5,
      transferAt: req.remittedAt,
    };

    try {
      const { data } = await http.patch(`/api/payment/payments/bank-transfer/orders/${encodeURIComponent(req.orderId)}`, payload);

      if (data && typeof data === "object") {
        const existing = readLocalPayments().find((item) => item.orderId === req.orderId);
        const normalized = normalizePaymentInfo({
          ...(existing ?? {}),
          ...(data as Record<string, unknown>),
          orderId: req.orderId,
          provider: (data as Record<string, unknown>).provider ?? existing?.provider ?? "BANK_TRANSFER",
        });

        return upsertLocalPayment(normalized);
      }

      return data;
    } catch (e: any) {
      if (!isFallbackStatus(e?.response?.status)) throw e;

      const existing = readLocalPayments().find((item) => item.orderId === req.orderId);
      const now = new Date().toISOString();
      const updated = normalizePaymentInfo({
        ...(existing ?? {}),
        paymentId: existing?.paymentId ?? createLocalPaymentId(),
        orderId: req.orderId,
        provider: existing?.provider ?? "BANK_TRANSFER",
        status: existing?.status ?? "INIT",
        expireAt: existing?.expireAt ?? now,
        bankAccountLast5: req.bankAccountLast5,
        bankLastFive: req.bankAccountLast5,
        remittedAt: req.remittedAt,
        transferAt: req.remittedAt,
        updatedAt: now,
        createdAt: existing?.createdAt ?? now,
        payInfo: {
          ...(existing?.payInfo ?? {}),
          bankAccountLast5: req.bankAccountLast5,
          bankLastFive: req.bankAccountLast5,
          remittedAt: req.remittedAt,
          transferAt: req.remittedAt,
        },
      });

      return upsertLocalPayment(updated);
    }
  },
};
