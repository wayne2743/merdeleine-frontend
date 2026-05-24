import { useEffect, useMemo, useState, type CSSProperties, type ChangeEvent, type FormEvent } from "react";
import { catalogApi } from "../../api/catalogApi";
import type { Ingredient, Stock } from "../../types/domain";

type IngredientForm = {
  id: string | null;
  name: string;
  brand: string;
  origin: string;
  governmentRegistrationInfo: string;
  attribute: string;
  caloriesPer100g: string;
  allergens: string;
};

const INITIAL_INGREDIENT_FORM: IngredientForm = {
  id: null,
  name: "",
  brand: "",
  origin: "",
  governmentRegistrationInfo: "",
  attribute: "",
  caloriesPer100g: "",
  allergens: "",
};

type StockForm = {
  id: string | null;
  unitPriceCents: string;
  stockedAt: string;
  expiresAt: string;
  stockQuantity: string;
};

const INITIAL_STOCK_FORM: StockForm = {
  id: null,
  unitPriceCents: "",
  stockedAt: "",
  expiresAt: "",
  stockQuantity: "",
};

function normalizeDateInput(value?: string | null): string {
  if (!value) return "";
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-TW", { hour12: false });
}

function normalizeStockQuantity(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return "";
  return parsed.toFixed(3);
}

function normalizeEnumValue(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

const actionButtonBase: CSSProperties = {
  minWidth: 60,
  padding: "6px 12px",
  borderRadius: 999,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  border: "1px solid #d7b283",
  boxShadow: "0 2px 6px rgba(56, 33, 8, 0.08)",
};

const actionButtonEdit: CSSProperties = {
  background: "linear-gradient(180deg, #f6ead6 0%, #ecd1ab 100%)",
  color: "#5f4528",
  borderColor: "#e0bf93",
};

const actionButtonDelete: CSSProperties = {
  background: "linear-gradient(180deg, #fff4f2 0%, #ffdcd5 100%)",
  color: "#ba3b2f",
  borderColor: "#f1b8b0",
};

const actionButtonStock: CSSProperties = {
  background: "linear-gradient(180deg, #f0f7ff 0%, #d5e8fa 100%)",
  color: "#1d5fa4",
  borderColor: "#a8cef0",
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
    const text = e.response.data.trim();
    if (text.toLowerCase().includes("used") || text.toLowerCase().includes("in use")) {
      return "此原物料已被商品使用，無法刪除";
    }
    return text;
  }

  if (e?.response?.data && typeof e.response.data === "object") {
    if (e.response.data.message) return e.response.data.message;
    if (e.response.data.error) return e.response.data.error;
  }

  if (e?.response?.status === 409) return "此原物料已被商品使用，無法刪除";
  if (e?.response?.status === 400) return "請確認欄位內容後再試";
  if (e?.response?.status) return `操作失敗（${e.response.status}）`;

  return e?.message || "操作失敗，請稍後再試";
}

