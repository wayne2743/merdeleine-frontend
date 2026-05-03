import { useMemo, useState } from "react";
import { authApi, type UpdateProfilePayload } from "../../api/authApi";
import { useAuth } from "../../auth/AuthProvider";

type ProfileForm = {
  displayName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  shippingAddress: string;
};

function trimOrEmpty(value: string) {
  return value.trim();
}

export default function ProfilePage() {
  const { user, refreshMe } = useAuth();

  const [form, setForm] = useState<ProfileForm>({
    displayName: user?.displayName ?? "",
    contactName: "",
    contactPhone: "",
    contactEmail: user?.email ?? "",
    shippingAddress: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasAnyValue = useMemo(
    () => Object.values(form).some((value) => value.trim().length > 0),
    [form]
  );

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const payload: UpdateProfilePayload = {};

    const displayName = trimOrEmpty(form.displayName);
    const contactName = trimOrEmpty(form.contactName);
    const contactPhone = trimOrEmpty(form.contactPhone);
    const contactEmail = trimOrEmpty(form.contactEmail);
    const shippingAddress = trimOrEmpty(form.shippingAddress);

    if (displayName) payload.displayName = displayName;
    if (contactName) payload.contactName = contactName;
    if (contactPhone) payload.contactPhone = contactPhone;
    if (contactEmail) payload.contactEmail = contactEmail;
    if (shippingAddress) payload.shippingAddress = shippingAddress;

    if (Object.keys(payload).length === 0) {
      setError("請至少填寫一個要更新的欄位");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.updateProfile(payload);
      await refreshMe();
      setSuccess("資料已更新");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string }; status?: number } };
      const msg =
        axiosErr?.response?.data?.message ??
        `更新失敗（${axiosErr?.response?.status ?? "網路錯誤"}），請稍後再試`;
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-header">
          <p className="register-kicker">Profile</p>
          <h1 className="register-title">編輯個人資料</h1>
          <p className="register-subtitle">
            可只修改需要變更的欄位，按下儲存後會送出到系統。
          </p>
        </div>

        <form className="register-form" onSubmit={onSubmit} noValidate>
          <div className="register-field">
            <label htmlFor="displayName">顯示名稱</label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              placeholder="例如：Alice"
              value={form.displayName}
              onChange={onChange}
              disabled={submitting}
              autoComplete="nickname"
            />
          </div>

          <div className="register-field">
            <label htmlFor="contactName">聯絡人姓名</label>
            <input
              id="contactName"
              name="contactName"
              type="text"
              placeholder="例如：Alice Chen"
              value={form.contactName}
              onChange={onChange}
              disabled={submitting}
              autoComplete="name"
            />
          </div>

          <div className="register-field">
            <label htmlFor="contactPhone">聯絡電話</label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              placeholder="0912345678"
              value={form.contactPhone}
              onChange={onChange}
              disabled={submitting}
              autoComplete="tel"
            />
          </div>

          <div className="register-field">
            <label htmlFor="contactEmail">聯絡 Email</label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              placeholder="alice@example.com"
              value={form.contactEmail}
              onChange={onChange}
              disabled={submitting}
              autoComplete="email"
            />
          </div>

          <div className="register-field">
            <label htmlFor="shippingAddress">收貨地址</label>
            <textarea
              id="shippingAddress"
              name="shippingAddress"
              placeholder="台北市信義區..."
              value={form.shippingAddress}
              onChange={onChange}
              disabled={submitting}
              rows={3}
              autoComplete="street-address"
            />
          </div>

          {!hasAnyValue && <p className="register-hint">尚未輸入任何變更內容</p>}
          {error && <p className="register-error">{error}</p>}
          {success && <p className="register-success">{success}</p>}

          <button type="submit" className="register-submit" disabled={submitting}>
            {submitting ? "儲存中..." : "儲存變更"}
          </button>
        </form>
      </div>
    </div>
  );
}
