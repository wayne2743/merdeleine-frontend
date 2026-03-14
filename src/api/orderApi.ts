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

  async myOrders(): Promise<OrderSummary[]> {
    const { data } = await http.get("/bff/my-orders");
    return data;
  },
};