import { http } from "./http";
import type { OrderSummary } from "../types/domain";

export type DeliveryMethod =
  | "STORE_PICKUP"
  | "CONVENIENCE_STORE_PICKUP"
  | "HOME_DELIVERY";

export type StorePickupDelivery = {
  deliveryMethod: "STORE_PICKUP";
  pickupLocationId: string;
  pickupLocationName?: string;
  pickupLocationAddress: string;
  pickupTime: string;
};

export type ConvenienceStorePickupDelivery = {
  deliveryMethod: "CONVENIENCE_STORE_PICKUP";
  convenienceStoreCode: string;
  convenienceStoreName: string;
  convenienceStoreAddress: string;
};

export type HomeDelivery = {
  deliveryMethod: "HOME_DELIVERY";
  homeDeliveryAddress: string;
};

export type OrderDeliveryRequest =
  | StorePickupDelivery
  | ConvenienceStorePickupDelivery
  | HomeDelivery;

export type ReserveOrderRequest = {
  sellWindowId: string;
  productId: string;

  quantity: number;
  currency: string;
  unitPriceCents: number;
  customerId: string;
  delivery: OrderDeliveryRequest;
};

export type StorePickupLocationRequest = {
  name: string;
  address: string;
  contactPhone?: string;
  active?: boolean;
};

export type StorePickupLocationResponse = {
  id?: string;
  name?: string;
  address?: string;
  contactPhone?: string | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const orderApi = {
  async reserveOrder(input: ReserveOrderRequest): Promise<{ orderId: string }> {

    const { data } = await http.post(
      "/api/order/orders",
      {
        ...input,
        status: "PAYMENT_REQUESTED"
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

  async listPublicStorePickupLocations(): Promise<StorePickupLocationResponse[]> {
    const { data } = await http.get<unknown>("/api/order/store-pickup-locations");
    const list: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.content)
        ? (data as any).content
        : Array.isArray((data as any)?.items)
          ? (data as any).items
          : [];
    return list as StorePickupLocationResponse[];
  },

  async listStorePickupLocations(): Promise<StorePickupLocationResponse[]> {
    const { data } = await http.get<unknown>(
      "/api/order/admin/store-pickup-locations"
    );
    const list: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.content)
        ? (data as any).content
        : Array.isArray((data as any)?.items)
          ? (data as any).items
          : [];
    return list as StorePickupLocationResponse[];
  },

  async createStorePickupLocation(
    payload: StorePickupLocationRequest
  ): Promise<StorePickupLocationResponse> {
    const { data } = await http.post<StorePickupLocationResponse>(
      "/api/order/admin/store-pickup-locations",
      payload
    );
    return data;
  },

  async updateStorePickupLocation(
    id: string,
    payload: StorePickupLocationRequest
  ): Promise<StorePickupLocationResponse> {
    const { data } = await http.put<StorePickupLocationResponse>(
      `/api/order/admin/store-pickup-locations/${id}`,
      payload
    );
    return data;
  },
};
