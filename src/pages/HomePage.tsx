const categoryCards = [
  {
    title: "常溫甜點",
    subtitle: "餅乾、費南雪、奶油磅蛋糕",
    image:
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "冷藏甜點",
    subtitle: "生乳酪、布丁、提拉米蘇",
    image:
      "https://images.unsplash.com/photo-1481391243133-f96216dcb5d2?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "節慶禮盒",
    subtitle: "質感包裝，送禮不失禮",
    image:
      "https://images.unsplash.com/photo-1548365328-9f547fb0953b?auto=format&fit=crop&w=1200&q=80",
  },
];

const featuredProducts = [
  {
    name: "伯爵茶瑪德蓮",
    desc: "佛手柑香氣與奶油尾韻，口感濕潤。",
    price: "NT$ 65",
    image:
      "https://images.unsplash.com/photo-1621743478914-cc8a86d7e7b5?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "焦糖海鹽可麗露",
    desc: "外脆內柔，帶焦糖與海鹽平衡。",
    price: "NT$ 80",
    image:
      "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "開心果巴斯克",
    desc: "濃郁奶香，尾韻有堅果甜香。",
    price: "NT$ 180",
    image:
      "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80",
  },
];

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="hero-shell">
        <img
          src="https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?auto=format&fit=crop&w=1800&q=80"
          alt="Dessert showcase"
          className="hero-image"
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-kicker">SEASONAL PATISSERIE</p>
          <h1 className="hero-title">春季甜點提案</h1>
          <p className="hero-subtitle">
            以細緻奶油香與低糖配方，呈現適合日常與送禮的法式甜點。
          </p>
          <div className="hero-actions">
            <a href="/customer/products" className="hero-btn hero-btn-primary">
              立即選購
            </a>
            <a href="/customer/sell-windows" className="hero-btn hero-btn-secondary">
              看檔期活動
            </a>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <h2>精選分類</h2>
          <span>為你挑選三種最受歡迎的品項方向</span>
        </div>

        <div className="category-grid">
          {categoryCards.map((card) => (
            <article key={card.title} className="category-card">
              <img src={card.image} alt={card.title} />
              <div className="category-overlay" />
              <div className="category-meta">
                <h3>{card.title}</h3>
                <p>{card.subtitle}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <h2>本週熱賣</h2>
          <span>店內最受歡迎的甜點風味</span>
        </div>

        <div className="featured-grid">
          {featuredProducts.map((item) => (
            <article key={item.name} className="featured-card">
              <img src={item.image} alt={item.name} />
              <div className="featured-body">
                <h3>{item.name}</h3>
                <p>{item.desc}</p>
                <div className="featured-row">
                  <strong>{item.price}</strong>
                  <a href="/customer/products">加入清單</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
