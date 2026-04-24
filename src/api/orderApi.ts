import { http } from "./http";
import type { OrderSummary } from "../types/domain";

export type ReserveOrderRequest = {
  sellWindowId: string;
  productId: string;

  quantity: number;
  currency: string;
  unitPriceCents: number;
  customerId: string;
};

export const orderApi = {
  async reserveOrder(input: ReserveOrderRequest): Promise<{ orderId: string }> {

    const { data } = await http.post(
      "/api/order/orders",
      {
        ...input,
        status: "RESERVED"
      }
    );

    return data;
  },

  async myOrders(customerId: string): Promise<OrderSummary[]> {
    const { data } = await http.get<OrderSummary[]>(
      `/api/order/orders?customerId=${encodeURIComponent(customerId)}`
    );
    return data;
  },

  async listOrdersBySellWindow(sellWindowId: string): Promise<OrderSummary[]> {
    const { data } = await http.get<OrderSummary[]>("/api/order/orders", {
      params: { sellWindowId },
    });
    return data;
  },

  async updateOrderQty(orderId: string, quantity: number): Promise<void> {
    const payload = { quantity, qty: quantity };
    try {
      await http.patch(`/api/order/orders/${orderId}`, payload);
      return;
    } catch (e: any) {
      const status = e?.response?.status;
      if (status !== 404 && status !== 405) throw e;
    }

    await http.put(`/api/order/orders/${orderId}`, payload);
  },

  async deleteOrder(orderId: string): Promise<void> {
    await http.delete(`/api/order/orders/${orderId}`);
  },
};