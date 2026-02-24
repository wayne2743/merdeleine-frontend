export type SellWindowStatus = "OPEN" | "CLOSED" | "PAYMENT_OPEN" | "FINALIZED";

export interface SellWindowSummary {
    id: string;
    name: string;
    startAt: string;
    endAt: string;
    timezone: string;

}

// src/types/domain.ts
export type ProductSellWindowView = {
  sellWindowId: string;
  sellWindowName: string;
  startAt: string;
  endAt: string;
  timezone: string;
  paymentCloseAt?: string | null;

  productId: string;
  productName: string;

  minQty: number;
  maxQty?: number | null;

  soldQty: number;
  quotaStatus: string; // OPEN/CLOSED
  quotaUpdatedAt?: string | null;
};

export type OrderStatus = "RESERVED" | "PAYMENT_REQUESTED" | "PAID" | "EXPIRED";

export interface OrderSummary {
  orderId: string;
  sellWindowId: string;
  productId: string;
  productName: string;

  qty: number;
  status: OrderStatus;

  paymentDueAt?: string; // equals paymentCloseAt after batch.confirmed
}

export interface PaymentInfo {
  paymentId: string;
  orderId: string;
  provider: string;
  status: "INIT" | "SUCCEEDED" | "FAILED" | "EXPIRED";
  expireAt: string;
  // 可能是 URL、超商代碼、ATM 虛擬帳號等
  payInfo: Record<string, any>;
}

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
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
};

export type AutoGroupOrderRequest = {
  productId: string;
  qty: number;
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