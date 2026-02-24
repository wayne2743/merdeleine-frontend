import { useEffect, useState } from "react";
import { planningApi } from "../../api/planningApi";
import { catalogApi } from "../../api/catalogApi";
import type { SellWindowSummary } from "../../types/domain";

export default function ConfirmBatchPage() {
  const [items, setItems] = useState<SellWindowSummary[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    catalogApi.listSellWindows().then((data) => {
      setItems(data);
      setSelected(data[0]?.sellWindowId ?? "");
    });
  }, []);

  async function onConfirm() {
    if (!selected) return;
    setMsg(null);
    try {
      await planningApi.confirmBatch(selected);
      setMsg("已送出 Confirm（Planning 會 open-payment 並 publish batch.confirmed）");
    } catch {
      setMsg("Confirm 失敗");
    }
  }

  return (
    <div>
      <h2>Confirm 成團 / 開放付款</h2>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ padding: 8, minWidth: 360 }}>
          {items.map((it) => (
            <option key={it.sellWindowId} value={it.sellWindowId}>
              {it.productName} / {it.sellWindowId} / {it.status}
            </option>
          ))}
        </select>
        <button onClick={onConfirm} style={{ padding: "8px 12px", borderRadius: 10 }}>
          Confirm
        </button>
      </div>

      {msg && <div style={{ marginTop: 12 }}>{msg}</div>}

      <p style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
        ※ 對應：Admin → Planning confirm → Catalog open-payment → publish batch.confirmed
      </p>
    </div>
  );
}