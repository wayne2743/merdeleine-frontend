import { http } from "./http";

export const planningApi = {
  async confirmBatch(sellWindowId: string): Promise<{ ok: boolean }> {
    const { data } = await http.post(`/batches/${sellWindowId}/confirm`);
    return data;
  },
};