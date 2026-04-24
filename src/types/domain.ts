export type SellWindowStatus = "OPEN" | "CLOSED" | "FINISHED";

export interface SellWindowSummary {
  sellWindowId: string;
  productName: string;
  status: SellWindowStatus;
  soldQty: number;
  minQty: number;
  maxQty?: number | null;
  orderCloseAt: string;
  paymentCloseAt?: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
}

// src/types/domain.ts
export type ProductSellWindowView = {
  productSellWindowId: string;

  sellWindowId: string;
  sellWindowName: string;
  startAt: string;
  endAt: string;
  predictedShipDate?: string | null;
  shipDays?: number | null;
  leadDays?: number | null;
  isClosed?: boolean | null;
  timezone: string;
  paymentCloseAt?: string | null;
  status?: SellWindowStatus | null;
  sellWindowStatus?: SellWindowStatus | null;
  sell_window_status?: SellWindowStatus | null;

  productId: string;
  productName: string;
  unitPriceCents: number;
  currency: string;

  minQty: number;
  maxQty?: number | null;

  soldQty: number;
  quotaStatus: string; // OPEN/CLOSED
  quotaUpdatedAt?: string | null;
};

export type ProductSellWindowCreateRequest = {
  productId: string;
  sellWindowId: string;
  minTotalQty: number;
  maxTotalQty?: number | null;
  leadDays?: number | null;
  shipDays?: number | null;
  isClosed?: boolean | null;
};

export type ProductSellWindowWithSellWindowCreateRequest = {
  productId: string;
  sellWindow: {
    name: string;
    startAt: string;
    endAt: string;
    timezone: string;
    predictedPaymentDate?: string | null;
    predictedProdDate?: string | null;
    predictedShipDate?: string | null;
  };
  minTotalQty: number;
  maxTotalQty?: number | null;
  leadDays?: number | null;
  shipDays?: number | null;
  isClosed?: boolean | null;
};

export type OrderStatus = "RESERVED" | "PAYMENT_REQUESTED" | "PAID" | "EXPIRED";

export interface OrderSummary {
  orderId: string;
  sellWindowId: string;
  productId: string;
  productName: string;

  qty: number;
  status: OrderStatus;
  createdAt?: string;
  totalAmountCents?: number;

  paymentDueAt?: string; // equals paymentCloseAt after batch.confirmed
}

export type PaymentStatus = "INIT" | "SUCCEEDED" | "FAILED" | "EXPIRED";

export type PaymentProvider = "BANK_TRANSFER" | "PAYPAL" | "ECPAY" | string;

export interface PaymentInfo {
  paymentId: string;
  orderId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amountCents?: number | null;
  currency?: string | null;
  providerPaymentId?: string | null;
  providerCaptureId?: string | null;
  approveUrl?: string | null;
  expireAt: string;
  expiredAt?: string | null;
  bankAccountLast5?: string | null;
  remittedAt?: string | null;
  note?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  sellWindowId?: string | null;
  sellWindowName?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  // 可能是 URL、超商代碼、ATM 虛擬帳號等
  payInfo: Record<string, any>;
}

export type PaymentCreateRequest = {
  orderId: string;
  provider: PaymentProvider;
  status?: PaymentStatus;
  expireAt: string;
  bankAccountLast5?: string | null;
  remittedAt?: string | null;
  note?: string | null;
  payInfo?: Record<string, any>;
};

export type PaymentUpdateRequest = Partial<PaymentCreateRequest>;

export interface CounterSnapshot {
  sellWindowId: string;
  productId: string;
  reservedQty: number;
  paidQty: number;
  thresholdQty: number;
  status: "OPEN" | "REACHED";
  asOfTs: string;
}

export type Product = {
  id: string;
  name: string;
  description?: string | null;
  unitPriceCents?: number | null;
  currency?: string | null;
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
  defaultMinQty?: number | null;
  defaultMaxQty?: number | null;
  defaultOpenDays?: number | null;
  defaultLeadDays?: number | null;
  defaultShipDays?: number | null;
};

