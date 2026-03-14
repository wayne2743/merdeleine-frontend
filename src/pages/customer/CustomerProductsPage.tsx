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

  const [activeOriginalPreviewUrl, setActiveOriginalPreviewUrl] = useState<string | null>(null);
  const [hoverFocusPoint, setHoverFocusPoint] = useState<{ xPercent: number; yPercent: number } | null>(null);
  const [hoverOriginalOpen, setHoverOriginalOpen] = useState(false);
  const [hoverPreviewPosition, setHoverPreviewPosition] = useState<{ left: number; top: number }>({
    left: 24,
    top: 24,
  });

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
    const firstDetailOriginal = detailImageByProductId[p.id]?.[0]?.originalUrl ?? null;
    const fallbackOriginal = originalImageByProductId[p.id] ?? null;
    setActiveOriginalPreviewUrl(firstDetailOriginal || fallbackOriginal);
    setHoverFocusPoint(null);
    setHoverPreviewPosition({ left: 24, top: 24 });
    setHoverOriginalOpen(false);
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
    <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 6, color: "#f2dfad", letterSpacing: 0.3 }}>商品列表</h2>
      <div style={{ fontSize: 12, color: "#eadfbd", marginBottom: 12 }}>
        選擇商品後可直接「發起開團 / 立即預約」，檔期時間由系統自動規劃。
      </div>

      {loading && <div>載入中...</div>}
      {error && <div style={{ color: "#b00020" }}>錯誤：{error}</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {products.map((p) => (
          <div
            key={p.id}
            onClick={() => openDetailModal(p)}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 12,
              background: "#fff",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "#f4f4f4",
                  border: "1px solid #eee",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {thumbnailByProductId[p.id] ? (
                  <img
                    src={thumbnailByProductId[p.id]}
                    alt={p.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div style={{ fontSize: 12, color: "#999" }}>暫無圖片</div>
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#4a321f" }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#5f4a38", marginTop: 4 }}>
                  {p.description || "（無描述）"}
                </div>
                <div style={{ fontSize: 12, color: "#7a6755", marginTop: 6 }}>狀態：{p.status}</div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                openModal(p);
              }}
              disabled={p.status !== "ACTIVE"}
            >
              發起開團 / 立即預約
            </button>
          </div>
        ))}
      </div>

      {!loading && !error && products.length === 0 && <div style={{ color: "#666" }}>目前沒有商品</div>}

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
          }}
          onClick={() => setDetailOpen(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 680, background: "#fff", borderRadius: 12, padding: 16 }}
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
                          onMouseEnter={() => {
                            setActiveOriginalPreviewUrl(
                              item.originalUrl || originalImageByProductId[detailSelected.id] || null
                            );
                            setHoverOriginalOpen(true);
                          }}
                          onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
                            const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
                            const previewWidth = Math.min(window.innerWidth * 0.46, 760);
                            const previewHeight = Math.min(window.innerHeight * 0.62, 560);
                            const gap = 18;

                            let left = e.clientX + gap;
                            let top = e.clientY + gap;

                            if (left + previewWidth > window.innerWidth - 8) {
                              left = e.clientX - previewWidth - gap;
                            }
                            if (top + previewHeight > window.innerHeight - 8) {
                              top = e.clientY - previewHeight - gap;
                            }

                            left = Math.max(8, left);
                            top = Math.max(8, top);

                            setHoverFocusPoint({
                              xPercent: Math.max(0, Math.min(100, xPercent)),
                              yPercent: Math.max(0, Math.min(100, yPercent)),
                            });
                            setHoverPreviewPosition({ left, top });
                          }}
                          onMouseLeave={() => {
                            setHoverFocusPoint(null);
                            setHoverOriginalOpen(false);
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

            {hoverOriginalOpen && (activeOriginalPreviewUrl || originalImageByProductId[detailSelected.id]) && (
              <div
                style={{
                  position: "fixed",
                  top: hoverPreviewPosition.top,
                  left: hoverPreviewPosition.left,
                  width: "min(46vw, 760px)",
                  height: "min(62vh, 560px)",
                  background: "rgba(0,0,0,0.75)",
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  padding: 10,
                  zIndex: 30,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "#111",
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      backgroundImage: `url(${activeOriginalPreviewUrl || originalImageByProductId[detailSelected.id]})`,
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "auto",
                      backgroundPosition: hoverFocusPoint
                        ? `${hoverFocusPoint.xPercent}% ${hoverFocusPoint.yPercent}%`
                        : "center center",
                    }}
                  />
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
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: 12, padding: 16 }}
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
