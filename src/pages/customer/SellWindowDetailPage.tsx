import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { catalogApi } from "../../api/catalogApi";
import { orderApi } from "../../api/orderApi";
import type { SellWindowSummary } from "../../types/domain";

export default function SellWindowDetailPage() {
  const { sellWindowId } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<SellWindowSummary | null>(null);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!sellWindowId) return;
    catalogApi.getSellWindow(sellWindowId).then(setData);
  }, [sellWindowId]);

  async function onReserve() {
    if (!data) return;
    setMsg(null);
    try {
      const res = await orderApi.reserveOrder({
        sellWindowId: data.sellWindowId,
        productId: data.productId,
        qty,
      });
      nav(`/customer/orders`);
      // 也可以 nav 到訂單詳情頁（你若要做）
      console.log("reserved orderId:", res.orderId);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) setMsg("名額不足或已關閉（409）");
      else setMsg("預約失敗，請稍後再試");
    }
  }

  if (!data) return <div>載入中...</div>;

  return (
    <div>
      <h2>檔期詳情 / 預約下單</h2>

      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{data.productName}</div>
        <div style={{ color: "#666", fontSize: 12 }}>sellWindowId: {data.sellWindowId}</div>
        <div style={{ marginTop: 8 }}>
          狀態：{data.status} / 名額：{data.soldQty}/{data.maxQty} / 最少到量：{data.minQty}
        </div>
        <div style={{ color: "#666", fontSize: 12, marginTop: 6 }}>
          接單截止：{new Date(data.orderCloseAt).toLocaleString()}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <label>數量：</label>
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          style={{ width: 120, padding: 8 }}
        />
        <button onClick={onReserve} style={{ padding: "8px 12px", borderRadius: 10 }}>
          預約下單（RESERVED）
        </button>
      </div>

      {msg && <div style={{ marginTop: 12, color: "crimson" }}>{msg}</div>}

      <p style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
        ※ 這顆按鈕對應：Order 以 sell_window_quota FOR UPDATE 做 sold_qty += qty，成功後發 order.reserved
      </p>
    </div>
  );
}