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

const DEFAULT_FEATURED_PRODUCTS: FeaturedProductCard[] = [
  {
    id: "default-earl-grey-madeleine",
    name: "伯爵茶瑪德蓮",
    desc: "佛手柑香氣與奶油尾韻，口感濕潤。",
    price: "NT$ 65",
    image: "https://images.unsplash.com/photo-1621743478914-cc8a86d7e7b5?auto=format&fit=crop&w=900&q=80",
    actionTo: "/customer/products",
  },
  {
    id: "default-canele",
    name: "焦糖海鹽可麗露",
    desc: "外脆內柔，帶焦糖與海鹽平衡。",
    price: "NT$ 80",
    image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=900&q=80",
    actionTo: "/customer/products",
  },
  {
    id: "default-basque",
    name: "開心果巴斯克",
    desc: "濃郁奶香，尾韻有堅果甜香。",
    price: "NT$ 180",
    image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80",
    actionTo: "/customer/products",
  },
];

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

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProductCard[]>(DEFAULT_FEATURED_PRODUCTS);
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

        const nextCards = finalProducts.map((product, index) => {
          const fallback = DEFAULT_FEATURED_PRODUCTS[index % DEFAULT_FEATURED_PRODUCTS.length];
          const images = imageResults[index]?.status === "fulfilled" ? imageResults[index].value : [];
          const desc = trimDescription(decodeDescription(product.description) || fallback.desc);

          return {
            id: product.id,
            name: product.name || fallback.name,
            desc,
            price: formatPrice(product),
            image: pickHomeImage(images) || fallback.image,
            actionTo: `/customer/products?action=group&productId=${encodeURIComponent(product.id)}`,
          };
        });

        setFeaturedProducts(nextCards);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setFeaturedProducts(DEFAULT_FEATURED_PRODUCTS);
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
            <Link to="/customer/products" className="hero-btn hero-btn-primary">
              立即選購
            </Link>
            <Link to="/customer/sell-windows" className="hero-btn hero-btn-secondary">
              看檔期活動
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section" />

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
    </div>
  );
}
