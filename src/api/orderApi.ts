import { http } from "./http";
import type { OrderSummary } from "../types/domain";

export const orderApi = {
  async reserveOrder(input: { sellWindowId: string; productId: string; qty: number }): Promise<{ orderId: string }> {
    const { data } = await http.post("/orders", { ...input, status: "RESERVED" });
    return data;
  },

  async myOrders(): Promise<OrderSummary[]> {
    const { data } = await http.get("/bff/my-orders");
    return data;
  },
};