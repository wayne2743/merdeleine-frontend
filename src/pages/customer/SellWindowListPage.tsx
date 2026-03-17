import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { catalogApi } from "../../api/catalogApi";
import type { ProductSellWindowView } from "../../types/domain";

const PAGE_SIZE = 10;

function fmt(dt?: string | null) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return String(dt);
  }
}

export default function SellWindowListPage() {
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<ProductSellWindowView[]>([]);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [total]);

  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await catalogApi.pageProductSellWindows(page, PAGE_SIZE);
        if (cancelled) return;

        setItems(resp.items ?? []);
        setTotal(resp.total ?? 0);
      } catch (e: any) {
        if (cancelled) return;
        console.error(e);
        setError(e?.message ?? "載入失敗");
        setItems([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [page]);

  useEffect(() => {
    if (page > 0 && page >= totalPages) {
      setPage(totalPages - 1);
    }
  }, [totalPages, page]);

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 6, color: "#f2dfad", letterSpacing: 0.3 }}>可預約檔期</h2>
      <div style={{ fontSize: 12, color: "#eadfbd", marginBottom: 12 }}>
        顯示 {total === 0 ? 0 : page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} / 共 {total} 筆
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={!canPrev || loading}>
          上一頁
        </button>

        <div style={{ fontSize: 12, color: "#eadfbd" }}>
          第 {page + 1} / {totalPages} 頁
        </div>

        <button onClick={() => setPage((p) => p + 1)} disabled={!canNext || loading}>
          下一頁
        </button>

        <button onClick={() => setPage(0)} disabled={page === 0 || loading} style={{ marginLeft: 8 }}>
          回到第一頁
        </button>

        <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1 || loading}>
          跳到最後頁
        </button>
      </div>

      {loading && <div>載入中...</div>}
      {error && <div style={{ color: "#b00020", marginBottom: 12 }}>取得資料失敗：{error}</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((it) => (
          <div
            key={it.productSellWindowId}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 12,
              background: "#fff",
            }}
          >
            <div className="sellwindow-card-top">
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#4a321f" }}>{it.productName}</div>
                <div style={{ fontSize: 12, color: "#5f4a38", marginTop: 2 }}>
                  檔期：{it.sellWindowName}（{it.timezone}）
                </div>
              </div>

              <div style={{ textAlign: "right", fontSize: 12, color: "#5f4a38" }}>
                <div>Quota：{it.quotaStatus}</div>
                <div>
                  名額：{it.soldQty}/{it.maxQty ?? "-"}（最少 {it.minQty}）
                </div>
                <div style={{ marginTop: 6 }}>
                  售價：{it.unitPriceCents} {it.currency}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 4, fontSize: 12, color: "#6c5642" }}>
              <div>接單起訖：{fmt(it.startAt)} ～ {fmt(it.endAt)}</div>
              <div>付款截止：{fmt(it.paymentCloseAt)}</div>
              <div>Quota更新：{fmt(it.quotaUpdatedAt)}</div>
            </div>

            <div style={{ marginTop: 10 }}>
              <Link to={`/customer/sell-windows/${it.productSellWindowId}`}>查看 / 預約</Link>
            </div>
          </div>
        ))}

        {!loading && !error && items.length === 0 && <div style={{ color: "#eadfbd" }}>目前沒有資料</div>}
      </div>
    </div>
  );
}
