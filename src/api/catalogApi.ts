import { http } from "./http";
import type { SellWindowSummary } from "../types/domain";
import type { PageResponse } from "../types/page";
import type { ProductSellWindowView } from "../types/domain";
import type {
  Product,
  ProductImage,
  AutoGroupOrderRequest,
  AutoGroupOrderResponse,
} from "../types/domain";


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
    const { data } = await http.get<PageResponse<ProductSellWindowView>>(
      `/api/catalog/views/product-sell-windows?page=${page}&size=${size}`
    );

    // 防呆：如果回來是 HTML，代表 proxy/baseURL 打錯
    if (typeof (data as any) === "string" && (data as any).trim().startsWith("<!doctype html")) {
      throw new Error("API returned HTML. Proxy/baseURL is wrong.");
    }

    return data;
  },

  async getProductSellWindowView(productSellWindowId: string): Promise<ProductSellWindowView> {
    const { data } = await http.get(`/api/catalog/views/product-sell-windows/${productSellWindowId}`);
    if (typeof data === "string" && data.trim().startsWith("<!doctype html")) {
      throw new Error("API returned HTML. Proxy/baseURL is wrong.");
    }
    return data;
  },

  async listProducts(): Promise<Product[]> {
    const { data } = await http.get<Product[]>("/api/catalog/products");
    return data;
  },

  async listProductImages(productId: string): Promise<ProductImage[]> {
    const { data } = await http.get<ProductImage[]>(`/api/catalog/products/${productId}/images`);
    return data;
  },

  async autoGroupOrder(req: AutoGroupOrderRequest): Promise<AutoGroupOrderResponse> {
    const { data } = await http.post<AutoGroupOrderResponse>(
      "/api/catalog/customer/auto-group-orders",
      req
    );
    return data;
  },

};