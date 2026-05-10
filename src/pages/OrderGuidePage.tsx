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

      <section className="home-section home-guide-highlight">
        <div className="home-guide-highlight-copy">
          <p className="home-guide-kicker">FIRST TIME HERE?</p>
          <h2>第一次購買，先看流程會更清楚</h2>
          <p>
            我們把「開團、加入、付款、製作、取貨」整理成一頁式說明，幫助你快速理解整體購買方式。
          </p>
          <div className="home-guide-points">
            <span>開團前可先加入，不會先扣款</span>
            <span>未達成團門檻會自動取消</span>
            <span>付款完成後才進入製作與出貨</span>
          </div>
        </div>

        <div className="home-guide-highlight-card">
          <div className="home-guide-mini-steps">
            <div><strong>1</strong><span>加入或發起開團</span></div>
            <div><strong>2</strong><span>成團後通知付款</span></div>
            <div><strong>3</strong><span>製作完成後出貨 / 取貨</span></div>
          </div>
          <a href="#order-guide-flow" className="hero-btn hero-btn-primary home-guide-highlight-btn">
            查看完整流程
          </a>
        </div>
      </section>

      <section id="order-guide-flow" className="order-guide-canvas">
        <div className="order-guide-desktop-flow">
          <img
            src="/order-guide-desktop-flow.png"
            alt="訂購流程圖：從開團、結團確認、付款到製作與取貨的完整步驟"
            loading="lazy"
          />
        </div>

        <div className="order-guide-mobile-flow">
          <section className="mobile-flow" aria-label="訂購流程說明">
            <article className="mobile-step pink">
              <div className="rail"><div className="num">1</div></div>
              <div className="card">
                <div className="step-inner">
                  <div className="icon-wrap" aria-hidden="true">
                    <svg viewBox="0 0 80 80">
                      <circle className="svg-stroke" cx="26" cy="28" r="10" />
                      <circle className="svg-stroke" cx="48" cy="28" r="10" />
                      <circle className="svg-stroke" cx="37" cy="20" r="10" />
                      <path className="svg-stroke" d="M10 62c2-14 12-22 26-22s24 8 26 22" />
                      <path className="svg-stroke" d="M38 62c2-11 10-17 21-17 8 0 14 4 17 11" />
                      <circle className="svg-fill-pink" cx="62" cy="56" r="13" />
                      <path d="M62 48v16M54 56h16" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <h2>開團 / 加入開團</h2>
                    <ul>
                      <li>使用者或商家可自行開團。</li>
                      <li>若商品已有開團，系統會自動引導到商品頁面，直接加入訂購數量。</li>
                      <li>開團依商家設定：開團時間、結團時間、付款時間、運送時間。</li>
                    </ul>
                  </div>
                </div>
              </div>
            </article>

            <article className="mobile-step orange">
              <div className="rail"><div className="num">2</div></div>
              <div className="card">
                <div className="step-inner">
                  <div className="icon-wrap" aria-hidden="true">
                    <svg viewBox="0 0 80 80">
                      <circle className="svg-stroke" cx="25" cy="30" r="10" />
                      <circle className="svg-stroke" cx="50" cy="30" r="10" />
                      <path className="svg-stroke" d="M10 64c3-15 14-23 30-23s27 8 30 23" />
                      <circle className="svg-fill-pink" cx="58" cy="52" r="14" />
                      <path className="svg-stroke" d="M58 43v11l8 5" />
                    </svg>
                  </div>
                  <div>
                    <h2>開團進行中（未付款）</h2>
                    <ul>
                      <li>在結團時間前，團員可持續加入訂購數量或調整數量。</li>
                      <li>此階段不會進行付款。</li>
                    </ul>
                  </div>
                </div>
              </div>
            </article>

            <article className="mobile-step yellow">
              <div className="rail"><div className="num">3</div></div>
              <div className="card">
                <div className="step-inner">
                  <div className="icon-wrap" aria-hidden="true">
                    <svg viewBox="0 0 80 80">
                      <path className="svg-stroke" d="M24 16h32v48H24z" />
                      <path className="svg-stroke" d="M32 16c0-6 16-6 16 0" />
                      <path className="svg-stroke" d="M32 30h16M32 42h16M32 54h10" />
                      <circle className="svg-stroke" cx="58" cy="58" r="12" />
                      <path className="svg-stroke" d="M67 67l8 8" />
                    </svg>
                  </div>
                  <div>
                    <h2>結團後，商家確認團購數量</h2>
                    <ul>
                      <li>商家會確認是否達到最低成團標準。</li>
                    </ul>
                  </div>
                </div>
                <div className="decision">
                  <div className="result bad">
                    <strong>未達最低標準</strong>
                    <p>開團自動取消，不進行付款。</p>
                  </div>
                  <div className="result good">
                    <strong>達到最低標準</strong>
                    <p>發送電子郵件，通知團員進行付款。</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="mobile-step green">
              <div className="rail"><div className="num">4</div></div>
              <div className="card">
                <div className="step-inner">
                  <div className="icon-wrap" aria-hidden="true">
                    <svg viewBox="0 0 80 80">
                      <rect className="svg-stroke" x="12" y="22" width="56" height="38" rx="6" />
                      <path className="svg-stroke" d="M12 34h56M24 48h14" />
                      <circle className="svg-fill-green" cx="61" cy="57" r="14" />
                      <path d="M54 57l5 5 10-12" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <h2>團員付款（付款期限內）</h2>
                    <ul>
                      <li>請在商家設定的付款期限內完成付款。</li>
                      <li>付款方式依網站提供為準。</li>
                    </ul>
                  </div>
                </div>
              </div>
            </article>

            <article className="mobile-step blue">
              <div className="rail"><div className="num">5</div></div>
              <div className="card">
                <div className="step-inner">
                  <div className="icon-wrap" aria-hidden="true">
                    <svg viewBox="0 0 80 80">
                      <path className="svg-stroke" d="M24 15h32v50H24z" />
                      <path className="svg-stroke" d="M32 16c0-6 16-6 16 0" />
                      <path className="svg-stroke" d="M32 30h13M32 42h13M32 54h10" />
                      <circle className="svg-fill-blue" cx="58" cy="56" r="16" />
                      <path className="svg-stroke" d="M58 46v20M52 51c0-4 12-4 12 1 0 6-12 3-12 9 0 5 12 5 12 0" />
                    </svg>
                  </div>
                  <div>
                    <h2>付款結束後，確認最終訂單數量</h2>
                    <ul>
                      <li>付款完成後，系統會再次確認付款後的有效訂購數量。</li>
                    </ul>
                  </div>
                </div>
                <div className="decision">
                  <div className="result bad">
                    <strong>未達最低標準</strong>
                    <p>訂單自動取消，並全額退款給所有團員。</p>
                  </div>
                  <div className="result good">
                    <strong>達到最低標準</strong>
                    <p>訂單成立，商家開始生產。</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="mobile-step purple">
              <div className="rail"><div className="num">6</div></div>
              <div className="card">
                <div className="step-inner">
                  <div className="icon-wrap" aria-hidden="true">
                    <svg viewBox="0 0 80 80">
                      <path className="svg-stroke" d="M18 57h44" />
                      <path className="svg-stroke" d="M23 57V28c0-8 7-14 17-14s17 6 17 14v29" />
                      <path className="svg-stroke" d="M17 28h46" />
                      <path className="svg-stroke" d="M30 36h20" />
                      <path className="svg-stroke" d="M34 57V40h12v17" />
                    </svg>
                  </div>
                  <div>
                    <h2>生產製作</h2>
                    <ul>
                      <li>商家依最終成立的訂單數量進行生產製作。</li>
                    </ul>
                  </div>
                </div>
              </div>
            </article>

            <article className="mobile-step teal">
              <div className="rail"><div className="num">7</div></div>
              <div className="card">
                <div className="step-inner">
                  <div className="icon-wrap" aria-hidden="true">
                    <svg viewBox="0 0 80 80">
                      <path className="svg-stroke" d="M7 55h45V31H7z" />
                      <path className="svg-stroke" d="M52 42h11l10 13v0H52z" />
                      <circle className="svg-stroke" cx="22" cy="61" r="6" />
                      <circle className="svg-stroke" cx="60" cy="61" r="6" />
                      <path className="svg-fill-pink" d="M18 15c-8 0-13 6-13 13 0 10 13 22 13 22s13-12 13-22c0-7-5-13-13-13z" />
                      <circle fill="#fff" cx="18" cy="28" r="5" />
                    </svg>
                  </div>
                  <div>
                    <h2>出貨 / 取貨</h2>
                    <ul>
                      <li>生產完畢後，會依商家指定的時間，將商品送達指定地點。</li>
                      <li>或依通知由團員自行取貨。</li>
                    </ul>
                  </div>
                </div>
              </div>
            </article>
          </section>
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
