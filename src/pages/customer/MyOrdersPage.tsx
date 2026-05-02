import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { orderApi } from "../../api/orderApi";
import { catalogApi } from "../../api/catalogApi";
import { paymentApi } from "../../api/paymentApi";
import { useAuth } from "../../auth/AuthProvider";
import type { OrderSummary, Product, SellWindowSummary } from "../../types/domain";

function getOrderQty(order: OrderSummary): number | string {
  const raw = (order as OrderSummary & { quantity?: number }).qty ?? (order as OrderSummary & { quantity?: number }).quantity;
  return Number.isFinite(raw) ? Number(raw) : "-";
}

function getOrderQtyNumber(order: OrderSummary): number | null {
  const raw = (order as OrderSummary & { quantity?: number }).qty ?? (order as OrderSummary & { quantity?: number }).quantity;
  return Number.isFinite(raw) ? Number(raw) : null;
}

function getOrderCreatedAt(order: OrderSummary): string | null {
  const raw = (order as OrderSummary & { createAt?: string; create_at?: string }).createdAt
    ?? (order as OrderSummary & { createAt?: string; create_at?: string }).createAt
    ?? (order as OrderSummary & { createAt?: string; create_at?: string }).create_at;
  return typeof raw === "string" && raw.trim() ? raw : null;
}

function getOrderTotalAmountCents(order: OrderSummary): number | null {
  const raw = (order as OrderSummary & { total_amount_cents?: number }).totalAmountCents
    ?? (order as OrderSummary & { total_amount_cents?: number }).total_amount_cents;
  return Number.isFinite(raw) ? Number(raw) : null;
}

function getOrderPaymentDueAt(order: OrderSummary): string | null {
  const raw = (order as OrderSummary & { payment_due_at?: string }).paymentDueAt
    ?? (order as OrderSummary & { payment_due_at?: string }).payment_due_at;
  return typeof raw === "string" && raw.trim() ? raw : null;
}

function getOrderMaxEditableQty(
  order: OrderSummary,
  sellWindowById: Record<string, SellWindowSummary>
): number | null {
  const currentQty = getOrderQtyNumber(order) ?? 0;
  const sellWindow = sellWindowById[order.sellWindowId];
  const maxQty = Number(sellWindow?.maxQty);
  const soldQty = Number(sellWindow?.soldQty ?? 0);

  if (!Number.isFinite(maxQty) || maxQty <= 0) return null;

  const remainingQty = Math.max(maxQty - soldQty, 0);
  return Math.max(currentQty + remainingQty, 1);
}

function formatDateTime(dt?: string | null): string {
  if (!dt) return "-";
  const value = new Date(dt);
  return Number.isNaN(value.getTime()) ? "-" : value.toLocaleString();
}

function formatPrice(amount?: number | null, currency?: string | null): string {
  if (!Number.isFinite(amount)) return "-";
  const amountValue = Number(amount);
  return `${currency || "TWD"} ${amountValue.toLocaleString()}`;
}

function getOrderStatusLabel(status: OrderSummary["status"]): string {
  if (status === "RESERVED") return "已預約";
  if (status === "PAYMENT_REQUESTED") return "待付款";
  if (status === "PAID") return "已付款";
  if (status === "EXPIRED") return "已逾期";
  return status;
}

function getOrderStatusClassName(status: OrderSummary["status"]): string {
  if (status === "PAID") return "is-paid";
  if (status === "PAYMENT_REQUESTED") return "is-payment-requested";
  if (status === "EXPIRED") return "is-expired";
  return "is-reserved";
}

const ORDER_STATUS_TABS = ["RESERVED", "PAYMENT_REQUESTED", "PAID", "EXPIRED"] as const;
type OrderStatusTab = (typeof ORDER_STATUS_TABS)[number];

function getOrderStatusFilterLabel(status: OrderStatusTab): string {
  if (status === "RESERVED") return "已預約";
  if (status === "PAYMENT_REQUESTED") return "待付款";
  if (status === "PAID") return "已付款";
  if (status === "EXPIRED") return "已逾期";
  return status;
}

