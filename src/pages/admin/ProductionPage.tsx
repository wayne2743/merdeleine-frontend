import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { catalogApi } from "../../api/catalogApi";
import { planningApi } from "../../api/planningApi";
import type {
  Product,
  ProductionBatch,
  ProductionBatchCreateRequest,
  SellWindowResponse,
} from "../../types/domain";

type BatchForm = {
  id: string | null;
  sellWindowId: string;
  productId: string;
  targetQty: string;
};

const pageCardStyle: CSSProperties = {
  border: "1px solid #eadfce",
  borderRadius: 18,
  background: "#fffdf9",
  boxShadow: "0 10px 30px rgba(88, 60, 24, 0.08)",
};

const actionButtonBase: CSSProperties = {
  borderRadius: 999,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  border: "1px solid #d7b283",
};

const statusMeta: Record<string, { label: string; color: string; background: string; border: string }> = {
  CREATED: { label: "已建立", color: "#8a5a14", background: "#fff4db", border: "#f1d08e" },
  CONFIRMED: { label: "已確認", color: "#0b6b57", background: "#def8ef", border: "#9ad8c4" },
  SCHEDULED: { label: "已排程", color: "#1557a0", background: "#e4f0ff", border: "#a9c6f6" },
  IN_PRODUCTION: { label: "生產中", color: "#6f3cc3", background: "#efe6ff", border: "#cbb4f5" },
  COMPLETED: { label: "已完成", color: "#2f5f2f", background: "#e4f5e0", border: "#b9ddb1" },
  CANCELLED: { label: "已取消", color: "#b13a2d", background: "#ffe8e4", border: "#f0b4ac" },
};

function fmtDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("zh-TW");
}

