import { Link } from "react-router-dom";

type Accent = "rose" | "amber" | "violet" | "blue" | "mint";

function FlowIcon({ kind, accent }: { kind: "group" | "cart" | "pending" | "card" | "mail" | "mixer" | "truck"; accent: Accent }) {
  return (
    <div className={`order-guide-icon is-${accent}`} aria-hidden>
      <svg viewBox="0 0 64 64" fill="none" role="presentation">
        {kind === "group" && (
          <>
            <circle cx="22" cy="20" r="7" stroke="currentColor" strokeWidth="3" />
            <circle cx="40" cy="18" r="6" stroke="currentColor" strokeWidth="3" />
            <circle cx="33" cy="28" r="8" stroke="currentColor" strokeWidth="3" />
            <path d="M12 44c2-6 7-10 14-10s12 4 14 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M32 36c6 0 11 3 13 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {kind === "cart" && (
          <>
            <path d="M10 16h8l4 22h24l6-16H20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="28" cy="48" r="4" stroke="currentColor" strokeWidth="3" />
            <circle cx="46" cy="48" r="4" stroke="currentColor" strokeWidth="3" />
            <circle cx="52" cy="16" r="8" fill="currentColor" opacity="0.18" />
            <path d="M49 16l2 2 4-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {kind === "pending" && (
          <>
            <circle cx="24" cy="20" r="7" stroke="currentColor" strokeWidth="3" />
            <circle cx="42" cy="20" r="7" stroke="currentColor" strokeWidth="3" />
            <path d="M13 43c3-7 8-11 15-11 8 0 13 4 16 11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="47" cy="41" r="10" stroke="currentColor" strokeWidth="3" />
            <path d="M47 36v6l4 2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {kind === "card" && (
          <>
            <rect x="10" y="15" width="44" height="30" rx="5" stroke="currentColor" strokeWidth="3" />
            <path d="M10 25h44" stroke="currentColor" strokeWidth="3" />
            <path d="M18 36h12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="48" cy="42" r="9" fill="currentColor" opacity="0.18" />
            <path d="M44 42l3 3 6-7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {kind === "mail" && (
          <>
            <rect x="12" y="17" width="40" height="28" rx="5" stroke="currentColor" strokeWidth="3" />
            <path d="M14 21l18 14L50 21" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {kind === "mixer" && (
          <>
            <path d="M16 20h18c6 0 11 5 11 11v14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M22 20v25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M15 45h30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M27 45c0 5 4 9 9 9s9-4 9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="27" cy="18" r="7" stroke="currentColor" strokeWidth="3" />
          </>
        )}
        {kind === "truck" && (
          <>
            <path d="M9 22h27v18H9z" stroke="currentColor" strokeWidth="3" />
            <path d="M36 29h10l7 8v3H36z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="20" cy="44" r="5" stroke="currentColor" strokeWidth="3" />
            <circle cx="44" cy="44" r="5" stroke="currentColor" strokeWidth="3" />
            <path d="M12 18l7-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M12 18l-3 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  );
}

const timelineItems = [
  { label: "開團時間", text: "商家設定的開始接受訂購時間", accent: "rose" },
  { label: "結團時間", text: "商家設定的最後收單時間", accent: "mint" },
  { label: "付款時間", text: "商家設定的付款期限", accent: "blue" },
  { label: "取貨時間", text: "商家設定的出貨或自取時間", accent: "violet" },
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
        <div className="order-guide-map-grid">
          <article className="order-guide-block is-rose">
            <div className="order-guide-step-badge is-rose">1</div>
            <header className="order-guide-block-head">
              <h2>開團 / 加入開團</h2>
            </header>
            <div className="order-guide-split-two">
              <div className="order-guide-mini-panel">
                <h3>自行開團</h3>
                <FlowIcon kind="group" accent="rose" />
                <p>使用者或商家可自行發起開團。</p>
              </div>
              <div className="order-guide-mini-panel">
                <h3>加入現有團</h3>
                <FlowIcon kind="cart" accent="rose" />
                <p>若商品已有開團，可直接加入並調整數量。</p>
              </div>
            </div>
            <div className="order-guide-block-note">
              開團後會依商家設定產生開團時間、結團時間、付款時間與取貨時間。
            </div>
          </article>

          <div className="order-guide-arrow is-right" aria-hidden>→</div>

          <article className="order-guide-block is-rose is-center">
            <div className="order-guide-step-badge is-rose">2</div>
            <header className="order-guide-block-head">
              <h2>開團進行中（未付款）</h2>
            </header>
            <FlowIcon kind="pending" accent="rose" />
            <p className="order-guide-center-copy">
              在結團前，團員可以持續加入、調整或取消數量，此階段不會先付款。
            </p>
          </article>

          <aside className="order-guide-legend">
            <h2>開團時間範例</h2>
            <div className="order-guide-legend-list">
              {timelineItems.map((item) => (
                <div key={item.label} className="order-guide-legend-item">
                  <span className={`order-guide-legend-dot is-${item.accent}`} aria-hidden />
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <article className="order-guide-block is-rose order-guide-block-span-2">
            <div className="order-guide-step-badge is-rose">3</div>
            <header className="order-guide-block-head">
              <h2>結團後，商家確認團購數量</h2>
            </header>
            <div className="order-guide-result-grid">
              <div className="order-guide-result-card is-negative">
                <span className="order-guide-result-chip is-negative">未達最低標準</span>
                <FlowIcon kind="group" accent="rose" />
                <p>團購數量未達最低標準，開團自動取消，不進行付款。</p>
              </div>
              <div className="order-guide-result-card is-positive">
                <span className="order-guide-result-chip is-positive">達到最低標準</span>
                <FlowIcon kind="mail" accent="mint" />
                <p>系統發送通知，提醒團員在付款期限內完成付款。</p>
              </div>
            </div>
          </article>

          <div className="order-guide-arrow is-right" aria-hidden>→</div>

          <article className="order-guide-block is-amber is-center">
            <div className="order-guide-step-badge is-amber">4</div>
            <header className="order-guide-block-head">
              <h2>團員付款（付款期限內）</h2>
            </header>
            <FlowIcon kind="card" accent="amber" />
            <p className="order-guide-center-copy">
              請在商家設定的付款期限內完成付款，付款方式依各檔期設定為準。
            </p>
          </article>

          <article className="order-guide-block is-violet order-guide-block-span-2">
            <div className="order-guide-step-badge is-violet">5</div>
            <header className="order-guide-block-head">
              <h2>付款結束後，確認最終訂單數量</h2>
            </header>
            <div className="order-guide-result-grid">
              <div className="order-guide-result-card is-negative">
                <span className="order-guide-result-chip is-negative">未達最低標準</span>
                <FlowIcon kind="card" accent="violet" />
                <p>付款後若最終有效數量仍未達標，訂單取消並依規則退款。</p>
              </div>
              <div className="order-guide-result-card is-positive">
                <span className="order-guide-result-chip is-positive">達到最低標準</span>
                <FlowIcon kind="mixer" accent="mint" />
                <p>訂單成立，商家開始依照最終確認數量安排製作。</p>
              </div>
            </div>
          </article>

          <div className="order-guide-arrow is-right" aria-hidden>→</div>

          <div className="order-guide-stack-column">
            <article className="order-guide-block is-blue is-center is-compact">
              <div className="order-guide-step-badge is-blue">6</div>
              <header className="order-guide-block-head">
                <h2>生產製作</h2>
              </header>
              <FlowIcon kind="mixer" accent="blue" />
              <p className="order-guide-center-copy">商家依訂單數量進行製作。</p>
            </article>

            <div className="order-guide-arrow is-down" aria-hidden>↓</div>

            <article className="order-guide-block is-mint is-center is-compact">
              <div className="order-guide-step-badge is-mint">7</div>
              <header className="order-guide-block-head">
                <h2>出貨 / 取貨</h2>
              </header>
              <FlowIcon kind="truck" accent="mint" />
              <p className="order-guide-center-copy">依商家指定時間出貨、配送或通知團員取貨。</p>
            </article>
          </div>
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
