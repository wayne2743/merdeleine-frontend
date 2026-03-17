import { useEffect, useMemo, useRef, useState } from "react";
import { catalogApi } from "../../api/catalogApi";
import type { Product, ProductImage, AutoGroupOrderRequest } from "../../types/domain";

function pickImageUrl(
  images: ProductImage[],
  imageType: "THUMBNAIL" | "DETAIL" | "ORIGINAL"
): string | null {
  const selectedImage = [...images]
    .filter((image) => image.isActive && image.imageType === imageType)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)[0];

  return selectedImage?.cdnUrl ?? null;
}

type DetailPreviewItem = {
  detailUrl: string;
  originalUrl: string | null;
};

function getImageGroupKey(image: ProductImage): string | null {
  if (!image.cdnUrl) return null;
  try {
    const pathname = new URL(image.cdnUrl).pathname;
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length < 4) return null;
    return parts[2] ?? null;
  } catch {
    return null;
  }
}

function buildDetailPreviewItems(images: ProductImage[]): DetailPreviewItem[] {
  const originalByGroup = new Map<string, string>();

  images
    .filter((image) => image.isActive && image.imageType === "ORIGINAL")
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)
    .forEach((image) => {
      const groupKey = getImageGroupKey(image);
      if (!groupKey) return;
      if (!originalByGroup.has(groupKey)) {
        originalByGroup.set(groupKey, image.cdnUrl);
      }
    });

  return images
    .filter((image) => image.isActive && image.imageType === "DETAIL")
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)
    .map((image) => {
      const groupKey = getImageGroupKey(image);
      return {
        detailUrl: image.cdnUrl,
        originalUrl: groupKey ? originalByGroup.get(groupKey) ?? null : null,
      };
    });
}

function formatPrice(product: Product): string {
  if (!Number.isFinite(product.unitPriceCents)) return "-";
  const amount = Number(product.unitPriceCents) / 100;
  const currency = product.currency || "TWD";
  return `${currency} ${amount.toLocaleString()}`;
}

