import { useEffect, useMemo, useState, type CSSProperties, type ChangeEvent, type FormEvent } from "react";
import { catalogApi } from "../../api/catalogApi";
import type { Ingredient } from "../../types/domain";

type IngredientForm = {
  id: string | null;
  name: string;
  unitPriceCents: string;
  brand: string;
  origin: string;
  governmentRegistrationInfo: string;
  attribute: string;
  stockedAt: string;
  expiresAt: string;
  stockQuantity: string;
};

const INITIAL_FORM: IngredientForm = {
  id: null,
  name: "",
  unitPriceCents: "",
  brand: "",
  origin: "",
  governmentRegistrationInfo: "",
  attribute: "",
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

function formatStockQuantity(value: number | string): string {
  if (typeof value === "number") return value.toString();
  return value;
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
    // backend blocks delete if ingredient is used by a product
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
  const [form, setForm] = useState<IngredientForm>(INITIAL_FORM);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      unitPriceCents: String(ingredient.unitPriceCents ?? ""),
      brand: ingredient.brand ?? "",
      origin: ingredient.origin ?? "",
      governmentRegistrationInfo: ingredient.governmentRegistrationInfo ?? "",
      attribute: ingredient.attribute ?? "",
      stockedAt: normalizeDateInput(ingredient.stockedAt),
      expiresAt: normalizeDateInput(ingredient.expiresAt),
      stockQuantity: String(ingredient.stockQuantity ?? ""),
    });
    setFormError(null);
    setFormSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onCancelEdit() {
    setForm(INITIAL_FORM);
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

    const unitPriceCents = Number(form.unitPriceCents);
    if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) {
      setFormError("單價（分）必須是大於等於 0 的整數");
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

    const stockQuantity = Number(form.stockQuantity);
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      setFormError("庫存數量必須是大於等於 0 的數字");
      return;
    }

    if (form.stockedAt && form.expiresAt && form.stockedAt > form.expiresAt) {
      setFormError("到期日不可早於進貨日");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        unitPriceCents,
        brand: form.brand.trim() || null,
        origin: form.origin.trim() || null,
        governmentRegistrationInfo: form.governmentRegistrationInfo.trim() || null,
        attribute,
        stockedAt: form.stockedAt || null,
        expiresAt: form.expiresAt || null,
        stockQuantity,
      };

      if (form.id) {
        await catalogApi.updateIngredient(form.id, payload);
        setFormSuccess(`已更新「${name}」`);
      } else {
        await catalogApi.createIngredient(payload);
        setFormSuccess(`已新增「${name}」`);
      }

      setForm(INITIAL_FORM);
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

  const isEditing = !!form.id;
  const editingName = isEditing
    ? (ingredients.find((i) => i.id === form.id)?.name ?? "")
    : "";

  return (
    <div className="page-container" style={{ maxWidth: 820 }}>
      {/* ── Form ── */}
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
                單價（分） <span style={{ color: "#be123c" }}>*</span>
              </label>
              <input
                name="unitPriceCents"
                type="number"
                min={0}
                step={1}
                value={form.unitPriceCents}
                onChange={onChange}
                placeholder="例：350"
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
                庫存數量 <span style={{ color: "#be123c" }}>*</span>
              </label>
              <input
                name="stockQuantity"
                type="number"
                min={0}
                step="0.001"
                value={form.stockQuantity}
                onChange={onChange}
                placeholder="例：25.500"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2c9a3", fontSize: 14, boxSizing: "border-box" }}
              />
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
                進貨日
              </label>
              <input
                name="stockedAt"
                type="date"
                value={form.stockedAt}
                onChange={onChange}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2c9a3", fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "#7a5c3a", fontWeight: 600, display: "block", marginBottom: 4 }}>
                到期日
              </label>
              <input
                name="expiresAt"
                type="date"
                value={form.expiresAt}
                onChange={onChange}
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

      {/* ── List ── */}
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
                  <th style={thStyle}>單價</th>
                  <th style={thStyle}>庫存</th>
                  <th style={thStyle}>品牌 / 產地</th>
                  <th style={thStyle}>進貨 / 到期</th>
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
                    <td style={tdStyle}>{formatMoney(ing.unitPriceCents)}</td>
                    <td style={tdStyle}>{formatStockQuantity(ing.stockQuantity)}</td>
                    <td style={tdStyle}>{[ing.brand, ing.origin].filter(Boolean).join(" / ") || "-"}</td>
                    <td style={tdStyle}>{`${ing.stockedAt ?? "-"} / ${ing.expiresAt ?? "-"}`}</td>
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
