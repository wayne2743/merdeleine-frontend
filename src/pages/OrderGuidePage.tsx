import { Link } from "react-router-dom";

const quickSteps = [
  {
    step: "01",
    title: "選商品並加入清單",
    desc: "在檔期內選擇商品、數量與取貨方式。",
  },
  {
    step: "02",
    title: "等待結團確認",
    desc: "結團前不扣款；商家確認達標後才通知付款。",
  },
  {
    step: "03",
    title: "期限內完成付款",
    desc: "收到通知後於付款期限內完成付款。",
  },
  {
    step: "04",
    title: "製作完成後取貨",
    desc: "依通知時段到指定地點取貨或收貨。",
  },
] as const;

const keyRules = [
  {
    title: "結團前可調整",
    desc: "開團期間都可以修改數量或取消，不會先扣款。",
  },
  {
    title: "未達標自動取消",
    desc: "若未達最低門檻，系統會自動取消，不收費。",
  },
  {
    title: "付款後才進製作",
    desc: "僅付款成功且達標的訂單才會安排製作與出貨。",
  },
] as const;

const reminders = [
  "開團期間可加入或調整數量，結團前不會進行付款。",
  "未達最低標準的團購會自動取消，不會被收取任何費用。",
  "付款完成後若最終數量仍未達標，將依規則退款。",
  "請留意電子郵件、LINE 或站內通知，以免錯過重要更新。",
];

export default function OrderGuidePage() {
  return (
    <div className="page-container order-guide-page">
      <section className="order-guide-hero">
        <p className="order-guide-kicker">GROUP BUY GUIDE</p>
        <h1>訂購流程說明</h1>
        <p className="order-guide-intro">
          用最短路徑理解團購：先加入、再確認、再付款、最後取貨。
        </p>
        <div className="order-guide-hero-actions">
          <Link to="/customer/products" className="hero-btn hero-btn-primary">
            前往商品列表
          </Link>
          <Link to="/customer/sell-windows" className="hero-btn hero-btn-secondary">
            查看目前檔期
          </Link>
        </div>
      </section>

      <section className="order-guide-simple-flow" aria-label="精簡訂購流程">
        <h2>一眼看懂：4 步驟完成訂購</h2>
        <div className="order-guide-simple-grid">
          {quickSteps.map((item, index) => (
            <article key={item.step} className="order-guide-simple-step">
              <div className="order-guide-simple-step-no">{item.step}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
              {index < quickSteps.length - 1 && (
                <div className="order-guide-simple-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M4 12h13" />
                    <path d="m13 7 7 5-7 5" />
                  </svg>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="order-guide-simple-rules" aria-label="訂購關鍵規則">
        {keyRules.map((item) => (
          <article key={item.title} className="order-guide-simple-rule-card">
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
          </article>
        ))}
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
          <p>若你對流程、付款或取貨安排有疑問，可以直接與我們聯繫。</p>
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
