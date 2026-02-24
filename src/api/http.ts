import axios from "axios";

export const http = axios.create({
  baseURL: "",
  timeout: 15000,
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