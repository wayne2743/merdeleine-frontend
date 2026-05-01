import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { catalogApi } from "../../api/catalogApi";
import type { ProductSellWindowView } from "../../types/domain";

const PAGE_SIZE = 10;

function getPredictedShipDate(item: ProductSellWindowView): string | null {
  if (item.predictedShipDate) return item.predictedShipDate;
  return null;
}

function fmt(dt?: string | null) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return String(dt);
  }
}

function formatPrice(amount: number, currency: string) {
  return `${currency} ${Number(amount).toLocaleString()}`;
}

function pickImageUrl(images: { imageType: string; isActive: boolean; isPrimary: boolean; sortOrder: number; cdnUrl: string }[]) {
  const activeImages = images.filter((img) => img.isActive);
  const sorted = (imgs: typeof images) => [...imgs].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);

  const galleryImage = sorted(
    activeImages.filter((img) => String(img.imageType).toUpperCase() === "GALLERY")
  )[0];
  if (galleryImage?.cdnUrl) return galleryImage.cdnUrl;

  const thumbnailImage = sorted(
    activeImages.filter((img) => String(img.imageType).toUpperCase() === "THUMBNAIL")
  )[0];
  if (thumbnailImage?.cdnUrl) return thumbnailImage.cdnUrl;

  const originalImage = sorted(
    activeImages.filter((img) => String(img.imageType).toUpperCase() === "ORIGINAL")
  )[0];
  return originalImage?.cdnUrl ?? "";
}

