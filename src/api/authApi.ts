import { http } from "./http";
import type { AuthMeResponse } from "../types/auth";

const OAUTH_BASE_URL = import.meta.env.VITE_OAUTH_BASE_URL ?? "http://localhost:8089";

export type RegisterPayload = {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  shippingAddress: string;
};

export type UpdateProfilePayload = {
  displayName?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  shippingAddress?: string;
};

export type BatchUserProfile = {
  customerId: string;
  name: string;
  phone: string;
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

  async updateMe(payload: RegisterPayload): Promise<AuthMeResponse> {
    const { data } = await http.put<AuthMeResponse>("/auth/me", payload);
    return data;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<void> {
    await http.put("/auth/profile", payload);
  },

  // 如果你的後端不是 /logout，改成你的實際端點
  async logout(): Promise<void> {
    await http.post("/logout");
  },

  async getUsersByCustomerIds(customerIds: string[]): Promise<BatchUserProfile[]> {
    if (customerIds.length === 0) return [];

    const { data } = await http.post<unknown>("/auth/users/batch", { customerIds });

    const list: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.users)
        ? (data as any).users
        : [];

    return list
      .map((raw) => {
        if (!raw || typeof raw !== "object") return null;
        const value = raw as Record<string, unknown>;

        const customerId = String(value.customerId ?? value.customer_id ?? value.id ?? "").trim();
        if (!customerId) return null;

        const name = String(
          value.name ?? value.contactName ?? value.contact_name ?? value.displayName ?? value.display_name ?? "-"
        ).trim() || "-";

        const phone = String(value.phone ?? value.contactPhone ?? value.contact_phone ?? "-").trim() || "-";

        return { customerId, name, phone } as BatchUserProfile;
      })
      .filter((item): item is BatchUserProfile => item !== null);
  },

  startGoogleLogin() {
    window.location.href = `${OAUTH_BASE_URL}/oauth2/authorization/google`;
  },

  startFacebookLogin() {
    window.location.href = `${OAUTH_BASE_URL}/oauth2/authorization/facebook`;
  },

  startLineLogin() {
    window.location.href = `${OAUTH_BASE_URL}/oauth2/authorization/line`;
  },
};