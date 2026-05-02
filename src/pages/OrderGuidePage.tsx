import { Link } from "react-router-dom";

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
          從開團、加入團購、成團確認、付款，到製作與取貨，整個流程一頁看懂。
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

      <section className="order-guide-canvas">
        <div className="order-guide-desktop-flow">
          <picture>
            <source media="(max-width: 900px)" srcSet="/order-guide-mobile-flow.png" />
            <img
              src="/order-guide-desktop-flow.png"
              alt="訂購流程圖：從開團、結團確認、付款到製作與取貨的完整步驟"
              loading="lazy"
            />
          </picture>
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
