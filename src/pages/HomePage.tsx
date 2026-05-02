import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { catalogApi } from "../api/catalogApi";
import type { Product, ProductImage } from "../types/domain";

type FeaturedProductCard = {
  id: string;
  name: string;
  desc: string;
  price: string;
  image: string;
  actionTo: string;
};

function pickHomeImage(images: ProductImage[]): string | null {
  const activeImages = images.filter((image) => image.isActive);

  const galleryImage = [...activeImages]
    .filter((image) => String(image.imageType).toUpperCase() === "GALLERY")
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)[0];

  if (galleryImage?.cdnUrl) {
    return galleryImage.cdnUrl;
  }

  const selected = [...activeImages]
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)[0];

  return selected?.cdnUrl ?? null;
}

function decodeDescription(value?: string | null): string {
  return (value || "").replace(/\\n/g, "\n").trim();
}

function trimDescription(value: string, maxLength = 34): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}…`;
}

function formatPrice(product: Product): string {
  if (!Number.isFinite(product.unitPriceCents)) return "-";
  return `${product.currency || "TWD"} ${Number(product.unitPriceCents).toLocaleString()}`;
}

type Season = "spring" | "summer" | "autumn" | "winter";

function getSeason(): Season {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

const seasonalHero: Record<Season, { kicker: string; title: string; subtitle: string; image: string; alt: string }> = {
  spring: {
    kicker: "SPRING PATISSERIE",
    title: "春季甜點提案",
    subtitle: "以細緻奶油香與低糖配方，呈現適合日常與送禮的法式甜點。",
    image: "https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?auto=format&fit=crop&w=1800&q=80",
    alt: "春季甜點 — 莓果塔與奶油派",
  },
  summer: {
    kicker: "SUMMER PATISSERIE",
    title: "夏季甜點提案",
    subtitle: "清爽柑橘與熱帶水果風味，帶來一整個夏天的清甜滋味。",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1800&q=80",
    alt: "夏季甜點 — 芒果與柑橘慕斯",
  },
  autumn: {
    kicker: "AUTUMN PATISSERIE",
    title: "秋季甜點提案",
    subtitle: "以栗子、焦糖與肉桂勾勒豐收時節的暖心甜點。",
    image: "https://images.unsplash.com/photo-1506459225024-1428097a7e18?auto=format&fit=crop&w=1800&q=80",
    alt: "秋季甜點 — 栗子塔與焦糖蘋果",
  },
  winter: {
    kicker: "WINTER PATISSERIE",
    title: "冬季甜點提案",
    subtitle: "濃郁巧克力與抹茶融入溫暖節日氛圍，每一口都是療癒享受。",
    image: "https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&w=1800&q=80",
    alt: "冬季甜點 — 巧克力蛋糕與糖霜",
  },
};

export default function HomePage() {
  const season = getSeason();
  const hero = seasonalHero[season];
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProductCard[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFeaturedProducts() {
      setLoadingFeatured(true);
      try {
        const products = await catalogApi.listProducts();
        if (cancelled) return;

        const activeProducts = (products ?? []).filter((product) => product.status === "ACTIVE");
        const featuredIds = catalogApi.getHomeFeaturedProductIds();
        const selectedProducts = featuredIds
          .map((productId) => activeProducts.find((product) => product.id === productId))
          .filter((product): product is Product => Boolean(product));

        const finalProducts = (selectedProducts.length > 0 ? selectedProducts : activeProducts.slice(0, 3)).slice(0, 3);
        if (finalProducts.length === 0) {
          setFeaturedProducts([]);
          return;
        }

        const imageResults = await Promise.allSettled(
          finalProducts.map((product) => catalogApi.listProductImages(product.id))
        );

        if (cancelled) return;

        const nextCards = finalProducts
          .map((product, index) => {
            const images = imageResults[index]?.status === "fulfilled" ? imageResults[index].value : [];
            const image = pickHomeImage(images);

            if (!image) return null;

            const desc = trimDescription(decodeDescription(product.description));

            return {
              id: product.id,
              name: product.name,
              desc,
              price: formatPrice(product),
              image,
              actionTo: `/customer/products?action=group&productId=${encodeURIComponent(product.id)}`,
            };
          })
          .filter((item): item is FeaturedProductCard => item !== null);

        setFeaturedProducts(nextCards);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setFeaturedProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingFeatured(false);
        }
      }
    }

    void loadFeaturedProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="home-page">
      <section className="hero-shell">
        <img
          src={hero.image}
          alt={hero.alt}
          className="hero-image"
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-kicker">{hero.kicker}</p>
          <h1 className="hero-title">{hero.title}</h1>
          <p className="hero-subtitle">{hero.subtitle}</p>
          <div className="hero-actions">
            <Link to="/customer/products" className="hero-btn hero-btn-primary">
              立即選購
            </Link>
            <Link to="/order-guide" className="hero-btn hero-btn-secondary">
              先看訂購流程
            </Link>
            <Link to="/customer/sell-windows" className="hero-btn hero-btn-secondary">
              看檔期活動
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section" />

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
          <Link to="/order-guide" className="hero-btn hero-btn-primary home-guide-highlight-btn">
            查看完整流程
          </Link>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <h2>本週熱賣</h2>
          <span>店內最受歡迎的甜點風味</span>
        </div>

        {loadingFeatured && featuredProducts.length === 0 ? (
          <div style={{ color: "#eadfbd", fontSize: 14 }}>熱門商品載入中...</div>
        ) : featuredProducts.length === 0 ? (
          <div style={{ color: "#eadfbd", fontSize: 14 }}>目前尚未設定首頁熱賣商品。</div>
        ) : (
          <div className="featured-grid">
            {featuredProducts.map((item) => (
              <article key={item.id} className="featured-card">
                <img src={item.image} alt={item.name} />
                <div className="featured-body">
                  <h3>{item.name}</h3>
                  <p>{item.desc}</p>
                  <div className="featured-row">
                    <strong>{item.price}</strong>
                    <Link to={item.actionTo}>加入清單</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="home-section" style={{ paddingTop: 8 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            fontSize: 13,
            color: "#eadfbd",
          }}
        >
          <Link to="/privacy-policy">隱私權政策</Link>
          <Link to="/terms">服務條款</Link>
          <Link to="/data-deletion">資料刪除說明</Link>
        </div>
      </section>
    </div>
  );
}
