import { useEffect, useState } from "react";
import { catalogApi } from "../../api/catalogApi";
import type { SellWindowSummary } from "../../types/domain";

export default function SellWindowAdminPage() {
  const [items, setItems] = useState<SellWindowSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    catalogApi
      .listSellWindows()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>載入中...</div>;

  return (
    <div>
      <h2>檔期管理</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
            <th style={{ padding: 8 }}>商品</th>
            <th style={{ padding: 8 }}>狀態</th>
            <th style={{ padding: 8 }}>名額</th>
            <th style={{ padding: 8 }}>接單截止</th>
            <th style={{ padding: 8 }}>付款截止</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.sellWindowId} style={{ borderBottom: "1px solid #f2f2f2" }}>
              <td style={{ padding: 8 }}>{it.productName}</td>
              <td style={{ padding: 8 }}>{it.status}</td>
              <td style={{ padding: 8 }}>
                {it.soldQty}/{it.maxQty}（min {it.minQty}）
              </td>
              <td style={{ padding: 8 }}>{new Date(it.orderCloseAt).toLocaleString()}</td>
              <td style={{ padding: 8 }}>{it.paymentCloseAt ? new Date(it.paymentCloseAt).toLocaleString() : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}