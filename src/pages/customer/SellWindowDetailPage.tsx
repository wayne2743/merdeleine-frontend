import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { catalogApi } from "../../api/catalogApi";
import { orderApi } from "../../api/orderApi";
import { useAuth } from "../../auth/AuthProvider";
import type { ProductImage, ProductSellWindowView } from "../../types/domain";

type RouteState = {
  item?: ProductSellWindowView;
};

function sortImages(images: ProductImage[]): ProductImage[] {
  return [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);
}

function pickHeroImage(images: ProductImage[]): string | null {
  const activeImages = images.filter((img) => img.isActive);

  const galleryImage = sortImages(
    activeImages.filter((img) => String(img.imageType).toUpperCase() === "GALLERY")
  )[0];
  if (galleryImage?.cdnUrl) return galleryImage.cdnUrl;

  const thumbnailImage = sortImages(
    activeImages.filter((img) => String(img.imageType).toUpperCase() === "THUMBNAIL")
  )[0];
  if (thumbnailImage?.cdnUrl) return thumbnailImage.cdnUrl;

  const originalImage = sortImages(
    activeImages.filter((img) => String(img.imageType).toUpperCase() === "ORIGINAL")
  )[0];
  return originalImage?.cdnUrl ?? null;
}

export default function SellWindowDetailPage() {
  const { productSellWindowId } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const seeded = (location.state as RouteState | null)?.item;

  const [data, setData] = useState<ProductSellWindowView | null>(seeded ?? null);
  const [qty, setQty] = useState(1);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);

  console.log("productSellWindowId param =", productSellWindowId);

  const needFetch = useMemo(() => {
    if (!productSellWindowId) return false;
    if (!data) return true;
    return String(data.productSellWindowId) !== String(productSellWindowId);
  }, [productSellWindowId, data]);

  useEffect(() => {
    if (!productSellWindowId) return;
    if (!needFetch) return;

    setMsg(null);
    catalogApi.getProductSellWindowView(productSellWindowId)
      .then(setData)
      .catch(() => setMsg("讀取檔期失敗，請稍後再試"));
  }, [productSellWindowId, needFetch]);

  useEffect(() => {
    if (!data?.productId) {
      setThumbnailUrl(null);
      return;
    }

    let cancelled = false;
    setImageLoading(true);

    catalogApi
      .listProductImages(data.productId)
      .then((images) => {
        if (cancelled) return;
        setThumbnailUrl(pickHeroImage(images));
      })
      .catch(() => {
        if (cancelled) return;
        setThumbnailUrl(null);
      })
      .finally(() => {
        if (!cancelled) setImageLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [data?.productId]);

  const soldQty = Number(data?.soldQty ?? 0);
  const maxQty = data?.maxQty ?? null;
  const isSoldOut = maxQty != null && soldQty >= maxQty;
  const canReserve = !!data && !isSoldOut && data.quotaStatus === "OPEN";

  async function onReserve() {
    if (!data) return;
    setMsg(null);

    if (!Number.isFinite(qty) || qty <= 0) {
      setMsg("quantity 必須大於 0");
      return;
    }
    if (!user?.id) {
      setMsg("缺少客戶資訊，請重新登入後再試");
      return;
    }
    if (isSoldOut) {
      setMsg("名額已滿，無法預約");
      return;
    }

    // 如果後端用 quotaStatus 控制開關，這邊可以先擋
    if (data.quotaStatus && data.quotaStatus !== "OPEN") {
      setMsg(`目前不可下單（狀態：${data.quotaStatus}）`);
      return;
    }

    try {
      const res = await orderApi.reserveOrder({
        sellWindowId: data.sellWindowId,
        productId: data.productId,
        quantity: qty,
        currency: "TWD",
        unitPriceCents: data.unitPriceCents,
        customerId: user.id,
      });

      nav(`/customer/orders`);
      console.log("reserved orderId:", res.orderId);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) setMsg("名額不足或已關閉（409）");
      else setMsg("預約失敗，請稍後再試");
    }
  }

  if (!data) return <div style={{ padding: "40px 20px", textAlign: "center", color: "#e7dfd2" }}>載入中...</div>;

  const quotaPercent = data.maxQty ? Math.min(100, Math.round((data.soldQty / data.maxQty) * 100)) : 0;
  const statusLabel = isSoldOut ? "名額已滿" : data.quotaStatus === "OPEN" ? "開放預約" : "暫停預約";
  const statusColor = isSoldOut ? "#e05252" : data.quotaStatus === "OPEN" ? "#6dbf8b" : "#c9a84c";

  return (
    <div className="page-container" style={{ maxWidth: 720, margin: "0 auto" }}>
      <button
        onClick={() => nav(-1)}
        style={{
          background: "none",
          border: "none",
          color: "#c9b97a",
          fontSize: 14,
          cursor: "pointer",
          padding: "0 0 16px 0",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        ← 返回
      </button>

      {/* 商品卡片：圖片 + 資訊 */}
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 16,
          overflow: "hidden",
          display: "flex",
          flexWrap: "wrap",
        }}
      >
        {/* 圖片區 */}
        <div
          style={{
            width: "100%",
            aspectRatio: "4 / 3",
            background: "rgba(0,0,0,0.25)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {imageLoading && <span style={{ color: "#e7dfd2", fontSize: 13 }}>圖片載入中...</span>}
          {!imageLoading && !thumbnailUrl && <span style={{ color: "#e7dfd2", fontSize: 13 }}>暫無圖片</span>}
          {!imageLoading && thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt={data.productName}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          )}
        </div>

        {/* 文字資訊區 */}
        <div style={{ flex: "1 1 260px", padding: "24px 24px 20px" }}>
          {/* 名稱 + 狀態 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{data.productName}</h2>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 20,
                background: statusColor + "22",
                color: statusColor,
                border: `1px solid ${statusColor}55`,
                whiteSpace: "nowrap",
              }}
            >
              {statusLabel}
            </span>
          </div>

          {/* 名額進度 */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, color: "#e7dfd2" }}>
              <span>已預約名額</span>
              <span style={{ fontWeight: 600 }}>
                {data.soldQty} / {data.maxQty ?? "無上限"}
                {data.minQty ? <span style={{ color: "#aaa", marginLeft: 6, fontWeight: 400 }}>（最少到量 {data.minQty}）</span> : null}
              </span>
            </div>
            {data.maxQty && (
              <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${quotaPercent}%`, background: isSoldOut ? "#e05252" : "#c9b97a", borderRadius: 4, transition: "width 0.3s" }} />
              </div>
            )}
          </div>

          {/* 詳細資訊 */}
          <div style={{ marginTop: 16, display: "grid", gap: 8, fontSize: 13.5 }}>
            <InfoRow label="預約價格" value={`TWD ${(data.unitPriceCents).toLocaleString()}`} highlight />
            <InfoRow label="檔期時間" value={`${new Date(data.startAt).toLocaleString("zh-TW")} ～ ${new Date(data.endAt).toLocaleString("zh-TW")}`} />
            {data.paymentCloseAt && (
              <InfoRow label="付款截止" value={new Date(data.paymentCloseAt).toLocaleString("zh-TW")} />
            )}
            {data.quotaUpdatedAt && (
              <InfoRow label="最新下單日期" value={new Date(data.quotaUpdatedAt).toLocaleString("zh-TW")} />
            )}
          </div>
        </div>
      </div>

      {/* 下單區 */}
      <div
        style={{
          marginTop: 20,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          padding: "20px 24px",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: "#e7dfd2" }}>預約下單</div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <label style={{ fontSize: 14, color: "#c9b97a", whiteSpace: "nowrap" }}>數量</label>
          <input
            type="number"
            min={1}
            value={qty}
            disabled={!canReserve}
            onChange={(e) => setQty(Number(e.target.value))}
            style={{
              width: 100,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.05)",
              color: "#e7dfd2",
              fontSize: 15,
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={onReserve}
            disabled={!canReserve}
            className="product-action-btn customer-product-btn"
            style={{ flex: "1 1 auto", maxWidth: 240, padding: "10px 20px", fontSize: 15 }}
          >
            {isSoldOut ? "名額已滿" : "立即預約"}
          </button>
        </div>

        {msg && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(224,82,82,0.12)", color: "#e07070", fontSize: 13, border: "1px solid rgba(224,82,82,0.25)" }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
      <span style={{ color: "#aaa", minWidth: 90, fontSize: 12.5 }}>{label}</span>
      <span style={{ color: highlight ? "#c9b97a" : "#e7dfd2", fontWeight: highlight ? 700 : 400, fontSize: highlight ? 16 : 13.5 }}>{value}</span>
    </div>
  );
}