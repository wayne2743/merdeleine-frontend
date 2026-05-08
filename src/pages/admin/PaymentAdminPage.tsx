import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { paymentApi } from "../../api/paymentApi";
import type {
  PaymentCreateRequest,
  PaymentInfo,
  PaymentProvider,
  PaymentStatus,
  PaymentUpdateRequest,
} from "../../types/domain";

type PaymentForm = {
  paymentId: string | null;
  orderId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  expireAt: string;
  bankAccountLast5: string;
  remittedAt: string;
  note: string;
  payInfoText: string;
};

const PROVIDER_OPTIONS: PaymentProvider[] = ["BANK_TRANSFER", "PAYPAL", "ECPAY"];
const STATUS_OPTIONS: PaymentStatus[] = ["INIT", "SUCCEEDED", "FAILED", "EXPIRED"];

function toInputDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDefaultExpireAt(): string {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return toInputDateTime(date.toISOString());
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("zh-TW");
}

function formatProviderLabel(provider: PaymentProvider): string {
  if (provider === "BANK_TRANSFER") return "銀行轉帳";
  if (provider === "PAYPAL") return "PayPal";
  if (provider === "ECPAY") return "綠界 EcPay";
  return provider;
}

function formatStatusLabel(status: PaymentStatus): string {
  if (status === "INIT") return "待付款";
  if (status === "SUCCEEDED") return "已付款";
  if (status === "FAILED") return "付款失敗";
  if (status === "EXPIRED") return "已逾期";
  return status;
}

function toJsonText(value?: Record<string, any> | null): string {
  if (!value || Object.keys(value).length === 0) return "{}";
  return JSON.stringify(value, null, 2);
}

const INITIAL_FORM: PaymentForm = {
  paymentId: null,
  orderId: "",
  provider: "BANK_TRANSFER",
  status: "INIT",
  expireAt: toDefaultExpireAt(),
  bankAccountLast5: "",
  remittedAt: "",
  note: "",
  payInfoText: "{}",
};

function toForm(payment: PaymentInfo): PaymentForm {
  return {
    paymentId: payment.paymentId,
    orderId: payment.orderId,
    provider: payment.provider,
    status: payment.status,
    expireAt: toInputDateTime(payment.expireAt),
    bankAccountLast5: payment.bankAccountLast5 ?? "",
    remittedAt: toInputDateTime(payment.remittedAt),
    note: payment.note ?? "",
    payInfoText: toJsonText(payment.payInfo),
  };
}

const actionBtnBase: CSSProperties = {
  minWidth: 82,
  padding: "8px 14px",
  borderRadius: 999,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  border: "1px solid #d7b283",
  boxShadow: "0 6px 16px rgba(56, 33, 8, 0.14)",
};