export default function SellWindowListPage() {
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<ProductSellWindowView[]>([]);
  const [total, setTotal] = useState(0);
  const [thumbnailByProductId, setThumbnailByProductId] = useState<Record<string, string>>({});

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [total]);

  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await catalogApi.pageProductSellWindowViews(page, PAGE_SIZE);
        if (cancelled) return;

        const nextItems = resp.items ?? [];
        setItems(nextItems);
        setTotal(resp.total ?? 0);

        const imageResults = await Promise.allSettled(
          nextItems.map(async (it) => {
            const images = await catalogApi.listProductImages(it.productId);
            return [it.productId, pickImageUrl(images)] as const;
          })
        );

        if (cancelled) return;

        const nextThumbnailByProductId = imageResults.reduce<Record<string, string>>((acc, result) => {
          if (result.status === "fulfilled") {
            const [productId, thumbnail] = result.value;
            if (thumbnail) acc[productId] = thumbnail;
          }
          return acc;
        }, {});

        setThumbnailByProductId(nextThumbnailByProductId);
      } catch (e: any) {
        if (cancelled) return;
        console.error(e);
        setError(e?.message ?? "載入失敗");
        setItems([]);
        setTotal(0);
        setThumbnailByProductId({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [page]);

  useEffect(() => {
    if (page > 0 && page >= totalPages) {
      setPage(totalPages - 1);
    }
  }, [totalPages, page]);

  return (
    <div className="page-container sellwindow-list-page">
      <div className="sellwindow-list-head">
        <h2>可預約檔期</h2>
        <span>
          顯示 {total === 0 ? 0 : page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} / 共 {total} 筆
        </span>
      </div>

      <div className="sellwindow-pagination">
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={!canPrev || loading}>
          上一頁
        </button>
        <div className="sellwindow-page-indicator">
          第 {page + 1} / {totalPages} 頁
        </div>
        <button onClick={() => setPage((p) => p + 1)} disabled={!canNext || loading}>
          下一頁
        </button>
        <button onClick={() => setPage(0)} disabled={page === 0 || loading}>
          回到第一頁
        </button>
        <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1 || loading}>
          跳到最後頁
        </button>
      </div>

      {loading && <div className="sellwindow-list-hint">載入中...</div>}
      {error && <div className="sellwindow-list-error">取得資料失敗：{error}</div>}

      <div className="sellwindow-list-grid">
        {items.map((it) => {
          const soldQty = Number(it.soldQty ?? 0);
          const maxQty = it.maxQty ?? null;
          const minQty = Number(it.minQty ?? 0);
          const remainingQty = maxQty != null ? Math.max(maxQty - soldQty, 0) : null;
          const achievementPercent = minQty > 0 ? Math.round((soldQty / minQty) * 100) : null;
          const barPercent =
            maxQty != null && maxQty > 0
              ? Math.min(Math.round((soldQty / maxQty) * 100), 100)
              : achievementPercent != null
                ? Math.min(achievementPercent, 100)
                : null;
          const benchmarkPercent =
            maxQty != null && maxQty > 0 && minQty > 0
              ? Math.min(Math.max((minQty / maxQty) * 100, 0), 100)
              : null;
          const isReachedAchievement = (achievementPercent ?? 0) >= 100;
          const isOverAchieved = (achievementPercent ?? 0) > 100;
          const isSoldOut = remainingQty === 0;
          const isLowStock = remainingQty != null && remainingQty > 0 && remainingQty <= 3;
          const isReservable = !isSoldOut && it.quotaStatus === "OPEN";
          const predictedShipDate = getPredictedShipDate(it);

          return (
            <article key={it.productSellWindowId} className="sellwindow-list-card">
              <div className="sellwindow-list-main">
                <div className="sellwindow-thumb-wrap">
                  {thumbnailByProductId[it.productId] ? (
                    <img
                      src={thumbnailByProductId[it.productId]}
                      alt={`${it.productName}-thumbnail`}
                      className="sellwindow-thumb"
                    />
                  ) : (
                    <div className="sellwindow-thumb-empty">暫無圖片</div>
                  )}
                </div>

                <div className="sellwindow-card-content">
                  <div className="sellwindow-card-title-row">
                    <div className="sellwindow-card-title">{it.productName}</div>
                    {isSoldOut && <div className="sellwindow-urgency is-soldout">已額滿</div>}
                    {!isSoldOut && isLowStock && <div className="sellwindow-urgency is-low">名額緊張</div>}
                  </div>
                  <div className="sellwindow-card-subtitle">檔期：{it.sellWindowName}（{it.timezone}）</div>

                  <div className="sellwindow-card-meta">
                    <div>接單起訖：{fmt(it.startAt)} ～ {fmt(it.endAt)}</div>
                    <div>付款截止：{fmt(it.paymentCloseAt)}</div>
                    <div>預計取貨時間：{fmt(predictedShipDate)}</div>
                    <div>最新下單日期：{fmt(it.quotaUpdatedAt)}</div>
                  </div>
                </div>

                <div className="sellwindow-card-side">
                  <div className={`sellwindow-chip ${isSoldOut ? "is-soldout" : ""}`}>狀態：{it.quotaStatus === "OPEN" ? "開放中" : it.quotaStatus === "CLOSED" ? "已關閉" : it.quotaStatus}</div>

                  <div
                    className="sellwindow-quota"
                    style={
                      isReachedAchievement
                        ? {
                            background: "linear-gradient(180deg, #ecfbf2 0%, #d8f6e5 100%)",
                            borderColor: "#8ad6af",
                          }
                        : undefined
                    }
                  >
                    <div className="sellwindow-quota-label">名額</div>
                    <div className="sellwindow-quota-value">
                      {soldQty}
                      <span> / {maxQty ?? "-"}</span>
                    </div>

                    {achievementPercent != null && (
                      <>
                        <div className="sellwindow-quota-track" style={{ position: "relative" }} aria-hidden>
                          <div
                            className="sellwindow-quota-fill"
                            style={{
                              width: `${barPercent}%`,
                              background: isReachedAchievement
                                ? "linear-gradient(90deg, #22a06b 0%, #168f5d 100%)"
                                : undefined,
                            }}
                          />
                          {benchmarkPercent != null && (
                            <div
                              style={{
                                position: "absolute",
                                left: `${benchmarkPercent}%`,
                                top: -2,
                                bottom: -2,
                                width: 2,
                                background: "#0d6b45",
                                opacity: 0.85,
                                transform: "translateX(-1px)",
                              }}
                            />
                          )}
                        </div>
                        <div
                          className="sellwindow-quota-percent"
                          style={isReachedAchievement ? { color: "#168f5d", fontWeight: 700 } : undefined}
                        >
                          已達成率 {achievementPercent}%
                          {isOverAchieved ? "（超標）" : ""}
                        </div>
                      </>
                    )}

                    {remainingQty != null && <div className="sellwindow-quota-remaining">剩餘 {remainingQty}</div>}
                  </div>

                  <div className="sellwindow-side-line">最少到量：{it.minQty}</div>
                  <div className="sellwindow-price">{formatPrice(it.unitPriceCents, it.currency)}</div>
                  {isReservable ? (
                    <Link
                      to={`/customer/sell-windows/${it.productSellWindowId}`}
                      state={{ item: it }}
                      className="sellwindow-link"
                    >
                      立即查看與預約
                    </Link>
                  ) : (
                    <span className="sellwindow-link is-disabled" aria-disabled="true" title="名額已滿，暫時無法預約">
                      立即查看與預約
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {!loading && !error && items.length === 0 && <div className="sellwindow-list-hint">目前沒有資料</div>}
      </div>
    </div>
  );
}