function shortId(value?: string | null): string {
  if (!value) return "-";
  return value.length <= 12 ? value : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function getStatusMeta(status: string) {
  return statusMeta[status] ?? {
    label: status || "未知",
    color: "#4a5568",
    background: "#edf2f7",
    border: "#cbd5e0",
  };
}

export default function ProductionPage() {
  const [items, setItems] = useState<ProductionBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sellWindows, setSellWindows] = useState<SellWindowResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [keyword, setKeyword] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));
  const [form, setForm] = useState<BatchForm>({
    id: null,
    sellWindowId: "",
    productId: "",
    targetQty: "1",
  });

  const productNameById = useMemo(
    () => Object.fromEntries(products.map((product) => [product.id, product.name])),
    [products],
  );

  const sellWindowNameById = useMemo(
    () => Object.fromEntries(sellWindows.map((sellWindow) => [sellWindow.id, sellWindow.name || sellWindow.id])),
    [sellWindows],
  );

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return [...items]
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .filter((item) => {
        if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
        if (!normalizedKeyword) return true;

        const joined = [
          item.id,
          item.productId,
          item.sellWindowId,
          productNameById[item.productId] ?? "",
          sellWindowNameById[item.sellWindowId] ?? "",
          item.status,
        ]
          .join(" ")
          .toLowerCase();

        return joined.includes(normalizedKeyword);
      });
  }, [items, keyword, productNameById, sellWindowNameById, statusFilter]);

  const createdCount = items.filter((item) => item.status === "CREATED").length;
  const confirmedCount = items.filter((item) => item.status === "CONFIRMED").length;
  const canGoNext = (page + 1) * pageSize < total;
  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d8c7b3",
    boxSizing: "border-box",
    background: "#fff",
  };

  function buildInitialForm(overrides?: Partial<BatchForm>): BatchForm {
    return {
      id: null,
      sellWindowId: sellWindows[0]?.id ?? "",
      productId: products[0]?.id ?? "",
      targetQty: "1",
      ...overrides,
    };
  }

  async function loadBatches(targetPage = page) {
    setLoading(true);
    setError(null);
    try {
      const response = await planningApi.pageBatches(targetPage, pageSize);
      setItems(response.items ?? []);
      setTotal(Number.isFinite(response.total) ? response.total : response.items.length);
    } catch (e: any) {
      console.error(e);
      setItems([]);
      setError(e?.response?.data?.message ?? e?.message ?? "讀取 production planning 批次失敗");
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalogOptions() {
    setCatalogLoading(true);
    try {
      const [productList, sellWindowList] = await Promise.all([
        catalogApi.listProducts(),
        catalogApi.listRawSellWindows(),
      ]);

      setProducts(productList ?? []);
      setSellWindows(sellWindowList ?? []);
    } catch (e) {
      console.error("load planning options failed", e);
    } finally {
      setCatalogLoading(false);
    }
  }

  useEffect(() => {
    void loadBatches(page);
  }, [page]);

  useEffect(() => {
    void loadCatalogOptions();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncLayout = () => setIsMobile(window.innerWidth < 768);
    syncLayout();
    window.addEventListener("resize", syncLayout);
    return () => window.removeEventListener("resize", syncLayout);
  }, []);

  useEffect(() => {
    setForm((prev) => {
      const nextSellWindowId = prev.sellWindowId || sellWindows[0]?.id || "";
      const nextProductId = prev.productId || products[0]?.id || "";

      if (nextSellWindowId === prev.sellWindowId && nextProductId === prev.productId) {
        return prev;
      }

      return {
        ...prev,
        sellWindowId: nextSellWindowId,
        productId: nextProductId,
      };
    });
  }, [products, sellWindows]);

  function updateForm<K extends keyof BatchForm>(key: K, value: BatchForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(buildInitialForm());
  }

  function closeForm() {
    setFormOpen(false);
    resetForm();
  }

  function openEdit(batch: ProductionBatch) {
    setMessage(null);
    setForm({
      id: batch.id,
      sellWindowId: batch.sellWindowId,
      productId: batch.productId,
      targetQty: String(batch.targetQty || ""),
    });
    setFormOpen(true);
  }

  function openCreate() {
    setMessage(null);
    resetForm();
    setFormOpen(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const targetQty = Number(form.targetQty);
    if (!form.sellWindowId) {
      setMessage("請先選擇檔期");
      return;
    }
    if (!form.productId) {
      setMessage("請先選擇商品");
      return;
    }
    if (!Number.isFinite(targetQty) || targetQty <= 0) {
      setMessage("目標數量需為大於 0 的整數");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const payload: ProductionBatchCreateRequest = {
        sellWindowId: form.sellWindowId,
        productId: form.productId,
        targetQty,
      };

      if (form.id) {
        await planningApi.updateBatch(form.id, payload);
        setMessage("批次更新成功");
      } else {
        await planningApi.createBatch(payload);
        setMessage("批次新增成功");
      }

      setFormOpen(false);
      resetForm();
      await loadBatches(page);
    } catch (e: any) {
      console.error(e);
      setMessage(e?.response?.data?.message ?? e?.message ?? (form.id ? "更新批次失敗" : "新增批次失敗"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(batch: ProductionBatch) {
    if (submitting) return;
    const confirmed = window.confirm(`確定刪除批次 ${shortId(batch.id)}？`);
    if (!confirmed) return;

    setSubmitting(true);
    setMessage(null);
    try {
      await planningApi.deleteBatch(batch.id);
      if (form.id === batch.id) {
        setFormOpen(false);
        resetForm();
      }
      setMessage("批次刪除成功");
      await loadBatches(page);
    } catch (e: any) {
      console.error(e);
      setMessage(e?.response?.data?.message ?? e?.message ?? "刪除批次失敗");
    } finally {
      setSubmitting(false);
    }
  }

  async function onConfirm(batch: ProductionBatch) {
    if (submitting) return;
    setSubmitting(true);
    setMessage(null);

    try {
      await planningApi.confirmBatch(batch.id);
      setMessage("批次已送出 Confirm");
      await loadBatches(page);
    } catch (e: any) {
      console.error(e);
      setMessage(e?.response?.data?.message ?? e?.message ?? "Confirm 失敗");
    } finally {
      setSubmitting(false);
    }
  }

  function renderActions(batch: ProductionBatch) {
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => openEdit(batch)}
          style={{ ...actionButtonBase, background: "#fff7ec", color: "#7a5318" }}
        >
          編輯
        </button>
        {batch.status === "CREATED" && (
          <button
            type="button"
            onClick={() => void onConfirm(batch)}
            style={{ ...actionButtonBase, background: "#e5faf0", color: "#0f6c52", borderColor: "#9ad8c4" }}
          >
            Confirm
          </button>
        )}
        <button
          type="button"
          onClick={() => void onDelete(batch)}
          style={{ ...actionButtonBase, background: "#fff1ef", color: "#b13a2d", borderColor: "#efb4ad" }}
        >
          刪除
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ ...pageCardStyle, padding: isMobile ? 16 : 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: isMobile ? 28 : 32 }}>Production Planning CRUD</h2>
            <p style={{ margin: "8px 0 0", color: "#6b7280", lineHeight: 1.6 }}>
              管理批次建立、編輯、刪除與 confirm，對應 `/api/production-planning/batches`。
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            style={{
              ...actionButtonBase,
              background: "linear-gradient(180deg, #f9ead6 0%, #efd0a7 100%)",
              color: "#5d3d16",
              width: isMobile ? "100%" : undefined,
              justifyContent: "center",
            }}
          >
            ＋ 新增批次
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginTop: 16 }}>
          <div style={{ ...pageCardStyle, padding: 14 }}>
            <div style={{ color: "#8a6a40", fontSize: 12 }}>目前頁面筆數</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{items.length}</div>
          </div>
          <div style={{ ...pageCardStyle, padding: 14 }}>
            <div style={{ color: "#8a6a40", fontSize: 12 }}>待確認批次</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{createdCount}</div>
          </div>
          <div style={{ ...pageCardStyle, padding: 14 }}>
            <div style={{ color: "#8a6a40", fontSize: 12 }}>已確認批次</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{confirmedCount}</div>
          </div>
          <div style={{ ...pageCardStyle, padding: 14 }}>
            <div style={{ color: "#8a6a40", fontSize: 12 }}>總筆數</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{total}</div>
          </div>
        </div>
      </div>

      <div style={{ ...pageCardStyle, padding: isMobile ? 14 : 18, overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, flexDirection: isMobile ? "column" : "row" }}>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜尋商品名稱 / 批次 ID / 檔期 ID"
            style={{ ...inputStyle, flex: "1 1 240px" }}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={{ ...inputStyle, minWidth: isMobile ? undefined : 160, flex: isMobile ? undefined : "0 0 160px" }}
          >
            <option value="ALL">全部狀態</option>
            {Object.keys(statusMeta).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {message && (
          <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 12, background: "#fff6df", color: "#7a5318" }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 12, background: "#ffe8e4", color: "#9f2f1f" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 18, textAlign: "center", color: "#6b7280" }}>讀取中...</div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: 18, textAlign: "center", color: "#6b7280" }}>目前沒有符合條件的批次資料</div>
        ) : isMobile ? (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredItems.map((item) => {
              const meta = getStatusMeta(item.status);
              return (
                <div key={item.id} style={{ border: "1px solid #eadfce", borderRadius: 14, padding: 14, background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{shortId(item.id)}</div>
                      <div style={{ color: "#8b6b48", fontSize: 12, wordBreak: "break-all" }}>{item.id}</div>
                    </div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: `1px solid ${meta.border}`,
                        background: meta.background,
                        color: meta.color,
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                    <div>
                      <div style={{ color: "#8b6b48", fontSize: 12 }}>商品 / 檔期</div>
                      <div style={{ fontWeight: 700 }}>{productNameById[item.productId] ?? shortId(item.productId)}</div>
                      <div style={{ color: "#6b7280", fontSize: 12 }}>商品 ID：{shortId(item.productId)}</div>
                      <div style={{ marginTop: 4 }}>{sellWindowNameById[item.sellWindowId] ?? shortId(item.sellWindowId)}</div>
                      <div style={{ color: "#6b7280", fontSize: 12 }}>檔期 ID：{shortId(item.sellWindowId)}</div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                      <div>
                        <div style={{ color: "#8b6b48", fontSize: 12 }}>目標量</div>
                        <div style={{ fontWeight: 700 }}>{item.targetQty}</div>
                      </div>
                      <div>
                        <div style={{ color: "#8b6b48", fontSize: 12 }}>訂單連結</div>
                        <div style={{ fontWeight: 700 }}>{item.orderLinkCount}</div>
                      </div>
                    </div>

                    <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.6 }}>
                      <div>已排程：{item.hasSchedule ? "是" : "否"}</div>
                      <div>建立：{fmtDate(item.createdAt)}</div>
                      <div>確認：{fmtDate(item.confirmedAt)}</div>
                    </div>

                    {renderActions(item)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #eadfce" }}>
                  <th style={{ padding: "10px 8px" }}>批次</th>
                  <th style={{ padding: "10px 8px" }}>商品 / 檔期</th>
                  <th style={{ padding: "10px 8px" }}>目標量</th>
                  <th style={{ padding: "10px 8px" }}>狀態</th>
                  <th style={{ padding: "10px 8px" }}>關聯</th>
                  <th style={{ padding: "10px 8px" }}>建立 / 確認時間</th>
                  <th style={{ padding: "10px 8px" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const meta = getStatusMeta(item.status);
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f3ebde", verticalAlign: "top" }}>
                      <td style={{ padding: "12px 8px" }}>
                        <div style={{ fontWeight: 700 }}>{shortId(item.id)}</div>
                        <div style={{ color: "#8b6b48", fontSize: 12 }}>{item.id}</div>
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <div style={{ fontWeight: 700 }}>{productNameById[item.productId] ?? shortId(item.productId)}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>商品 ID：{shortId(item.productId)}</div>
                        <div style={{ marginTop: 6 }}>{sellWindowNameById[item.sellWindowId] ?? shortId(item.sellWindowId)}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>檔期 ID：{shortId(item.sellWindowId)}</div>
                      </td>
                      <td style={{ padding: "12px 8px", fontWeight: 700 }}>{item.targetQty}</td>
                      <td style={{ padding: "12px 8px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "4px 10px",
                            borderRadius: 999,
                            border: `1px solid ${meta.border}`,
                            background: meta.background,
                            color: meta.color,
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <div>訂單連結：{item.orderLinkCount}</div>
                        <div>已排程：{item.hasSchedule ? "是" : "否"}</div>
                      </td>
                      <td style={{ padding: "12px 8px", fontSize: 13 }}>
                        <div>建立：{fmtDate(item.createdAt)}</div>
                        <div>確認：{fmtDate(item.confirmedAt)}</div>
                      </td>
                      <td style={{ padding: "12px 8px" }}>{renderActions(item)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
          <div style={{ color: "#6b7280", fontSize: 13 }}>第 {page + 1} 頁 / 每頁 {pageSize} 筆</div>
          <div style={{ display: "flex", gap: 8, width: isMobile ? "100%" : undefined }}>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0 || loading}
              style={{ ...actionButtonBase, background: "#fff", color: "#6b7280", flex: isMobile ? 1 : undefined }}
            >
              上一頁
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={loading || !canGoNext}
              style={{ ...actionButtonBase, background: "#fff", color: "#6b7280", flex: isMobile ? 1 : undefined }}
            >
              下一頁
            </button>
          </div>
        </div>
      </div>

      {formOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(29, 42, 34, 0.45)",
            display: "grid",
            placeItems: "center",
            padding: isMobile ? 12 : 24,
            zIndex: 50,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              ...pageCardStyle,
              width: "100%",
              maxWidth: 520,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: isMobile ? 16 : 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <h3 style={{ margin: 0 }}>{form.id ? "編輯批次" : "新增批次"}</h3>
                <div style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>請選擇檔期、商品與目標數量。</div>
              </div>
              <button
                type="button"
                onClick={closeForm}
                style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer", color: "#8a5a14" }}
                aria-label="關閉"
              >
                ×
              </button>
            </div>

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 14 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>檔期</span>
                <select
                  value={form.sellWindowId}
                  onChange={(event) => updateForm("sellWindowId", event.target.value)}
                  disabled={catalogLoading || submitting}
                  style={inputStyle}
                >
                  <option value="">請選擇檔期</option>
                  {sellWindows.map((sellWindow) => (
                    <option key={sellWindow.id} value={sellWindow.id}>
                      {sellWindow.name || shortId(sellWindow.id)}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>商品</span>
                <select
                  value={form.productId}
                  onChange={(event) => updateForm("productId", event.target.value)}
                  disabled={catalogLoading || submitting}
                  style={inputStyle}
                >
                  <option value="">請選擇商品</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>目標數量</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.targetQty}
                  onChange={(event) => updateForm("targetQty", event.target.value)}
                  disabled={submitting}
                  style={inputStyle}
                />
              </label>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    ...actionButtonBase,
                    background: "linear-gradient(180deg, #f6ead6 0%, #e6c18f 100%)",
                    color: "#563714",
                    flex: isMobile ? 1 : undefined,
                  }}
                >
                  {submitting ? "儲存中..." : form.id ? "更新批次" : "建立批次"}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  style={{ ...actionButtonBase, background: "#fff", color: "#6b7280", flex: isMobile ? 1 : undefined }}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}