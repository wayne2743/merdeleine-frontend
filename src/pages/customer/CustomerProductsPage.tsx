import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { catalogApi } from "../../api/catalogApi";
import { fetchImageWithCache } from "../../utils/imageCache";
import { useAuth } from "../../auth/AuthProvider";
import type {
  Product,
  ProductImage,
  AutoGroupOrderRequest,
  NextGroupOpenAtResponse,
  OpenProductSellWindowResponse,
  SellWindowNextGroupOpenAtResponse,
} from "../../types/domain";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function addDays(iso: string, days: number): string {
  const base = new Date(iso);
  return new Date(base.getTime() + days * ONE_DAY_MS).toISOString();
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDateTimeWithWeekday(iso?: string | null): string {
  if (!iso) return "-";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "-";
  const weekday = dt.toLocaleDateString("zh-TW", { weekday: "short" });
  return `${formatDateTime(iso)} (${weekday})`;
}

function getIsoWeekInfo(iso?: string | null): { year: number; week: number } | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / ONE_DAY_MS) + 1) / 7);

  return {
    year: utcDate.getUTCFullYear(),
    week,
  };
}

function pickImageUrl(
  images: ProductImage[],
  imageType: "THUMBNAIL" | "DETAIL" | "ORIGINAL" | "GALLERY"
): string | null {
  const selectedImage = [...images]
    .filter((image) => image.isActive && image.imageType === imageType)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)[0];

  return selectedImage?.cdnUrl ?? null;
}

function pickCardImageUrl(images: ProductImage[]): string | null {
  return pickImageUrl(images, "GALLERY") || pickImageUrl(images, "THUMBNAIL") || pickImageUrl(images, "ORIGINAL");
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
  const amount = Number(product.unitPriceCents);
  const currency = product.currency || "TWD";
  return `${currency} ${amount.toLocaleString()}`;
}

function getProductOpenDays(product?: Product | null): number {
  const raw = Number(product?.defaultOpenDays ?? 7);
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 7;
}

function getGroupOpenDays(nextGroupInfo?: NextGroupOpenAtResponse | null, product?: Product | null): number {
  const raw = Number(nextGroupInfo?.default_open_days);
  if (Number.isFinite(raw) && raw >= 1) return Math.floor(raw);
  return getProductOpenDays(product);
}

function decodeProductDescription(value?: string | null): string {
  return (value || "").replace(/\\n/g, "\n");
}

