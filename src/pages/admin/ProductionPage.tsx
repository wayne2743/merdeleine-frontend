export default function ProductionPage() {
    return (
      <div>
        <h2>生產工單</h2>
        <p>這頁建議接一個 BFF：彙整 production.scheduled / production.started 與 work_order / work_step。</p>
  
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginTop: 12 }}>
          <div style={{ fontWeight: 700 }}>（示意）WorkOrder #WO-123</div>
          <div>status: READY</div>
          <div>productQty: 48</div>
          <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
            ※ 等你 PRD service API 好了，我再幫你把這頁變成「工單列表 + 工序看板」
          </div>
        </div>
      </div>
    );
  }