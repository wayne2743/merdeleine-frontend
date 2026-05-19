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
  minWidth: 72,
  padding: "6px 12px",
  borderRadius: 999,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  border: "1px solid #d7b283",
  boxShadow: "0 4px 10px rgba(56, 33, 8, 0.10)",
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
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
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
    setFormSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onCancelEdit() {
    setForm(INITIAL_INGREDIENT_FORM);
    setFormError(null);
    setFormSuccess(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

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
        setFormSuccess(`已更新「${name}」`);
      } else {
        await catalogApi.createIngredient(payload);
        setFormSuccess(`已新增「${name}」`);
      }

      setForm(INITIAL_INGREDIENT_FORM);
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
  const editingName = isEditing
    ? (ingredients.find((i) => i.id === form.id)?.name ?? "")
    : "";

  const isStockEditing = !!stockForm.id;

  return (
    <div className="page-container" style={{ maxWidth: 820 }}>
      {/* ── Ingredient Form ── */}
      <section
        style={{
          borderRadius: 18,
          border: "1px solid rgba(233, 210, 176, 0.28)",
          background: "linear-gradient(160deg, rgba(255,248,240,0.9) 0%, rgba(255,243,228,0.7) 100%)",
          padding: "28px 32px",
          marginBottom: 32,
          boxShadow: "0 4px 24px rgba(180, 120, 40, 0.08)",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#5f4528", marginBottom: 20 }}>
          {isEditing ? `編輯原物料：${editingName}` : "新增原物料"}
        </h2>

        {formSuccess && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#15803d",
              borderRadius: 8,
              padding: "10px 16px",
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {formSuccess}
          </div>
        )}
        {formError && (
          <div
            style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
              borderRadius: 8,
              padding: "10px 16px",
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {formError}
          </div>
        )}

        <form onSubmit={(e) => void onSubmit(e)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px 20px", marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 13, color: "#7a5c3a", fontWeight: 600, display: "block", marginBottom: 4 }}>
                名稱 <span style={{ color: "#be123c" }}>*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="例：有機全脂牛奶"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2c9a3", fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "#7a5c3a", fontWeight: 600, display: "block", marginBottom: 4 }}>
                屬性（attribute） <span style={{ color: "#be123c" }}>*</span>
              </label>
              <input
                name="attribute"
                value={form.attribute}
                onChange={onChange}
                placeholder="例：RAW_MATERIAL"
                list="ingredient-attribute-options"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2c9a3", fontSize: 14, boxSizing: "border-box" }}
              />
              <datalist id="ingredient-attribute-options">
                {attributeOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
              <div style={{ marginTop: 4, color: "#9a7a55", fontSize: 12 }}>
                需填後端 enum 值（會自動轉大寫與底線）
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, color: "#7a5c3a", fontWeight: 600, display: "block", marginBottom: 4 }}>
                品牌
              </label>
              <input
                name="brand"
                value={form.brand}
                onChange={onChange}
                placeholder="例：在地農場 A"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2c9a3", fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "#7a5c3a", fontWeight: 600, display: "block", marginBottom: 4 }}>
                產地
              </label>
              <input
                name="origin"
                value={form.origin}
                onChange={onChange}
                placeholder="例：台灣雲林"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2c9a3", fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "#7a5c3a", fontWeight: 600, display: "block", marginBottom: 4 }}>
                每 100g 熱量
              </label>
              <input
                name="caloriesPer100g"
                type="number"
                min={0}
                step={1}
                value={form.caloriesPer100g}
                onChange={onChange}
                placeholder="例：364"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2c9a3", fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "#7a5c3a", fontWeight: 600, display: "block", marginBottom: 4 }}>
                過敏原
              </label>
              <input
                name="allergens"
                value={form.allergens}
                onChange={onChange}
                placeholder="例：小麥、麩質"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2c9a3", fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: "#7a5c3a", fontWeight: 600, display: "block", marginBottom: 4 }}>
              政府登記資訊
            </label>
            <textarea
              name="governmentRegistrationInfo"
              value={form.governmentRegistrationInfo}
              onChange={onChange}
              rows={2}
              placeholder="可填寫字號、許可文件或追溯資訊"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2c9a3", fontSize: 14, resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: "linear-gradient(180deg, #f7e4c2 0%, #e9c07a 100%)",
                color: "#5a3e1b",
                border: "1px solid #d5a85a",
                borderRadius: 999,
                padding: "9px 28px",
                fontWeight: 700,
                fontSize: 14,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "送出中…" : isEditing ? "儲存變更" : "新增原物料"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={onCancelEdit}
                style={{
                  background: "#f5f5f5",
                  color: "#555",
                  border: "1px solid #ddd",
                  borderRadius: 999,
                  padding: "9px 20px",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                取消編輯
              </button>
            )}
          </div>
        </form>
      </section>

      {/* ── Ingredient List ── */}
      <section>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "#5f4528", marginBottom: 16 }}>
          原物料列表
        </h2>

        {listLoading && <p style={{ color: "#999", fontSize: 14 }}>載入中…</p>}
        {listError && <p style={{ color: "#be123c", fontSize: 14 }}>{listError}</p>}

        {!listLoading && !listError && ingredients.length === 0 && (
          <p style={{ color: "#aaa", fontSize: 14 }}>尚無原物料，請先新增</p>
        )}

        {!listLoading && ingredients.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
                background: "#fffdf9",
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 2px 12px rgba(180,120,40,0.07)",
              }}
            >
              <thead>
                <tr style={{ background: "linear-gradient(180deg, #f7e9d0 0%, #f0d9b5 100%)", color: "#5f4528" }}>
                  <th style={thStyle}>名稱</th>
                  <th style={thStyle}>屬性</th>
                  <th style={thStyle}>熱量 / 過敏原</th>
                  <th style={thStyle}>品牌 / 產地</th>
                  <th style={thStyle}>登記資訊</th>
                  <th style={thStyle}>建立 / 更新</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing, idx) => (
                  <tr
                    key={ing.id}
                    style={{ background: idx % 2 === 0 ? "#fffdf8" : "#fdf7ef" }}
                  >
                    <td style={tdStyle}>{ing.name}</td>
                    <td style={tdStyle}>{ing.attribute}</td>
                    <td style={{ ...tdStyle, maxWidth: 220 }}>
                      {(ing.caloriesPer100g ?? "-")}
                      <span style={{ color: "#999" }}> kcal</span>
                      <br />
                      <span style={{ color: "#777" }} title={ing.allergens ?? ""}>{ing.allergens ?? "-"}</span>
                    </td>
                    <td style={tdStyle}>{[ing.brand, ing.origin].filter(Boolean).join(" / ") || "-"}</td>
                    <td style={{ ...tdStyle, maxWidth: 200, color: "#888" }}>
                      {ing.governmentRegistrationInfo ? (
                        <span title={ing.governmentRegistrationInfo}>
                          {ing.governmentRegistrationInfo.length > 40
                            ? `${ing.governmentRegistrationInfo.slice(0, 40)}…`
                            : ing.governmentRegistrationInfo}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: "#777", fontSize: 12 }}>
                      {formatDateTime(ing.createdAt)} / {formatDateTime(ing.updatedAt)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          style={{ ...actionButtonBase, ...actionButtonStock }}
                          onClick={() => void openStockModal(ing)}
                        >
                          庫存
                        </button>
                        <button
                          style={{ ...actionButtonBase, ...actionButtonEdit }}
                          onClick={() => onEdit(ing)}
                        >
                          編輯
                        </button>
                        <button
                          style={{ ...actionButtonBase, ...actionButtonDelete }}
                          onClick={() => { setDeleteConfirm(ing.id); setDeleteError(null); }}
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
        )}
      </section>

      {/* ── Delete confirm modal ── */}
      {deleteConfirm && (() => {
        const target = ingredients.find((i) => i.id === deleteConfirm);
        return (
          <div
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
            }}
            onClick={() => setDeleteConfirm(null)}
          >
            <div
              style={{
                background: "#fff", borderRadius: 16, padding: "28px 32px", maxWidth: 380,
                width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 12 }}>
                確認刪除
              </h3>
              <p style={{ fontSize: 14, color: "#444", marginBottom: 8 }}>
                確定要刪除原物料「<strong>{target?.name}</strong>」嗎？
              </p>
              <p style={{ fontSize: 12, color: "#999", marginBottom: 20 }}>
                ※ 若此原物料已被商品使用，系統將會擋下刪除操作。
              </p>
              {deleteError && (
                <div
                  style={{
                    background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c",
                    borderRadius: 8, padding: "8px 12px", marginBottom: 16, fontSize: 13,
                  }}
                >
                  {deleteError}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  style={{
                    background: "#f5f5f5", color: "#555", border: "1px solid #ddd",
                    borderRadius: 999, padding: "8px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
                  }}
                >
                  取消
                </button>
                <button
                  onClick={() => void onDeleteConfirmed(deleteConfirm)}
                  style={{
                    background: "linear-gradient(180deg, #fff4f2 0%, #ffdcd5 100%)",
                    color: "#ba3b2f", border: "1px solid #f1b8b0",
                    borderRadius: 999, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}
                >
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
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            zIndex: 1000, overflowY: "auto", padding: "40px 16px",
          }}
          onClick={closeStockModal}
        >
          <div
            style={{
              background: "#fff", borderRadius: 18, padding: "28px 32px",
              maxWidth: 680, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a" }}>
                庫存管理：{stockModalIngredient.name}
              </h3>
              <button
                onClick={closeStockModal}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 20, color: "#888", padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Stock form */}
            <div
              style={{
                background: "linear-gradient(160deg, rgba(240,247,255,0.9) 0%, rgba(213,232,250,0.5) 100%)",
                border: "1px solid rgba(168,206,240,0.5)",
                borderRadius: 12,
                padding: "20px 24px",
                marginBottom: 24,
              }}
            >
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px 16px", marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "#4a6fa0", fontWeight: 600, display: "block", marginBottom: 3 }}>
                      單價（分） <span style={{ color: "#be123c" }}>*</span>
                    </label>
                    <input
                      name="unitPriceCents"
                      type="number"
                      min={0}
                      step={1}
                      value={stockForm.unitPriceCents}
                      onChange={onStockChange}
                      placeholder="例：350"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #a8cef0", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#4a6fa0", fontWeight: 600, display: "block", marginBottom: 3 }}>
                      庫存數量 <span style={{ color: "#be123c" }}>*</span>
                    </label>
                    <input
                      name="stockQuantity"
                      type="number"
                      min={0}
                      step="0.001"
                      value={stockForm.stockQuantity}
                      onChange={onStockChange}
                      placeholder="例：25.500"
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #a8cef0", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#4a6fa0", fontWeight: 600, display: "block", marginBottom: 3 }}>
                      進貨日
                    </label>
                    <input
                      name="stockedAt"
                      type="date"
                      value={stockForm.stockedAt}
                      onChange={onStockChange}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #a8cef0", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#4a6fa0", fontWeight: 600, display: "block", marginBottom: 3 }}>
                      到期日
                    </label>
                    <input
                      name="expiresAt"
                      type="date"
                      value={stockForm.expiresAt}
                      onChange={onStockChange}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #a8cef0", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="submit"
                    disabled={stockSubmitting}
                    style={{
                      background: "linear-gradient(180deg, #d5e8fa 0%, #a8cef0 100%)",
                      color: "#1d5fa4",
                      border: "1px solid #a8cef0",
                      borderRadius: 999,
                      padding: "7px 22px",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: stockSubmitting ? "not-allowed" : "pointer",
                      opacity: stockSubmitting ? 0.7 : 1,
                    }}
                  >
                    {stockSubmitting ? "送出中…" : isStockEditing ? "儲存變更" : "新增批次"}
                  </button>
                  {isStockEditing && (
                    <button
                      type="button"
                      onClick={onCancelStockEdit}
                      style={{
                        background: "#f5f5f5", color: "#555", border: "1px solid #ddd",
                        borderRadius: 999, padding: "7px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer",
                      }}
                    >
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
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f0f7ff", color: "#1d5fa4" }}>
                      <th style={stockThStyle}>單價</th>
                      <th style={stockThStyle}>庫存數量</th>
                      <th style={stockThStyle}>進貨日</th>
                      <th style={stockThStyle}>到期日</th>
                      <th style={stockThStyle}>建立時間</th>
                      <th style={{ ...stockThStyle, textAlign: "center" }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.map((stock, idx) => (
                      <tr key={stock.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fbff" }}>
                        <td style={stockTdStyle}>{formatMoney(stock.unitPriceCents)}</td>
                        <td style={stockTdStyle}>{stock.stockQuantity}</td>
                        <td style={stockTdStyle}>{stock.stockedAt ? normalizeDateInput(stock.stockedAt) : "-"}</td>
                        <td style={stockTdStyle}>{stock.expiresAt ? normalizeDateInput(stock.expiresAt) : "-"}</td>
                        <td style={{ ...stockTdStyle, color: "#888", fontSize: 11 }}>{formatDateTime(stock.createdAt)}</td>
                        <td style={{ ...stockTdStyle, textAlign: "center", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: 5 }}>
                            <button
                              style={{ ...actionButtonBase, ...actionButtonEdit, minWidth: 52, fontSize: 12, padding: "4px 10px" }}
                              onClick={() => onStockEdit(stock)}
                            >
                              編輯
                            </button>
                            <button
                              style={{ ...actionButtonBase, ...actionButtonDelete, minWidth: 52, fontSize: 12, padding: "4px 10px" }}
                              onClick={() => { setStockDeleteConfirm(stock.id); setStockDeleteError(null); }}
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
            )}

            {/* Stock delete confirm */}
            {stockDeleteConfirm && (
              <div
                style={{
                  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
                  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100,
                }}
                onClick={() => setStockDeleteConfirm(null)}
              >
                <div
                  style={{
                    background: "#fff", borderRadius: 16, padding: "24px 28px", maxWidth: 360,
                    width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
                  }}
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
                    <button
                      onClick={() => setStockDeleteConfirm(null)}
                      style={{ background: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: 999, padding: "7px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                    >
                      取消
                    </button>
                    <button
                      onClick={() => void onStockDeleteConfirmed(stockDeleteConfirm)}
                      style={{ background: "linear-gradient(180deg, #fff4f2 0%, #ffdcd5 100%)", color: "#ba3b2f", border: "1px solid #f1b8b0", borderRadius: 999, padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                    >
                      確認刪除
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontWeight: 700,
  fontSize: 13,
  borderBottom: "1px solid rgba(200, 160, 80, 0.2)",
};

const tdStyle: CSSProperties = {
  padding: "10px 14px",
  borderBottom: "1px solid rgba(200, 160, 80, 0.10)",
  verticalAlign: "middle",
};

const stockThStyle: CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  fontWeight: 700,
  fontSize: 12,
  borderBottom: "1px solid #d5e8fa",
};

const stockTdStyle: CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #e8f3fd",
  verticalAlign: "middle",
};
