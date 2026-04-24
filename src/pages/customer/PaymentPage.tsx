import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { catalogApi } from "../../api/catalogApi";
import { orderApi } from "../../api/orderApi";
import { paymentApi } from "../../api/paymentApi";
import { useAuth } from "../../auth/AuthProvider";
import type { OrderSummary, PaymentInfo } from "../../types/domain";

function getErrorMessage(error: any, fallback: string): string {
  const rawMessage =
    error?.response?.data?.message
    ?? error?.response?.data?.error
    ?? (typeof error?.response?.data === "string" ? error.response.data : null)
    ?? error?.message;

  if (typeof rawMessage === "string" && /^not\s*found$/i.test(rawMessage.trim())) {
    return fallback;
  }

  return rawMessage ?? fallback;
}

function toDateTimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type PaymentOrderSummary = {
  productName: string | null;
  unitPriceCents: number | null;
  currency: string | null;
  qty: number | null;
  totalAmountCents: number | null;
  paymentDueAt: string | null;
};

function getOrderQtyNumber(order: OrderSummary): number | null {
  const raw = (order as OrderSummary & { quantity?: number }).qty ?? (order as OrderSummary & { quantity?: number }).quantity;
  return Number.isFinite(raw) ? Number(raw) : null;
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

function getOrderUnitPriceCents(order: OrderSummary): number | null {
  const raw = (order as OrderSummary & { unitPriceCents?: number; unit_price_cents?: number }).unitPriceCents
    ?? (order as OrderSummary & { unitPriceCents?: number; unit_price_cents?: number }).unit_price_cents;
  return Number.isFinite(raw) ? Number(raw) : null;
}

function getOrderCurrency(order: OrderSummary): string | null {
  const raw = (order as OrderSummary & { currency?: string | null }).currency;
  return typeof raw === "string" && raw.trim() ? raw : null;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("zh-TW");
}

function formatPrice(amount?: number | null, currency?: string | null): string {
  if (!Number.isFinite(amount)) return "-";
  return `${currency || "TWD"} ${Number(amount).toLocaleString()}`;
}

export default function PaymentPage() {
  const { orderId } = useParams();
  const { user, status } = useAuth();
  const [data, setData] = useState<PaymentInfo | null>(null);
  const [orderSummary, setOrderSummary] = useState<PaymentOrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [bankAccountLast5, setBankAccountLast5] = useState("");
  const [remittedAt, setRemittedAt] = useState(toDateTimeLocalValue(new Date()));
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const currentOrderId = orderId;
    let active = true;

    async function loadPaymentInfo(targetOrderId: string) {
      const payment = await paymentApi.getPaymentByOrder(targetOrderId);
      if (active) setData(payment);
    }

    async function init() {
      setLoading(true);
      try {
        await loadPaymentInfo(currentOrderId);
      } catch (e: any) {
        if (!active) return;
        console.error(e);

        if (e?.response?.status === 404) {
          setData(null);
          setMessage(null);
        } else {
          setMessage(getErrorMessage(e, "讀取付款資訊失敗，請稍後再試"));
          setData(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void init();

    return () => {
      active = false;
    };
  }, [orderId]);

  useEffect(() => {
    if (!orderId || status !== "authenticated" || !user?.id) {
      setOrderSummary(null);
      return;
    }

    const customerId = user.id;
    let active = true;

    async function loadOrderSummary() {
      try {
        const [ordersResult, productsResult] = await Promise.allSettled([
          orderApi.myOrders(customerId),
          catalogApi.listProducts(),
        ]);

        if (!active) return;

        const orders = ordersResult.status === "fulfilled" ? ordersResult.value : [];
        const products = productsResult.status === "fulfilled" ? productsResult.value : [];
        const order = orders.find((item) => item.orderId === orderId);

        if (!order) {
          setOrderSummary(null);
          return;
        }

        const product = products.find((item) => item.id === order.productId);
        const qty = getOrderQtyNumber(order);
        const unitPriceCents = getOrderUnitPriceCents(order)
          ?? (Number.isFinite(product?.unitPriceCents) ? Number(product?.unitPriceCents) : null);
        const currency = getOrderCurrency(order) ?? product?.currency ?? "TWD";
        const totalAmountCents = getOrderTotalAmountCents(order)
          ?? (Number.isFinite(unitPriceCents) && Number.isFinite(qty) ? Number(unitPriceCents) * Number(qty) : null);

        setOrderSummary({
          productName: order.productName || product?.name || null,
          unitPriceCents,
          currency,
          qty,
          totalAmountCents,
          paymentDueAt: getOrderPaymentDueAt(order),
        });
      } catch (e) {
        console.error(e);
        if (active) setOrderSummary(null);
      }
    }

    void loadOrderSummary();

    return () => {
      active = false;
    };
  }, [orderId, status, user?.id]);

  async function onSubmitBankTransferReport(e: FormEvent) {
    e.preventDefault();
    if (!orderId || submittingReport) return;

    const normalizedLast5 = bankAccountLast5.replace(/\D/g, "").slice(0, 5);
    if (normalizedLast5.length !== 5) {
      setMessage("請輸入匯款銀行帳號後 5 碼");
      return;
    }

    if (!remittedAt) {
      setMessage("請輸入匯款時間");
      return;
    }

    const remittedDate = new Date(remittedAt);
    if (Number.isNaN(remittedDate.getTime())) {
      setMessage("匯款時間格式不正確");
      return;
    }

    setSubmittingReport(true);
    setMessage(null);

    try {
      await paymentApi.submitBankTransferReport({
        orderId,
        bankAccountLast5: normalizedLast5,
        remittedAt: remittedDate.toISOString(),
      });

      setBankAccountLast5(normalizedLast5);
      setRemittedAt(toDateTimeLocalValue(remittedDate));

      try {
        const refreshedPayment = await paymentApi.getPaymentByOrder(orderId);
        setData(refreshedPayment);
      } catch (refreshError) {
        console.warn("refresh payment after bank transfer report failed", refreshError);
      }

      setMessage("已送出對帳資訊，請等待後台確認");
    } catch (e: any) {
      console.error(e);
      const status = e?.response?.status;
      if (status === 404 || status === 405 || status === 501) {
        setMessage("目前暫時無法送出至後端系統，已先保留你填寫的對帳資訊。");
      } else {
        setMessage(getErrorMessage(e, "送出對帳資訊失敗"));
      }
    } finally {
      setSubmittingReport(false);
    }
  }

  if (loading) return <div className="payment-loading">載入中...</div>;

  const isSuccessMessage = Boolean(message && /(已送出|成功|已複製)/.test(message));
  const displayCurrency = orderSummary?.currency ?? data?.currency ?? "TWD";
  const displayQty = Number.isFinite(orderSummary?.qty) ? Number(orderSummary?.qty) : null;
  const displayTotalAmount = orderSummary?.totalAmountCents ?? data?.amountCents ?? null;
  const displayUnitPrice = orderSummary?.unitPriceCents
    ?? (Number.isFinite(displayQty) && Number.isFinite(displayTotalAmount) && Number(displayQty) > 0
      ? Math.round(Number(displayTotalAmount) / Number(displayQty))
      : null);
  const displayPaymentDueAt = orderSummary?.paymentDueAt ?? data?.expireAt ?? null;
  const hasSubmittedBankTransferInfo = Boolean(data?.bankAccountLast5 && data?.remittedAt);

  return (
    <div className="page-container payment-page">
      <div className="payment-head">
        <div>
          <div className="payment-kicker">Bank Transfer</div>
          <h2>銀行轉帳付款資訊</h2>
          <p className="payment-subtitle">先確認訂單內容，再依下方帳號完成匯款與回填資料即可。</p>
        </div>
        <Link to="/customer/orders" className="payment-back-link">返回我的訂單</Link>
      </div>

      {message && (
        <div className={`payment-banner ${isSuccessMessage ? "is-success" : "is-neutral"}`}>
          {message}
        </div>
      )}

      <div className="payment-top-note">
        請在 <strong>{formatDateTime(displayPaymentDueAt)}</strong> 前完成匯款；完成後再送出對帳資訊，可加快後台確認速度。
      </div>

      <div className="payment-methods">
        <div className="payment-method-card is-active">
          <strong>銀行轉帳</strong>
          <span>目前開放，可直接依帳號資訊匯款</span>
        </div>
        <div className="payment-method-card is-disabled">
          <strong>PayPal</strong>
          <span>尚未開放</span>
        </div>
        <div className="payment-method-card is-disabled">
          <strong>綠界 EcPay</strong>
          <span>尚未開放</span>
        </div>
      </div>

      <section className="payment-card payment-order-card">
        <div className="payment-card-head">
          <div>
            <div className="payment-card-kicker">訂單摘要</div>
            <h3>此筆訂單相關資訊</h3>
          </div>
          <span className="payment-chip is-soft">付款前請再次確認</span>
        </div>

        <div className="payment-order-product">{orderSummary?.productName || "尚未取得商品名稱"}</div>

        <div className="payment-summary-grid">
          <div className="payment-summary-item">
            <span className="payment-summary-label">商品單價</span>
            <strong className="payment-summary-value">{formatPrice(displayUnitPrice, displayCurrency)}</strong>
          </div>
          <div className="payment-summary-item">
            <span className="payment-summary-label">數量</span>
            <strong className="payment-summary-value">{Number.isFinite(displayQty) ? Number(displayQty).toLocaleString() : "-"}</strong>
          </div>
          <div className="payment-summary-item is-highlight">
            <span className="payment-summary-label">下單總金額</span>
            <strong className="payment-summary-value">{formatPrice(displayTotalAmount, displayCurrency)}</strong>
          </div>
          <div className="payment-summary-item is-warning">
            <span className="payment-summary-label">付款截止日期</span>
            <strong className="payment-summary-value">{formatDateTime(displayPaymentDueAt)}</strong>
          </div>
        </div>
      </section>

      <aside className="payment-card payment-guide-card">
          <div className="payment-card-head">
            <div>
              <div className="payment-card-kicker">付款說明</div>
              <h3>如何完成付款？</h3>
            </div>
          </div>

          <ol className="payment-steps">
            <li>請依 Email 通知中的帳號資訊完成銀行轉帳。</li>
            <li>回填「銀行帳號後 5 碼」與「匯款時間」。</li>
            <li>等待後台對帳完成，系統會更新付款狀態。</li>
          </ol>

          <div className="payment-tip">
            若已完成匯款但狀態尚未更新，通常是因為仍在等待人工對帳。
          </div>
        </aside>

      {!hasSubmittedBankTransferInfo ? (
        <section className="payment-card payment-form-card">
          <div className="payment-card-head">
            <div>
              <div className="payment-card-kicker">步驟 2</div>
              <h3>提供對帳資訊</h3>
            </div>
            <span className="payment-chip is-soft">提交後可加速對帳</span>
          </div>

          <form onSubmit={onSubmitBankTransferReport} className="payment-form">
            <label className="payment-field">
              <span>銀行帳號後 5 碼</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={bankAccountLast5}
                onChange={(e) => setBankAccountLast5(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="請輸入 5 碼，例如 50193"
                required
              />
              <small>請填寫你匯出款項的來源帳號末 5 碼。</small>
            </label>

            <label className="payment-field">
              <span>匯款時間</span>
              <input
                type="datetime-local"
                value={remittedAt}
                onChange={(e) => setRemittedAt(e.target.value)}
                required
              />
              <small>請盡量填寫實際匯款完成時間，方便後台比對。</small>
            </label>

            <div className="payment-form-actions">
              <button type="submit" disabled={submittingReport} className="payment-submit-btn">
                {submittingReport ? "送出中..." : "送出對帳資訊"}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="payment-card payment-form-card">
          <div className="payment-card-head">
            <div>
              <div className="payment-card-kicker">步驟 2（已提交）</div>
              <h3>對帳資訊已送出</h3>
            </div>
            <span className="payment-chip is-soft">等待後台確認中</span>
          </div>

          <div className="payment-status-grid">
            <div>
              <span className="payment-info-label">銀行帳號後 5 碼</span>
              <strong className="payment-info-value">{data?.bankAccountLast5 || "-"}</strong>
            </div>
            <div>
              <span className="payment-info-label">匯款時間</span>
              <strong className="payment-info-value">{formatDateTime(data?.remittedAt)}</strong>
            </div>
          </div>
        </section>
      )}

      {!data && (
        <div className="payment-muted-note">
          目前尚未取得付款紀錄，但你仍可先完成銀行轉帳並填寫對帳資訊。
        </div>
      )}

      <p className="payment-footer-note">
        ※ 後端 API 尚未正式設計完成；前端已先預留送出欄位與呼叫位置。
      </p>
    </div>
  );
}