import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { catalogApi } from "../../api/catalogApi";
import { orderApi } from "../../api/orderApi";
import type { ProductSellWindowView } from "../../types/domain";

type RouteState = {
  item?: ProductSellWindowView;
};

type ReserveForm = {
  quantity: number;          // 你原本的 qty
  currency: string;          // e.g. "TWD"
  unitPriceCents: number;    // e.g. 12000
  customerId: string;        // UUID string
};

export default function SellWindowDetailPage() {
  const { productSellWindowId } = useParams();
  const nav = useNavigate();
  const location = useLocation();

  const seeded = (location.state as RouteState | null)?.item;

  const [data, setData] = useState<ProductSellWindowView | null>(seeded ?? null);
  // const [qty, setQty] = useState(1);

  // ✅ 用一個 form state 管所有欄位
  const [form, setForm] = useState<ReserveForm>({
    quantity: 1,
    currency: "TWD",
    unitPriceCents: 0,
    customerId: "",
  });

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

  async function onReserve() {
    if (!data) return;
    setMsg(null);

    // 簡單前端防呆
    // ✅ 簡單前端防呆（對應你貼的 validation）
    if (!Number.isFinite(form.quantity) || form.quantity <= 0) {
      setMsg("quantity 必須大於 0");
      return;
    }
    if (!form.currency.trim()) {
      setMsg("currency 不可空白");
      return;
    }
    if (!Number.isFinite(form.unitPriceCents)) {
      setMsg("unitPriceCents 必須是數字");
      return;
    }
    if (!form.customerId.trim()) {
      setMsg("customerId 不可空白");
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

        // ✅ 新增的欄位一起送
        quantity: form.quantity,
        currency: form.currency.trim(),
        unitPriceCents: form.unitPriceCents,
        customerId: form.customerId.trim(),
      });

      nav(`/customer/orders`);
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

        <div style={{ color: "#666", fontSize: 12 }}>
          sellWindowId: {String(data.sellWindowId)}
        </div>

        <div style={{ marginTop: 8 }}>
          狀態：{data.quotaStatus} / 名額：{data.soldQty}/{data.maxQty ?? "-"} / 最少到量：
          {data.minQty}
        </div>

        <div style={{ color: "#666", fontSize: 12, marginTop: 6 }}>
          檔期：{new Date(data.startAt).toLocaleString()} ~ {new Date(data.endAt).toLocaleString()}
          {"  "}
          ({data.timezone})
        </div>

        <div style={{ color: "#666", fontSize: 12, marginTop: 6 }}>
          付款截止：{data.paymentCloseAt ? new Date(data.paymentCloseAt).toLocaleString() : "-"}
        </div>

        <div style={{ color: "#666", fontSize: 12, marginTop: 6 }}>
          quotaUpdatedAt：{data.quotaUpdatedAt ? new Date(data.quotaUpdatedAt).toLocaleString() : "-"}
        </div>
      </div>

      {/* <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
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
      </div> */}
      <div style={{ marginTop: 16, display: "grid", gap: 12, maxWidth: 520 }}>
        {/* quantity */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ width: 110 }}>數量：</label>
          <input
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) =>
              setForm((p) => ({ ...p, quantity: Number(e.target.value) }))
            }
            style={{ width: 200, padding: 8 }}
          />
        </div>

        {/* currency */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ width: 110 }}>幣別：</label>
          <input
            type="text"
            value={form.currency}
            onChange={(e) =>
              setForm((p) => ({ ...p, currency: e.target.value }))
            }
            placeholder="例如 TWD"
            style={{ width: 200, padding: 8 }}
          />
        </div>

        {/* unitPriceCents */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ width: 110 }}>單價(分)：</label>
          <input
            type="number"
            min={0}
            value={form.unitPriceCents}
            onChange={(e) =>
              setForm((p) => ({ ...p, unitPriceCents: Number(e.target.value) }))
            }
            placeholder="例如 12000"
            style={{ width: 200, padding: 8 }}
          />
        </div>

        {/* customerId */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={{ width: 110 }}>客戶ID：</label>
          <input
            type="text"
            value={form.customerId}
            onChange={(e) =>
              setForm((p) => ({ ...p, customerId: e.target.value }))
            }
            placeholder="UUID"
            style={{ width: 360, padding: 8 }}
          />
        </div>

        <div>
          <button
            onClick={onReserve}
            style={{ padding: "8px 12px", borderRadius: 10 }}
          >
            預約下單（RESERVED）
          </button>
        </div>
      </div>


      {msg && <div style={{ marginTop: 12, color: "crimson" }}>{msg}</div>}

      <p style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
        ※ 對應：Order 以 sell_window_quota FOR UPDATE 做 sold_qty += qty，成功後發 order.reserved
      </p>
    </div>
  );
}