import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { orderApi } from "../../api/orderApi";
import type { OrderSummary } from "../../types/domain";

export default function MyOrdersPage() {
  const [items, setItems] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi
      .myOrders()
      .then(setItems)
      .catch((e) => {
        console.error(e);
        setItems([]);
        // 你可以 setError 狀態顯示在畫面上
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>載入中...</div>;

  
  return (
    <div>
      <h2>我的訂單</h2>
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((o) => (
          <div key={o.orderId} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{o.productName}</div>
            <div style={{ fontSize: 12, color: "#666" }}>orderId: {o.orderId}</div>
            <div>數量：{o.qty}</div>
            <div>狀態：{o.status}</div>
            {o.paymentDueAt && <div style={{ fontSize: 12, color: "#666" }}>付款截止：{new Date(o.paymentDueAt).toLocaleString()}</div>}
            <div style={{ marginTop: 8 }}>
              <Link to={`/customer/orders/${o.orderId}/payment`}>查看付款資訊</Link>
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
        ※ Order 收到 batch.confirmed 後會把 RESERVED → PAYMENT_REQUESTED，並設定 payment_due_at
      </p>
    </div>
  );
}