export default function TermsPage() {
  return (
    <div className="page-container" style={{ maxWidth: 900, lineHeight: 1.8 }}>
      <h2>服務條款</h2>

      <p>歡迎使用 Merdeleine。</p>

      <h3>1. 帳號使用</h3>
      <p>您可以透過 Google、Facebook、LINE 登入本網站。</p>
      <p>您需確保帳號資訊正確。</p>

      <h3>2. 訂單與付款</h3>
      <p>所有訂單須經付款完成後才成立。</p>
      <p>本網站保留訂單審核與取消權利。</p>

      <h3>3. 商品與配送</h3>
      <p>商品為手工製作，可能略有差異。</p>
      <p>配送時間依實際狀況為準。</p>

      <h3>4. 責任限制</h3>
      <p>本網站不對以下情況負責：</p>
      <ul>
        <li>不可抗力（天災、物流延誤）</li>
        <li>第三方服務問題（如 PayPal）</li>
      </ul>

      <h3>5. 修改權利</h3>
      <p>本網站保留修改服務內容與條款之權利。</p>
    </div>
  );
}
