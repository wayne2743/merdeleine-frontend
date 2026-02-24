import { http } from "./http";
import type { PaymentInfo } from "../types/domain";

export const paymentApi = {
  async getPaymentByOrder(orderId: string): Promise<PaymentInfo> {
    const { data } = await http.get(`/bff/orders/${orderId}/payment`);
    return data;
  },
};