import { useEffect, useState, type FormEvent } from "react";
import { authApi } from "../../api/authApi";
import { catalogApi } from "../../api/catalogApi";
import { orderApi } from "../../api/orderApi";
import type {
  OrderSummary,
  Product,
  ProductSellWindowView,
  SellWindowNextGroupOpenAtResponse,
  SellWindowResponse,
  SellWindowStatus,
} from "../../types/domain";

const TIMEZONES = [
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
];

const STATUS_LABEL: Record<SellWindowStatus, string> = {
  OPEN: "開放",
  CLOSED: "已關閉",
  FINISHED: "已完成",
};

function toInputDt(isoStr?: string | null): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmt(isoStr?: string | null): string {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("zh-TW");
}

function addDays(isoStr: string, days: number): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function extractNextSellWindowOpenAt(payload: SellWindowNextGroupOpenAtResponse): string | null {
  if (typeof payload === "string") {
    return payload.trim() || null;
  }

  if (!payload || typeof payload !== "object") return null;

  const raw = payload as Record<string, unknown>;
  const candidates = [
    raw.nextGroupOpenAt,
    raw.next_group_open_at,
    raw.startAt,
    raw.start_at,
    raw.endAt,
    raw.end_at,
    (raw.data as Record<string, unknown> | undefined)?.nextGroupOpenAt,
    (raw.data as Record<string, unknown> | undefined)?.next_group_open_at,
    (raw.data as Record<string, unknown> | undefined)?.startAt,
    (raw.data as Record<string, unknown> | undefined)?.start_at,
    (raw.data as Record<string, unknown> | undefined)?.endAt,
    (raw.data as Record<string, unknown> | undefined)?.end_at,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function isSellWindowStatus(value: unknown): value is SellWindowStatus {
  return value === "OPEN" || value === "CLOSED" || value === "FINISHED";
}

function getSellWindowStatus(item: ProductSellWindowView): SellWindowStatus | null {
  const rawStatus = item.status ?? item.sellWindowStatus ?? item.sell_window_status;
  return isSellWindowStatus(rawStatus) ? rawStatus : null;
}

function toSellWindowResponse(item: ProductSellWindowView): SellWindowResponse {
  return {
    id: item.sellWindowId,
    name: item.sellWindowName,
    startAt: item.startAt,
    endAt: item.endAt,
    timezone: item.timezone,
    status: getSellWindowStatus(item) ?? "CLOSED",
    paymentTtlMinutes: 0,
    paymentOpenAt: null,
    paymentCloseAt: item.paymentCloseAt ?? null,
  };
}

function getOrderCustomerId(order: OrderSummary): string {
  const raw = (order as OrderSummary & { customerId?: string; customer_id?: string }).customerId
    ?? (order as OrderSummary & { customerId?: string; customer_id?: string }).customer_id;
  return typeof raw === "string" && raw.trim() ? raw : "";
}

function getOrderContactName(order: OrderSummary): string {
  const raw = (order as OrderSummary & {
    contactName?: string;
    contact_name?: string;
    customerName?: string;
    customer_name?: string;
  }).contactName
    ?? (order as OrderSummary & {
      contactName?: string;
      contact_name?: string;
      customerName?: string;
      customer_name?: string;
    }).contact_name
    ?? (order as OrderSummary & {
      contactName?: string;
      contact_name?: string;
      customerName?: string;
      customer_name?: string;
    }).customerName
    ?? (order as OrderSummary & {
      contactName?: string;
      contact_name?: string;
      customerName?: string;
      customer_name?: string;
    }).customer_name;
  return typeof raw === "string" && raw.trim() ? raw : "-";
}

function getOrderContactPhone(order: OrderSummary): string {
  const raw = (order as OrderSummary & {
    contactPhone?: string;
    contact_phone?: string;
    phone?: string;
  }).contactPhone
    ?? (order as OrderSummary & {
      contactPhone?: string;
      contact_phone?: string;
      phone?: string;
    }).contact_phone
    ?? (order as OrderSummary & {
      contactPhone?: string;
      contact_phone?: string;
      phone?: string;
    }).phone;
  return typeof raw === "string" && raw.trim() ? raw : "-";
}

function getOrderQty(order: OrderSummary): number | null {
  const raw = (order as OrderSummary & { quantity?: number }).qty
    ?? (order as OrderSummary & { quantity?: number }).quantity;
  return Number.isFinite(raw) ? Number(raw) : null;
}

function getOrderTotalAmountCents(order: OrderSummary): number | null {
  const raw = (order as OrderSummary & {
    total_amount_cents?: number;
    totalPriceCents?: number;
    total_price_cents?: number;
    amountCents?: number;
    amount_cents?: number;
  }).totalAmountCents
    ?? (order as OrderSummary & {
      total_amount_cents?: number;
      totalPriceCents?: number;
      total_price_cents?: number;
      amountCents?: number;
      amount_cents?: number;
    }).total_amount_cents
    ?? (order as OrderSummary & {
      total_amount_cents?: number;
      totalPriceCents?: number;
      total_price_cents?: number;
      amountCents?: number;
      amount_cents?: number;
    }).totalPriceCents
    ?? (order as OrderSummary & {
      total_amount_cents?: number;
      totalPriceCents?: number;
      total_price_cents?: number;
      amountCents?: number;
      amount_cents?: number;
    }).total_price_cents
    ?? (order as OrderSummary & {
      total_amount_cents?: number;
      totalPriceCents?: number;
      total_price_cents?: number;
      amountCents?: number;
      amount_cents?: number;
    }).amountCents
    ?? (order as OrderSummary & {
      total_amount_cents?: number;
      totalPriceCents?: number;
      total_price_cents?: number;
      amountCents?: number;
      amount_cents?: number;
    }).amount_cents;

  if (Number.isFinite(raw)) return Number(raw);

  const qty = getOrderQty(order);
  const unitPrice = (order as OrderSummary & { unitPriceCents?: number; unit_price_cents?: number }).unitPriceCents
    ?? (order as OrderSummary & { unitPriceCents?: number; unit_price_cents?: number }).unit_price_cents;

  if (qty !== null && Number.isFinite(unitPrice)) return qty * Number(unitPrice);

  return null;
}

type Form = {
  name: string;
  startAt: string;
  endAt: string;
  timezone: string;
  productId: string;
  minTotalQty: string;
  maxTotalQty: string;
  leadDays: string;
  shipDays: string;
  isClosed: boolean;
};

const EMPTY_FORM: Form = {
  name: "",
  startAt: "",
  endAt: "",
  timezone: "Asia/Taipei",
  productId: "",
  minTotalQty: "1",
  maxTotalQty: "1",
  leadDays: "0",
  shipDays: "0",
  isClosed: false,
};

type OrderModalState = {
  open: boolean;
  loading: boolean;
  error: string | null;
  sellWindowId: string;
  sellWindowName: string;
  orders: OrderSummary[];
};

export default function SellWindowCrudPage() {
  const [items, setItems] = useState<ProductSellWindowView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [defaultTimeLoading, setDefaultTimeLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | SellWindowStatus>("ALL");
  const [productKeyword, setProductKeyword] = useState("");
  const [orderModal, setOrderModal] = useState<OrderModalState>({
    open: false,
    loading: false,
    error: null,
    sellWindowId: "",
    sellWindowName: "",
    orders: [],
  });
  const [customerById, setCustomerById] = useState<Record<string, { name: string; phone: string }>>({});
  const [formModalOpen, setFormModalOpen] = useState(false);

  async function load(targetPage = page) {
    setLoading(true);
    setError(null);
    try {
      const response = await catalogApi.pageProductSellWindows(targetPage, pageSize);
      const pageItems = Array.isArray(response.items) ? response.items : [];
      setItems(
        pageItems.slice().sort((a, b) => {
          const aStart = typeof a.startAt === "string" ? a.startAt : "";
          const bStart = typeof b.startAt === "string" ? b.startAt : "";
          return aStart.localeCompare(bStart);
        }),
      );
      setTotal(Number.isFinite(response.total) ? response.total : pageItems.length);
    } catch (e: any) {
      setError(e?.message ?? "讀取失敗");
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const data = await catalogApi.listProducts();
      const next = Array.isArray(data) ? data.slice() : [];
      next.sort((a, b) => (a.name || "").localeCompare(b.name || "", "zh-Hant"));
      setProducts(next);
    } catch (e: any) {
      setProductsError(e?.response?.data?.message ?? e?.message ?? "商品載入失敗");
    } finally {
      setProductsLoading(false);
    }
  }

  async function prefillNextSellWindowTimes() {
    if (editingId) return;

    setDefaultTimeLoading(true);
    try {
      const payload = await catalogApi.getNextSellWindowOpenAt();
      const nextOpenAt = extractNextSellWindowOpenAt(payload);
      if (!nextOpenAt) return;

      const nextEndAt = addDays(nextOpenAt, 7);
      if (!nextEndAt) return;

      setForm((prev) => {
        if (editingId) return prev;
        return {
          ...prev,
          startAt: toInputDt(nextOpenAt),
          endAt: toInputDt(nextEndAt),
        };
      });
    } catch (e) {
      console.error("prefill next sell window time failed", e);
    } finally {
      setDefaultTimeLoading(false);
    }
  }

  useEffect(() => {
    void load(page);
  }, [page]);

  useEffect(() => {
    void prefillNextSellWindowTimes();
  }, []);

  useEffect(() => {
    void loadProducts();
  }, []);

  function startEdit(item: SellWindowResponse) {
    setEditingId(item.id);
    setForm({
      ...EMPTY_FORM,
      name: item.name,
      startAt: toInputDt(item.startAt),
      endAt: toInputDt(item.endAt),
      timezone: item.timezone,
    });
    setFormError(null);
    setFormModalOpen(true);
  }

  function openFormModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormModalOpen(true);
    if (products.length === 0 && !productsLoading) {
      void loadProducts();
    }
    void prefillNextSellWindowTimes();
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormModalOpen(false);
  }

  function getProductDefaultFormValues(
    productId: string,
  ): (Pick<Form, "minTotalQty" | "maxTotalQty" | "leadDays" | "shipDays"> & { openDays: number }) | null {
    const selectedProduct = products.find((product) => product.id === productId);
    if (!selectedProduct) return null;

    const minTotalQty = selectedProduct.defaultMinQty != null ? String(selectedProduct.defaultMinQty) : "1";
    const rawOpenDays = Number(selectedProduct.defaultOpenDays ?? 7);
    const openDays = Number.isFinite(rawOpenDays) && rawOpenDays >= 1 ? Math.floor(rawOpenDays) : 7;

    return {
      minTotalQty,
      maxTotalQty: selectedProduct.defaultMaxQty != null ? String(selectedProduct.defaultMaxQty) : minTotalQty,
      leadDays: selectedProduct.defaultLeadDays != null ? String(selectedProduct.defaultLeadDays) : "0",
      shipDays: selectedProduct.defaultShipDays != null ? String(selectedProduct.defaultShipDays) : "0",
      openDays,
    };
  }

  function change(field: keyof Form, value: string) {
    setForm((prev) => {
      if (field === "productId") {
        const defaults = getProductDefaultFormValues(value);

        let nextEndAt = prev.endAt;
        if (defaults && prev.startAt) {
          const startDate = new Date(prev.startAt);
          if (!Number.isNaN(startDate.getTime())) {
            const computedEndAt = addDays(startDate.toISOString(), defaults.openDays);
            if (computedEndAt) {
              nextEndAt = toInputDt(computedEndAt);
            }
          }
        }

        return {
          ...prev,
          productId: value,
          ...(defaults
            ? {
                minTotalQty: defaults.minTotalQty,
                maxTotalQty: defaults.maxTotalQty,
                leadDays: defaults.leadDays,
                shipDays: defaults.shipDays,
                endAt: nextEndAt,
              }
            : {}),
        };
      }

      if (field === "minTotalQty") {
        const nextMin = value.trim();
        const nextMinNum = Number(nextMin);
        const currentMaxNum = Number(prev.maxTotalQty);
        const shouldSyncMax = !prev.maxTotalQty.trim() || (!Number.isNaN(nextMinNum) && currentMaxNum < nextMinNum);

        return {
          ...prev,
          [field]: value,
          ...(shouldSyncMax ? { maxTotalQty: nextMin } : {}),
        };
      }

      return { ...prev, [field]: value };
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) { setFormError("請輸入檔期名稱"); return; }
    if (!form.startAt) { setFormError("請選擇開始時間"); return; }
    if (!form.endAt) { setFormError("請選擇結束時間"); return; }
    if (new Date(form.endAt) <= new Date(form.startAt)) {
      setFormError("結束時間必須晚於開始時間");
      return;
    }

    let minTotalQty = 0;
    let maxTotalQty: number | null = null;
    let leadDays: number | null = null;
    let shipDays: number | null = null;

    if (!editingId) {
      if (!form.productId) {
        setFormError("請先選擇商品");
        return;
      }

      minTotalQty = Number(form.minTotalQty);
      if (!Number.isInteger(minTotalQty) || minTotalQty < 1) {
        setFormError("最少到量需為大於 0 的整數");
        return;
      }

      if (!form.maxTotalQty.trim()) {
        setFormError("請輸入最大量；目前後端不接受空值");
        return;
      }

      maxTotalQty = Number(form.maxTotalQty);
      if (!Number.isInteger(maxTotalQty) || maxTotalQty < 1) {
        setFormError("最大量需為大於 0 的整數");
        return;
      }
      if (maxTotalQty < minTotalQty) {
        setFormError("最大量不可小於最少到量");
        return;
      }

      if (form.leadDays.trim()) {
        leadDays = Number(form.leadDays);
        if (!Number.isInteger(leadDays) || leadDays < 0) {
          setFormError("提前天數需為 0 以上整數");
          return;
        }
      }

      if (form.shipDays.trim()) {
        shipDays = Number(form.shipDays);
        if (!Number.isInteger(shipDays) || shipDays < 0) {
          setFormError("出貨天數需為 0 以上整數");
          return;
        }
      }
    }

    const sellWindowReq = {
      name: form.name.trim(),
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      timezone: form.timezone,
    };

    setSubmitting(true);
    try {
      if (editingId) {
        await catalogApi.updateSellWindow(editingId, sellWindowReq);
      } else {
        const predictedPaymentDate = addDays(sellWindowReq.endAt, 1) || sellWindowReq.endAt;
        const predictedProdDate = addDays(predictedPaymentDate, leadDays ?? 0) || predictedPaymentDate;
        const predictedShipDate = addDays(predictedProdDate, shipDays ?? 0) || predictedProdDate;

        await catalogApi.createProductSellWindowWithSellWindow({
          productId: form.productId,
          sellWindow: {
            ...sellWindowReq,
            predictedPaymentDate,
            predictedProdDate,
            predictedShipDate,
          },
          minTotalQty,
          maxTotalQty,
          leadDays,
          shipDays,
          isClosed: form.isClosed,
        });
      }
      setFormModalOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (e: any) {
      const message =
        e?.response?.data?.message
        ?? e?.response?.data?.error
        ?? (typeof e?.response?.data === "string" ? e.response.data : null)
        ?? e?.message
        ?? "操作失敗";

      console.error("create sell window flow failed", e);
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(item: SellWindowResponse) {
    if (!window.confirm(`確定刪除檔期「${item.name}」？此操作無法還原。`)) return;
    try {
      await catalogApi.deleteSellWindow(item.id);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? e?.message ?? "刪除失敗");
    }
  }

  async function openOrders(item: SellWindowResponse) {
    setOrderModal({
      open: true,
      loading: true,
      error: null,
      sellWindowId: item.id,
      sellWindowName: item.name,
      orders: [],
    });

    try {
      const data = await orderApi.listOrdersBySellWindow(item.id);
      setOrderModal((prev) => ({ ...prev, loading: false, orders: data }));

      const customerIds = [...new Set(data.map((order) => getOrderCustomerId(order)).filter(Boolean))];
      if (customerIds.length > 0) {
        const profiles = await authApi.getUsersByCustomerIds(customerIds);
        setCustomerById((prev) => {
          const next = { ...prev };
          profiles.forEach((p) => {
            next[p.customerId] = { name: p.name, phone: p.phone };
          });
          return next;
        });
      }
    } catch (e: any) {
      const fallback =
        "目前後端尚未提供依檔期查詢訂單的 API（需支援 /api/order/orders?sellWindowId=...）。";
      setOrderModal((prev) => ({
        ...prev,
        loading: false,
        error: e?.response?.data?.message ?? e?.message ?? fallback,
      }));
    }
  }

  function closeOrders() {
    setOrderModal((prev) => ({ ...prev, open: false }));
  }

  function formatMoney(cents?: number | null, currency?: string | null): string {
    if (typeof cents !== "number") return "-";
    return new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency: currency || "TWD",
      maximumFractionDigits: 2,
    }).format(cents);
  }

  const orderModalTotalAmountCents = orderModal.orders.reduce((sum, order) => {
    const amount = getOrderTotalAmountCents(order);
    return sum + (amount ?? 0);
  }, 0);

  const isEdit = editingId !== null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedProductKeyword = productKeyword.trim().toLowerCase();
  const hasActiveFilters = statusFilter !== "ALL" || normalizedProductKeyword.length > 0;
  const filteredItems = items.filter((item) => {
    const itemStatus = getSellWindowStatus(item);
    const matchesStatus = statusFilter === "ALL" || itemStatus === statusFilter;
    const productName = typeof item.productName === "string" ? item.productName : "";
    const matchesProduct = !normalizedProductKeyword || productName.toLowerCase().includes(normalizedProductKeyword);
    return matchesStatus && matchesProduct;
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>檔期 CRUD 管理</h2>
        <button
          type="button"
          onClick={openFormModal}
          style={btnPrimary}
        >
          + 新增檔期
        </button>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div>載入中...</div>
      ) : error ? (
        <div style={{ color: "crimson" }}>{error}</div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ color: "#666", fontSize: 13 }}>
              顯示第 {page + 1} / {totalPages} 頁，共 {total} 筆
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                disabled={page === 0}
                style={btnSecondary}
              >
                上一頁
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
                disabled={page + 1 >= totalPages}
                style={btnSecondary}
              >
                下一頁
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "end",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
              flexWrap: "wrap",
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(255, 248, 239, 0.92)",
              border: "1px solid rgba(224, 191, 147, 0.65)",
            }}
          >
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", flex: 1 }}>
              <label style={{ ...labelStyle, minWidth: 170, color: "#4f3927", fontSize: 13 }}>
                狀態篩選
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "ALL" | SellWindowStatus)}
                  style={inputStyle}
                >
                  <option value="ALL">全部狀態</option>
                  <option value="OPEN">開放</option>
                  <option value="CLOSED">已關閉</option>
                  <option value="FINISHED">已完成</option>
                </select>
              </label>

              <label style={{ ...labelStyle, minWidth: 220, flex: "1 1 240px", color: "#4f3927", fontSize: 13 }}>
                商品名稱篩選
                <input
                  type="text"
                  value={productKeyword}
                  onChange={(e) => setProductKeyword(e.target.value)}
                  placeholder="輸入商品名稱關鍵字"
                  style={inputStyle}
                />
              </label>
            </div>

            <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
              <div style={{ color: "#6b5a47", fontSize: 13 }}>
                篩選結果：{filteredItems.length} 筆
              </div>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("ALL");
                  setProductKeyword("");
                }}
                style={btnSecondary}
                disabled={!hasActiveFilters}
              >
                清除篩選
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                {["檔期名稱", "商品名稱", "商品售價", "開始", "結束", "時區", "狀態", "操作"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", borderBottom: "2px solid #ddd" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 16, color: "#888", textAlign: "center" }}>
                    {items.length === 0 ? "目前沒有任何資料。" : "查無符合篩選條件的資料。"}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const sellWindow = toSellWindowResponse(item);
                  const status = getSellWindowStatus(item);

                  return (
                    <tr
                      key={item.productSellWindowId || item.sellWindowId}
                      style={{
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <td style={{ padding: "10px 12px", fontWeight: 500 }}>{item.sellWindowName}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div>{item.productName || "-"}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: "#777" }}>
                          已售 {item.soldQty} / {item.maxQty ?? "-"}，最低成團 {item.minQty}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>{formatMoney(item.unitPriceCents, item.currency)}</td>
                      <td style={{ padding: "10px 12px" }}>{fmt(item.startAt)}</td>
                      <td style={{ padding: "10px 12px" }}>{fmt(item.endAt)}</td>
                      <td style={{ padding: "10px 12px", color: "#666" }}>{item.timezone}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 12,
                              background:
                                status === "OPEN"
                                  ? "#e6f4ea"
                                  : status === "FINISHED"
                                    ? "#e8ebf5"
                                  : "#f0f0f0",
                              color:
                                status === "OPEN"
                                  ? "#2e7d32"
                                  : status === "FINISHED"
                                    ? "#41507a"
                                  : "#666",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {status ? (STATUS_LABEL[status] ?? status) : "-"}
                          </span>
                          <span style={{ fontSize: 12, color: "#777" }}>名額：{item.quotaStatus}</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
                          <button
                            type="button"
                            onClick={() => openOrders(sellWindow)}
                            style={{ ...btnSmall, ...btnSmallInfo }}
                          >
                            查看訂單
                          </button>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => startEdit(sellWindow)}
                              style={{ ...btnSmall, ...btnSmallEdit }}
                            >
                              編輯
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(sellWindow)}
                              style={{ ...btnSmall, ...btnSmallDanger }}
                            >
                              刪除
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </>
      )}

      {/* ── Form Modal ── */}
      {formModalOpen && (
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
              width: "min(600px, 100%)",
              maxHeight: "82vh",
              overflow: "auto",
              background: "#fff",
              borderRadius: 10,
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
              padding: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{isEdit ? "編輯檔期" : "新增檔期"}</h3>
              <button
                type="button"
                onClick={() => cancelEdit()}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 22,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
                aria-label="close"
              >
                ×
              </button>
            </div>

            {!isEdit && defaultTimeLoading && (
              <div style={{ marginBottom: 12, color: "#8a6a27", fontSize: 13 }}>正在載入預設檔期時間...</div>
            )}
            {formError && (
              <div style={{ marginBottom: 12, color: "crimson", fontSize: 14 }}>{formError}</div>
            )}
            <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
              <label style={labelStyle}>
                檔期名稱 *
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => change("name", e.target.value)}
                  placeholder="例：2025 春季特賣檔期"
                  style={inputStyle}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={labelStyle}>
                  開始時間 *
                  <input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(e) => change("startAt", e.target.value)}
                    style={inputStyle}
                  />
                </label>
                <label style={labelStyle}>
                  結束時間 *
                  <input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(e) => change("endAt", e.target.value)}
                    style={inputStyle}
                  />
                </label>
              </div>

              <label style={labelStyle}>
                時區
                <select
                  value={form.timezone}
                  onChange={(e) => change("timezone", e.target.value)}
                  style={inputStyle}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </label>

              {!isEdit && (
                <>
                  <label style={labelStyle}>
                    商品 *
                    <select
                      value={form.productId}
                      onChange={(e) => change("productId", e.target.value)}
                      style={inputStyle}
                      disabled={productsLoading}
                    >
                      <option value="">{productsLoading ? "商品載入中..." : "請選擇商品"}</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}（{formatMoney(product.unitPriceCents ?? null, product.currency ?? "TWD")} / {product.status}）
                        </option>
                      ))}
                    </select>
                  </label>

                  {productsError && (
                    <div style={{ color: "crimson", fontSize: 13 }}>{productsError}</div>
                  )}

                  {!productsError && (
                    <div style={{ color: "#6b5a47", fontSize: 12, marginTop: -4 }}>
                      選擇商品後，會自動帶入該商品的 `defaultMinQty`、`defaultMaxQty`、`defaultOpenDays`、`defaultLeadDays`、`defaultShipDays`。
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <label style={labelStyle}>
                      最少到量 *
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={form.minTotalQty}
                        onChange={(e) => change("minTotalQty", e.target.value)}
                        style={inputStyle}
                      />
                    </label>
                    <label style={labelStyle}>
                      最大量 *
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={form.maxTotalQty}
                        onChange={(e) => change("maxTotalQty", e.target.value)}
                        placeholder="請輸入最大量"
                        style={inputStyle}
                        required
                      />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <label style={labelStyle}>
                      提前天數
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={form.leadDays}
                        onChange={(e) => change("leadDays", e.target.value)}
                        style={inputStyle}
                      />
                    </label>
                    <label style={labelStyle}>
                      出貨天數
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={form.shipDays}
                        onChange={(e) => change("shipDays", e.target.value)}
                        style={inputStyle}
                      />
                    </label>
                  </div>

                  <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={form.isClosed}
                      onChange={(e) => setForm((prev) => ({ ...prev, isClosed: e.target.checked }))}
                    />
                    建立後先關閉此商品檔期
                  </label>
                </>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="submit" disabled={submitting} style={btnPrimary}>
                  {submitting ? "處理中..." : isEdit ? "儲存變更" : "新增檔期"}
                </button>
                <button type="button" onClick={() => cancelEdit()} style={btnSecondary}>
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Orders Modal ── */}
      {orderModal.open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeOrders}
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
              width: "min(920px, 100%)",
              maxHeight: "82vh",
              overflow: "auto",
              background: "#fff",
              borderRadius: 10,
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
              padding: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>檔期訂單詳情 - {orderModal.sellWindowName}</h3>
              <button
                type="button"
                onClick={closeOrders}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 22,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
                aria-label="close"
              >
                ×
              </button>
            </div>

            <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
              sellWindowId: {orderModal.sellWindowId}
            </div>

            <div style={{ marginTop: 14 }}>
              {orderModal.loading && <div>訂單載入中...</div>}

              {!orderModal.loading && orderModal.error && (
                <div style={{ color: "crimson", lineHeight: 1.7 }}>{orderModal.error}</div>
              )}

              {!orderModal.loading && !orderModal.error && orderModal.orders.length === 0 && (
                <div style={{ color: "#666" }}>此檔期目前沒有訂單。</div>
              )}

              {!orderModal.loading && !orderModal.error && orderModal.orders.length > 0 && (
                <>
                  <div
                    style={{
                      marginBottom: 10,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #e6d4bd",
                      background: "#fff7eb",
                      color: "#5b3c1f",
                      fontWeight: 700,
                    }}
                  >
                    總訂單金額：{formatMoney(orderModalTotalAmountCents, "TWD")}
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", borderBottom: "1px solid #ececec" }}>
                        <th style={{ padding: 8 }}>姓名</th>
                        <th style={{ padding: 8 }}>電話</th>
                        <th style={{ padding: 8 }}>訂購數量</th>
                        <th style={{ padding: 8 }}>訂購金額</th>
                        <th style={{ padding: 8 }}>狀態</th>
                        <th style={{ padding: 8 }}>付款截止</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderModal.orders.map((o) => {
                        const customerId = getOrderCustomerId(o);
                        const mappedCustomer = customerId ? customerById[customerId] : undefined;
                        const displayName = mappedCustomer?.name || getOrderContactName(o);
                        const displayPhone = mappedCustomer?.phone || getOrderContactPhone(o);

                        return (
                          <tr key={o.orderId} style={{ borderBottom: "1px solid #f5f5f5" }}>
                            <td style={{ padding: 8 }}>{displayName}</td>
                            <td style={{ padding: 8 }}>{displayPhone}</td>
                            <td style={{ padding: 8 }}>{getOrderQty(o) ?? "-"}</td>
                            <td style={{ padding: 8 }}>{formatMoney(getOrderTotalAmountCents(o), "TWD")}</td>
                            <td style={{ padding: 8 }}>{o.status}</td>
                            <td style={{ padding: 8 }}>{fmt(o.paymentDueAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 14,
  fontWeight: 500,
  color: "#333",
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #ccc",
  borderRadius: 6,
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 20px",
  background: "linear-gradient(180deg, #deb981 0%, #ca9659 100%)",
  color: "#2f241b",
  border: "1px solid #d2a86f",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14,
  boxShadow: "0 6px 16px rgba(56, 33, 8, 0.22)",
};

const btnSecondary: React.CSSProperties = {
  padding: "10px 20px",
  background: "#fffdf9",
  color: "#6b5a47",
  border: "1px solid #d9c1a0",
  borderRadius: 999,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
};

const btnSmall: React.CSSProperties = {
  minWidth: 82,
  padding: "8px 14px",
  borderRadius: 999,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  border: "1px solid #d7b283",
  boxShadow: "0 6px 16px rgba(56, 33, 8, 0.14)",
};

const btnSmallEdit: React.CSSProperties = {
  background: "linear-gradient(180deg, #f6ead6 0%, #ecd1ab 100%)",
  color: "#5f4528",
  borderColor: "#e0bf93",
};

const btnSmallDanger: React.CSSProperties = {
  background: "linear-gradient(180deg, #fff4f2 0%, #ffdcd5 100%)",
  color: "#ba3b2f",
  borderColor: "#f1b8b0",
};

const btnSmallInfo: React.CSSProperties = {
  background: "linear-gradient(180deg, #efe6d6 0%, #e1c08f 100%)",
  color: "#4a3420",
  borderColor: "#d2ab73",
};