function pickThumbnail(images: { imageType: string; isActive: boolean; isPrimary: boolean; sortOrder: number; cdnUrl: string }[]) {
  const hit = [...images]
    .filter((img) => img.isActive && img.imageType === "THUMBNAIL")
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)[0];
  return hit?.cdnUrl ?? "";
}

function getErrorMessage(error: any, fallback: string): string {
  return (
    error?.response?.data?.message
    ?? error?.response?.data?.error
    ?? (typeof error?.response?.data === "string" ? error.response.data : null)
    ?? error?.message
    ?? fallback
  );
}

export default function MyOrdersPage() {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<OrderSummary[]>([]);
  const [thumbnailByProductId, setThumbnailByProductId] = useState<Record<string, string>>({});
  const [productById, setProductById] = useState<Record<string, Product>>({});
  const [sellWindowById, setSellWindowById] = useState<Record<string, SellWindowSummary>>({});
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState<string>("1");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [paymentMethodModal, setPaymentMethodModal] = useState<{ open: boolean; order: OrderSummary | null }>({
    open: false,
    order: null,
  });
  const [qtyLimitModal, setQtyLimitModal] = useState<{ open: boolean; maxAllowed: number | null }>({
    open: false,
    maxAllowed: null,
  });
  const [activeStatusTab, setActiveStatusTab] = useState<OrderStatusTab>("RESERVED");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmQtyModal, setConfirmQtyModal] = useState<{ open: boolean; order: OrderSummary | null; newQty: number | null }>({
    open: false,
    order: null,
    newQty: null,
  });

  const filteredItems = items.filter((order) => order.status === activeStatusTab);

  const tabOrderCounts = ORDER_STATUS_TABS.reduce<Record<OrderStatusTab, number>>((acc, tab) => {
    acc[tab] = items.filter((order) => order.status === tab).length;
    return acc;
  }, { RESERVED: 0, PAYMENT_REQUESTED: 0, PAID: 0, EXPIRED: 0 });

  async function loadOrdersForUser(customerId: string) {
    setLoading(true);
    setError(null);

    try {
      const orders = await orderApi.myOrders(customerId);
      setItems(orders);

      const products = await catalogApi.listProducts();
      const nextProductById = products.reduce<Record<string, Product>>((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {});
      setProductById(nextProductById);

      const uniqueSellWindowIds = [...new Set(orders.map((o) => o.sellWindowId).filter(Boolean))];
      const sellWindowResults = await Promise.allSettled(
        uniqueSellWindowIds.map(async (sellWindowId) => {
          const sw = await catalogApi.getSellWindow(sellWindowId);
          return [sellWindowId, sw] as const;
        })
      );

      const nextSellWindowById = sellWindowResults.reduce<Record<string, SellWindowSummary>>((acc, result) => {
        if (result.status === "fulfilled") {
          const [sellWindowId, sw] = result.value;
          acc[sellWindowId] = sw;
        }
        return acc;
      }, {});
      setSellWindowById(nextSellWindowById);

      const imageResults = await Promise.allSettled(
        orders.map(async (o) => {
          const images = await catalogApi.listProductImages(o.productId);
          return [o.productId, pickThumbnail(images)] as const;
        })
      );

      const nextThumbnailByProductId = imageResults.reduce<Record<string, string>>((acc, result) => {
        if (result.status === "fulfilled") {
          const [productId, thumbnail] = result.value;
          if (thumbnail) acc[productId] = thumbnail;
        }
        return acc;
      }, {});

      setThumbnailByProductId(nextThumbnailByProductId);
    } catch (e) {
      console.error(e);
      setItems([]);
      setThumbnailByProductId({});
      setProductById({});
      setSellWindowById({});
      setError("讀取我的訂單失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "loading") return;
    if (!user?.id) {
      setItems([]);
      setError("缺少登入者資訊，請重新登入");
      setLoading(false);
      return;
    }

    setActionMessage(null);
    void loadOrdersForUser(user.id);
  }, [status, user?.id]);

  useEffect(() => {
    if (status === "loading" || !user?.id) return;

    const url = new URL(window.location.href);
    const paypalOrderId = url.searchParams.get("token");
    const isCancelled = ["1", "true"].includes((url.searchParams.get("cancel") ?? "").toLowerCase())
      || ["1", "true"].includes((url.searchParams.get("cancelled") ?? "").toLowerCase());

    if (!paypalOrderId && !isCancelled) return;

    const clearQueryString = () => {
      window.history.replaceState({}, document.title, window.location.pathname);
    };

    if (isCancelled && !paypalOrderId) {
      setActionMessage("PayPal 付款已取消");
      clearQueryString();
      return;
    }

    let active = true;
    setPayingOrderId("__paypal_capture__");
    setActionMessage("正在確認 PayPal 付款結果...");

    void paymentApi
      .capturePaypalPayment(paypalOrderId as string)
      .then(async () => {
        if (!active) return;
        clearQueryString();
        setActionMessage("PayPal 付款成功");
        await loadOrdersForUser(user.id);
      })
      .catch((e: any) => {
        if (!active) return;
        clearQueryString();
        console.error(e);
        setActionMessage(getErrorMessage(e, "PayPal 付款確認失敗"));
      })
      .finally(() => {
        if (active) setPayingOrderId(null);
      });

    return () => {
      active = false;
    };
  }, [status, user?.id]);

  async function onDeleteOrder(order: OrderSummary) {
    if (deletingOrderId || updatingOrderId || payingOrderId) return;

    const ok = window.confirm(`確定要刪除訂單 ${order.orderId} 嗎？`);
    if (!ok) return;

    setActionMessage(null);
    setDeletingOrderId(order.orderId);
    try {
      await orderApi.deleteOrder(order.orderId);
      setItems((prev) => prev.filter((it) => it.orderId !== order.orderId));
      setActionMessage("訂單已刪除");
    } catch (e: any) {
      console.error(e);
      setActionMessage(getErrorMessage(e, "刪除訂單失敗"));
    } finally {
      setDeletingOrderId(null);
    }
  }

  function onPayOrder(order: OrderSummary) {
    if (deletingOrderId || updatingOrderId || payingOrderId) return;

    if (order.status !== "PAYMENT_REQUESTED") {
      setActionMessage(order.status === "PAID" ? "此訂單已完成付款" : "此訂單目前尚未開放付款");
      return;
    }

    setActionMessage(null);
    setPaymentMethodModal({ open: true, order });
  }

  function closePaymentMethodModal() {
    setPaymentMethodModal({ open: false, order: null });
  }

  function onSelectPaymentMethod(method: "BANK_TRANSFER" | "PAYPAL" | "ECPAY") {
    const selectedOrder = paymentMethodModal.order;
    if (!selectedOrder) return;

    if (method !== "BANK_TRANSFER") {
      setActionMessage("目前僅開放銀行轉帳付款，PayPal 與綠界 EcPay 尚未開放");
      return;
    }

    closePaymentMethodModal();
    navigate(`/customer/orders/${selectedOrder.orderId}/payment?method=bank-transfer`);
  }

  function closeQtyLimitModal() {
    setQtyLimitModal({ open: false, maxAllowed: null });
  }

  function startEditQty(order: OrderSummary) {
    const currentQty = getOrderQtyNumber(order) ?? 1;
    setEditingOrderId(order.orderId);
    setEditingQty(String(currentQty));
    setActionMessage(null);
    closeQtyLimitModal();
  }

  function cancelEditQty() {
    setEditingOrderId(null);
    setEditingQty("1");
    closeQtyLimitModal();
  }

  async function onSaveQty(order: OrderSummary) {
    if (updatingOrderId || deletingOrderId) return;

    const nextQty = Number(editingQty);
    if (!Number.isInteger(nextQty) || nextQty < 1) {
      setActionMessage("數量必須為大於 0 的整數");
      return;
    }

    const maxEditableQty = getOrderMaxEditableQty(order, sellWindowById);
    if (maxEditableQty != null && nextQty > maxEditableQty) {
      setActionMessage(null);
      setEditingQty(String(maxEditableQty));
      setQtyLimitModal({ open: true, maxAllowed: maxEditableQty });
      return;
    }

    // 顯示確認 modal 而不是直接修改
    setConfirmQtyModal({ open: true, order, newQty: nextQty });
  }

  async function onConfirmQtyChange() {
    const { order, newQty } = confirmQtyModal;
    if (!order || newQty === null) return;

    setUpdatingOrderId(order.orderId);
    setActionMessage(null);
    try {
      await orderApi.updateOrderQty(order.orderId, newQty);
      const unitPrice = Number(productById[order.productId]?.unitPriceCents);

      setItems((prev) =>
        prev.map((it) => {
          if (it.orderId !== order.orderId) return it;
          return {
            ...it,
            qty: newQty,
            totalAmountCents: Number.isFinite(unitPrice) ? unitPrice * newQty : it.totalAmountCents,
          };
        })
      );
      setEditingOrderId(null);
      setConfirmQtyModal({ open: false, order: null, newQty: null });
      setActionMessage("訂單數量已更新");
      closeQtyLimitModal();
    } catch (e: any) {
      console.error(e);
      const message = e?.response?.data?.message ?? e?.message ?? "修改數量失敗";
      if (typeof message === "string" && /(最大|max|exceed|quota|額滿)/i.test(message)) {
        setQtyLimitModal({
          open: true,
          maxAllowed: getOrderMaxEditableQty(order, sellWindowById),
        });
      }
      setActionMessage(message);
      setConfirmQtyModal({ open: false, order: null, newQty: null });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function closeConfirmQtyModal() {
    setConfirmQtyModal({ open: false, order: null, newQty: null });
  }

  if (loading) return <div className="myorders-hint">載入中...</div>;

  
  return (
    <div className="page-container myorders-page">
      <div className="myorders-head">
        <h2>我的訂單</h2>
        <span>最近下單與付款資訊一覽</span>
      </div>

      {error && <div className="myorders-error">{error}</div>}
      {!error && actionMessage && <div className="myorders-error">{actionMessage}</div>}

      {!error && items.length === 0 && <div className="myorders-hint">目前尚無訂單，先去商品頁看看吧。</div>}

      {!error && items.length > 0 && (
        <div className="myorders-tabs" role="tablist" aria-label="訂單狀態篩選">
          {ORDER_STATUS_TABS.map((tab) => {
            const isActive = activeStatusTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`myorders-tab${isActive ? " is-active" : ""}`}
                onClick={() => setActiveStatusTab(tab)}
              >
                <span>{getOrderStatusFilterLabel(tab)}</span>
                <strong>{tabOrderCounts[tab]}</strong>
              </button>
            );
          })}
        </div>
      )}

      {!error && items.length > 0 && filteredItems.length === 0 && (
        <div className="myorders-hint">此狀態目前沒有訂單。</div>
      )}

      <div className="myorders-grid">
        {filteredItems.map((o) => (
          <article key={o.orderId} className="myorders-card">
            <div className="myorders-card-main">
              <div className="myorders-thumb-wrap">
                {thumbnailByProductId[o.productId] ? (
                  <img
                    src={thumbnailByProductId[o.productId]}
                    alt={`${o.productName}-thumbnail`}
                    className="myorders-thumb"
                  />
                ) : (
                  <span className="myorders-thumb-empty">暫無圖片</span>
                )}
              </div>

              <div className="myorders-content">
                <div className="myorders-title-row">
                  <div className="myorders-title">{productById[o.productId]?.name || o.productName}</div>
                  <span className={`myorders-status ${getOrderStatusClassName(o.status)}`}>
                    {getOrderStatusLabel(o.status)}
                  </span>
                </div>
                <div className="myorders-id">orderId: {o.orderId}</div>

                <div className="myorders-metrics">
                  <div className="myorders-metric">
                    <div className="myorders-metric-label">下單總金額</div>
                    <div className="myorders-metric-value is-price">
                      {formatPrice(getOrderTotalAmountCents(o), productById[o.productId]?.currency ?? "TWD")}
                    </div>
                  </div>

                  <div className="myorders-metric">
                    <div className="myorders-metric-label">付款截止日期</div>
                    <div className="myorders-metric-value">{formatDateTime(getOrderPaymentDueAt(o))}</div>
                  </div>

                  <div className="myorders-metric">
                    <div className="myorders-metric-label">下單時間</div>
                    <div className="myorders-metric-value">{formatDateTime(getOrderCreatedAt(o))}</div>
                  </div>
                </div>

                <div className="myorders-meta-grid">
                  <div className="myorders-qty-row">
                    <span>數量：</span>
                    {editingOrderId === o.orderId ? (
                      <span className="myorders-qty-editor">
                        <input
                          type="number"
                          min={1}
                          max={getOrderMaxEditableQty(o, sellWindowById) ?? undefined}
                          step={1}
                          value={editingQty}
                          onChange={(e) => setEditingQty(e.target.value)}
                          className="myorders-qty-input"
                        />
                        <button
                          type="button"
                          onClick={() => void onSaveQty(o)}
                          disabled={updatingOrderId === o.orderId}
                          className="myorders-qty-save-btn"
                        >
                          {updatingOrderId === o.orderId ? "儲存中..." : "儲存"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditQty}
                          disabled={updatingOrderId === o.orderId}
                          className="myorders-qty-cancel-btn"
                        >
                          取消
                        </button>
                      </span>
                    ) : (
                      <>
                        <strong>{getOrderQty(o)}</strong>
                        <button
                          type="button"
                          onClick={() => startEditQty(o)}
                          disabled={o.status !== "RESERVED" || deletingOrderId === o.orderId || updatingOrderId === o.orderId}
                          className="myorders-qty-edit-btn"
                        >
                          修改數量
                        </button>
                        {o.status !== "RESERVED" && <span className="myorders-qty-hint">僅已預約可修改</span>}
                      </>
                    )}
                  </div>
                  <div>商品價格：{formatPrice(productById[o.productId]?.unitPriceCents, productById[o.productId]?.currency)}</div>
                  <div>
                    販售起訖：
                    {formatDateTime(sellWindowById[o.sellWindowId]?.startAt)} ~ {formatDateTime(sellWindowById[o.sellWindowId]?.endAt)}
                  </div>
                </div>

                <div className="myorders-actions">
                  {o.status === "PAYMENT_REQUESTED" && (
                    <button
                      type="button"
                      onClick={() => void onPayOrder(o)}
                      disabled={
                        deletingOrderId === o.orderId
                        || updatingOrderId === o.orderId
                        || payingOrderId === o.orderId
                        || payingOrderId === "__paypal_capture__"
                      }
                      className="myorders-pay-btn"
                      title="選擇付款方式"
                    >
                      付款
                    </button>
                  )}

                  {o.status === "PAID" && (
                    <Link to={`/customer/orders/${o.orderId}/payment`} className="myorders-payment-link">
                      查看付款資訊
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => void onDeleteOrder(o)}
                    disabled={deletingOrderId === o.orderId || updatingOrderId === o.orderId || payingOrderId === o.orderId}
                    className="myorders-delete-btn"
                  >
                    {deletingOrderId === o.orderId ? "刪除中..." : "刪除訂單"}
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {paymentMethodModal.open && paymentMethodModal.order && (
        <div className="myorders-modal-backdrop" onClick={closePaymentMethodModal}>
          <div
            className="myorders-modal myorders-payment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="myorders-payment-method-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="myorders-modal-kicker">付款方式</div>
            <h3 id="myorders-payment-method-title" className="myorders-modal-title">
              選擇付款方式
            </h3>
            <p className="myorders-modal-body">
              請為訂單 <strong>{paymentMethodModal.order.orderId}</strong> 選擇付款方式。
              目前僅開放 <strong>銀行轉帳</strong>。
            </p>

            <div className="myorders-payment-methods">
              <button
                type="button"
                className="myorders-payment-method-btn is-available"
                onClick={() => onSelectPaymentMethod("BANK_TRANSFER")}
              >
                <strong>銀行轉帳</strong>
                <span>目前開放，可查看匯款資訊並完成付款</span>
              </button>

              <button
                type="button"
                className="myorders-payment-method-btn"
                onClick={() => onSelectPaymentMethod("PAYPAL")}
                disabled
              >
                <strong>PayPal</strong>
                <span>尚未開放</span>
              </button>

              <button
                type="button"
                className="myorders-payment-method-btn"
                onClick={() => onSelectPaymentMethod("ECPAY")}
                disabled
              >
                <strong>綠界 EcPay</strong>
                <span>尚未開放</span>
              </button>
            </div>

            <div className="myorders-modal-actions">
              <button type="button" onClick={closePaymentMethodModal} className="myorders-modal-btn">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {qtyLimitModal.open && (
        <div className="myorders-modal-backdrop" onClick={closeQtyLimitModal}>
          <div
            className="myorders-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="myorders-qty-limit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="myorders-modal-kicker">數量提醒</div>
            <h3 id="myorders-qty-limit-title" className="myorders-modal-title">
              無法修改
            </h3>
            <p className="myorders-modal-body">
              已經超過最大量。
              {qtyLimitModal.maxAllowed != null && (
                <>
                  {" "}目前最多可修改為 <strong>{qtyLimitModal.maxAllowed}</strong>。
                </>
              )}
            </p>
            <div className="myorders-modal-actions">
              <button type="button" onClick={closeQtyLimitModal} className="myorders-modal-btn">
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmQtyModal.open && confirmQtyModal.order && confirmQtyModal.newQty !== null && (
        <div className="myorders-modal-backdrop" onClick={closeConfirmQtyModal}>
          <div
            className="myorders-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="myorders-confirm-qty-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="myorders-modal-kicker">確認修改</div>
            <h3 id="myorders-confirm-qty-title" className="myorders-modal-title">
              確認修改數量？
            </h3>
            <p className="myorders-modal-body">
              商品：<strong>{productById[confirmQtyModal.order.productId]?.name || confirmQtyModal.order.productName}</strong>
            </p>

            <div style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 12,
              padding: "16px",
              marginBottom: 24,
              fontSize: 14,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: "#aaa" }}>
                <span>原數量</span>
                <span style={{ color: "#e7dfd2", fontWeight: 600 }}>{getOrderQtyNumber(confirmQtyModal.order)}</span>
              </div>
              <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "8px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", color: "#aaa" }}>
                <span>新數量</span>
                <span style={{ color: "#c9b97a", fontWeight: 600 }}>{confirmQtyModal.newQty}</span>
              </div>
              <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "8px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#aaa" }}>新單價</span>
                <span style={{ color: "#f0c75c", fontWeight: 700, fontSize: 16 }}>
                  {formatPrice((productById[confirmQtyModal.order.productId]?.unitPriceCents || 0) * confirmQtyModal.newQty, productById[confirmQtyModal.order.productId]?.currency)}
                </span>
              </div>
            </div>

            <p style={{
              margin: "0 0 24px 0",
              color: "#8b7562",
              fontSize: 12,
              lineHeight: 1.5,
            }}>
              修改後的金額將被更新。如已付款將依新金額進行結算。
            </p>

            <div className="myorders-modal-actions" style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={closeConfirmQtyModal}
                disabled={updatingOrderId === confirmQtyModal.order.orderId}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  background: "transparent",
                  color: "#c9b97a",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={onConfirmQtyChange}
                disabled={updatingOrderId === confirmQtyModal.order.orderId}
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
                  opacity: updatingOrderId === confirmQtyModal.order.orderId ? 0.6 : 1,
                }}
              >
                {updatingOrderId === confirmQtyModal.order.orderId ? "修改中..." : "確認修改"}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="myorders-note">
        ※ Order 收到 batch.confirmed 後會把 RESERVED → PAYMENT_REQUESTED，並設定 payment_due_at
      </p>
    </div>
  );
}