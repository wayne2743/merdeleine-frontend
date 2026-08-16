import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { catalogApi } from "../../api/catalogApi";
import { orderApi } from "../../api/orderApi";
import { paymentApi } from "../../api/paymentApi";
import { useAuth } from "../../auth/AuthProvider";
import type { OrderSummary, PaymentInfo } from "../../types/domain";

export type CheckoutRouteState = {
  checkout?: {
    productName: string;
    unitPriceCents: number;
    currency: string;
    qty: number;
    totalAmountCents: number;
    paymentDueAt?: string | null;
    paymentId?: string | null;
  };
};

type CheckoutSummary = NonNullable<CheckoutRouteState["checkout"]>;

function getErrorMessage(error: unknown, fallback: string): string {
  const value = error as {
    response?: { data?: { message?: string; error?: string } | string };
    message?: string;
  };
  const responseData = value?.response?.data;
  return (
    (typeof responseData === "object" ? responseData?.message ?? responseData?.error : null)
    ?? (typeof responseData === "string" ? responseData : null)
    ?? value?.message
    ?? fallback
  );
}

function getOrderQty(order: OrderSummary): number {
  const raw = order.qty ?? (order as OrderSummary & { quantity?: number }).quantity;
  return Number.isFinite(raw) ? Number(raw) : 1;
}

function getOrderUnitPrice(order: OrderSummary): number | null {
  const value = order as OrderSummary & { unitPriceCents?: number; unit_price_cents?: number };
  const raw = value.unitPriceCents ?? value.unit_price_cents;
  return Number.isFinite(raw) ? Number(raw) : null;
}

function getOrderTotal(order: OrderSummary): number | null {
  const value = order as OrderSummary & { total_amount_cents?: number };
  const raw = order.totalAmountCents ?? value.total_amount_cents;
  return Number.isFinite(raw) ? Number(raw) : null;
}

function getOrderDueAt(order: OrderSummary): string | null {
  const value = order as OrderSummary & { payment_due_at?: string };
  return order.paymentDueAt ?? value.payment_due_at ?? null;
}

