import { useEffect, useMemo, useState } from "react";
import { authApi, type UpdateProfilePayload } from "../../api/authApi";
import { useAuth } from "../../auth/AuthProvider";
import type { AuthUser } from "../../types/auth";

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

function pickUserString(user: AuthUser | null, ...keys: string[]): string {
  if (!user) return "";
  const raw = user as unknown as Record<string, unknown>;
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function mapUserToForm(user: AuthUser | null): ProfileForm {
  return {
    displayName: pickUserString(user, "displayName", "display_name"),
    contactName: pickUserString(user, "contactName", "contact_name", "name"),
    contactPhone: pickUserString(user, "contactPhone", "contact_phone", "phone"),
    contactEmail: pickUserString(user, "contactEmail", "contact_email", "email"),
    shippingAddress: pickUserString(user, "shippingAddress", "shipping_address", "address"),
  };
}

export default function ProfilePage() {
  const { user, refreshMe } = useAuth();

  const [form, setForm] = useState<ProfileForm>(() => mapUserToForm(user));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const userDefaults = useMemo(() => mapUserToForm(user), [user]);

  useEffect(() => {
    setForm(userDefaults);
  }, [userDefaults]);

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

    const displayName = trimOrEmpty(form.displayName);
    const contactName = trimOrEmpty(form.contactName);
    const contactPhone = trimOrEmpty(form.contactPhone);
    const contactEmail = trimOrEmpty(form.contactEmail);
    const shippingAddress = trimOrEmpty(form.shippingAddress);

    const defaults = userDefaults;

    const displayNameChanged = displayName !== defaults.displayName;
    const contactChanged =
      contactName !== defaults.contactName ||
      contactPhone !== defaults.contactPhone ||
      contactEmail !== defaults.contactEmail ||
      shippingAddress !== defaults.shippingAddress;

    if (!displayNameChanged && !contactChanged) {
      setError("目前沒有可更新的變更");
      return;
    }

    // /auth/me 更新聯絡資料時需要完整欄位，避免只改單欄造成後端覆蓋空值。
    if (contactChanged && (!contactName || !contactPhone || !contactEmail)) {
      setError("更新聯絡資料時，請填寫聯絡人姓名、聯絡電話與聯絡 Email");
      return;
    }

    setSubmitting(true);
    try {
      if (contactChanged) {
        await authApi.updateMe({
          contactName,
          contactPhone,
          contactEmail,
          shippingAddress,
        });
      }

      if (displayNameChanged) {
        const payload: UpdateProfilePayload = { displayName };
        await authApi.updateProfile(payload);
      }

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
