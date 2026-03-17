import axios from "axios";

let tokenGetter: () => string | null = () => null;

export function setTokenGetter(getter: () => string | null) {
  tokenGetter = getter;
}

export const http = axios.create({
  baseURL: "",
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = tokenGetter();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

// 你也可以在這邊統一加 token / traceId
http.interceptors.response.use(
  (res) => res,
  (err) => {
    // 先簡單吐出訊息，之後可改 toast
    console.error("API error:", err?.response?.status, err?.message);
    return Promise.reject(err);
  }
);