import { http } from "./http";
import type { CounterSnapshot } from "../types/domain";

export const aggregatorApi = {
  async getSnapshot(sellWindowId: string, productId: string): Promise<CounterSnapshot> {
    const { data } = await http.get(`/internal/counters/${sellWindowId}/${productId}/snapshot`);
    return data;
  },
};