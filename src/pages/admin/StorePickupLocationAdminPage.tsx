import { useEffect, useState, type FormEvent } from "react";
import { orderApi, type StorePickupLocationResponse } from "../../api/orderApi";

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
  const [locations, setLocations] = useState<StorePickupLocationResponse[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  async function loadLocations() {
    setListLoading(true);
    setListError(null);
    try {
      const data = await orderApi.listStorePickupLocations();
      setLocations(data);
    } catch {
      setListError("讀取門市列表失敗，請稍後再試");
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    void loadLocations();
  }, []);

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
      void loadLocations();
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
          border: "1px solid #e6d8c6",
          background: "linear-gradient(180deg, #fffdf9 0%, #faf3e9 100%)",
          padding: "22px",
          display: "grid",
          gap: 14,
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 13, color: "#5f4c3b", fontWeight: 700 }}>門市名稱</span>
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
          <span style={{ fontSize: 13, color: "#5f4c3b", fontWeight: 700 }}>門市地址</span>
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
          <span style={{ fontSize: 13, color: "#5f4c3b", fontWeight: 700 }}>聯絡電話（選填）</span>
          <input
            name="contactPhone"
            value={form.contactPhone}
            onChange={onChange}
            maxLength={30}
            placeholder="例如：02-2771-2345"
            disabled={submitting}
          />
        </label>

        <label style={{ display: "inline-flex", gap: 8, alignItems: "center", color: "#5f4c3b", fontSize: 14, fontWeight: 600 }}>
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
              color: "#9f3e3e",
              background: "#fff1ef",
              border: "1px solid #efc1c1",
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
              color: "#2f7f49",
              background: "#e9f7ee",
              border: "1px solid #b9e2c7",
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

      {/* 門市列表 */}
      <section
        style={{
          marginTop: 24,
          borderRadius: 18,
          border: "1px solid #e6d8c6",
          background: "linear-gradient(180deg, #fffdf9 0%, #faf3e9 100%)",
          padding: "22px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 17, color: "#4a3829" }}>目前門市列表</h2>
          <button
            type="button"
            onClick={() => void loadLocations()}
            disabled={listLoading}
            style={{
              minWidth: 72,
              padding: "6px 14px",
              fontSize: 13,
              borderRadius: 999,
            }}
          >
            {listLoading ? "載入中..." : "重新整理"}
          </button>
        </div>

        {listError && (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#9f3e3e",
              background: "#fff1ef",
              border: "1px solid #efc1c1",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            {listError}
          </p>
        )}

        {!listLoading && !listError && locations.length === 0 && (
          <p style={{ margin: 0, color: "#8b7562", fontSize: 14 }}>尚未建立任何門市</p>
        )}

        {locations.length > 0 && (
          <div style={{ display: "grid", gap: 10 }}>
            {locations.map((loc, index) => (
              <div
                key={loc.id ?? index}
                style={{
                  borderRadius: 12,
                  border: "1px solid #e5d6c2",
                  background: "#fff",
                  padding: "14px 16px",
                  display: "grid",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{ fontSize: 15, fontWeight: 700, color: "#4b392a" }}
                  >
                    {loc.name ?? "-"}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: loc.active
                        ? "#e9f7ee"
                        : "#f4f0ea",
                      color: loc.active ? "#2f7f49" : "#7b6d60",
                      border: loc.active
                        ? "1px solid #b9e2c7"
                        : "1px solid #d9cec0",
                    }}
                  >
                    {loc.active ? "啟用中" : "已停用"}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#5f4c3b" }}>
                  {loc.address ?? "-"}
                </div>
                {loc.contactPhone && (
                  <div style={{ fontSize: 12, color: "#7b6a59" }}>
                    {loc.contactPhone}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
