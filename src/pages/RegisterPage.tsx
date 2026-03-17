import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authApi, type RegisterPayload } from "../api/authApi";
import { useAuth } from "../auth/AuthProvider";

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { status, applyAuthResponse } = useAuth();

  // 取得 OAuth2 後端 redirect 帶來的臨時 JWT
  const tempToken = searchParams.get("token") ?? "";

  const [form, setForm] = useState<RegisterPayload>({
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    shippingAddress: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 如果已完整登入「且」不在新用戶流程（URL 沒有 token），才導離此頁。
  // 有 tempToken 時代表正在走 OAuth 新用戶流程，即使 /auth/me 仍回傳 authenticated
  // （後端可能維持了部分 session），也不應在此時跳走 —— 讓使用者完成填表再跳。
  useEffect(() => {
    if (status === "authenticated" && !tempToken) {
      navigate("/customer/products", { replace: true });
    }
  }, [status, tempToken, navigate]);

  // 如果沒有臨時 token 且非 authenticated，導回登入
  useEffect(() => {
    if (status !== "loading" && !tempToken && status !== "authenticated") {
      navigate("/login", { replace: true });
    }
  }, [status, tempToken, navigate]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.contactName.trim()) {
      setError("請輸入聯絡人姓名");
      return;
    }
    if (!form.contactPhone.trim()) {
      setError("請輸入聯絡電話");
      return;
    }
    if (!form.contactEmail.trim()) {
      setError("請輸入聯絡 Email");
      return;
    }
    if (!form.shippingAddress.trim()) {
      setError("請輸入收貨地址");
      return;
    }

    setSubmitting(true);
    try {
      const meResponse = await authApi.register(tempToken, form);
      applyAuthResponse(meResponse);
      navigate("/customer/products", { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string }; status?: number } };
      const msg =
        axiosErr?.response?.data?.message ??
        `註冊失敗（${axiosErr?.response?.status ?? "網路錯誤"}），請稍後再試`;
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" || !tempToken) {
    return null;
  }

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-header">
          <p className="register-kicker">Welcome</p>
          <h1 className="register-title">完成您的資料</h1>
          <p className="register-subtitle">
            首次登入需填寫以下資料，之後下單時將自動帶入。
          </p>
        </div>

        <form className="register-form" onSubmit={handleSubmit} noValidate>
          <div className="register-field">
            <label htmlFor="contactName">聯絡人姓名 *</label>
            <input
              id="contactName"
              name="contactName"
              type="text"
              placeholder="王小明"
              value={form.contactName}
              onChange={handleChange}
              disabled={submitting}
              autoComplete="name"
            />
          </div>

          <div className="register-field">
            <label htmlFor="contactPhone">聯絡電話 *</label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              placeholder="0912-345-678"
              value={form.contactPhone}
              onChange={handleChange}
              disabled={submitting}
              autoComplete="tel"
            />
          </div>

          <div className="register-field">
            <label htmlFor="contactEmail">聯絡 Email *</label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              placeholder="example@mail.com"
              value={form.contactEmail}
              onChange={handleChange}
              disabled={submitting}
              autoComplete="email"
            />
          </div>

          <div className="register-field">
            <label htmlFor="shippingAddress">預設收貨地址 *</label>
            <textarea
              id="shippingAddress"
              name="shippingAddress"
              placeholder="台北市信義區信義路五段7號"
              value={form.shippingAddress}
              onChange={handleChange}
              disabled={submitting}
              rows={3}
              autoComplete="street-address"
            />
          </div>

          {error && <p className="register-error">{error}</p>}

          <button type="submit" className="register-submit" disabled={submitting}>
            {submitting ? "送出中…" : "完成註冊"}
          </button>
        </form>
      </div>
    </div>
  );
}
