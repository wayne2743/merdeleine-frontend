export default function AdminDashboardPage() {
    return (
      <div>
        <h2>後台總覽</h2>
        <ul>
          <li>檔期/名額（sell_window_quota）</li>
          <li>到量狀態（threshold.reached）</li>
          <li>Confirm 成團（batch.confirmed）</li>
          <li>付款截止結算 → production.scheduled</li>
        </ul>
        <p style={{ color: "#666", fontSize: 12 }}>
          ※ 後台通常會透過 BFF 統整 Catalog/Order/Aggregator/Planning 的視圖，前端才不會跨服務亂飛
        </p>
      </div>
    );
  }