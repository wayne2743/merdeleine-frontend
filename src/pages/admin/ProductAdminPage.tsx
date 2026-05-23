import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { catalogApi } from "../../api/catalogApi";
import type { Ingredient, IngredientGroup, Product, ProductCreateRequest, ProductImage, ProductUpdateRequest } from "../../types/domain";

type ProductForm = {
  id: string | null;
  name: string;
  description: string;
  ingredients: string;
  allergens: string;
  calories: string;
  unitPriceCents: string;
  currency: string;
  defaultMinQty: string;
  defaultMaxQty: string;
  defaultOpenDays: string;
  defaultLeadDays: string;
  defaultShipDays: string;
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
  recipeQuantity: string;
  productIngredients: Array<{
    ingredientId: string;
    requiredAmount: string;
    unit: string;
    ingredientGroupId?: string | null;
  }>;
};

type ProductImageForm = {
  file: File | null;
  imageType: string;
  sortOrder: string;
  isPrimary: boolean;
  isActive: boolean;
};

type ProductImagesModalState = {
  open: boolean;
  loading: boolean;
  error: string | null;
  productId: string;
  productName: string;
  images: ProductImage[];
};

type ImageEditDraft = {
  sortOrder: string;
  isActive: boolean;
};

const INITIAL_FORM: ProductForm = {
  id: null,
  name: "",
  description: "",
  ingredients: "",
  allergens: "",
  calories: "",
  unitPriceCents: "",
  currency: "TWD",
  defaultMinQty: "1",
  defaultMaxQty: "",
  defaultOpenDays: "7",
  defaultLeadDays: "0",
  defaultShipDays: "0",
  status: "ACTIVE",
  recipeQuantity: "1",
  productIngredients: [],
};

const INITIAL_IMAGE_FORM: ProductImageForm = {
  file: null,
  imageType: "MAIN",
  sortOrder: "1",
  isPrimary: true,
  isActive: true,
};

const actionButtonBase: CSSProperties = {
  minWidth: 82,
  padding: "8px 14px",
  borderRadius: 999,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  border: "1px solid #d7b283",
  boxShadow: "0 6px 16px rgba(56, 33, 8, 0.14)",
};

