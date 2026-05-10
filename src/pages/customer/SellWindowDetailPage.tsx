import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { catalogApi } from "../../api/catalogApi";
import { orderApi } from "../../api/orderApi";
import type { StorePickupLocationResponse } from "../../api/orderApi";
import { fetchImageWithCache } from "../../utils/imageCache";
import { useAuth } from "../../auth/AuthProvider";
import type { ProductImage, ProductSellWindowView } from "../../types/domain";

type RouteState = {
  item?: ProductSellWindowView;
};

type DeliveryMethod = "STORE_PICKUP" | "CONVENIENCE_STORE_PICKUP" | "HOME_DELIVERY";

type DeliveryForm = {
  deliveryMethod: DeliveryMethod;
  pickupLocationName: string;
  pickupLocationAddress: string;
  pickupTime: string;
  convenienceStoreCode: string;
  convenienceStoreName: string;
  convenienceStoreAddress: string;
  homeDeliveryAddress: string;
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

function toOffsetDateTime(value: string): string | null {
  if (!value.trim()) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;

  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  const hours = String(dt.getHours()).padStart(2, "0");
  const minutes = String(dt.getMinutes()).padStart(2, "0");
  const seconds = String(dt.getSeconds()).padStart(2, "0");

  const tzMinutes = -dt.getTimezoneOffset();
  const sign = tzMinutes >= 0 ? "+" : "-";
  const tzAbs = Math.abs(tzMinutes);
  const tzHours = String(Math.floor(tzAbs / 60)).padStart(2, "0");
  const tzMins = String(tzAbs % 60).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${tzHours}:${tzMins}`;
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pickupLocations, setPickupLocations] = useState<StorePickupLocationResponse[]>([]);
  const [selectedPickupLocationId, setSelectedPickupLocationId] = useState<string>("");
  const [deliveryForm, setDeliveryForm] = useState<DeliveryForm>({
    deliveryMethod: "STORE_PICKUP",
    pickupLocationName: "",
    pickupLocationAddress: "",
    pickupTime: "",
    convenienceStoreCode: "",
    convenienceStoreName: "",
    convenienceStoreAddress: "",
    homeDeliveryAddress: "",
  });

  useEffect(() => {
    if (!showConfirmModal) return;
    // 預帶取貨時間為檔期預計取貨時間
    if (data?.predictedShipDate) {
      setDeliveryForm((prev) => ({ ...prev, pickupTime: data.predictedShipDate! }));
    }
    orderApi.listPublicStorePickupLocations()
      .then((list) => {
        const active = list.filter((l) => l.active !== false);
        setPickupLocations(active);
        if (active.length > 0 && !selectedPickupLocationId) {
          const first = active[0];
          setSelectedPickupLocationId(first.id ?? "");
          setDeliveryForm((prev) => ({
            ...prev,
            pickupLocationName: first.name ?? "",
            pickupLocationAddress: first.address ?? "",
          }));
        }
      })
      .catch(() => setPickupLocations([]));
  }, [showConfirmModal]);  // eslint-disable-line react-hooks/exhaustive-deps

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
      .then(async (images) => {
        if (cancelled) return;
        const heroImage = pickHeroImage(images);
        if (heroImage) {
          const cachedUrl = await fetchImageWithCache(heroImage);
          if (!cancelled) setThumbnailUrl(cachedUrl);
        } else {
          if (!cancelled) setThumbnailUrl(null);
        }
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

    // 基本驗證通過，顯示確認 modal
    setShowConfirmModal(true);
  }

  async function onConfirmReserve() {
    if (!data) return;

    let delivery: any;
    if (deliveryForm.deliveryMethod === "STORE_PICKUP") {
      const pickupLocationAddress = deliveryForm.pickupLocationAddress.trim();
      const pickupTime = toOffsetDateTime(deliveryForm.pickupTime);
      if (!selectedPickupLocationId || !pickupLocationAddress) {
        setMsg("請選取取貨門市");
        return;
      }
      if (!pickupTime) {
        setMsg("請填寫有效的取貨時間");
        return;
      }

      delivery = {
        deliveryMethod: "STORE_PICKUP",
        pickupLocationId: selectedPickupLocationId,
        pickupLocationName: deliveryForm.pickupLocationName.trim() || undefined,
        pickupLocationAddress,
        pickupTime,
      };
    } else if (deliveryForm.deliveryMethod === "CONVENIENCE_STORE_PICKUP") {
      const convenienceStoreCode = deliveryForm.convenienceStoreCode.trim();
      const convenienceStoreName = deliveryForm.convenienceStoreName.trim();
      const convenienceStoreAddress = deliveryForm.convenienceStoreAddress.trim();

      if (!convenienceStoreCode || !convenienceStoreName || !convenienceStoreAddress) {
        setMsg("請完整填寫超商代碼、門市名稱與門市地址");
        return;
      }

      delivery = {
        deliveryMethod: "CONVENIENCE_STORE_PICKUP",
        convenienceStoreCode,
        convenienceStoreName,
        convenienceStoreAddress,
      };
    } else {
      const homeDeliveryAddress = deliveryForm.homeDeliveryAddress.trim();
      if (!homeDeliveryAddress) {
        setMsg("請填寫宅配地址");
        return;
      }

      delivery = {
        deliveryMethod: "HOME_DELIVERY",
        homeDeliveryAddress,
      };
    }

    try {
      const res = await orderApi.reserveOrder({
        sellWindowId: data.sellWindowId,
        productId: data.productId,
        quantity: qty,
        currency: "TWD",
        unitPriceCents: data.unitPriceCents,
        customerId: user!.id,
        delivery,
      });

      setShowConfirmModal(false);
      nav(`/customer/orders`);
      console.log("reserved orderId:", res.orderId);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) setMsg("名額不足或已關閉（409）");
      else setMsg("預約失敗，請稍後再試");
      setShowConfirmModal(false);
    }
  }

  if (!data) return <div style={{ padding: "40px 20px", textAlign: "center", color: "#6f5f50" }}>載入中...</div>;

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
          color: "#8a6948",
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
          background: "linear-gradient(180deg, #fffdf9 0%, #fbf4ea 100%)",
          border: "1px solid #e6d8c6",
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
            background: "#f2ece4",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {imageLoading && <span style={{ color: "#746352", fontSize: 13 }}>圖片載入中...</span>}
          {!imageLoading && !thumbnailUrl && <span style={{ color: "#746352", fontSize: 13 }}>暫無圖片</span>}
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
                border: `1px solid ${statusColor}44`,
              }}
            >
              {statusLabel}
            </span>
          </div>

          {/* 名額進度 */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, color: "#6e5d4d" }}>
              <span>已預約名額</span>
              <span style={{ fontWeight: 600 }}>
                {data.soldQty} / {data.maxQty ?? "無上限"}
                {data.minQty ? <span style={{ color: "#8f7f70", marginLeft: 6, fontWeight: 400 }}>（最少到量 {data.minQty}）</span> : null}
              </span>
            </div>
            {data.maxQty && (
              <div style={{ height: 6, borderRadius: 4, background: "#e6dacb", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${quotaPercent}%`, background: isSoldOut ? "#cf5a5a" : "#b58e60", borderRadius: 4, transition: "width 0.3s" }} />
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
          background: "linear-gradient(180deg, #fffdf9 0%, #faf2e8 100%)",
          border: "1px solid #e6d8c6",
          borderRadius: 16,
          padding: "20px 24px",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#5f4c3b" }}>預約下單</div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <label style={{ fontSize: 14, color: "#8a6948", whiteSpace: "nowrap" }}>數量</label>
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
              border: "1px solid #d8c8b5",
              background: "#fff",
              color: "#3f3228",
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
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "#fff1ef", color: "#a04646", fontSize: 13, border: "1px solid #efc1c1" }}>
            {msg}
          </div>
        )}
      </div>

      {/* 確認預約 Modal */}
      {showConfirmModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(43, 31, 20, 0.42)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            style={{
              background: "linear-gradient(180deg, #fffdfa 0%, #f8f0e5 100%)",
              border: "1px solid #e5d5c2",
              borderRadius: 16,
              padding: "32px 24px",
              maxWidth: 400,
              width: "100%",
              boxShadow: "0 14px 36px rgba(73, 52, 33, 0.24)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                margin: "0 0 8px 0",
                fontSize: 20,
                fontWeight: 700,
                color: "#4b392a",
              }}
            >
              確認預約
            </h2>
            <p
              style={{
                margin: "0 0 24px 0",
                color: "#8a6948",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {data?.productName}
            </p>

            <div
              style={{
                background: "#f8f2e9",
                border: "1px solid #e6d7c3",
                borderRadius: 12,
                padding: "16px",
                marginBottom: 24,
                fontSize: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: "#857461" }}>
                <span>商品數量</span>
                <span style={{ color: "#4b392a", fontWeight: 600 }}>{qty}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#857461" }}>
                <span>單價</span>
                <span style={{ color: "#8a6948", fontWeight: 600 }}>TWD {(data?.unitPriceCents || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: "#857461" }}>
                <span>運送方式</span>
                <span style={{ color: "#4b392a", fontWeight: 600 }}>
                  {deliveryForm.deliveryMethod === "STORE_PICKUP"
                    ? "門市定點取貨"
                    : deliveryForm.deliveryMethod === "CONVENIENCE_STORE_PICKUP"
                      ? "超商取貨"
                      : "宅配貨運"}
                </span>
              </div>
              <div style={{ height: "1px", background: "#e5d7c4", margin: "8px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#857461" }}>小計</span>
                <span style={{ color: "#9a6b38", fontWeight: 700, fontSize: 16 }}>
                  TWD {((data?.unitPriceCents || 0) * qty).toLocaleString()}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>

              {deliveryForm.deliveryMethod === "HOME_DELIVERY" && (
                <input
                  type="text"
                  placeholder="宅配地址"
                  value={deliveryForm.homeDeliveryAddress}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDeliveryForm((prev) => ({ ...prev, homeDeliveryAddress: value }));
                  }}
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    border: "1px solid #d8c8b5",
                    background: "#fff",
                    color: "#3f3228",
                    padding: "10px 12px",
                    boxSizing: "border-box",
                  }}
                />
              )}

              {deliveryForm.deliveryMethod === "STORE_PICKUP" && (
                <>
                  <select
                    value={selectedPickupLocationId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedPickupLocationId(id);
                      const loc = pickupLocations.find((l) => l.id === id);
                      setDeliveryForm((prev) => ({
                        ...prev,
                        pickupLocationName: loc?.name ?? "",
                        pickupLocationAddress: loc?.address ?? "",
                      }));
                    }}
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      border: "1px solid #d8c8b5",
                      background: "#fff",
                      color: selectedPickupLocationId ? "#3f3228" : "#8c7b6a",
                      padding: "10px 12px",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="">請選取門市</option>
                    {pickupLocations.map((loc) => (
                      <option key={loc.id} value={loc.id ?? ""}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  {deliveryForm.pickupLocationAddress && (
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid #e2d3bf",
                        background: "#fcf8f2",
                        color: "#7b6a59",
                        fontSize: 13,
                      }}
                    >
                      {deliveryForm.pickupLocationAddress}
                    </div>
                  )}
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2d3bf",
                      background: "#fcf8f2",
                      fontSize: 13,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "#8c7b6a" }}>預計取貨時間</span>
                    <span style={{ color: "#4b392a" }}>
                      {data?.predictedShipDate
                        ? new Date(data.predictedShipDate).toLocaleString("zh-TW")
                        : "未設定"}
                    </span>
                  </div>
                </>
              )}

              {deliveryForm.deliveryMethod === "CONVENIENCE_STORE_PICKUP" && (
                <>
                  <input
                    type="text"
                    placeholder="超商門市代碼（必填）"
                    value={deliveryForm.convenienceStoreCode}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDeliveryForm((prev) => ({ ...prev, convenienceStoreCode: value }));
                    }}
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      border: "1px solid #d8c8b5",
                      background: "#fff",
                      color: "#3f3228",
                      padding: "10px 12px",
                      boxSizing: "border-box",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="超商門市名稱（必填）"
                    value={deliveryForm.convenienceStoreName}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDeliveryForm((prev) => ({ ...prev, convenienceStoreName: value }));
                    }}
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      border: "1px solid #d8c8b5",
                      background: "#fff",
                      color: "#3f3228",
                      padding: "10px 12px",
                      boxSizing: "border-box",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="超商門市地址（必填）"
                    value={deliveryForm.convenienceStoreAddress}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDeliveryForm((prev) => ({ ...prev, convenienceStoreAddress: value }));
                    }}
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      border: "1px solid #d8c8b5",
                      background: "#fff",
                      color: "#3f3228",
                      padding: "10px 12px",
                      boxSizing: "border-box",
                    }}
                  />
                </>
              )}
            </div>

            <p
              style={{
                margin: "0 0 24px 0",
                color: "#7c6a58",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              確認預約後，將進行付款流程。如需取消，可在確認頁面進行調整。
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
                width: "100%",
              }}
            >
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #d9c8b1",
                  background: "#fffdf9",
                  color: "#6a543f",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#f3e9dc";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#fffdf9";
                }}
              >
                取消
              </button>
              <button
                onClick={onConfirmReserve}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(180deg, #deb981 0%, #ca9659 100%)",
                  color: "#2f241b",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.05)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1)";
                }}
              >
                確認預約
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
      <span style={{ color: "#867564", minWidth: 90, fontSize: 12.5 }}>{label}</span>
      <span style={{ color: highlight ? "#8a6948" : "#4a3b2d", fontWeight: highlight ? 700 : 500, fontSize: highlight ? 16 : 13.5 }}>{value}</span>
    </div>
  );
}