export default function PaymentAdminPage() {
  const [items, setItems] = useState<PaymentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [approvingPaymentId, setApprovingPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentForm>(INITIAL_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [sellWindowFilter, setSellWindowFilter] = useState<"ALL" | string>("ALL");
  const [customerNameKeyword, setCustomerNameKeyword] = useState("");
  const [customerPhoneKeyword, setCustomerPhoneKeyword] = useState("");
  const [providerFilter, setProviderFilter] = useState<"ALL" | PaymentProvider>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | PaymentStatus>("ALL");

  const isEditMode = Boolean(form.paymentId);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const byExpire = (b.expireAt ?? "").localeCompare(a.expireAt ?? "");
      if (byExpire !== 0) return byExpire;
      return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
    });
  }, [items]);

  const sellWindowOptions = useMemo(() => {
    const map = new Map<string, string>();
    sortedItems.forEach((item) => {
      const id = (item.sellWindowId || item.sellWindowName || "").trim();
      if (!id) return;
      const label = (item.sellWindowName || item.sellWindowId || "").trim();
      map.set(id, label || id);
    });

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "zh-Hant"));
  }, [sortedItems]);

  async function loadPayments(targetPage: number, append = false) {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await paymentApi.pagePayments(targetPage, pageSize);
      const pageItems = Array.isArray(response.items) ? response.items : [];

      setItems((prev) => {
        if (!append) return pageItems;

        const map = new Map(prev.map((item) => [item.paymentId, item]));
        pageItems.forEach((item) => map.set(item.paymentId, item));
        return Array.from(map.values());
      });

      const totalCount = Number.isFinite(response.total) ? Number(response.total) : null;
      const loadedCount = targetPage * pageSize + pageItems.length;
      setHasMore(totalCount != null ? loadedCount < totalCount : pageItems.length >= pageSize);
      setPage(targetPage);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "讀取 payment 資訊失敗");
      if (!append) {
        setItems([]);
        setHasMore(false);
      }
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadPayments(0);
  }, []);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || loading || loadingMore) return;
        void loadPayments(page + 1, true);
      },
      { rootMargin: "200px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page]);

  function updateForm<K extends keyof PaymentForm>(key: K, value: PaymentForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function closeForm() {
    setForm(INITIAL_FORM);
    setFormOpen(false);
  }

  function openCreateForm() {
    setMessage(null);
    setForm(INITIAL_FORM);
    setFormOpen(true);
  }

  function openEditForm(item: PaymentInfo) {
    setMessage(null);
    setForm(toForm(item));
    setFormOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const orderId = form.orderId.trim();
    if (!orderId) {
      setMessage("請填寫 orderId");
      return;
    }

    const expireAt = new Date(form.expireAt);
    if (!form.expireAt || Number.isNaN(expireAt.getTime())) {
      setMessage("請填寫正確的到期時間");
      return;
    }

    let remittedAtIso: string | null = null;
    if (form.remittedAt.trim()) {
      const remittedDate = new Date(form.remittedAt);
      if (Number.isNaN(remittedDate.getTime())) {
        setMessage("匯款時間格式不正確");
        return;
      }
      remittedAtIso = remittedDate.toISOString();
    }

    let payInfo: Record<string, any> = {};
    try {
      const rawText = form.payInfoText.trim();
      if (rawText) {
        const parsed = JSON.parse(rawText);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("payInfo 必須是 JSON 物件");
        }
        payInfo = parsed as Record<string, any>;
      }
    } catch (err: any) {
      setMessage(err?.message ?? "payInfo JSON 格式錯誤");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const payload: PaymentCreateRequest | PaymentUpdateRequest = {
        orderId,
        provider: form.provider,
        status: form.status,
        expireAt: expireAt.toISOString(),
        bankAccountLast5: form.bankAccountLast5.trim() || null,
        remittedAt: remittedAtIso,
        note: form.note.trim() || null,
        payInfo,
      };

      if (form.paymentId) {
        await paymentApi.updatePayment(form.paymentId, payload);
        setMessage("payment 資訊已更新");
      } else {
        await paymentApi.createPayment(payload as PaymentCreateRequest);
        setMessage("payment 資訊已建立");
      }

      closeForm();
      await loadPayments(0);
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message ?? (form.paymentId ? "更新 payment 失敗" : "建立 payment 失敗"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onApprove(item: PaymentInfo) {
    if (submitting || approvingPaymentId) return;

    const ok = window.confirm(`確定將這筆 payment 標記為已收款？\npaymentId：${item.paymentId}`);
    if (!ok) return;

    setApprovingPaymentId(item.paymentId);
    setMessage(null);
    try {
      const updated = await paymentApi.approvePayment(item.paymentId);
      setItems((prev) => prev.map((current) => current.paymentId === item.paymentId ? updated : current));
      setMessage("已確認收款");
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message ?? "確認收款失敗");
    } finally {
      setApprovingPaymentId(null);
    }
  }

  async function onDelete(item: PaymentInfo) {
    if (submitting || approvingPaymentId) return;
    const ok = window.confirm(`確定刪除 payment「${item.paymentId}」？`);
    if (!ok) return;

    setSubmitting(true);
    setMessage(null);
    try {
      await paymentApi.deletePayment(item.paymentId);
      setMessage("payment 資訊已刪除");
      await loadPayments(0);
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message ?? "刪除 payment 失敗");
    } finally {
      setSubmitting(false);
    }
  }

  const normalizedCustomerNameKeyword = customerNameKeyword.trim().toLowerCase();
  const normalizedCustomerPhoneKeyword = customerPhoneKeyword.trim().toLowerCase();
  const hasActiveFilters = providerFilter !== "ALL" || statusFilter !== "ALL" || sellWindowFilter !== "ALL" || normalizedCustomerNameKeyword.length > 0 || normalizedCustomerPhoneKeyword.length > 0;

  const filteredItems = sortedItems.filter((item) => {
    const customerName = (item.customerName || "").toLowerCase();
    const customerPhone = (item.customerPhone || "").toLowerCase();
    const sellWindowValue = (item.sellWindowId || item.sellWindowName || "").trim();

    const matchesSellWindow = sellWindowFilter === "ALL" || sellWindowValue === sellWindowFilter;
    const matchesCustomerName = !normalizedCustomerNameKeyword || customerName.includes(normalizedCustomerNameKeyword);
    const matchesCustomerPhone = !normalizedCustomerPhoneKeyword || customerPhone.includes(normalizedCustomerPhoneKeyword);
    const matchesProvider = providerFilter === "ALL" || item.provider === providerFilter;
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;

    return matchesSellWindow && matchesCustomerName && matchesCustomerPhone && matchesProvider && matchesStatus;
  });

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Payment 資訊管理（CRUD）</h2>
          <div style={{ color: "#eadfbd", fontSize: 13 }}>
            payment list 目前改由 `GET /payments/enriched` 載入，並顯示支付方式、狀態、到期時間、匯款後五碼與匯款時間等資訊。
          </div>
        </div>
        <button type="button" onClick={openCreateForm} disabled={submitting}>
          新增 Payment
        </button>
      </div>

      <div style={{ color: "#eadfbd", fontSize: 13 }}>
        向下滑動頁面時會自動載入更多 payment 資料。
      </div>

      {message && <div style={{ color: "#f4e1bf", fontSize: 13 }}>{message}</div>}
      {error && <div style={{ color: "#ffd3c8", fontSize: 13 }}>讀取錯誤：{error}</div>}

      <div
        style={{
          display: "flex",
          alignItems: "end",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          padding: "12px 14px",
          borderRadius: 12,
          background: "rgba(255, 248, 239, 0.92)",
          border: "1px solid rgba(224, 191, 147, 0.65)",
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", flex: 1 }}>
          <label style={{ display: "grid", gap: 4, minWidth: 180, color: "#4f3927", fontSize: 13 }}>
            檔期名稱
            <select value={sellWindowFilter} onChange={(e) => setSellWindowFilter(e.target.value)}>
              <option value="ALL">全部檔期</option>
              {sellWindowOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4, minWidth: 160, color: "#4f3927", fontSize: 13 }}>
            支付方式
            <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value as "ALL" | PaymentProvider)}>
              <option value="ALL">全部方式</option>
              {PROVIDER_OPTIONS.map((provider) => (
                <option key={provider} value={provider}>{formatProviderLabel(provider)}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4, minWidth: 150, color: "#4f3927", fontSize: 13 }}>
            狀態
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | PaymentStatus)}>
              <option value="ALL">全部狀態</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{formatStatusLabel(status)}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4, minWidth: 170, color: "#4f3927", fontSize: 13 }}>
            客戶姓名
            <input value={customerNameKeyword} onChange={(e) => setCustomerNameKeyword(e.target.value)} placeholder="輸入客戶姓名" />
          </label>

          <label style={{ display: "grid", gap: 4, minWidth: 170, color: "#4f3927", fontSize: 13 }}>
            客戶電話
            <input value={customerPhoneKeyword} onChange={(e) => setCustomerPhoneKeyword(e.target.value)} placeholder="輸入客戶電話" />
          </label>
        </div>

        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
          <button
            type="button"
            onClick={() => {
              setSellWindowFilter("ALL");
              setCustomerNameKeyword("");
              setCustomerPhoneKeyword("");
              setProviderFilter("ALL");
              setStatusFilter("ALL");
            }}
            disabled={!hasActiveFilters}
          >
            清除篩選
          </button>
        </div>
      </div>

      <div style={{ borderRadius: 14, overflowX: "auto", border: "1px solid #eadfcd", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", color: "#2f241b", minWidth: 920 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              <th style={{ padding: 10 }}>檔期名稱</th>
              <th style={{ padding: 10 }}>支付方式</th>
              <th style={{ padding: 10 }}>狀態</th>
              <th style={{ padding: 10 }}>到期時間</th>
              <th style={{ padding: 10 }}>匯款後五碼</th>
              <th style={{ padding: 10 }}>匯款時間</th>
              <th style={{ padding: 10 }}>客戶姓名</th>
              <th style={{ padding: 10 }}>客戶電話</th>
              <th style={{ padding: 10 }}>客戶 Email</th>
              <th style={{ padding: 10, width: 280 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: 12 }}>載入中...</td>
              </tr>
            )}

            {!loading && filteredItems.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: 12 }}>
                  {items.length === 0 ? "目前沒有 payment 資料" : "查無符合篩選條件的 payment 資料"}
                </td>
              </tr>
            )}

            {!loading && filteredItems.map((item) => (
              <tr key={item.paymentId} style={{ borderBottom: "1px solid #f1ebe2" }}>
                <td style={{ padding: 10 }}>
                  <div style={{ fontWeight: 600 }}>{item.sellWindowName || "-"}</div>
                </td>
                <td style={{ padding: 10 }}>{formatProviderLabel(item.provider)}</td>
                <td style={{ padding: 10 }}>{formatStatusLabel(item.status)}</td>
                <td style={{ padding: 10 }}>{formatDateTime(item.expireAt)}</td>
                <td style={{ padding: 10 }}>{item.bankAccountLast5 || "-"}</td>
                <td style={{ padding: 10 }}>{formatDateTime(item.remittedAt)}</td>
                <td style={{ padding: 10 }}>{item.customerName || "-"}</td>
                <td style={{ padding: 10 }}>{item.customerPhone || "-"}</td>
                <td style={{ padding: 10 }}>{item.customerEmail || "-"}</td>
                <td style={{ padding: 10 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {item.provider === "BANK_TRANSFER" && item.status !== "SUCCEEDED" && (
                      <button
                        type="button"
                        onClick={() => void onApprove(item)}
                        disabled={submitting || approvingPaymentId === item.paymentId}
                        style={{ ...actionBtnBase, background: "linear-gradient(180deg, #eef9f1 0%, #cfead8 100%)", color: "#2d6a4f", border: "1px solid #93c5a7" }}
                      >
                        {approvingPaymentId === item.paymentId ? "確認中..." : "確認收款"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditForm(item)}
                      disabled={submitting || Boolean(approvingPaymentId)}
                      style={{ ...actionBtnBase, background: "linear-gradient(180deg, #f6ead6 0%, #ecd1ab 100%)", color: "#5f4528" }}
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(item)}
                      disabled={submitting || Boolean(approvingPaymentId)}
                      style={{ ...actionBtnBase, background: "linear-gradient(180deg, #fff4f2 0%, #ffdcd5 100%)", color: "#ba3b2f" }}
                    >
                      刪除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        ref={loadMoreRef}
        style={{
          minHeight: 24,
          textAlign: "center",
          color: "#eadfbd",
          fontSize: 13,
        }}
      >
        {loadingMore ? "載入更多資料中..." : hasMore ? "向下滑動可自動載入更多" : items.length > 0 ? "已載入目前所有資料" : ""}
      </div>

      {formOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.42)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(780px, 100%)",
              maxHeight: "86vh",
              overflow: "auto",
              padding: 18,
              borderRadius: 12,
              border: "1px solid #eadfcd",
              background: "#fff",
              color: "#2f241b",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.22)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{isEditMode ? "編輯 Payment" : "新增 Payment"}</div>
              <button type="button" onClick={closeForm} disabled={submitting} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>
                ×
              </button>
            </div>

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span>orderId</span>
                  <input value={form.orderId} onChange={(e) => updateForm("orderId", e.target.value)} required />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span>provider</span>
                  <select value={form.provider} onChange={(e) => updateForm("provider", e.target.value)}>
                    {PROVIDER_OPTIONS.map((provider) => (
                      <option key={provider} value={provider}>{provider}</option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span>status</span>
                  <select value={form.status} onChange={(e) => updateForm("status", e.target.value as PaymentStatus)}>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span>expireAt</span>
                  <input type="datetime-local" value={form.expireAt} onChange={(e) => updateForm("expireAt", e.target.value)} required />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span>銀行帳號後 5 碼</span>
                  <input value={form.bankAccountLast5} maxLength={5} onChange={(e) => updateForm("bankAccountLast5", e.target.value.replace(/\D/g, "").slice(0, 5))} />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span>匯款時間</span>
                  <input type="datetime-local" value={form.remittedAt} onChange={(e) => updateForm("remittedAt", e.target.value)} />
                </label>
              </div>

              <label style={{ display: "grid", gap: 4 }}>
                <span>備註</span>
                <textarea value={form.note} onChange={(e) => updateForm("note", e.target.value)} rows={3} maxLength={500} />
              </label>

              <label style={{ display: "grid", gap: 4 }}>
                <span>payInfo（JSON）</span>
                <textarea value={form.payInfoText} onChange={(e) => updateForm("payInfoText", e.target.value)} rows={8} spellCheck={false} style={{ fontFamily: "Consolas, monospace" }} />
              </label>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="submit" disabled={submitting}>{submitting ? "處理中..." : isEditMode ? "儲存修改" : "建立 Payment"}</button>
                <button type="button" onClick={closeForm} disabled={submitting}>取消</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