const actionButtonView: CSSProperties = {
  background: "linear-gradient(180deg, #efe6d6 0%, #e1c08f 100%)",
  color: "#4a3420",
  borderColor: "#d2ab73",
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

const PAGE_SIZE = 5;
type ProductStatusFilter = "ALL" | Product["status"];

function fmtPrice(amount?: number | null, currency?: string | null): string {
  if (!Number.isFinite(amount)) return "-";
  return `${currency || "TWD"} ${Number(amount).toLocaleString()}`;
}

function encodeDescriptionForDb(value: string): string {
  return value.replace(/\r\n|\r|\n/g, "\\n");
}

function decodeDescriptionFromDb(value?: string | null): string {
  return (value || "").replace(/\\n/g, "\n");
}

function truncateDescription(value?: string | null, maxLength = 56): string {
  const normalized = decodeDescriptionFromDb(value).replace(/\s+/g, " ").trim();
  if (!normalized) return "-";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
}

function splitAllergens(value?: string | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[,，、;；\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function aggregateAllergenTags(product: Product): string[] {
  const tags = new Set<string>();

  splitAllergens(product.allergens).forEach((tag) => tags.add(tag));
  splitAllergens(product.allergies).forEach((tag) => tags.add(tag));
  (product.productIngredients ?? []).forEach((pi) => {
    splitAllergens(pi.allergens).forEach((tag) => tags.add(tag));
  });

  return [...tags];
}

function toGramAmount(requiredAmount: string, unit: string): number | null {
  const amount = Number(requiredAmount);
  if (!Number.isFinite(amount) || amount < 0) return null;

  const normalizedUnit = (unit || "").trim().toLowerCase();
  if (/^(kg|公斤|千克)$/.test(normalizedUnit)) return amount * 1000;
  if (/^(g|gram|grams|公克|克)$/.test(normalizedUnit)) return amount;
  if (/^(mg|毫克)$/.test(normalizedUnit)) return amount / 1000;
  return null;
}

function aggregateCalories(product: Product): number | null {
  let totalCalories = 0;
  let hasCalculatedValue = false;

  (product.productIngredients ?? []).forEach((pi) => {
    if (!Number.isFinite(pi.caloriesPer100g)) return;
    const gramAmount = toGramAmount(pi.requiredAmount, pi.unit);
    if (gramAmount == null) return;

    totalCalories += (Number(pi.caloriesPer100g) * gramAmount) / 100;
    hasCalculatedValue = true;
  });

  if (hasCalculatedValue) return Math.round(totalCalories);

  const fallback = product.calories ?? product.calorie;
  return Number.isFinite(fallback) ? Number(fallback) : null;
}

function toForm(product: Product): ProductForm {
  return {
    id: product.id,
    name: product.name || "",
    description: decodeDescriptionFromDb(product.description),
    ingredients: product.ingredients || "",
    allergens: product.allergens || product.allergies || "",
    calories: Number.isFinite(product.calories) ? String(product.calories) : Number.isFinite(product.calorie) ? String(product.calorie) : "",
    unitPriceCents: Number.isFinite(product.unitPriceCents) ? String(product.unitPriceCents) : "",
    currency: product.currency || "TWD",
    defaultMinQty: Number.isFinite(product.defaultMinQty) ? String(product.defaultMinQty) : "1",
    defaultMaxQty: Number.isFinite(product.defaultMaxQty) ? String(product.defaultMaxQty) : "",
    defaultOpenDays: Number.isFinite(product.defaultOpenDays) ? String(product.defaultOpenDays) : "7",
    defaultLeadDays: Number.isFinite(product.defaultLeadDays) ? String(product.defaultLeadDays) : "0",
    defaultShipDays: Number.isFinite(product.defaultShipDays) ? String(product.defaultShipDays) : "0",
    status: product.status,
    recipeQuantity: Number.isFinite(product.recipeQuantity) ? String(product.recipeQuantity) : "1",
    productIngredients: product.productIngredients ?? [],
  };
}

const INITIAL_PI_DRAFT = { ingredientId: "", requiredAmount: "", unit: "", ingredientGroupId: "" };

export default function ProductAdminPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(INITIAL_FORM);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [piDraft, setPiDraft] = useState(INITIAL_PI_DRAFT);
  const [ingredientGroups, setIngredientGroups] = useState<IngredientGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [imageForm, setImageForm] = useState<ProductImageForm>(INITIAL_IMAGE_FORM);
  const [imagesModal, setImagesModal] = useState<ProductImagesModalState>({
    open: false,
    loading: false,
    error: null,
    productId: "",
    productName: "",
    images: [],
  });
  const [selectedOriginalUrl, setSelectedOriginalUrl] = useState<string | null>(null);
  const [imageDraftById, setImageDraftById] = useState<Record<string, ImageEditDraft>>({});
  const [savingImageGroupKey, setSavingImageGroupKey] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>("ALL");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const isEditMode = Boolean(form.id);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  async function loadProducts(nextPage: number, nextStatus: ProductStatusFilter) {
    setLoading(true);
    setError(null);
    try {
      const response = await catalogApi.pageProducts({
        page: nextPage,
        size: PAGE_SIZE,
        status: nextStatus === "ALL" ? undefined : nextStatus,
        sort: "createdAt,desc",
      });

      if (nextPage > 0 && response.items.length === 0 && response.total > 0) {
        return await loadProducts(nextPage - 1, nextStatus);
      }

      const nextItems = response.items ?? [];
      setItems(nextItems);
      setPage(response.page ?? nextPage);
      setTotal(response.total ?? 0);

    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "讀取商品失敗");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts(page, statusFilter);
  }, [page, statusFilter]);

  function updateForm<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(INITIAL_FORM);
  }

  function resetImageForm() {
    setImageForm(INITIAL_IMAGE_FORM);
  }

  function updateImageForm<K extends keyof ProductImageForm>(key: K, value: ProductImageForm[K]) {
    setImageForm((prev) => ({ ...prev, [key]: value }));
  }

  function closeFormModal() {
    setFormModalOpen(false);
    resetForm();
    resetImageForm();
    setIngredientGroups([]);
    setNewGroupName("");
    setEditingGroupId(null);
  }

  function openCreateModal() {
    setMessage(null);
    resetForm();
    resetImageForm();
    setPiDraft(INITIAL_PI_DRAFT);
    setIngredientGroups([]);
    setNewGroupName("");
    setEditingGroupId(null);
    setFormModalOpen(true);
    void catalogApi.listIngredients().then(setAllIngredients).catch(() => {});
  }

  function openEditModal(product: Product) {
    setMessage(null);
    setForm(toForm(product));
    resetImageForm();
    setPiDraft(INITIAL_PI_DRAFT);
    setNewGroupName("");
    setEditingGroupId(null);
    setFormModalOpen(true);
    void catalogApi.listIngredients().then(setAllIngredients).catch(() => {});
    void catalogApi.listProductIngredientGroups(product.id).then(setIngredientGroups).catch(() => {});
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const name = form.name.trim();
    const description = encodeDescriptionForDb(form.description.trim());
    const ingredients = form.ingredients.trim();
    const allergens = form.allergens.trim();
    const calories = form.calories.trim() === "" ? undefined : Number(form.calories);
    const currency = form.currency.trim().toUpperCase();
    const unitPriceCents = Number(form.unitPriceCents);
    const defaultMinQty = Number(form.defaultMinQty);
    const defaultMaxQty = form.defaultMaxQty.trim() === "" ? null : Number(form.defaultMaxQty);
    const defaultOpenDays = Number(form.defaultOpenDays);
    const defaultLeadDays = Number(form.defaultLeadDays);
    const defaultShipDays = Number(form.defaultShipDays);
    const recipeQuantity = Number(form.recipeQuantity);

    if (!name) {
      setMessage("請填寫商品名稱");
      return;
    }
    if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) {
      setMessage("請填寫正確的單價（整數，且不可小於 0）");
      return;
    }
    if (calories !== undefined && (!Number.isFinite(calories) || calories < 0)) {
      setMessage("請填寫正確的 calories（留空或數字，且不可小於 0）");
      return;
    }
    if (!Number.isInteger(defaultMinQty) || defaultMinQty < 1) {
      setMessage("請填寫正確的 defaultMinQty（整數，且需大於等於 1）");
      return;
    }
    if (defaultMaxQty !== null && (!Number.isInteger(defaultMaxQty) || defaultMaxQty < 1)) {
      setMessage("請填寫正確的 defaultMaxQty（留空或整數，且需大於等於 1）");
      return;
    }
    if (defaultMaxQty !== null && defaultMaxQty < defaultMinQty) {
      setMessage("defaultMaxQty 不可小於 defaultMinQty");
      return;
    }
    if (!Number.isInteger(defaultOpenDays) || defaultOpenDays < 1) {
      setMessage("請填寫正確的 defaultOpenDays（整數，且需大於等於 1）");
      return;
    }
    if (!Number.isInteger(defaultLeadDays) || defaultLeadDays < 0) {
      setMessage("請填寫正確的 defaultLeadDays（整數，且不可小於 0）");
      return;
    }
    if (!Number.isInteger(defaultShipDays) || defaultShipDays < 0) {
      setMessage("請填寫正確的 defaultShipDays（整數，且不可小於 0）");
      return;
    }
    if (!Number.isInteger(recipeQuantity) || recipeQuantity < 1) {
      setMessage("請填寫正確的食譜數量（整數，且需大於等於 1）");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    let savedProduct: Product | null = null;

    const productIngredients = form.productIngredients.map((pi) => ({
      ingredientId: pi.ingredientId,
      requiredAmount: pi.requiredAmount,
      unit: pi.unit,
      ingredientGroupId: pi.ingredientGroupId ?? null,
    }));

    try {
      if (form.id) {
        const payload: ProductUpdateRequest = {
          name,
          description,
          ingredients,
          allergens,
          allergies: allergens,
          calories,
          calorie: calories,
          status: form.status,
          unitPriceCents,
          currency,
          defaultMinQty,
          defaultMaxQty,
          defaultOpenDays,
          defaultLeadDays,
          defaultShipDays,
          recipeQuantity,
          productIngredients,
        };
        savedProduct = await catalogApi.updateProduct(form.id, payload);
      } else {
        const payload: ProductCreateRequest = {
          name,
          description,
          ingredients,
          allergens,
          allergies: allergens,
          calories,
          calorie: calories,
          status: form.status,
          unitPriceCents,
          currency,
          defaultMinQty,
          defaultMaxQty,
          defaultOpenDays,
          defaultLeadDays,
          defaultShipDays,
          recipeQuantity,
          productIngredients,
        };
        savedProduct = await catalogApi.createProduct(payload);
      }

      if (savedProduct && imageForm.file) {
        await catalogApi.uploadProductImage(savedProduct.id, {
          file: imageForm.file,
          imageType: INITIAL_IMAGE_FORM.imageType,
          sortOrder: Number(INITIAL_IMAGE_FORM.sortOrder),
          isPrimary: INITIAL_IMAGE_FORM.isPrimary,
          isActive: INITIAL_IMAGE_FORM.isActive,
        });
      }

      setMessage(imageForm.file ? "商品與圖片已儲存成功" : form.id ? "商品更新成功" : "商品新增成功");
      closeFormModal();
      await loadProducts(page, statusFilter);
    } catch (e: any) {
      console.error(e);
      if (savedProduct) {
        setForm(toForm(savedProduct));
        setFormModalOpen(true);
        setMessage(e?.message ?? "商品已儲存，但圖片上傳失敗");
      } else {
        setMessage(e?.message ?? (form.id ? "更新商品失敗" : "新增商品失敗"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(product: Product) {
    if (submitting) return;
    const ok = window.confirm(`確定刪除商品「${product.name}」？`);
    if (!ok) return;

    setSubmitting(true);
    setMessage(null);
    try {
      await catalogApi.deleteProduct(product.id);
      if (form.id === product.id) closeFormModal();
      setMessage("商品刪除成功");
      await loadProducts(page, statusFilter);
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message ?? "刪除商品失敗");
    } finally {
      setSubmitting(false);
    }
  }

  async function openImagesModal(product: Product) {
    setImagesModal({
      open: true,
      loading: true,
      error: null,
      productId: product.id,
      productName: product.name,
      images: [],
    });

    try {
      const images = await catalogApi.listProductImages(product.id);
      const sorted = [...(images ?? [])].sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
      const draft: Record<string, ImageEditDraft> = {};
      sorted.forEach((img) => {
        draft[img.id] = {
          sortOrder: String(img.sortOrder ?? 1),
          isActive: Boolean(img.isActive),
        };
      });
      setImageDraftById(draft);
      setImagesModal((prev) => ({ ...prev, loading: false, images: sorted }));
    } catch (e: any) {
      console.error(e);
      setImagesModal((prev) => ({
        ...prev,
        loading: false,
        error: e?.message ?? "讀取商品圖片失敗",
      }));
    }
  }

  function closeImagesModal() {
    setSelectedOriginalUrl(null);
    setSavingImageGroupKey(null);
    setImageDraftById({});
    setImagesModal((prev) => ({ ...prev, open: false }));
  }

  function getImageGroupKey(img: ProductImage): string {
    if (img.originalFilename && img.originalFilename.trim()) {
      return `filename:${img.originalFilename}`;
    }
    return `sort:${img.sortOrder}`;
  }

  function updateImageDraft<K extends keyof ImageEditDraft>(imageId: string, key: K, value: ImageEditDraft[K]) {
    setImageDraftById((prev) => ({
      ...prev,
      [imageId]: {
        sortOrder: prev[imageId]?.sortOrder ?? "1",
        isActive: prev[imageId]?.isActive ?? true,
        [key]: value,
      },
    }));
  }

  async function saveImageMetaForAllTypes(baseImage: ProductImage) {
    const draft = imageDraftById[baseImage.id];
    if (!draft) return;

    const parsedSortOrder = Number(draft.sortOrder);
    if (!Number.isFinite(parsedSortOrder) || parsedSortOrder < 1) {
      setMessage("排序需為大於等於 1 的整數");
      return;
    }

    const groupKey = getImageGroupKey(baseImage);
    const groupImages = imagesModal.images.filter((img) => getImageGroupKey(img) === groupKey);
    if (groupImages.length === 0) return;

    setSavingImageGroupKey(groupKey);
    setMessage(null);

    try {
      const updated = await Promise.all(
        groupImages.map((img) =>
          catalogApi.updateProductImage(imagesModal.productId, img.id, {
            sortOrder: parsedSortOrder,
            isActive: draft.isActive,
          })
        )
      );

      const updatedById = new Map(updated.map((img) => [img.id, img]));

      setImagesModal((prev) => ({
        ...prev,
        images: prev.images.map((img) => updatedById.get(img.id) ?? img),
      }));

      setImageDraftById((prev) => {
        const next = { ...prev };
        groupImages.forEach((img) => {
          next[img.id] = {
            sortOrder: String(parsedSortOrder),
            isActive: draft.isActive,
          };
        });
        return next;
      });

      setMessage(`已更新同組圖片（${groupImages.length} 種類型）`);
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message ?? "更新圖片排序/狀態失敗");
    } finally {
      setSavingImageGroupKey(null);
    }
  }

  function openOriginalPreview(galleryImage: ProductImage) {
    const originals = imagesModal.images.filter((img) => img.imageType?.toUpperCase() === "ORIGINAL");
    const matchedOriginal =
      originals.find((img) => img.sortOrder === galleryImage.sortOrder)
      ?? originals.find((img) => img.isPrimary === galleryImage.isPrimary)
      ?? originals[0]
      ?? galleryImage;

    setSelectedOriginalUrl(matchedOriginal.cdnUrl);
  }

  function closeOriginalPreview() {
    setSelectedOriginalUrl(null);
  }

  async function handleCreateGroup() {
    if (!form.id || !newGroupName.trim()) return;
    try {
      const group = await catalogApi.createIngredientGroup({ productId: form.id, name: newGroupName.trim() });
      setIngredientGroups((prev) => [...prev, group]);
      setNewGroupName("");
    } catch (e: any) {
      setMessage(e?.message ?? "新增群組失敗");
    }
  }

  async function handleUpdateGroup(id: string) {
    if (!editingGroupName.trim()) return;
    try {
      const updated = await catalogApi.updateIngredientGroup(id, { name: editingGroupName.trim() });
      setIngredientGroups((prev) => prev.map((g) => (g.id === id ? updated : g)));
      setEditingGroupId(null);
    } catch (e: any) {
      setMessage(e?.message ?? "更新群組失敗");
    }
  }

  async function handleDeleteGroup(id: string) {
    if (!window.confirm("確定刪除此群組？")) return;
    try {
      await catalogApi.deleteIngredientGroup(id);
      setIngredientGroups((prev) => prev.filter((g) => g.id !== id));
      setForm((prev) => ({
        ...prev,
        productIngredients: prev.productIngredients.map((pi) =>
          pi.ingredientGroupId === id ? { ...pi, ingredientGroupId: null } : pi
        ),
      }));
    } catch (e: any) {
      setMessage(e?.message ?? "刪除群組失敗");
    }
  }

  return (
    <div>
      {(() => {
        const galleryImages = imagesModal.images.filter((img) => img.imageType?.toUpperCase() === "GALLERY");

        return (
          <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2>商品管理（CRUD）</h2>
          <p style={{ color: "#eadfbd", marginTop: -4 }}>
            可新增、編輯、刪除目前商品。
          </p>
        </div>
        <button type="button" onClick={openCreateModal} disabled={submitting}>
          新增商品
        </button>
      </div>

      {message && <div style={{ marginTop: 10, color: "#f4e1bf" }}>{message}</div>}
      {error && <div style={{ marginTop: 8, color: "#ffd3c8" }}>讀取錯誤：{error}</div>}

      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#c9b08a", fontSize: 13 }}>
          商品狀態
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ProductStatusFilter);
              setPage(0);
            }}
            disabled={loading || submitting}
          >
            <option value="ALL">全部</option>
            <option value="ACTIVE">上架中</option>
            <option value="INACTIVE">下架</option>
            <option value="DRAFT">草稿</option>
          </select>
        </label>
        <span style={{ color: "#c9b08a", fontSize: 13 }}>每頁 {PAGE_SIZE} 筆，排序：建立時間新到舊</span>
      </div>

      <div style={{ marginTop: 14, borderRadius: 12, overflowX: "auto", border: "1px solid #eadfcd", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", color: "#2f241b", minWidth: 1100 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              <th style={{ padding: 10 }}>商品名稱</th>
              <th style={{ padding: 10 }}>狀態</th>
              <th style={{ padding: 10 }}>單價</th>
              <th style={{ padding: 10 }}>熱量</th>
              <th style={{ padding: 10 }}>成分</th>
              <th style={{ padding: 10 }}>過敏原</th>
              <th style={{ padding: 10 }}>原物料</th>
              <th style={{ padding: 10 }}>描述</th>
              <th style={{ padding: 10, width: 220 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} style={{ padding: 12 }}>
                  載入中...
                </td>
              </tr>
            )}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 12 }}>
                  {statusFilter === "ALL" ? "目前沒有商品資料" : `沒有「${statusFilter === "ACTIVE" ? "上架中" : statusFilter === "INACTIVE" ? "下架" : "草稿"}」的商品`}
                </td>
              </tr>
            )}

            {!loading &&
              items.map((p) => {
                const piNames = (p.productIngredients ?? []).map((pi) => pi.ingredientName ?? pi.ingredientId);
                const allergenTags = aggregateAllergenTags(p);
                const totalCalories = aggregateCalories(p);
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f1ebe2" }}>
                    <td style={{ padding: 10, fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: 10 }}>{p.status}</td>
                    <td style={{ padding: 10 }}>{fmtPrice(p.unitPriceCents, p.currency)}</td>
                    <td style={{ padding: 10 }}>{totalCalories != null ? `${totalCalories} kcal` : "-"}</td>
                    <td style={{ padding: 10 }}>{p.ingredients || "-"}</td>
                    <td style={{ padding: 10, maxWidth: 180, fontSize: 12 }}>
                      {allergenTags.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {allergenTags.map((tag) => (
                            <span key={tag} style={{ background: "#f7ede0", color: "#7a5c3a", borderRadius: 999, padding: "2px 8px", fontWeight: 500, border: "1px solid #e8d5b8", whiteSpace: "nowrap" }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : "-"}
                    </td>
                    <td style={{ padding: 10, maxWidth: 180, fontSize: 12 }}>
                      {piNames.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {piNames.map((name, i) => (
                            <span key={i} style={{ background: "#f7ede0", color: "#7a5c3a", borderRadius: 999, padding: "2px 8px", fontWeight: 500, border: "1px solid #e8d5b8", whiteSpace: "nowrap" }}>
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : "-"}
                    </td>
                    <td style={{ padding: 10 }}>{truncateDescription(p.description)}</td>
                    <td style={{ padding: 10 }}>
                      <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
                        <button
                          type="button"
                          onClick={() => void openImagesModal(p)}
                          disabled={submitting}
                          style={{ ...actionButtonBase, ...actionButtonView }}
                        >
                          查看圖片
                        </button>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            disabled={submitting}
                            style={{ ...actionButtonBase, ...actionButtonEdit }}
                          >
                            編輯
                          </button>
                          <button
                            type="button"
                            onClick={() => void onDelete(p)}
                            disabled={submitting}
                            style={{ ...actionButtonBase, ...actionButtonDelete }}
                          >
                            刪除
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {!error && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div style={{ color: "#c9b08a", fontSize: 13 }}>
            共 {total} 筆，第 {Math.min(page + 1, totalPages)} / {totalPages} 頁
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setPage(0)} disabled={loading || page <= 0}>第一頁</button>
            <button type="button" onClick={() => setPage((prev) => Math.max(0, prev - 1))} disabled={loading || page <= 0}>上一頁</button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={loading || page >= totalPages - 1}
            >
              下一頁
            </button>
            <button type="button" onClick={() => setPage(totalPages - 1)} disabled={loading || page >= totalPages - 1}>最後一頁</button>
          </div>
        </div>
      )}

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
              width: "min(720px, 100%)",
              maxHeight: "82vh",
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
              <div style={{ fontWeight: 700, fontSize: 20 }}>{isEditMode ? "編輯商品" : "新增商品"}</div>
              <button
                type="button"
                onClick={closeFormModal}
                disabled={submitting}
                style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer", lineHeight: 1 }}
                aria-label="close"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={onSubmit}
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              <label style={{ display: "grid", gap: 4 }}>
                <span>商品名稱</span>
                <input value={form.name} onChange={(e) => updateForm("name", e.target.value)} maxLength={100} required />
              </label>

              <label style={{ display: "grid", gap: 4 }}>
                <span>商品描述</span>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  maxLength={500}
                  rows={4}
                />
              </label>

              <label style={{ display: "grid", gap: 4 }}>
                <span>成分</span>
                <textarea
                  value={form.ingredients}
                  onChange={(e) => updateForm("ingredients", e.target.value)}
                  maxLength={500}
                  rows={2}
                />
              </label>

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span>過敏原</span>
                  <input value={form.allergens} onChange={(e) => updateForm("allergens", e.target.value)} maxLength={200} />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span>熱量（kcal）</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.calories}
                    onChange={(e) => updateForm("calories", e.target.value)}
                    placeholder="例如 320"
                  />
                </label>
              </div>

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span>單價（cents）</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.unitPriceCents}
                    onChange={(e) => updateForm("unitPriceCents", e.target.value)}
                    required
                  />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span>幣別</span>
                  <input value={form.currency} onChange={(e) => updateForm("currency", e.target.value)} maxLength={10} required />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span>狀態</span>
                  <select value={form.status} onChange={(e) => updateForm("status", e.target.value as ProductForm["status"])}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span>defaultMinQty</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={form.defaultMinQty}
                    onChange={(e) => updateForm("defaultMinQty", e.target.value)}
                    required
                  />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span>defaultMaxQty</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={form.defaultMaxQty}
                    onChange={(e) => updateForm("defaultMaxQty", e.target.value)}
                    placeholder="留空代表不限"
                  />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span>defaultLeadDays</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.defaultLeadDays}
                    onChange={(e) => updateForm("defaultLeadDays", e.target.value)}
                    required
                  />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span>defaultOpenDays</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={form.defaultOpenDays}
                    onChange={(e) => updateForm("defaultOpenDays", e.target.value)}
                    required
                  />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span>defaultShipDays</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.defaultShipDays}
                    onChange={(e) => updateForm("defaultShipDays", e.target.value)}
                    required
                  />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span>食譜數量（recipeQuantity）</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={form.recipeQuantity}
                    onChange={(e) => updateForm("recipeQuantity", e.target.value)}
                    required
                  />
                </label>
              </div>

              <div style={{ fontSize: 12, color: "#6b5a47" }}>
                `defaultMaxQty` 可留空，代表不限制上限。
              </div>

              {/* ── 材料群組管理（僅編輯模式） ── */}
              {isEditMode && (
                <div style={{ borderTop: "1px solid #eee", paddingTop: 12, display: "grid", gap: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>材料群組管理</span>

                  {ingredientGroups.length === 0 && (
                    <div style={{ fontSize: 13, color: "#aaa" }}>尚未建立任何群組</div>
                  )}

                  {ingredientGroups.map((group) => {
                    const groupIngredients = form.productIngredients.filter((pi) => pi.ingredientGroupId === group.id);
                    return (
                      <div key={group.id} style={{ border: "1px solid #e8d9c3", borderRadius: 8, padding: "10px 12px", background: "#fffcf6" }}>
                        {editingGroupId === group.id ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: groupIngredients.length > 0 ? 8 : 0 }}>
                            <input
                              value={editingGroupName}
                              onChange={(e) => setEditingGroupName(e.target.value)}
                              style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: "1px solid #e2c9a3", fontSize: 13 }}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleUpdateGroup(group.id); } }}
                            />
                            <button type="button" onClick={() => void handleUpdateGroup(group.id)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "#e9c07a", border: "1px solid #d5a85a", cursor: "pointer" }}>儲存</button>
                            <button type="button" onClick={() => setEditingGroupId(null)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 12, background: "#f5f5f5", border: "1px solid #ddd", cursor: "pointer" }}>取消</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: groupIngredients.length > 0 ? 8 : 0 }}>
                            <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{group.name}</span>
                            <button type="button" onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); }} style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, background: "#f0e8d6", border: "1px solid #e2c9a3", cursor: "pointer" }}>改名</button>
                            <button type="button" onClick={() => void handleDeleteGroup(group.id)} style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, background: "#fff1f2", color: "#ba3b2f", border: "1px solid #f1b8b0", cursor: "pointer" }}>刪除</button>
                          </div>
                        )}
                        {groupIngredients.length > 0 && (
                          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#5f4528", display: "grid", gap: 2 }}>
                            {groupIngredients.map((pi) => {
                              const name = allIngredients.find((i) => i.id === pi.ingredientId)?.name ?? pi.ingredientId;
                              return <li key={pi.ingredientId}>{name}：{pi.requiredAmount} {pi.unit}</li>;
                            })}
                          </ul>
                        )}
                        {groupIngredients.length === 0 && (
                          <div style={{ fontSize: 12, color: "#bbb" }}>（尚無原物料）</div>
                        )}
                      </div>
                    );
                  })}

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="新群組名稱"
                      style={{ flex: 1, padding: "7px 8px", borderRadius: 6, border: "1px solid #e2c9a3", fontSize: 13 }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleCreateGroup(); } }}
                    />
                    <button
                      type="button"
                      disabled={!newGroupName.trim()}
                      onClick={() => void handleCreateGroup()}
                      style={{ padding: "7px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: "#e9c07a", border: "1px solid #d5a85a", cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      + 新增群組
                    </button>
                  </div>
                </div>
              )}

              {/* ── 綁定原物料 ── */}
              <div style={{ borderTop: "1px solid #eee", paddingTop: 12, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>綁定原物料</span>
                </div>

                {/* 依群組顯示已綁定原物料 */}
                {form.productIngredients.length > 0 && (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f7f2eb", color: "#5f4528", textAlign: "left" }}>
                          <th style={{ padding: "6px 10px", fontWeight: 600 }}>原物料名稱</th>
                          <th style={{ padding: "6px 10px", fontWeight: 600 }}>用量</th>
                          <th style={{ padding: "6px 10px", fontWeight: 600 }}>單位</th>
                          <th style={{ padding: "6px 10px", fontWeight: 600 }}>群組</th>
                          <th style={{ padding: "6px 10px", fontWeight: 600 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.productIngredients.map((pi, idx) => {
                          const name = allIngredients.find((i) => i.id === pi.ingredientId)?.name ?? pi.ingredientId;
                          const groupName = ingredientGroups.find((g) => g.id === pi.ingredientGroupId)?.name ?? "";
                          return (
                            <tr key={pi.ingredientId} style={{ borderBottom: "1px solid #f0e8dc", background: idx % 2 === 0 ? "#fff" : "#fdf8f2" }}>
                              <td style={{ padding: "6px 10px" }}>{name}</td>
                              <td style={{ padding: "6px 10px" }}>{pi.requiredAmount}</td>
                              <td style={{ padding: "6px 10px" }}>{pi.unit}</td>
                              <td style={{ padding: "6px 10px" }}>
                                <select
                                  value={pi.ingredientGroupId ?? ""}
                                  onChange={(e) => {
                                    const updated = [...form.productIngredients];
                                    updated[idx] = { ...pi, ingredientGroupId: e.target.value || null };
                                    updateForm("productIngredients", updated);
                                  }}
                                  style={{ padding: "3px 6px", borderRadius: 5, border: "1px solid #e2c9a3", fontSize: 12, background: "#fff" }}
                                >
                                  <option value="">— 未分組 —</option>
                                  {ingredientGroups.map((g) => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                  ))}
                                </select>
                                {groupName && <span style={{ marginLeft: 6, fontSize: 11, color: "#7a5c3a" }}>{groupName}</span>}
                              </td>
                              <td style={{ padding: "6px 10px" }}>
                                <button
                                  type="button"
                                  onClick={() => updateForm("productIngredients", form.productIngredients.filter((_, i) => i !== idx))}
                                  style={{ background: "#fff1f2", color: "#ba3b2f", border: "1px solid #f1b8b0", borderRadius: 999, padding: "3px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                                >
                                  移除
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {form.productIngredients.length === 0 && (
                  <div style={{ fontSize: 13, color: "#aaa" }}>尚未綁定任何原物料</div>
                )}

                {/* 新增一筆綁定 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 8, alignItems: "end" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#7a5c3a", fontWeight: 600, marginBottom: 3 }}>選擇原物料</div>
                    <select
                      value={piDraft.ingredientId}
                      onChange={(e) => setPiDraft((p) => ({ ...p, ingredientId: e.target.value }))}
                      style={{ width: "100%", padding: "7px 8px", borderRadius: 6, border: "1px solid #e2c9a3", fontSize: 13 }}
                    >
                      <option value="">— 選擇 —</option>
                      {allIngredients
                        .filter((i) => !form.productIngredients.some((pi) => pi.ingredientId === i.id))
                        .map((i) => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#7a5c3a", fontWeight: 600, marginBottom: 3 }}>整批用量</div>
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      value={piDraft.requiredAmount}
                      onChange={(e) => setPiDraft((p) => ({ ...p, requiredAmount: e.target.value }))}
                      placeholder="例：100"
                      style={{ width: 100, padding: "7px 8px", borderRadius: 6, border: "1px solid #e2c9a3", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#7a5c3a", fontWeight: 600, marginBottom: 3 }}>單位</div>
                    <input
                      value={piDraft.unit}
                      onChange={(e) => setPiDraft((p) => ({ ...p, unit: e.target.value }))}
                      placeholder="例：g"
                      style={{ width: 70, padding: "7px 8px", borderRadius: 6, border: "1px solid #e2c9a3", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  {ingredientGroups.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, color: "#7a5c3a", fontWeight: 600, marginBottom: 3 }}>群組</div>
                      <select
                        value={piDraft.ingredientGroupId}
                        onChange={(e) => setPiDraft((p) => ({ ...p, ingredientGroupId: e.target.value }))}
                        style={{ width: 110, padding: "7px 8px", borderRadius: 6, border: "1px solid #e2c9a3", fontSize: 13 }}
                      >
                        <option value="">— 未分組 —</option>
                        {ingredientGroups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!piDraft.ingredientId || !piDraft.requiredAmount || !piDraft.unit}
                    onClick={() => {
                      if (!piDraft.ingredientId || !piDraft.requiredAmount || !piDraft.unit) return;
                      updateForm("productIngredients", [
                        ...form.productIngredients,
                        {
                          ingredientId: piDraft.ingredientId,
                          requiredAmount: piDraft.requiredAmount,
                          unit: piDraft.unit,
                          ingredientGroupId: piDraft.ingredientGroupId || null,
                        },
                      ]);
                      setPiDraft(INITIAL_PI_DRAFT);
                    }}
                    style={{
                      background: "linear-gradient(180deg, #f7e4c2 0%, #e9c07a 100%)",
                      color: "#5a3e1b",
                      border: "1px solid #d5a85a",
                      borderRadius: 999,
                      padding: "7px 16px",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    加入
                  </button>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #eee", paddingTop: 10, display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 600 }}>圖片上傳（可選）</div>

                <label style={{ display: "grid", gap: 4 }}>
                  <span>圖片檔案</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => updateImageForm("file", e.target.files?.[0] ?? null)}
                  />
                </label>
                <div style={{ fontSize: 12, color: "#6b5a47" }}>
                  圖片屬性會自動套用預設值（imageType=MAIN、sortOrder=1、isPrimary=true、isActive=true）。
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                <button type="submit" disabled={submitting}>
                  {submitting ? "處理中..." : isEditMode ? "儲存修改" : "新增商品"}
                </button>
                <button type="button" onClick={closeFormModal} disabled={submitting}>
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {imagesModal.open && (
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
              width: "min(980px, 100%)",
              maxHeight: "82vh",
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
              <div>
                <div style={{ fontWeight: 700, fontSize: 20 }}>商品圖片預覽</div>
                <div style={{ fontSize: 13, color: "#6b5a47", marginTop: 4 }}>
                  {imagesModal.productName} ({imagesModal.productId})
                </div>
              </div>
              <button
                type="button"
                onClick={closeImagesModal}
                style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer", lineHeight: 1 }}
                aria-label="close"
              >
                ×
              </button>
            </div>

            {imagesModal.loading && <div style={{ padding: "8px 2px" }}>圖片載入中...</div>}

            {!imagesModal.loading && imagesModal.error && (
              <div style={{ color: "crimson", lineHeight: 1.7 }}>{imagesModal.error}</div>
            )}

            {!imagesModal.loading && !imagesModal.error && imagesModal.images.length === 0 && (
              <div style={{ color: "#666" }}>此商品目前沒有圖片。</div>
            )}

            {!imagesModal.loading && !imagesModal.error && imagesModal.images.length > 0 && galleryImages.length === 0 && (
              <div style={{ color: "#666" }}>此商品目前沒有 GALLERY 圖片。</div>
            )}

            {!imagesModal.loading && !imagesModal.error && galleryImages.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 14,
                }}
              >
                {galleryImages.map((img) => (
                  <div key={img.id} style={{ border: "1px solid #eadfcd", borderRadius: 10, overflow: "hidden", background: "#fffaf5" }}>
                    <button
                      type="button"
                      onClick={() => openOriginalPreview(img)}
                      style={{
                        position: "relative",
                        background: "#f7f2ea",
                        aspectRatio: "1 / 1",
                        width: "100%",
                        border: "none",
                        padding: 0,
                        cursor: "zoom-in",
                      }}
                    >
                      <img
                        src={img.cdnUrl}
                        alt={img.originalFilename || imagesModal.productName}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      {img.isPrimary && (
                        <span
                          style={{
                            position: "absolute",
                            top: 8,
                            left: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: "#b8860b",
                            color: "#fff",
                          }}
                        >
                          主圖
                        </span>
                      )}
                    </button>
                    <div style={{ padding: 10, display: "grid", gap: 8, fontSize: 12 }}>
                      <div>類型：{img.imageType}</div>
                      <label style={{ display: "grid", gap: 4 }}>
                        <span>排序</span>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={imageDraftById[img.id]?.sortOrder ?? String(img.sortOrder ?? 1)}
                          onChange={(e) => updateImageDraft(img.id, "sortOrder", e.target.value)}
                        />
                      </label>
                      <label style={{ display: "grid", gap: 4 }}>
                        <span>狀態</span>
                        <select
                          value={(imageDraftById[img.id]?.isActive ?? img.isActive) ? "ACTIVE" : "INACTIVE"}
                          onChange={(e) => updateImageDraft(img.id, "isActive", e.target.value === "ACTIVE")}
                        >
                          <option value="ACTIVE">啟用</option>
                          <option value="INACTIVE">停用</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => void saveImageMetaForAllTypes(img)}
                        disabled={savingImageGroupKey === getImageGroupKey(img)}
                      >
                        {savingImageGroupKey === getImageGroupKey(img) ? "儲存中..." : "儲存此組圖片設定"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedOriginalUrl && (
              <div
                role="dialog"
                aria-modal="true"
                onClick={closeOriginalPreview}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0, 0, 0, 0.62)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1100,
                  padding: 16,
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "relative",
                    width: "min(1100px, 96vw)",
                    maxHeight: "90vh",
                  }}
                >
                  <button
                    type="button"
                    onClick={closeOriginalPreview}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      zIndex: 1,
                      border: "none",
                      background: "rgba(0,0,0,0.45)",
                      color: "#fff",
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      cursor: "pointer",
                      fontSize: 18,
                      lineHeight: 1,
                    }}
                    aria-label="close"
                  >
                    ×
                  </button>
                  <img
                    src={selectedOriginalUrl}
                    alt={`${imagesModal.productName} original`}
                    style={{
                      display: "block",
                      maxWidth: "100%",
                      maxHeight: "90vh",
                      margin: "0 auto",
                      borderRadius: 10,
                      background: "#111",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
          </>
        );
      })()}
    </div>
  );
}