export type ProductCreateRequest = {
  name: string;
  description?: string;
  status?: "DRAFT" | "ACTIVE" | "INACTIVE";
  unitPriceCents: number;
  currency: string;
  defaultMinQty?: number | null;
  defaultMaxQty?: number | null;
  defaultOpenDays?: number | null;
  defaultLeadDays?: number | null;
  defaultShipDays?: number | null;
};

export type ProductUpdateRequest = {
  name?: string;
  description?: string;
  status?: "DRAFT" | "ACTIVE" | "INACTIVE";
  unitPriceCents?: number;
  currency?: string;
  defaultMinQty?: number | null;
  defaultMaxQty?: number | null;
  defaultOpenDays?: number | null;
  defaultLeadDays?: number | null;
  defaultShipDays?: number | null;
};

export type ProductImage = {
  id: string;
  productId: string;
  imageType: "MAIN" | "THUMBNAIL" | "GALLERY" | "DETAIL" | "ORIGINAL" | string;
  sortOrder: number;
  cdnUrl: string;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  width: number;
  height: number;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductImageUploadRequest = {
  file: File;
  imageType: string;
  sortOrder: number;
  isPrimary: boolean;
  isActive: boolean;
};

export type ProductImageUpdateRequest = {
  sortOrder: number;
  isActive: boolean;
};

export type SellWindowResponse = {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  timezone: string;
  status: SellWindowStatus;
  paymentTtlMinutes: number;
  paymentOpenAt?: string | null;
  paymentCloseAt?: string | null;
};

export type SellWindowCreateRequest = {
  name: string;
  startAt: string;
  endAt: string;
  timezone: string;
};

export type SellWindowUpdateRequest = {
  name: string;
  startAt: string;
  endAt: string;
  timezone: string;
};

export type AutoGroupOrderRequest = {
  productId: string;
  qty: number;
  customerId: string;
  predictedGroupOpenAt: string;
  predictedGroupEndAt: string;
  leadsDay: number;
  shipDay: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  shippingAddress?: string;
};

export type AutoGroupOrderResponse = {
  sellWindowId: string;
  orderId: string;
  status: string; // RESERVED
  sellWindow: {
    startAt: string;
    endAt: string;
    timezone: string;
  };
};

export type NextGroupOpenAtResponse = {
  product_id: string;
  next_group_open_at: string;
  default_min_qty: number;
  default_max_qty: number | null;
  default_open_days?: number | null;
  default_leads_day: number;
  default_ship_day: number;
};

export type SellWindowNextGroupOpenAtResponse =
  | string
  | {
      nextGroupOpenAt?: string | null;
      next_group_open_at?: string | null;
      startAt?: string | null;
      start_at?: string | null;
      endAt?: string | null;
      end_at?: string | null;
      [key: string]: unknown;
    }
  | null;

export type OpenProductSellWindowResponse =
  | string
  | {
      uuid?: string | null;
      productSellWindowId?: string | null;
      sellWindowId?: string | null;
      id?: string | null;
      [key: string]: unknown;
    }
  | null;

export type ProductionBatchStatus =
  | "CREATED"
  | "CONFIRMED"
  | "SCHEDULED"
  | "IN_PRODUCTION"
  | "COMPLETED"
  | "CANCELLED"
  | string;

export type ProductionBatch = {
  id: string;
  sellWindowId: string;
  productId: string;
  targetQty: number;
  status: ProductionBatchStatus;
  createdAt?: string | null;
  confirmedAt?: string | null;
  orderLinkCount: number;
  hasSchedule: boolean;
};

export type ProductionBatchCreateRequest = {
  sellWindowId: string;
  productId: string;
  targetQty: number;
};

export type ProductionBatchUpdateRequest = Partial<ProductionBatchCreateRequest>;