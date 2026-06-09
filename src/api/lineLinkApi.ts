import axios from "axios";

export type StartLineLinkResponse = {
  /** LINE 帳號連動確認頁網址，前端需整頁導向此網址 */
  accountLinkUrl: string;
};

/**
 * LINE 帳號綁定使用獨立的 axios 實例。
 *
 * 為什麼不共用 src/api/http.ts？
 * - 共用的 http 實例在收到 503 時會視為「後端離線」而自動登出；
 *   但綁定流程的 503 代表「後端 LINE token 未設定」，屬於可重試錯誤，
 *   不應該把使用者登出。
 *
 * 認證方式：
 * - 帶上 Authorization Bearer（與其他 API 一致），API gateway 會從 JWT
 *   解析出會員身分並自動附加 X-USER-ID。
 * - 前端「不要」自己帶 X-USER-ID。
 */
const lineHttp = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
  withCredentials: true,
  timeout: 15000,
});

lineHttp.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("accessToken");
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

export const lineLinkApi = {
  /** 開始綁定，回傳 LINE 帳號連動網址 */
  async start(lineUserId: string): Promise<StartLineLinkResponse> {
    const { data } = await lineHttp.post<StartLineLinkResponse>(
      "/api/members/me/line/link/start",
      { lineUserId }
    );
    return data;
  },

  /** 解除綁定 */
  async unlink(): Promise<void> {
    await lineHttp.delete("/api/members/me/line/link");
  },
};