function formatPrice(amount?: number | null, currency = "TWD"): string {
  if (!Number.isFinite(amount)) return "-";
  return `${currency} ${Number(amount).toLocaleString("zh-TW")}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "尚未設定";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "尚未設定" : date.toLocaleString("zh-TW");
}

function getPaymentExpireAt(preferred?: string | null): string {
  const preferredDate = preferred ? new Date(preferred) : null;
  if (preferredDate && !Number.isNaN(preferredDate.getTime()) && preferredDate.getTime() > Date.now()) {
    return preferredDate.toISOString();
  }
  return new Date(Date.now() + 30 * 60 * 1000).toISOString();
}

export default function PaymentPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const { user, status } = useAuth();
  const routeSummary = (location.state as CheckoutRouteState | null)?.checkout ?? null;
  const routePaymentId = routeSummary?.paymentId ?? null;

  const [summary, setSummary] = useState<CheckoutSummary | null>(routeSummary);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(!routeSummary);
  const [paymentLoading, setPaymentLoading] = useState(!routePaymentId);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setMessage("找不到訂單編號");
      return;
    }

    let active = true;
    if (!routePaymentId) setPaymentLoading(true);
    void paymentApi.ensureNewebPayPayment(orderId, getPaymentExpireAt(routeSummary?.paymentDueAt))
      .then((result) => {
        if (active) setPayment(result);
      })
      .catch((error: unknown) => {
        const statusCode = (error as { response?: { status?: number } })?.response?.status;
        if (!active) return;
        if (statusCode === 404) {
          if (!routePaymentId) setMessage("此訂單的付款資料尚未建立，請稍後重新整理再試");
        } else {
          console.warn("讀取付款狀態失敗", error);
          setMessage(getErrorMessage(error, "暫時無法取得付款資料"));
        }
      })
      .finally(() => {
        if (active) setPaymentLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId, routePaymentId, routeSummary?.paymentDueAt]);

  useEffect(() => {
    if (!orderId || status !== "authenticated" || !user?.id) {
      if (status !== "loading") setLoading(false);
      return;
    }

    const customerId = user.id;
    let active = true;
    async function loadSummary() {
      try {
        const [orders, products] = await Promise.all([
          orderApi.myOrders(customerId),
          catalogApi.listProducts(),
        ]);
        if (!active) return;
        const order = orders.find((item) => item.orderId === orderId);
        if (!order) return;

        const product = products.find((item) => item.id === order.productId);
        const qty = getOrderQty(order);
        const unitPriceCents = getOrderUnitPrice(order) ?? Number(product?.unitPriceCents ?? 0);
        const currency = (order as OrderSummary & { currency?: string }).currency ?? product?.currency ?? "TWD";
        const totalAmountCents = getOrderTotal(order) ?? unitPriceCents * qty;
        setSummary({
          productName: order.productName || product?.name || "訂購商品",
          unitPriceCents,
          currency,
          qty,
          totalAmountCents,
          paymentDueAt: getOrderDueAt(order),
        });
      } catch (error) {
        console.warn("讀取結帳訂單摘要失敗", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSummary();
    return () => {
      active = false;
    };
  }, [orderId, status, user?.id]);

  const isPaid = payment?.status === "SUCCEEDED";
  const checkoutPaymentId = payment?.paymentId || routePaymentId;

  function onCheckout() {
    if (!checkoutPaymentId) {
      setMessage("尚未取得付款編號，請稍後重新整理再試");
      return;
    }
    window.location.assign(paymentApi.getNewebPayCheckoutUrl(checkoutPaymentId));
  }

  if (loading) return <div className="payment-loading">結帳資料載入中...</div>;

  return (
    <div className="page-container checkout-page">
      <header className="checkout-header">
        <Link to="/customer/orders" className="checkout-back-link">← 返回訂單</Link>
        <div className="checkout-heading">
          <div className="checkout-kicker">SECURE CHECKOUT</div>
          <h2>安心結帳</h2>
          <p>目前僅支援信用卡付款，將由藍新金流安全頁面完成交易。</p>
        </div>
        <div className="checkout-secure-badge" aria-label="安全加密付款">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="10" width="14" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          SSL 安全加密
        </div>
      </header>

      {message && (
        <div className={`checkout-banner${isPaid ? " is-success" : ""}`} role="status">
          {message}
        </div>
      )}

      {isPaid ? (
        <section className="checkout-success-card">
          <div className="checkout-success-icon" aria-hidden="true">✓</div>
          <div className="checkout-kicker">PAYMENT COMPLETE</div>
          <h2>付款完成</h2>
          <p>感謝你的訂購，我們已收到這筆信用卡付款。</p>
          <Link to="/customer/orders" className="checkout-primary-link">查看我的訂單</Link>
        </section>
      ) : (
        <div className="checkout-layout">
          <main className="checkout-card checkout-payment-card">
            <div className="checkout-section-head">
              <div>
                <span className="checkout-step">付款方式</span>
                <h3>信用卡</h3>
              </div>
              <div className="checkout-card-brands" aria-label="支援 Visa、Mastercard、JCB">
                <span>VISA</span><span>Mastercard</span><span>JCB</span>
              </div>
            </div>

            <div className="checkout-method-selected">
              <span className="checkout-radio" aria-hidden="true" />
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="2.5" y="5" width="19" height="14" rx="2" />
                <path d="M2.5 10h19" />
              </svg>
              <div>
                <strong>信用卡付款</strong>
                <small>支援台灣及國際發行信用卡</small>
              </div>
            </div>

            <div className="checkout-form">
              <div className="checkout-gateway-panel">
                <div className="checkout-gateway-logo" aria-hidden="true">藍新</div>
                <div>
                  <strong>前往藍新金流安全付款</strong>
                  <p>下一步將離開本頁，請在藍新金流頁面輸入信用卡資料並完成 3D 驗證。</p>
                </div>
              </div>

              <div className="checkout-security-note">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.8 3.2 8 7.5 9.5 4.3-1.5 7.5-4.7 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-4" /></svg>
                信用卡號與安全碼只會提供給藍新金流，本網站不會接觸或儲存完整卡片資料。
              </div>

              <button
                type="button"
                className="checkout-submit"
                onClick={onCheckout}
                disabled={paymentLoading || !checkoutPaymentId}
              >
                {paymentLoading
                  ? "付款資料載入中…"
                  : checkoutPaymentId
                    ? `前往付款 ${formatPrice(summary?.totalAmountCents, summary?.currency)}`
                    : "尚未開放付款"}
              </button>
              <p className="checkout-agreement">按下前往付款即表示你同意本店的訂購與退款政策。</p>
            </div>
          </main>

          <aside className="checkout-card checkout-summary-card">
            <span className="checkout-step">訂單摘要</span>
            <h3>{summary?.productName ?? "訂購商品"}</h3>
            <div className="checkout-summary-lines">
              <div><span>商品單價</span><strong>{formatPrice(summary?.unitPriceCents, summary?.currency)}</strong></div>
              <div><span>數量</span><strong>{summary?.qty ?? "-"}</strong></div>
              <div><span>取貨方式</span><strong>依訂單設定</strong></div>
              {summary?.paymentDueAt && <div><span>付款期限</span><strong>{formatDateTime(summary.paymentDueAt)}</strong></div>}
            </div>
            <div className="checkout-total"><span>應付金額</span><strong>{formatPrice(summary?.totalAmountCents, summary?.currency)}</strong></div>
            <p className="checkout-order-number">訂單編號<br /><strong>{orderId ?? "-"}</strong></p>
          </aside>
        </div>
      )}
    </div>
  );
}
