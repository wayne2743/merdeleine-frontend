import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { catalogApi } from "../../api/catalogApi";
import type { Product, AutoGroupOrderRequest } from "../../types/domain";

export default function CustomerProductsPage() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  // modal state
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);

  const [qty, setQty] = useState(1);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");

  const canSubmit = useMemo(() => {
    return !!selected && Number.isFinite(qty) && qty >= 1;
  }, [selected, qty]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await catalogApi.listProducts();
        if (cancelled) return;
        setProducts(data ?? []);
      } catch (e: any) {
        if (cancelled) return;
        console.error(e);
        setError(e?.message ?? "載入商品失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function openModal(p: Product) {
    setSelected(p);
    setQty(1);
    setContactName("");
    setContactPhone("");
    setContactEmail("");
    setShippingAddress("");
    setOpen(true);
  }

  async function submit() {
    if (!selected) return;

    const payload: AutoGroupOrderRequest = {
      productId: selected.id,
      qty,
      contactName: contactName || undefined,
      contactPhone: contactPhone || undefined,
      contactEmail: contactEmail || undefined,
      shippingAddress: shippingAddress || undefined,
    };

    try {
      const resp = await catalogApi.autoGroupOrder(payload);
      // 你可以導到訂單頁；你若還沒做訂單頁，也可以先 alert
      alert(`已發起開團並預約成功！\norderId=${resp.orderId}\nsellWindowId=${resp.sellWindowId}`);
      setOpen(false);

      // 如果你有 MyOrders / OrderDetail 路由就導過去
      // nav(`/customer/orders/${resp.orderId}`);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "發起開團失敗");
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 6 }}>商品列表</h2>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
        選擇商品後可直接「發起開團 / 立即預約」，檔期時間由系統自動規劃。
      </div>

      {loading && <div>載入中...</div>}
      {error && <div style={{ color: "#b00020" }}>錯誤：{error}</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {products.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 12,
              background: "#fff",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                {p.description || "（無描述）"}
              </div>
              <div style={{ fontSize: 12, color: "#777", marginTop: 6 }}>
                狀態：{p.status}
              </div>
            </div>

            <button onClick={() => openModal(p)} disabled={p.status !== "ACTIVE"}>
              發起開團 / 立即預約
            </button>
          </div>
        ))}
      </div>

      {!loading && !error && products.length === 0 && (
        <div style={{ color: "#666" }}>目前沒有商品</div>
      )}

      {/* Modal（純 inline，先不引入 UI library） */}
      {open && selected && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: 12, padding: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>
              發起開團：{selected.name}
            </div>

            <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#555" }}>數量（必填）</span>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
            </label>

            <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#555" }}>聯絡人</span>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </label>

            <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#555" }}>電話</span>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </label>

            <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#555" }}>Email</span>
              <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </label>

            <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: "#555" }}>配送地址</span>
              <textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} />
            </label>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setOpen(false)}>取消</button>
              <button onClick={submit} disabled={!canSubmit}>
                確認發起
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}