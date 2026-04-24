import axios from "axios";

let tokenGetter: () => string | null = () => null;
let unauthorizedHandler: () => void = () => {};

export function setTokenGetter(getter: () => string | null) {
  tokenGetter = getter;
}

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

export const http = axios.create({
  baseURL: "",
  timeout: 15000,
});

function looksLikeHtml(data: unknown): boolean {
  return (
    typeof data === "string" &&
    /<!doctype html|<html[\s>]|<head[\s>]|<body[\s>]/i.test(data)
  );
}

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
  (res) => {
    const requestUrl = String(res?.config?.url ?? "");

    if (!requestUrl.includes("/auth/login") && looksLikeHtml(res?.data)) {
      unauthorizedHandler();
      return Promise.reject(new Error("登入已過期，請重新登入"));
    }

    return res;
  },
  (err) => {
    const status = err?.response?.status;
    const requestUrl = String(err?.config?.url ?? "");

    if ((status === 401 || status === 403) && !requestUrl.includes("/auth/login")) {
      unauthorizedHandler();
    }

    // 先簡單吐出訊息，之後可改 toast
    console.error("API error:", status, err?.message);
    return Promise.reject(err);
  }
);