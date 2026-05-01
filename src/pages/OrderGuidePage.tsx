import { Link } from "react-router-dom";

type FlowCard = {
  step: string;
  title: string;
  accent: "rose" | "amber" | "violet" | "blue" | "mint";
  summary: string;
  details: string[];
};

const flowCards: FlowCard[] = [
  {
    step: "1",
    title: "開團 / 加入開團",
    accent: "rose",
    summary: "你可以自己發起開團，也可以加入現有團購，先保留需求數量。",
    details: [
      "自行開團：由商家設定開團、結團、付款與取貨時程。",
      "加入既有團：直接加入目前可併單的檔期，不需要重新建立新團。",
    ],
  },
  {
    step: "2",
    title: "開團進行中（未付款）",
    accent: "rose",
    summary: "在結團前，團員可以持續加購、調整或取消數量。",
    details: [
      "此階段不會先扣款。",
      "實際是否成團，會依結團時的總量判斷。",
    ],
  },
  {
    step: "3",
    title: "結團後，商家確認成團數量",
    accent: "amber",
    summary: "系統會先檢查是否達到最低成團門檻。",
    details: [
      "未達最低標準：訂單自動取消，不會進入付款。",
      "達到最低標準：系統通知團員進入付款階段。",
    ],
  },
  {
    step: "4",
    title: "團員付款（付款期限內）",
    accent: "amber",
    summary: "請在商家設定的付款期限內完成付款。",
    details: [
      "付款方式依檔期與商家設定為準。",
      "逾期未付款，訂單可能失效或被取消。",
    ],
  },
  {
    step: "5",
    title: "付款結束後，確認最終訂單數量",
    accent: "violet",
    summary: "付款完成後，系統會再次確認最終有效數量是否成團。",
    details: [
      "若付款後仍未達最低標準：訂單取消並依規則退款。",
      "若付款後達標：訂單成立，進入正式製作。",
    ],
  },
  {
    step: "6",
    title: "生產製作",
    accent: "blue",
    summary: "商家依照最終成立的訂單數量安排製作。",
    details: [
      "此階段以出貨品質與時程準備為主。",
      "若有異動，商家會另行通知。",
    ],
  },
  {
    step: "7",
    title: "出貨 / 取貨",
    accent: "mint",
    summary: "依商家設定時間出貨、配送或通知自取。",
    details: [
      "請留意簡訊、Email 或站內通知。",
      "若為自取，請在指定時間前往取貨。",
    ],
  },
];

const reminders = [
  "開團期間可加入或調整數量，結團前不會先付款。",
  "未達最低標準的團購，系統會自動取消，不會強制收款。",
  "付款完成後若最終仍未達標，將依規則退款。",
  "請確認你的電子郵件與聯絡方式正確，方便接收通知。",
];

const timelineItems = [
  { label: "開團時間", text: "商家設定的開團開始時間" },
  { label: "結團時間", text: "商家設定的最後收單時間" },
  { label: "付款時間", text: "商家設定的付款期限" },
  { label: "取貨時間", text: "商家設定的出貨或自取時間" },
];

export default function OrderGuidePage() {
  return (
    <div className="page-container order-guide-page">
      <section className="order-guide-hero">
        <div className="order-guide-hero-copy">
          <p className="order-guide-kicker">HOW TO ORDER</p>
          <h1>訂購流程說明</h1>
          <p>
            開團購買、透明成團、確認付款，再進入製作與出貨。第一次使用也能快速理解整體流程。
          </p>
          <div className="order-guide-hero-actions">
            <Link to="/customer/products" className="hero-btn hero-btn-primary">
              前往商品列表
            </Link>
            <Link to="/customer/sell-windows" className="hero-btn hero-btn-secondary">
              查看目前檔期
            </Link>
          </div>
        </div>

        <aside className="order-guide-timeline">
          <h2>開團時間範例</h2>
          <div className="order-guide-timeline-list">
            {timelineItems.map((item) => (
              <div key={item.label} className="order-guide-timeline-item">
                <strong>{item.label}</strong>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="order-guide-section">
        <div className="home-section-head">
          <h2>整體流程</h2>
          <span>從開團到取貨，共 7 個主要步驟</span>
        </div>

        <div className="order-guide-grid">
          {flowCards.map((card) => (
            <article key={card.step} className={`order-guide-card is-${card.accent}`}>
              <div className="order-guide-card-badge">{card.step}</div>
              <div className="order-guide-card-body">
                <h3>{card.title}</h3>
                <p>{card.summary}</p>
                <ul>
                  {card.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="order-guide-bottom-grid">
        <article className="order-guide-note-card">
          <h2>小提醒</h2>
          <ul>
            {reminders.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="order-guide-contact-card">
          <h2>有問題嗎？</h2>
          <p>若你對訂購流程、付款或取貨安排有疑問，可以直接與我們聯繫。</p>
          <div className="order-guide-contact-list">
            <div>
              <strong>客服信箱</strong>
              <span>merdeleine.tw@gmail.com</span>
            </div>
            <div>
              <strong>LINE</strong>
              <span>@490ajoi</span>
            </div>
            <div>
              <strong>服務時間</strong>
              <span>週一至週四 09:00 - 18:00</span>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
