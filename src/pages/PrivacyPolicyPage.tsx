export default function PrivacyPolicyPage() {
  return (
    <div className="page-container" style={{ maxWidth: 900, lineHeight: 1.8 }}>
      <h2>隱私權政策</h2>

      <p>歡迎使用 Merdeleine（以下簡稱「本網站」）。</p>

      <p>當您使用本網站（包含透過 Google、Facebook、LINE 登入）時，我們可能會收集以下資訊：</p>

      <h3>1. 收集的資料</h3>
      <ul>
        <li>基本資料：姓名、Email、頭像（由第三方登入提供）</li>
        <li>訂單資訊：購買商品、配送地址、聯絡電話</li>
        <li>系統資料：IP、裝置資訊（用於安全與分析）</li>
      </ul>

      <h3>2. 資料用途</h3>
      <p>我們會將您的資料用於：</p>
      <ul>
        <li>建立與管理會員帳號</li>
        <li>訂單處理與客服聯繫</li>
        <li>系統安全與防詐騙</li>
      </ul>

      <h3>3. 第三方服務</h3>
      <p>我們可能使用以下服務：</p>
      <ul>
        <li>PayPal（付款）</li>
        <li>Google / Facebook / LINE（登入驗證）</li>
      </ul>
      <p>這些服務可能依其政策處理您的資料。</p>

      <h3>4. 資料保護</h3>
      <p>我們採取合理技術措施保護您的個人資料。</p>

      <h3>5. 資料刪除</h3>
      <p>您可以隨時聯繫我們要求刪除資料。</p>

      <h3>6. 聯絡方式</h3>
      <p>Email: merdeleine.tw@gmail.com</p>
    </div>
  );
}
