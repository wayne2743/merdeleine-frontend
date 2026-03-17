import { http } from "./http";
import type { AuthMeResponse } from "../types/auth";

export type RegisterPayload = {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  shippingAddress: string;
};

export const authApi = {
  async me(): Promise<AuthMeResponse> {
    const { data } = await http.get<AuthMeResponse>("/auth/me");
    return data;
  },

  /**
   * 完成新用戶註冊。tempToken 來自 OAuth2 redirect 的 URL query param。
   * 後端會回傳新的 MeResponse + 長效 JWT。
   */
  async register(tempToken: string, payload: RegisterPayload): Promise<AuthMeResponse> {
    const { data } = await http.post<AuthMeResponse>("/auth/register", payload, {
      headers: { Authorization: `Bearer ${tempToken}` },
    });
    return data;
  },

  // 如果你的後端不是 /logout，改成你的實際端點
  async logout(): Promise<void> {
    await http.post("/logout");
  },

  startGoogleLogin() {
    window.location.href = "/oauth2/authorization/google";
  },
};