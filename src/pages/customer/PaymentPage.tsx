import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { paymentApi } from "../../api/paymentApi";
import type { PaymentInfo } from "../../types/domain";

export default function PaymentPage() {
  const { orderId } = useParams();
  const [data, setData] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    paymentApi
      .getPaymentByOrder(orderId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <div>載入中...</div>;
  if (!data) return <div>找不到付款資訊（可能尚未開放付款，或 payment 尚未 created）</div>;

  return (
    <div>
      <h2>付款資訊</h2>
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <div>paymentId：{data.paymentId}</div>
        <div>provider：{data.provider}</div>
        <div>status：{data.status}</div>
        <div>expireAt：{new Date(data.expireAt).toLocaleString()}</div>
      </div>

      <h3 style={{ marginTop: 16 }}>payInfo</h3>
      <pre style={{ background: "#fafafa", padding: 12, borderRadius: 12, overflow: "auto" }}>
        {JSON.stringify(data.payInfo, null, 2)}
      </pre>

      <p style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
        ※ 對應：payment.created 後 NOTI 發送繳費資訊；前端也可用此頁查詢
      </p>
    </div>
  );
}