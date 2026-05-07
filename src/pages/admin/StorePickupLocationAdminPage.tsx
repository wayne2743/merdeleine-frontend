import { useState, type FormEvent } from "react";
import { orderApi } from "../../api/orderApi";

type FormState = {
  name: string;
  address: string;
  contactPhone: string;
  active: boolean;
};

const INITIAL_FORM: FormState = {
  name: "",
  address: "",
  contactPhone: "",
  active: true,
};

function getErrorMessage(error: unknown): string {
  const e = error as {
    response?: {
      status?: number;
      data?: { message?: string; error?: string } | string;
    };
    message?: string;
  };

  if (typeof e?.response?.data === "string" && e.response.data.trim()) {
    return e.response.data;
  }

  if (e?.response?.data && typeof e.response.data === "object") {
    if (e.response.data.message) return e.response.data.message;
    if (e.response.data.error) return e.response.data.error;
  }

  if (e?.response?.status) {
    return `建立失敗（${e.response.status}），請確認欄位內容後再試`;
  }

  return e?.message || "建立失敗，請稍後再試";
}

export default function StorePickupLocationAdminPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(null);
    setError(null);

    const name = form.name.trim();
    const address = form.address.trim();
    const contactPhone = form.contactPhone.trim();

    if (!name) {
      setError("請輸入門市名稱");
      return;
    }

    if (!address) {
      setError("請輸入門市地址");
      return;
    }

    setSubmitting(true);
    try {
      await orderApi.createStorePickupLocation({
        name,
        address,
        contactPhone: contactPhone || undefined,
        active: form.active,
      });

      setSuccess("門市定點取貨資訊已建立");
      setForm(INITIAL_FORM);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 820 }}>
      <section
        style={{
          borderRadius: 18,
          border: "1px solid rgba(233, 210, 176, 0.28)",
          background:
            "radial-gradient(360px 160px at 8% -6%, rgba(255, 220, 164, 0.12), transparent 70%), rgba(22, 33, 29, 0.82)",
          padding: "24px 22px",
          boxShadow: "0 10px 26px rgba(14, 10, 7, 0.24)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            letterSpacing: "0.14em",
            color: "#e2c18f",
          }}
        >
          ADMIN
        </p>
        <h1
          style={{
            margin: "8px 0 4px",
            fontSize: 30,
            lineHeight: 1.2,
            color: "#f8e9cf",
            fontFamily: '"Playfair Display", "Noto Serif TC", serif',
          }}
        >
          新增門市定點取貨資訊
        </h1>
        <p style={{ margin: 0, color: "#e7dfd2", fontSize: 14 }}>
          由管理者建立可用的門市取貨點，供下單時選擇。
        </p>
      </section>

      <form
        onSubmit={onSubmit}
        style={{
          marginTop: 16,
          borderRadius: 18,
          border: "1px solid rgba(233, 210, 176, 0.2)",
          background: "rgba(255, 255, 255, 0.04)",
          padding: "22px",
          display: "grid",
          gap: 14,
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 13, color: "#e7dfd2" }}>門市名稱</span>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            maxLength={255}
            placeholder="例如：台北門市（忠孝東路）"
            disabled={submitting}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 13, color: "#e7dfd2" }}>門市地址</span>
          <textarea
            name="address"
            value={form.address}
            onChange={onChange}
            maxLength={1000}
            rows={3}
            placeholder="例如：台北市大安區忠孝東路四段181號"
            disabled={submitting}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 13, color: "#e7dfd2" }}>聯絡電話（選填）</span>
          <input
            name="contactPhone"
            value={form.contactPhone}
            onChange={onChange}
            maxLength={30}
            placeholder="例如：02-2771-2345"
            disabled={submitting}
          />
        </label>

        <label style={{ display: "inline-flex", gap: 8, alignItems: "center", color: "#e7dfd2", fontSize: 14 }}>
          <input
            type="checkbox"
            checked={form.active}
            disabled={submitting}
            onChange={(event) => {
              const checked = event.target.checked;
              setForm((prev) => ({ ...prev, active: checked }));
            }}
          />
          啟用此門市
        </label>

        {error && (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#f8b7ad",
              background: "rgba(173, 60, 48, 0.22)",
              border: "1px solid rgba(248, 183, 173, 0.26)",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            {error}
          </p>
        )}

        {success && (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#bde9c8",
              background: "rgba(43, 112, 64, 0.28)",
              border: "1px solid rgba(189, 233, 200, 0.3)",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            {success}
          </p>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
          <button type="submit" disabled={submitting} style={{ minWidth: 148 }}>
            {submitting ? "建立中..." : "建立門市"}
          </button>
        </div>
      </form>
    </div>
  );
}