function extractOpenSellWindowUuid(payload: OpenProductSellWindowResponse): string | null {
  if (typeof payload === "string") {
    const raw = payload.trim();
    return raw || null;
  }

  if (!payload || typeof payload !== "object") return null;

  const raw = payload as Record<string, unknown>;
  const candidates = [
    raw.uuid,
    raw.productSellWindowId,
    raw.sellWindowId,
    raw.id,
    (raw.data as Record<string, unknown> | undefined)?.uuid,
    (raw.data as Record<string, unknown> | undefined)?.productSellWindowId,
    (raw.data as Record<string, unknown> | undefined)?.sellWindowId,
    (raw.data as Record<string, unknown> | undefined)?.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function extractNextSellWindowOpenAt(payload: SellWindowNextGroupOpenAtResponse): string | null {
  if (typeof payload === "string") {
    const raw = payload.trim();
    return raw || null;
  }

  if (!payload || typeof payload !== "object") return null;

  const raw = payload as Record<string, unknown>;
  const candidates = [
    raw.nextGroupOpenAt,
    raw.next_group_open_at,
    raw.startAt,
    raw.start_at,
    (raw.data as Record<string, unknown> | undefined)?.nextGroupOpenAt,
    (raw.data as Record<string, unknown> | undefined)?.next_group_open_at,
    (raw.data as Record<string, unknown> | undefined)?.startAt,
    (raw.data as Record<string, unknown> | undefined)?.start_at,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export default function CustomerProductsPage() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
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
  const [reserving, setReserving] = useState<string | null>(null);

  const [orderOpen, setOrderOpen] = useState(false);
  const [orderSelected, setOrderSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [reserveSuccess, setReserveSuccess] = useState(false);
  const [nextGroupInfo, setNextGroupInfo] = useState<NextGroupOpenAtResponse | null>(null);
  const [nextSellWindowOpenAt, setNextSellWindowOpenAt] = useState<string | null>(null);
  const [nextGroupLoading, setNextGroupLoading] = useState(false);
  const [nextGroupError, setNextGroupError] = useState<string | null>(null);
  const [checkingOpenProductId, setCheckingOpenProductId] = useState<string | null>(null);
  const [redirectingModalOpen, setRedirectingModalOpen] = useState(false);
  const [redirectTargetUuid, setRedirectTargetUuid] = useState<string | null>(null);
  const [autoTriggeredProductId, setAutoTriggeredProductId] = useState<string | null>(null);

  useEffect(() => {
    const shouldLockScroll = detailOpen || orderOpen || !!originalModalUrl;
    if (shouldLockScroll) {
      document.documentElement.classList.add("modal-scroll-lock");
      document.body.classList.add("modal-scroll-lock");
    }

    return () => {
      document.documentElement.classList.remove("modal-scroll-lock");
      document.body.classList.remove("modal-scroll-lock");
    };
  }, [detailOpen, orderOpen, originalModalUrl]);

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
            const cardImageUrl = pickCardImageUrl(images);
            const cachedCardUrl = cardImageUrl ? await fetchImageWithCache(cardImageUrl) : null;
            return [
              product.id,
              cachedCardUrl,
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

  useEffect(() => {
    const action = searchParams.get("action");
    const productId = searchParams.get("productId");

    if (loading || action !== "group" || !productId || autoTriggeredProductId === productId) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("action");
    nextParams.delete("productId");

    const targetProduct = products.find((product) => product.id === productId);
    setAutoTriggeredProductId(productId);
    setSearchParams(nextParams, { replace: true });

    if (targetProduct) {
      void handleStartGroup(targetProduct);
    }
  }, [searchParams, setSearchParams, loading, products, autoTriggeredProductId]);

  async function handleReserve() {
    if (!orderSelected || reserving) return;
    const customerId = user?.id?.trim();
    if (!customerId) {
      alert("登入資訊遺失，請重新登入後再試");
      return;
    }
    if (!nextGroupInfo) {
      alert("開團時程資訊尚未載入，請稍候再試");
      return;
    }

    const predictedGroupOpenAt = nextSellWindowOpenAt ?? nextGroupInfo.next_group_open_at;
    const predictedGroupEndAt = addDays(predictedGroupOpenAt, getGroupOpenDays(nextGroupInfo, orderSelected));

    setReserving(orderSelected.id);
    try {
      const payload: AutoGroupOrderRequest = {
        productId: orderSelected.id,
        qty,
        customerId,
        predictedGroupOpenAt,
        predictedGroupEndAt,
        leadsDay: nextGroupInfo.default_leads_day,
        shipDay: nextGroupInfo.default_ship_day,
        contactName: user?.displayName || undefined,
        contactEmail: user?.email || undefined,
      };
      await catalogApi.autoGroupOrder(payload);
      setReserveSuccess(true);
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error(e);
      alert(err?.message ?? "發起開團失敗");
    } finally {
      setReserving(null);
    }
  }

  async function openOrderModal(p: Product) {
    setReserveSuccess(false);
    setOrderSelected(p);
    setQty(1);
    setOrderOpen(true);
    setNextGroupLoading(true);
    setNextGroupError(null);
    setNextGroupInfo(null);
    setNextSellWindowOpenAt(null);

    try {
      const [info, sellWindowOpenAtPayload] = await Promise.all([
        catalogApi.getNextGroupOpenAt(p.id),
        catalogApi.getNextSellWindowOpenAt(),
      ]);
      setNextGroupInfo(info);
      setNextSellWindowOpenAt(extractNextSellWindowOpenAt(sellWindowOpenAtPayload));
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error(e);
      setNextGroupError(err?.message ?? "載入最快可開團資訊失敗");
    } finally {
      setNextGroupLoading(false);
    }
  }

  async function handleStartGroup(p: Product) {
    if (checkingOpenProductId) return;

    setCheckingOpenProductId(p.id);
    try {
      const resp = await catalogApi.getOpenProductSellWindow(p.id);
      const uuid = extractOpenSellWindowUuid(resp);

      if (uuid) {
        setRedirectTargetUuid(uuid);
        setRedirectingModalOpen(true);
        return;
      }

      await openOrderModal(p);
    } catch (e: unknown) {
      console.error(e);
      // 查詢失敗時保留既有流程，避免阻斷下單。
      await openOrderModal(p);
    } finally {
      setCheckingOpenProductId(null);
    }
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

  function closeRedirectingModal() {
    const target = redirectTargetUuid;
    setRedirectingModalOpen(false);
    setRedirectTargetUuid(null);
    if (target) {
      nav(`/customer/sell-windows/${target}`);
    }
  }



  return (
    <div className="page-container customer-products-page">
      <div className="customer-products-head">
        <p className="customer-products-kicker">CUSTOMER PICKS</p>
        <h2>商品列表 (本季可訂購商品)</h2>
      </div>
      <div className="customer-products-subtitle">
        選擇商品後可直接「發起開團 / 立即預約」，檔期時間由系統自動規劃。
      </div>

      {loading && <div className="customer-products-hint">載入中...</div>}
      {error && <div className="customer-products-error">錯誤：{error}</div>}

      <div className="featured-grid customer-products-grid">
        {products.filter((p) => p.status === "ACTIVE").map((p) => {
          const imageUrl =
            thumbnailByProductId[p.id] ||
            detailImageByProductId[p.id]?.[0]?.detailUrl ||
            originalImageByProductId[p.id] ||
            "";

          const descriptionText = decodeProductDescription(p.description) || "(暫無描述)";

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
                    void handleStartGroup(p);
                  }}
                  disabled={p.status !== "ACTIVE" || checkingOpenProductId === p.id}
                  className="product-action-btn customer-product-btn"
                >
                  {checkingOpenProductId === p.id ? "檢查檔期中..." : "發起開團 / 立即預約"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {!loading && !error && products.length === 0 && <div className="customer-products-hint">目前沒有商品</div>}

      {redirectingModalOpen && (
        <div
          className="customer-modal-backdrop customer-redirecting-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 120,
          }}
        >
          <div
            className="customer-modal-panel customer-redirecting-modal"
            style={{
              width: "100%",
              maxWidth: 360,
              background: "#fff",
              borderRadius: 14,
              padding: "22px 18px",
              color: "#4a321f",
              textAlign: "center",
              fontWeight: 700,
              lineHeight: 1.7,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: 12 }}>
              該商品已有存在的檔期。
            </div>
            <div style={{ marginBottom: 16, fontWeight: 500, fontSize: 13, color: "#6e563d" }}>
              按下下方按鈕後，將為您轉導至該檔期頁面。
            </div>
            <button onClick={closeRedirectingModal} style={{ width: "100%" }}>
              關閉並前往檔期
            </button>
          </div>
        </div>
      )}

      {detailOpen && detailSelected && (
        <div
          className="customer-modal-backdrop customer-detail-modal-backdrop"
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
            zIndex: 120,
          }}
        >
          <div
            className="customer-modal-panel customer-detail-modal"
            style={{
              width: "100%",
              maxWidth: 680,
              maxHeight: "calc(100dvh - 32px)",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setDetailOpen(false)}
              aria-label="關閉視窗"
              title="關閉"
              className="modal-close-btn"
            >
              ×
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#4a321f" }}>商品詳細</div>
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
                className="customer-modal-backdrop customer-original-modal-backdrop"
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
                  zIndex: 130,
                }}
              >
                <div
                  className="customer-modal-panel customer-original-modal"
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
                    type="button"
                    onClick={() => setOriginalModalUrl(null)}
                    aria-label="關閉視窗"
                    title="關閉"
                    className="modal-close-btn modal-close-btn-dark"
                  >
                    ×
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
            <div style={{ marginTop: 8, fontSize: 13, color: "#6c5642", whiteSpace: "pre-wrap" }}>
              {decodeProductDescription(detailSelected.description) || "（無描述）"}
            </div>
          </div>
        </div>
      )}

      {orderOpen && orderSelected && (
        <div
          className="customer-modal-backdrop customer-order-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 120,
          }}
        >
          <div
            className="customer-modal-panel customer-order-modal"
            style={{
              width: "100%",
              maxWidth: 400,
              maxHeight: "calc(100dvh - 32px)",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 16,
              padding: "24px 20px",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="customer-order-modal-topbar">
              <button
                type="button"
                onClick={() => setOrderOpen(false)}
                aria-label="關閉視窗"
                title="關閉"
                className="modal-close-btn customer-order-close-btn"
              >
                ×
              </button>
            </div>

            {reserveSuccess ? (
              <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "#3d2410", marginBottom: 8 }}>
                  預約成功！
                </div>
                <div style={{ fontSize: 13, color: "#6a513a", marginBottom: 24, lineHeight: 1.7 }}>
                  您的下單已送出，請至檔期列表確認目前狀態。
                </div>
                <div className="customer-order-modal-actions" style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setOrderOpen(false)} style={{ flex: 1 }}>
                    關閉
                  </button>
                  <Link
                    to="/customer/sell-windows"
                    onClick={() => setOrderOpen(false)}
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      color: "#fff",
                      background: "linear-gradient(180deg, #d49f64 0%, #bf7f3d 100%)",
                      border: "1px solid #ad6f32",
                      borderRadius: 999,
                      padding: "10px 14px",
                      textDecoration: "none",
                    }}
                  >
                    查看檔期列表
                  </Link>
                </div>
              </div>
            ) : (
              <div className="customer-order-modal-body">
                <div style={{ fontWeight: 800, fontSize: 17, color: "#4a321f", marginBottom: 6 }}>
                  {orderSelected.name}
                </div>
                <div style={{ fontSize: 14, color: "#7a6248", marginBottom: 18 }}>
                  單價：{formatPrice(orderSelected)}
                </div>

                {nextGroupLoading && (
                  <div style={{ fontSize: 12, color: "#7a6248", marginBottom: 12 }}>最快可開團資訊載入中...</div>
                )}

                {!nextGroupLoading && nextGroupError && (
                  <div style={{ fontSize: 12, color: "crimson", marginBottom: 12 }}>{nextGroupError}</div>
                )}

                {!nextGroupLoading && nextGroupInfo && (
                  <div
                    style={{
                      marginBottom: 14,
                      padding: "12px",
                      borderRadius: 12,
                      border: "1px solid #e7d6bd",
                      background: "linear-gradient(180deg, #fffaf2 0%, #fff5e7 100%)",
                      color: "#5a422b",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: "#4c331f" }}>開團時程預估</div>
                    <div style={{ fontSize: 12, color: "#7a6248", marginBottom: 10 }}>
                      以下時間為系統預估，實際時程依檔期狀況為準。
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      {(() => {
                        const predictedGroupOpenAt = nextSellWindowOpenAt ?? nextGroupInfo.next_group_open_at;
                        const predictedGroupEndAt = addDays(
                          predictedGroupOpenAt,
                          getGroupOpenDays(nextGroupInfo, orderSelected)
                        );
                        const predictedPickupAt = addDays(
                          predictedGroupEndAt,
                          nextGroupInfo.default_leads_day + nextGroupInfo.default_ship_day
                        );
                        const groupWeekInfo = getIsoWeekInfo(predictedGroupOpenAt);

                        return (
                          <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          background: "#fff",
                          border: "1px solid #efdcc4",
                          borderRadius: 10,
                          padding: "8px 10px",
                        }}
                      >
                        <span style={{ fontSize: 12, color: "#7a6248", fontWeight: 600 }}>預計開團週數</span>
                        <strong style={{ fontSize: 12, color: "#4b311d", textAlign: "right" }}>
                          {groupWeekInfo ? `${groupWeekInfo.year} 第 ${groupWeekInfo.week} 週` : "-"}
                        </strong>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          background: "#fff",
                          border: "1px solid #efdcc4",
                          borderRadius: 10,
                          padding: "8px 10px",
                        }}
                      >
                        <span style={{ fontSize: 12, color: "#7a6248", fontWeight: 600 }}>預計開團時間</span>
                        <strong style={{ fontSize: 12, color: "#4b311d", textAlign: "right" }}>
                          {formatDateTimeWithWeekday(predictedGroupOpenAt)}
                        </strong>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          background: "#fff",
                          border: "1px solid #efdcc4",
                          borderRadius: 10,
                          padding: "8px 10px",
                        }}
                      >
                        <span style={{ fontSize: 12, color: "#7a6248", fontWeight: 600 }}>預計結團時間</span>
                        <strong style={{ fontSize: 12, color: "#4b311d", textAlign: "right" }}>
                          {formatDateTimeWithWeekday(predictedGroupEndAt)}
                        </strong>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          background: "#fff",
                          border: "1px solid #e6cfad",
                          borderRadius: 10,
                          padding: "8px 10px",
                        }}
                      >
                        <span style={{ fontSize: 12, color: "#7a6248", fontWeight: 700 }}>預計取貨時間</span>
                        <strong style={{ fontSize: 12, color: "#3f2614", textAlign: "right" }}>
                          {formatDateTimeWithWeekday(predictedPickupAt)}
                        </strong>
                      </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    marginBottom: 18,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e7d6bd",
                    background: "#fff6e8",
                    color: "#6a513a",
                    fontSize: 12,
                    lineHeight: 1.65,
                  }}
                >
                  我們會依您的下單數量，優先加入目前可併單的檔期；若暫時沒有可加入檔期，系統會自動建立新檔期並先為您保留數量。檔期結束前，若下單總量達到最低成團門檻，系統才會通知所有訂購者進行付款。
                </div>

                <label style={{ display: "grid", gap: 6, marginBottom: 20 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#5f4b3a" }}>下單數量</span>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                    style={{ fontSize: 15, padding: "10px 14px" }}
                  />
                </label>

                <div className="customer-order-modal-actions" style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => void handleReserve()}
                    disabled={reserving === orderSelected.id || qty < 1 || !user?.id?.trim()}
                    style={{ width: "100%" }}
                  >
                    {reserving === orderSelected.id ? "處理中…" : "確認預約"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
