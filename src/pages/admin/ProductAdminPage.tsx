import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { catalogApi } from "../../api/catalogApi";
import type { Product, ProductCreateRequest, ProductImage, ProductUpdateRequest } from "../../types/domain";

type ProductForm = {
  id: string | null;
  name: string;
  description: string;
  unitPriceCents: string;
  currency: string;
  defaultMinQty: string;
  defaultMaxQty: string;
  defaultOpenDays: string;
  defaultLeadDays: string;
  defaultShipDays: string;
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
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
  unitPriceCents: "",
  currency: "TWD",
  defaultMinQty: "1",
  defaultMaxQty: "",
  defaultOpenDays: "7",
  defaultLeadDays: "0",
  defaultShipDays: "0",
  status: "ACTIVE",
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

const HOME_FEATURED_LIMIT = 3;

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

function toForm(product: Product): ProductForm {
  return {
    id: product.id,
    name: product.name || "",
    description: decodeDescriptionFromDb(product.description),
    unitPriceCents: Number.isFinite(product.unitPriceCents) ? String(product.unitPriceCents) : "",
    currency: product.currency || "TWD",
    defaultMinQty: Number.isFinite(product.defaultMinQty) ? String(product.defaultMinQty) : "1",
    defaultMaxQty: Number.isFinite(product.defaultMaxQty) ? String(product.defaultMaxQty) : "",
    defaultOpenDays: Number.isFinite(product.defaultOpenDays) ? String(product.defaultOpenDays) : "7",
    defaultLeadDays: Number.isFinite(product.defaultLeadDays) ? String(product.defaultLeadDays) : "0",
    defaultShipDays: Number.isFinite(product.defaultShipDays) ? String(product.defaultShipDays) : "0",
    status: product.status,
  };
}

export default function ProductAdminPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(INITIAL_FORM);
  const [formModalOpen, setFormModalOpen] = useState(false);
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
  const [homeFeaturedIds, setHomeFeaturedIds] = useState<string[]>(() => catalogApi.getHomeFeaturedProductIds());
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE" | "DRAFT">("ALL");

  const isEditMode = Boolean(form.id);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const rank = (status: Product["status"]) => (status === "ACTIVE" ? 0 : status === "DRAFT" ? 1 : 2);
      const byStatus = rank(a.status) - rank(b.status);
      if (byStatus !== 0) return byStatus;
      return a.name.localeCompare(b.name, "zh-Hant");
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    if (statusFilter === "ALL") return sortedItems;
    return sortedItems.filter((p) => p.status === statusFilter);
  }, [sortedItems, statusFilter]);

  const statusCounts = useMemo(() => ({
    ALL: items.length,
    ACTIVE: items.filter((p) => p.status === "ACTIVE").length,
    INACTIVE: items.filter((p) => p.status === "INACTIVE").length,
    DRAFT: items.filter((p) => p.status === "DRAFT").length,
  }), [items]);

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const data = await catalogApi.listProducts();
      const nextItems = data ?? [];
      setItems(nextItems);

      const validFeaturedIds = catalogApi.getHomeFeaturedProductIds().filter((productId) => nextItems.some((item) => item.id === productId));
      catalogApi.saveHomeFeaturedProductIds(validFeaturedIds);
      setHomeFeaturedIds(validFeaturedIds);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "讀取商品失敗");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

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
  }

  function openCreateModal() {
    setMessage(null);
    resetForm();
    resetImageForm();
    setFormModalOpen(true);
  }

  function openEditModal(product: Product) {
    setMessage(null);
    setForm(toForm(product));
    resetImageForm();
    setFormModalOpen(true);
  }

  function toggleHomeFeatured(product: Product) {
    setMessage(null);

    setHomeFeaturedIds((prev) => {
      const exists = prev.includes(product.id);
      let next = prev;

      if (exists) {
        next = prev.filter((item) => item !== product.id);
        setMessage(`已將「${product.name}」自首頁本週熱賣移除`);
      } else {
        if (prev.length >= HOME_FEATURED_LIMIT) {
          setMessage(`首頁本週熱賣最多只能設定 ${HOME_FEATURED_LIMIT} 個商品`);
          return prev;
        }

        next = [...prev, product.id];
        setMessage(`已將「${product.name}」加入首頁本週熱賣`);
      }

      catalogApi.saveHomeFeaturedProductIds(next);
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const name = form.name.trim();
    const description = encodeDescriptionForDb(form.description.trim());
    const currency = form.currency.trim().toUpperCase();
    const unitPriceCents = Number(form.unitPriceCents);
    const defaultMinQty = Number(form.defaultMinQty);
    const defaultMaxQty = form.defaultMaxQty.trim() === "" ? null : Number(form.defaultMaxQty);
    const defaultOpenDays = Number(form.defaultOpenDays);
    const defaultLeadDays = Number(form.defaultLeadDays);
    const defaultShipDays = Number(form.defaultShipDays);

    if (!name) {
      setMessage("請填寫商品名稱");
      return;
    }
    if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) {
      setMessage("請填寫正確的單價（整數，且不可小於 0）");
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

    setSubmitting(true);
    setMessage(null);

    let savedProduct: Product | null = null;

    try {
      if (form.id) {
        const payload: ProductUpdateRequest = {
          name,
          description,
          status: form.status,
          unitPriceCents,
          currency,
          defaultMinQty,
          defaultMaxQty,
          defaultOpenDays,
          defaultLeadDays,
          defaultShipDays,
        };
        savedProduct = await catalogApi.updateProduct(form.id, payload);
      } else {
        const payload: ProductCreateRequest = {
          name,
          description,
          status: form.status,
          unitPriceCents,
          currency,
          defaultMinQty,
          defaultMaxQty,
          defaultOpenDays,
          defaultLeadDays,
          defaultShipDays,
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
      await loadProducts();
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
      await loadProducts();
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
            可新增、編輯、刪除目前商品，並指定最多 3 個商品顯示於首頁「本週熱賣」。
          </p>
        </div>
        <button type="button" onClick={openCreateModal} disabled={submitting}>
          新增商品
        </button>
      </div>

      {message && <div style={{ marginTop: 10, color: "#f4e1bf" }}>{message}</div>}
      {error && <div style={{ marginTop: 8, color: "#ffd3c8" }}>讀取錯誤：{error}</div>}
      {!error && (
        <div style={{ marginTop: 8, color: "#eadfbd", fontSize: 13 }}>
          首頁本週熱賣目前已選 {homeFeaturedIds.length} / {HOME_FEATURED_LIMIT} 個商品。
        </div>
      )}

      {/* 狀態篩選 */}
      {!loading && !error && items.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#c9b08a" }}>篩選狀態：</span>
          {(["ALL", "ACTIVE", "INACTIVE", "DRAFT"] as const).map((s) => {
            const label = s === "ALL" ? "全部" : s === "ACTIVE" ? "上架中" : s === "INACTIVE" ? "下架" : "草稿";
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 400,
                  border: isActive ? "1.5px solid #c9b97a" : "1px solid rgba(201,185,122,0.3)",
                  background: isActive ? "rgba(201,185,122,0.18)" : "transparent",
                  color: isActive ? "#f0dea8" : "#9a8866",
                  cursor: "pointer",
                }}
              >
                {label}
                <span style={{ marginLeft: 5, fontSize: 11, opacity: 0.75 }}>({statusCounts[s]})</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 14, borderRadius: 12, overflowX: "auto", border: "1px solid #eadfcd", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", color: "#2f241b", minWidth: 920 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              <th style={{ padding: 10 }}>商品名稱</th>
              <th style={{ padding: 10 }}>狀態</th>
              <th style={{ padding: 10 }}>單價</th>
              <th style={{ padding: 10 }}>描述</th>
              <th style={{ padding: 10 }}>首頁熱賣</th>
              <th style={{ padding: 10, width: 220 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} style={{ padding: 12 }}>
                  載入中...
                </td>
              </tr>
            )}

            {!loading && filteredItems.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 12 }}>
                  {statusFilter === "ALL" ? "目前沒有商品資料" : `沒有「${statusFilter === "ACTIVE" ? "上架中" : statusFilter === "INACTIVE" ? "下架" : "草稿"}」的商品`}
                </td>
              </tr>
            )}

            {!loading &&
              filteredItems.map((p) => {
                const featuredIndex = homeFeaturedIds.indexOf(p.id);
                const isHomeFeatured = featuredIndex >= 0;

                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f1ebe2" }}>
                    <td style={{ padding: 10, fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: 10 }}>{p.status}</td>
                    <td style={{ padding: 10 }}>{fmtPrice(p.unitPriceCents, p.currency)}</td>
                    <td style={{ padding: 10, whiteSpace: "pre-wrap" }}>{decodeDescriptionFromDb(p.description) || "-"}</td>
                    <td style={{ padding: 10 }}>
                      <div style={{ display: "grid", gap: 6, justifyItems: "start" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: isHomeFeatured ? "#eef8ef" : "#f3f4f6",
                            color: isHomeFeatured ? "#2f6d47" : "#6b7280",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {isHomeFeatured ? `第 ${featuredIndex + 1} 位熱賣` : "未顯示於首頁"}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleHomeFeatured(p)}
                          disabled={submitting || (!isHomeFeatured && homeFeaturedIds.length >= HOME_FEATURED_LIMIT)}
                          style={{
                            ...actionButtonBase,
                            minWidth: 126,
                            background: isHomeFeatured
                              ? "linear-gradient(180deg, #f5f5f5 0%, #e5e7eb 100%)"
                              : "linear-gradient(180deg, #eef8ef 0%, #d6f0db 100%)",
                            color: isHomeFeatured ? "#4b5563" : "#2f6d47",
                            borderColor: isHomeFeatured ? "#d1d5db" : "#9fd0ad",
                          }}
                          title={!isHomeFeatured && homeFeaturedIds.length >= HOME_FEATURED_LIMIT ? `最多只能選 ${HOME_FEATURED_LIMIT} 個商品` : undefined}
                        >
                          {isHomeFeatured ? "移除熱賣" : "設為熱賣"}
                        </button>
                      </div>
                    </td>
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
              </div>

              <div style={{ fontSize: 12, color: "#6b5a47" }}>
                `defaultMaxQty` 可留空，代表不限制上限。
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