export default function IngredientAdminPage() {
  const [form, setForm] = useState<IngredientForm>(INITIAL_INGREDIENT_FORM);
  const [showFormModal, setShowFormModal] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Stock modal state
  const [stockModalIngredient, setStockModalIngredient] = useState<Ingredient | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [stocksError, setStocksError] = useState<string | null>(null);
  const [stockForm, setStockForm] = useState<StockForm>(INITIAL_STOCK_FORM);
  const [stockSubmitting, setStockSubmitting] = useState(false);
  const [stockFormError, setStockFormError] = useState<string | null>(null);
  const [stockFormSuccess, setStockFormSuccess] = useState<string | null>(null);
  const [stockDeleteConfirm, setStockDeleteConfirm] = useState<string | null>(null);
  const [stockDeleteError, setStockDeleteError] = useState<string | null>(null);

  const attributeOptions = useMemo(() => {
    const fromData = ingredients
      .map((item) => normalizeEnumValue(item.attribute ?? ""))
      .filter((item) => item.length > 0);
    return Array.from(new Set(fromData));
  }, [ingredients]);

  async function loadIngredients() {
    setListLoading(true);
    setListError(null);
    try {
      const data = await catalogApi.listIngredients();
      setIngredients(data);
    } catch {
      setListError("讀取原物料列表失敗，請稍後再試");
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    void loadIngredients();
  }, []);

  function onChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    if (name === "attribute") {
      setForm((prev) => ({ ...prev, attribute: normalizeEnumValue(value) }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openNewModal() {
    setForm(INITIAL_INGREDIENT_FORM);
    setFormError(null);
    setShowFormModal(true);
  }

  function onEdit(ingredient: Ingredient) {
    setForm({
      id: ingredient.id,
      name: ingredient.name,
      brand: ingredient.brand ?? "",
      origin: ingredient.origin ?? "",
      governmentRegistrationInfo: ingredient.governmentRegistrationInfo ?? "",
      attribute: ingredient.attribute ?? "",
      caloriesPer100g: ingredient.caloriesPer100g == null ? "" : String(ingredient.caloriesPer100g),
      allergens: ingredient.allergens ?? "",
    });
    setFormError(null);
    setShowFormModal(true);
  }

  function closeFormModal() {
    setShowFormModal(false);
    setForm(INITIAL_INGREDIENT_FORM);
    setFormError(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    if (!name) {
      setFormError("請輸入原物料名稱");
      return;
    }

    const attribute = normalizeEnumValue(form.attribute);
    if (!attribute) {
      setFormError("請輸入原物料屬性（attribute）");
      return;
    }

    if (!/^[A-Z][A-Z0-9_]*$/.test(attribute)) {
      setFormError("屬性格式錯誤，請使用英數與底線，例如 RAW_MATERIAL");
      return;
    }

    let caloriesPer100g: number | null = null;
    if (form.caloriesPer100g.trim()) {
      const parsedCalories = Number(form.caloriesPer100g);
      if (!Number.isInteger(parsedCalories) || parsedCalories < 0) {
        setFormError("每 100g 熱量必須是大於等於 0 的整數");
        return;
      }
      caloriesPer100g = parsedCalories;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        brand: form.brand.trim() || null,
        origin: form.origin.trim() || null,
        governmentRegistrationInfo: form.governmentRegistrationInfo.trim() || null,
        attribute,
        caloriesPer100g,
        allergens: form.allergens.trim() || null,
      };

      if (form.id) {
        await catalogApi.updateIngredient(form.id, payload);
      } else {
        await catalogApi.createIngredient(payload);
      }

      closeFormModal();
      void loadIngredients();
    } catch (err: unknown) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeleteConfirmed(id: string) {
    setDeleteError(null);
    try {
      await catalogApi.deleteIngredient(id);
      setDeleteConfirm(null);
      void loadIngredients();
    } catch (err: unknown) {
      setDeleteError(getErrorMessage(err));
    }
  }

  // ── Stock modal ──────────────────────────────────────────────────────────

  async function openStockModal(ingredient: Ingredient) {
    setStockModalIngredient(ingredient);
    setStockForm(INITIAL_STOCK_FORM);
    setStockFormError(null);
    setStockFormSuccess(null);
    setStockDeleteConfirm(null);
    setStockDeleteError(null);
    setStocksLoading(true);
    setStocksError(null);
    try {
      const data = await catalogApi.listIngredientStocks(ingredient.id);
      setStocks(data);
    } catch {
      setStocksError("讀取庫存列表失敗，請稍後再試");
    } finally {
      setStocksLoading(false);
    }
  }

  function closeStockModal() {
    setStockModalIngredient(null);
    setStocks([]);
    setStockForm(INITIAL_STOCK_FORM);
    setStockFormError(null);
    setStockFormSuccess(null);
    setStockDeleteConfirm(null);
    setStockDeleteError(null);
  }

  function onStockChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setStockForm((prev) => ({ ...prev, [name]: value }));
  }

  function onStockEdit(stock: Stock) {
    setStockForm({
      id: stock.id,
      unitPriceCents: String(stock.unitPriceCents ?? ""),
      stockedAt: normalizeDateInput(stock.stockedAt),
      expiresAt: normalizeDateInput(stock.expiresAt),
      stockQuantity: String(stock.stockQuantity ?? ""),
    });
    setStockFormError(null);
    setStockFormSuccess(null);
  }

  function onCancelStockEdit() {
    setStockForm(INITIAL_STOCK_FORM);
    setStockFormError(null);
    setStockFormSuccess(null);
  }

  async function onStockSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stockModalIngredient) return;
    setStockFormError(null);
    setStockFormSuccess(null);

    const unitPriceCents = Number(stockForm.unitPriceCents);
    if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) {
      setStockFormError("單價（分）必須是大於等於 0 的整數");
      return;
    }

    const normalizedStockQuantity = normalizeStockQuantity(stockForm.stockQuantity);
    if (!normalizedStockQuantity) {
      setStockFormError("庫存數量必須是大於等於 0 的數字");
      return;
    }

    if (stockForm.stockedAt && stockForm.expiresAt && stockForm.stockedAt > stockForm.expiresAt) {
      setStockFormError("到期日不可早於進貨日");
      return;
    }

    setStockSubmitting(true);
    try {
      if (stockForm.id) {
        await catalogApi.updateStock(stockForm.id, {
          unitPriceCents,
          stockedAt: stockForm.stockedAt || null,
          expiresAt: stockForm.expiresAt || null,
          stockQuantity: normalizedStockQuantity,
        });
        setStockFormSuccess("已更新庫存批次");
      } else {
        await catalogApi.createStock({
          ingredientId: stockModalIngredient.id,
          unitPriceCents,
          stockedAt: stockForm.stockedAt || null,
          expiresAt: stockForm.expiresAt || null,
          stockQuantity: normalizedStockQuantity,
        });
        setStockFormSuccess("已新增庫存批次");
      }

      setStockForm(INITIAL_STOCK_FORM);
      const data = await catalogApi.listIngredientStocks(stockModalIngredient.id);
      setStocks(data);
    } catch (err: unknown) {
      setStockFormError(getErrorMessage(err));
    } finally {
      setStockSubmitting(false);
    }
  }

  async function onStockDeleteConfirmed(stockId: string) {
    if (!stockModalIngredient) return;
    setStockDeleteError(null);
    try {
      await catalogApi.deleteStock(stockId);
      setStockDeleteConfirm(null);
      const data = await catalogApi.listIngredientStocks(stockModalIngredient.id);
      setStocks(data);
    } catch (err: unknown) {
      setStockDeleteError(getErrorMessage(err));
    }
  }

  const isEditing = !!form.id;
  const isStockEditing = !!stockForm.id;

  return (
    <div className="page-container" style={{ maxWidth: 820 }}>

      {/* ── Header + New button ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#5f4528", margin: 0 }}>原物料列表</h2>
        <button
          type="button"
          onClick={openNewModal}
          style={{
            background: "linear-gradient(180deg, #f7e4c2 0%, #e9c07a 100%)",
            color: "#5a3e1b",
            border: "1px solid #d5a85a",
            borderRadius: 999,
            padding: "9px 22px",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(180,120,40,0.15)",
          }}
        >
          + 新增原物料
        </button>
      </div>

      {/* ── Ingredient List (cards) ── */}
      {listLoading && <p style={{ color: "#999", fontSize: 14 }}>載入中…</p>}
      {listError && <p style={{ color: "#be123c", fontSize: 14 }}>{listError}</p>}
      {!listLoading && !listError && ingredients.length === 0 && (
        <p style={{ color: "#aaa", fontSize: 14 }}>尚無原物料，請先新增</p>
      )}

      {!listLoading && ingredients.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {ingredients.map((ing) => (
            <div
              key={ing.id}
              style={{
                borderRadius: 14,
                border: "1px solid #e8d9c2",
                background: "linear-gradient(180deg, #fffdf9 0%, #faf5ec 100%)",
                padding: "14px 16px",
                boxShadow: "0 2px 8px rgba(180,120,40,0.06)",
              }}
            >
              {/* Name + attribute */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#4b392a" }}>{ing.name}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                  background: "#f0e8d5", color: "#7a5c3a", border: "1px solid #ddc99e",
                }}>
                  {ing.attribute ?? "-"}
                </span>
              </div>

              {/* Info rows */}
              <div style={{ display: "grid", gap: 3, fontSize: 13, color: "#5f4c3b", marginBottom: 12 }}>
                {(ing.caloriesPer100g != null || ing.allergens) && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {ing.caloriesPer100g != null && (
                      <span style={{ color: "#6e5131" }}>
                        熱量：<strong>{ing.caloriesPer100g} kcal</strong>／100g
                      </span>
                    )}
                    {ing.allergens && (
                      <span style={{ color: "#7a5c3a" }}>
                        {ing.caloriesPer100g != null ? "・" : ""}過敏原：{ing.allergens}
                      </span>
                    )}
                  </div>
                )}
                {(ing.brand || ing.origin) && (
                  <div style={{ color: "#7a6248" }}>
                    {[ing.brand && `品牌：${ing.brand}`, ing.origin && `產地：${ing.origin}`].filter(Boolean).join("　")}
                  </div>
                )}
                {ing.governmentRegistrationInfo && (
                  <div style={{ color: "#8c7a64", fontSize: 12 }}>
                    登記資訊：{ing.governmentRegistrationInfo}
                  </div>
                )}
                <div style={{ color: "#aaa", fontSize: 11, marginTop: 2 }}>
                  建立：{formatDateTime(ing.createdAt)}
                  {ing.updatedAt && ing.updatedAt !== ing.createdAt && (
                    <span>　更新：{formatDateTime(ing.updatedAt)}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={{ ...actionButtonBase, ...actionButtonStock }} onClick={() => void openStockModal(ing)}>
                  庫存
                </button>
                <button style={{ ...actionButtonBase, ...actionButtonEdit }} onClick={() => onEdit(ing)}>
                  編輯
                </button>
                <button style={{ ...actionButtonBase, ...actionButtonDelete }} onClick={() => { setDeleteConfirm(ing.id); setDeleteError(null); }}>
                  刪除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── New / Edit modal ── */}
      {showFormModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(43,28,14,0.5)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            zIndex: 1000, overflowY: "auto", padding: "24px 12px",
          }}
          onClick={closeFormModal}
        >
          <div
            style={{
              background: "linear-gradient(160deg, #fffdf9 0%, #faf5ec 100%)",
              borderRadius: 18,
              border: "1px solid #e8d9c2",
              padding: "24px 20px",
              width: "100%",
              maxWidth: 560,
              boxShadow: "0 12px 40px rgba(43,28,14,0.22)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#5f4528" }}>
                {isEditing ? "編輯原物料" : "新增原物料"}
              </h3>
              <button
                type="button"
                onClick={closeFormModal}
                style={{ background: "transparent", border: "none", fontSize: 22, color: "#9a7a55", cursor: "pointer", lineHeight: 1, padding: "2px 6px" }}
              >
                ×
              </button>
            </div>

            {formError && (
              <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>
                {formError}
              </div>
            )}

            <form onSubmit={(e) => void onSubmit(e)}>
              <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 13, color: "#7a5c3a", fontWeight: 600, display: "block", marginBottom: 4 }}>
                    名稱 <span style={{ color: "#be123c" }}>*</span>
                  </label>
                  <input name="name" value={form.name} onChange={onChange} placeholder="例：有機全脂牛奶"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2c9a3", fontSize: 14, boxSizing: "border-box" }} />
                </div>

                <div>
                  <label style={{ fontSize: 13, color: "#7a5c3a", fontWeight: 600, display: "block", marginBottom: 4 }}>
                    屬性 <span style={{ color: "#be123c" }}>*</span>
                  </label>
                  <input name="attribute" value={form.attribute} onChange={onChange} placeholder="例：RAW_MATERIAL"
                    list="ingredient-attribute-options"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2c9a3", fontSize: 14, boxSizing: "border-box" }} />
                  <datalist id="ingredient-attribute-options">
                    {attributeOptions.map((option) => <option key={option} value={option} />)}
                  </datalist>
                  <div style={{ marginTop: 4, color: "#9a7a55", fontSize: 12 }}>需填後端 enum 值（會自動轉大寫與底線）</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 13, color: "#7a5c3a", fontWeight: 600, display: "block", marginBottom: 4 }}>品牌</label>
                    <input name="brand" value={form.brand} onChange={onChange} placeholder="例：在地農場 A"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2c9a3", fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: "#7a5c3a", fontWeight: 600, display: "block", marginBottom: 4 }}>產地</label>
                    <input name="origin" value={form.origin} onChange={onChange} placeholder="例：台灣雲林"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2c9a3", fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 13, color: "#7a5c3a", fontWeight: 600, display: "block", marginBottom: 4 }}>每 100g 熱量</label>
                    <input name="caloriesPer100g" type="number" min={0} step={1} value={form.caloriesPer100g} onChange={onChange} placeholder="例：364"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2c9a3", fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: "#7a5c3a", fontWeight: 600, display: "block", marginBottom: 4 }}>過敏原</label>
                    <input name="allergens" value={form.allergens} onChange={onChange} placeholder="例：小麥、麩質"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2c9a3", fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, color: "#7a5c3a", fontWeight: 600, display: "block", marginBottom: 4 }}>政府登記資訊</label>
                  <textarea name="governmentRegistrationInfo" value={form.governmentRegistrationInfo} onChange={onChange}
                    rows={2} placeholder="可填寫字號、許可文件或追溯資訊"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2c9a3", fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={closeFormModal}
                  style={{ background: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: 999, padding: "9px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                  取消
                </button>
                <button type="submit" disabled={submitting}
                  style={{
                    background: "linear-gradient(180deg, #f7e4c2 0%, #e9c07a 100%)",
                    color: "#5a3e1b", border: "1px solid #d5a85a",
                    borderRadius: 999, padding: "9px 28px", fontWeight: 700, fontSize: 14,
                    cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1,
                  }}>
                  {submitting ? "送出中…" : isEditing ? "儲存變更" : "新增原物料"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteConfirm && (() => {
        const target = ingredients.find((i) => i.id === deleteConfirm);
        return (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
            onClick={() => setDeleteConfirm(null)}
          >
            <div
              style={{ background: "#fff", borderRadius: 16, padding: "28px 32px", maxWidth: 380, width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 12 }}>確認刪除</h3>
              <p style={{ fontSize: 14, color: "#444", marginBottom: 8 }}>
                確定要刪除原物料「<strong>{target?.name}</strong>」嗎？
              </p>
              <p style={{ fontSize: 12, color: "#999", marginBottom: 20 }}>
                ※ 若此原物料已被商品使用，系統將會擋下刪除操作。
              </p>
              {deleteError && (
                <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", borderRadius: 8, padding: "8px 12px", marginBottom: 16, fontSize: 13 }}>
                  {deleteError}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setDeleteConfirm(null)}
                  style={{ background: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: 999, padding: "8px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  取消
                </button>
                <button onClick={() => void onDeleteConfirmed(deleteConfirm)}
                  style={{ background: "linear-gradient(180deg, #fff4f2 0%, #ffdcd5 100%)", color: "#ba3b2f", border: "1px solid #f1b8b0", borderRadius: 999, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  確認刪除
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Stock management modal ── */}
      {stockModalIngredient && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed", inset: 0,
            background: "rgba(43,28,14,0.5)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            zIndex: 1000, overflowY: "auto", padding: "24px 12px",
          }}
          onClick={closeStockModal}
        >
          <div
            style={{
              background: "linear-gradient(160deg, rgba(240,247,255,0.98) 0%, rgba(213,232,250,0.95) 100%)",
              borderRadius: 18,
              border: "1px solid rgba(168,206,240,0.5)",
              padding: "24px 20px",
              width: "100%",
              maxWidth: 560,
              boxShadow: "0 12px 40px rgba(43,28,14,0.22)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid rgba(168,206,240,0.3)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1d5fa4", margin: 0 }}>
                庫存管理：{stockModalIngredient.name}
              </h3>
              <button
                type="button"
                onClick={closeStockModal}
                style={{ background: "transparent", border: "none", fontSize: 22, color: "#4a6fa0", cursor: "pointer", lineHeight: 1, padding: "2px 6px" }}
              >
                ×
              </button>
            </div>

            {/* Stock form */}
            <div style={{ background: "#fff", border: "1px solid rgba(168,206,240,0.4)", borderRadius: 12, padding: "20px 16px", marginBottom: 24 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1d5fa4", marginBottom: 16 }}>
                {isStockEditing ? "編輯庫存批次" : "新增庫存批次"}
              </h4>

              {stockFormSuccess && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", borderRadius: 8, padding: "8px 14px", marginBottom: 12, fontSize: 13 }}>
                  {stockFormSuccess}
                </div>
              )}
              {stockFormError && (
                <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", borderRadius: 8, padding: "8px 14px", marginBottom: 12, fontSize: 13 }}>
                  {stockFormError}
                </div>
              )}

              <form onSubmit={(e) => void onStockSubmit(e)}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px 14px", marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "#4a6fa0", fontWeight: 600, display: "block", marginBottom: 3 }}>
                      單價（分） <span style={{ color: "#be123c" }}>*</span>
                    </label>
                    <input name="unitPriceCents" type="number" min={0} step={1} value={stockForm.unitPriceCents} onChange={onStockChange} placeholder="例：350"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #a8cef0", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#4a6fa0", fontWeight: 600, display: "block", marginBottom: 3 }}>
                      庫存數量 <span style={{ color: "#be123c" }}>*</span>
                    </label>
                    <input name="stockQuantity" type="number" min={0} step="0.001" value={stockForm.stockQuantity} onChange={onStockChange} placeholder="例：25.500"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #a8cef0", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#4a6fa0", fontWeight: 600, display: "block", marginBottom: 3 }}>進貨日</label>
                    <input name="stockedAt" type="date" value={stockForm.stockedAt} onChange={onStockChange}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #a8cef0", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#4a6fa0", fontWeight: 600, display: "block", marginBottom: 3 }}>到期日</label>
                    <input name="expiresAt" type="date" value={stockForm.expiresAt} onChange={onStockChange}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #a8cef0", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" disabled={stockSubmitting}
                    style={{ background: "linear-gradient(180deg, #d5e8fa 0%, #a8cef0 100%)", color: "#1d5fa4", border: "1px solid #a8cef0", borderRadius: 999, padding: "7px 22px", fontWeight: 700, fontSize: 13, cursor: stockSubmitting ? "not-allowed" : "pointer", opacity: stockSubmitting ? 0.7 : 1 }}>
                    {stockSubmitting ? "送出中…" : isStockEditing ? "儲存變更" : "新增批次"}
                  </button>
                  {isStockEditing && (
                    <button type="button" onClick={onCancelStockEdit}
                      style={{ background: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: 999, padding: "7px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                      取消
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Stock list */}
            <h4 style={{ fontSize: 14, fontWeight: 700, color: "#333", marginBottom: 12 }}>庫存批次列表</h4>

            {stocksLoading && <p style={{ color: "#999", fontSize: 13 }}>載入中…</p>}
            {stocksError && <p style={{ color: "#be123c", fontSize: 13 }}>{stocksError}</p>}
            {!stocksLoading && !stocksError && stocks.length === 0 && (
              <p style={{ color: "#aaa", fontSize: 13 }}>尚無庫存批次，請先新增</p>
            )}

            {!stocksLoading && stocks.length > 0 && (
              <div style={{ display: "grid", gap: 10 }}>
                {stocks.map((stock, idx) => (
                  <div key={stock.id}
                    style={{ background: idx % 2 === 0 ? "#fff" : "#f4f9ff", borderRadius: 10, border: "1px solid #d5e8fa", padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 14, color: "#1d5fa4", fontWeight: 700 }}>{formatMoney(stock.unitPriceCents)}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button style={{ ...actionButtonBase, ...actionButtonEdit, minWidth: 52, fontSize: 12, padding: "4px 10px" }} onClick={() => onStockEdit(stock)}>編輯</button>
                        <button style={{ ...actionButtonBase, ...actionButtonDelete, minWidth: 52, fontSize: 12, padding: "4px 10px" }} onClick={() => { setStockDeleteConfirm(stock.id); setStockDeleteError(null); }}>刪除</button>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#4a6fa0", marginTop: 6, flexWrap: "wrap" }}>
                      <span>數量：{stock.stockQuantity}</span>
                      {stock.stockedAt && <span>進貨：{normalizeDateInput(stock.stockedAt)}</span>}
                      {stock.expiresAt && <span>到期：{normalizeDateInput(stock.expiresAt)}</span>}
                      <span style={{ color: "#aaa", fontSize: 11 }}>建立：{formatDateTime(stock.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Stock delete confirm modal ── */}
      {stockDeleteConfirm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200 }}
          onClick={() => setStockDeleteConfirm(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", maxWidth: 360, width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 12 }}>確認刪除庫存批次</h3>
            <p style={{ fontSize: 13, color: "#444", marginBottom: 20 }}>確定要刪除此庫存批次嗎？</p>
            {stockDeleteError && (
              <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 13 }}>
                {stockDeleteError}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setStockDeleteConfirm(null)}
                style={{ background: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: 999, padding: "7px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                取消
              </button>
              <button onClick={() => void onStockDeleteConfirmed(stockDeleteConfirm)}
                style={{ background: "linear-gradient(180deg, #fff4f2 0%, #ffdcd5 100%)", color: "#ba3b2f", border: "1px solid #f1b8b0", borderRadius: 999, padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