export default function CustomerProductsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [thumbnailByProductId, setThumbnailByProductId] = useState<Record<string, string>>({});
  const [detailImageByProductId, setDetailImageByProductId] = useState<Record<string, DetailPreviewItem[]>>({});
  const [originalImageByProductId, setOriginalImageByProductId] = useState<Record<string, string>>({});

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSelected, setDetailSelected] = useState<Product | null>(null);
  const [originalModalUrl, setOriginalModalUrl] = useState<string | null>(null);

  const detailStripRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);

  const [qty, setQty] = useState(1);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");

  const canSubmit = useMemo(() => {
    return !!selected && Number.isFinite(qty) && qty >= 1;
  }, [selected, qty]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await catalogApi.listProducts();
        if (cancelled) return;

        const nextProducts = data ?? [];
        setProducts(nextProducts);

        const imageResults = await Promise.allSettled(
          nextProducts.map(async (product) => {
            const images = await catalogApi.listProductImages(product.id);
            return [
              product.id,
              pickImageUrl(images, "THUMBNAIL"),
              buildDetailPreviewItems(images),
              pickImageUrl(images, "ORIGINAL"),
            ] as const;
          })
        );

        if (cancelled) return;

        const nextThumbnailByProductId = imageResults.reduce<Record<string, string>>((acc, result) => {
          if (result.status === "fulfilled") {
            const [productId, thumbnailUrl] = result.value;
            if (thumbnailUrl) acc[productId] = thumbnailUrl;
          }
          return acc;
        }, {});

        const nextDetailImageByProductId = imageResults.reduce<Record<string, DetailPreviewItem[]>>((acc, result) => {
          if (result.status === "fulfilled") {
            const [productId, , detailItems] = result.value;
            if (detailItems.length > 0) acc[productId] = detailItems;
          }
          return acc;
        }, {});

        const nextOriginalImageByProductId = imageResults.reduce<Record<string, string>>((acc, result) => {
          if (result.status === "fulfilled") {
            const [productId, , , originalUrl] = result.value;
            if (originalUrl) acc[productId] = originalUrl;
          }
          return acc;
        }, {});

        setThumbnailByProductId(nextThumbnailByProductId);
        setDetailImageByProductId(nextDetailImageByProductId);
        setOriginalImageByProductId(nextOriginalImageByProductId);
      } catch (e: any) {
        if (cancelled) return;
        console.error(e);
        setError(e?.message ?? "載入商品失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function openModal(p: Product) {
    setSelected(p);
    setQty(1);
    setContactName("");
    setContactPhone("");
    setContactEmail("");
    setShippingAddress("");
    setOpen(true);
  }

  function openDetailModal(p: Product) {
    setDetailSelected(p);
    setOriginalModalUrl(null);
    setDetailOpen(true);

    if (detailStripRef.current) {
      detailStripRef.current.scrollLeft = 0;
    }
  }

  function scrollDetailImages(direction: "left" | "right") {
    if (!detailStripRef.current) return;
    const delta = direction === "left" ? -220 : 220;
    detailStripRef.current.scrollBy({ left: delta, behavior: "smooth" });
  }

  async function submit() {
    if (!selected) return;

    const payload: AutoGroupOrderRequest = {
      productId: selected.id,
      qty,
      contactName: contactName || undefined,
      contactPhone: contactPhone || undefined,
      contactEmail: contactEmail || undefined,
      shippingAddress: shippingAddress || undefined,
    };

    try {
      const resp = await catalogApi.autoGroupOrder(payload);
      alert(`已發起開團並預約成功！\norderId=${resp.orderId}\nsellWindowId=${resp.sellWindowId}`);
      setOpen(false);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "發起開團失敗");
    }
  }

  return (
    <div className="page-container customer-products-page">
      <div className="customer-products-head">
        <p className="customer-products-kicker">CUSTOMER PICKS</p>
        <h2>商品列表</h2>
      </div>
      <div className="customer-products-subtitle">
        選擇商品後可直接「發起開團 / 立即預約」，檔期時間由系統自動規劃。
      </div>

      {loading && <div className="customer-products-hint">載入中...</div>}
      {error && <div className="customer-products-error">錯誤：{error}</div>}

      <div className="featured-grid customer-products-grid">
        {products.map((p) => {
          const imageUrl =
            thumbnailByProductId[p.id] ||
            detailImageByProductId[p.id]?.[0]?.detailUrl ||
            originalImageByProductId[p.id] ||
            "";

          const descriptionText = (p.description ?? "(暫無描述)")
            .replace(/\\n/g, "\n")
            .split(/\r?\n/)
            .filter((line) => line.trim().length > 0)
            .join(" ");

          return (
            <article
              key={p.id}
              onClick={() => openDetailModal(p)}
              className="featured-card customer-product-card"
            >
              <div className="customer-product-media">
                {imageUrl ? (
                  <img src={imageUrl} alt={p.name} />
                ) : (
                  <div className="product-thumb-empty">暫無圖片</div>
                )}
              </div>

              <div className="featured-body customer-product-body">
                <h3>{p.name}</h3>
                <p className="customer-product-desc">{descriptionText}</p>
                <div className="featured-row customer-product-row">
                  <strong>{formatPrice(p)}</strong>
                  <span className="product-status">狀態：{p.status}</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal(p);
                  }}
                  disabled={p.status !== "ACTIVE"}
                  className="product-action-btn customer-product-btn"
                >
                  發起開團 / 立即預約
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {!loading && !error && products.length === 0 && <div className="customer-products-hint">目前沒有商品</div>}

      {detailOpen && detailSelected && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            overflowY: "auto",
          }}
          onClick={() => setDetailOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 680,
              maxHeight: "calc(100dvh - 32px)",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 12,
              padding: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#4a321f" }}>商品詳細</div>
              <button onClick={() => setDetailOpen(false)}>關閉</button>
            </div>

            <div
              style={{
                width: "100%",
                height: 220,
                borderRadius: 12,
                overflow: "hidden",
                background: "#f4f4f4",
                border: "1px solid #eee",
                position: "relative",
              }}
            >
              {detailImageByProductId[detailSelected.id]?.length ? (
                <>
                  <button
                    onClick={() => scrollDetailImages("left")}
                    style={{
                      position: "absolute",
                      left: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      zIndex: 2,
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      border: "1px solid #ddd",
                      background: "rgba(255,255,255,0.95)",
                      cursor: "pointer",
                    }}
                  >
                    ◀
                  </button>

                  <div
                    ref={detailStripRef}
                    style={{
                      width: "100%",
                      height: "100%",
                      overflowX: "auto",
                      overflowY: "hidden",
                      display: "flex",
                      gap: 8,
                      padding: "14px 46px",
                      boxSizing: "border-box",
                      scrollBehavior: "smooth",
                    }}
                  >
                    {detailImageByProductId[detailSelected.id].map((item, index) => (
                      <div
                        key={`${detailSelected.id}-${index}`}
                        style={{
                          width: 190,
                          height: 190,
                          borderRadius: 10,
                          overflow: "hidden",
                          border: "1px solid #eee",
                          background: "#fff",
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={item.detailUrl}
                          alt={`${detailSelected.name}-detail-${index + 1}`}
                          onClick={() => {
                            setOriginalModalUrl(
                              item.originalUrl || originalImageByProductId[detailSelected.id] || null
                            );
                          }}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                            cursor: "zoom-in",
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => scrollDetailImages("right")}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      zIndex: 2,
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      border: "1px solid #ddd",
                      background: "rgba(255,255,255,0.95)",
                      cursor: "pointer",
                    }}
                  >
                    ▶
                  </button>
                </>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    color: "#999",
                  }}
                >
                  暫無 DETAIL 圖片
                </div>
              )}
            </div>

            {originalModalUrl && (
              <div
                style={{
                  position: "fixed",
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.65)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                  zIndex: 40,
                }}
                onClick={() => setOriginalModalUrl(null)}
              >
                <div
                  style={{
                    width: "min(92vw, 1200px)",
                    height: "min(88vh, 860px)",
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "#111",
                    border: "1px solid rgba(255,255,255,0.18)",
                    position: "relative",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setOriginalModalUrl(null)}
                    style={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}
                  >
                    關閉
                  </button>
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 8,
                      boxSizing: "border-box",
                    }}
                  >
                    <img
                      src={originalModalUrl}
                      alt={`${detailSelected.name}-original`}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        width: "auto",
                        height: "auto",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 14, fontSize: 18, fontWeight: 700, color: "#4a321f" }}>{detailSelected.name}</div>
            <div style={{ marginTop: 8, fontSize: 14, color: "#5b442f" }}>售價：{formatPrice(detailSelected)}</div>
            <div style={{ marginTop: 8, fontSize: 13, color: "#6c5642" }}>
              {detailSelected.description || "（無描述）"}
            </div>
          </div>
        </div>
      )}

      {open && selected && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            overflowY: "auto",
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              maxHeight: "calc(100dvh - 32px)",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 12,
              padding: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>發起開團：{selected.name}</div>

            <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#555" }}>數量（必填）</span>
              <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </label>

            <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#555" }}>聯絡人</span>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </label>

            <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#555" }}>電話</span>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </label>

            <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#555" }}>Email</span>
              <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </label>

            <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: "#555" }}>配送地址</span>
              <textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} />
            </label>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setOpen(false)}>取消</button>
              <button onClick={submit} disabled={!canSubmit}>
                確認發起
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
