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
  const [page, setPage] = useState(0); // 0-based
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

        // 防呆：如果後端回的 page/size 跟前端不一致也沒關係，我們用前端的 PAGE_SIZE
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

  // 若 total 變小導致 page 超出範圍，拉回最後一頁
  useEffect(() => {
    if (page > 0 && page >= totalPages) {
      setPage(totalPages - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 6 }}>可預約檔期</h2>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
        顯示 {total === 0 ? 0 : page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} / 共 {total} 筆
      </div>

      {/* 分頁控制 */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={!canPrev || loading}
        >
          上一頁
        </button>

        <div style={{ fontSize: 12, color: "#444" }}>
          第 {page + 1} / {totalPages} 頁
        </div>

        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!canNext || loading}
        >
          下一頁
        </button>

        <button
          onClick={() => setPage(0)}
          disabled={page === 0 || loading}
          style={{ marginLeft: 8 }}
        >
          回到第一頁
        </button>

        <button
          onClick={() => setPage(totalPages - 1)}
          disabled={page === totalPages - 1 || loading}
        >
          跳到最後頁
        </button>
      </div>

      {loading && <div>載入中...</div>}
      {error && (
        <div style={{ color: "#b00020", marginBottom: 12 }}>
          取得資料失敗：{error}
        </div>
      )}

      {/* 列表 */}
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((it) => (
          <div
            key={`${it.sellWindowId}:${it.productId}`}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 12,
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{it.productName}</div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                  檔期：{it.sellWindowName}（{it.timezone}）
                </div>
              </div>

              <div style={{ textAlign: "right", fontSize: 12, color: "#444" }}>
                <div>Quota：{it.quotaStatus}</div>
                <div>
                  名額：{it.soldQty}/{it.maxQty ?? "-"}（最少 {it.minQty}）
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 4, fontSize: 12, color: "#555" }}>
              <div>接單起訖：{fmt(it.startAt)} ～ {fmt(it.endAt)}</div>
              <div>付款截止：{fmt(it.paymentCloseAt)}</div>
              <div>Quota更新：{fmt(it.quotaUpdatedAt)}</div>
            </div>

            <div style={{ marginTop: 10 }}>
              <Link to={`/customer/sell-windows/${it.sellWindowId}`}>
                查看 / 預約
              </Link>
            </div>
          </div>
        ))}

        {!loading && !error && items.length === 0 && (
          <div style={{ color: "#666" }}>目前沒有資料</div>
        )}
      </div>
    </div>
  );
}