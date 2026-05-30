import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { catalogApi } from "../api/catalogApi";
import { extractSupplementalInfo, splitInfoTags } from "../utils/productInfo";
import type { Product, ProductImage } from "../types/domain";

type FeaturedProductCard = {
  id: string;
  name: string;
  desc: string;
  fullDesc: string;
  price: string;
  ingredients: string;
  calories: string;
  allergens: string;
  image: string;
  actionTo: string;
};

type DetailPreviewItem = {
  detailUrl: string;
  originalUrl: string | null;
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

function getImageGroupKey(image: ProductImage): string | null {
  if (!image.cdnUrl) return null;
  try {
    const pathname = new URL(image.cdnUrl).pathname;
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length < 4) return null;
    return parts[2] ?? null;
  } catch {
    return null;
  }
}

function buildDetailPreviewItems(images: ProductImage[]): DetailPreviewItem[] {
  const originalByGroup = new Map<string, string>();

  images
    .filter((image) => image.isActive && image.imageType === "ORIGINAL")
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)
    .forEach((image) => {
      const groupKey = getImageGroupKey(image);
      if (!groupKey) return;
      if (!originalByGroup.has(groupKey)) {
        originalByGroup.set(groupKey, image.cdnUrl);
      }
    });

  return images
    .filter((image) => image.isActive && image.imageType === "DETAIL")
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)
    .map((image) => {
      const groupKey = getImageGroupKey(image);
      return {
        detailUrl: image.cdnUrl,
        originalUrl: groupKey ? originalByGroup.get(groupKey) ?? null : null,
      };
    });
}

function pickOriginalImage(images: ProductImage[]): string | null {
  const originalImage = [...images]
    .filter((image) => image.isActive && image.imageType === "ORIGINAL")
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)[0];

  return originalImage?.cdnUrl ?? null;
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

const ORDER_FLOW_STEPS = [
  {
    step: 1,
    title: "瀏覽商品",
    desc: "從本週檔期中挑選想要的甜點。",
    color: "#c99876",
  },
  {
    step: 2,
    title: "加入清單",
    desc: "選擇數量與預取貨點，送出預約。",
    color: "#d0a584",
  },
  {
    step: 3,
    title: "等待成團",
    desc: "檔期結束、店家確認後通知付款。",
    color: "#b8956a",
  },
  {
    step: 4,
    title: "完成付款",
    desc: "支援轉帳付款或 LINE Pay。",
    color: "#a67c52",
  },
  {
    step: 5,
    title: "現場取貨",
    desc: "前往選定門市，依約定時間取貨。",
    color: "#7fa572",
  },
] as const;

export default function HomePage() {
  const season = getSeason();
  const hero = seasonalHero[season];
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProductCard[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [featuredDetail, setFeaturedDetail] = useState<FeaturedProductCard | null>(null);
  const [detailImageByProductId, setDetailImageByProductId] = useState<Record<string, DetailPreviewItem[]>>({});
  const [originalImageByProductId, setOriginalImageByProductId] = useState<Record<string, string>>({});
  const [originalModalUrl, setOriginalModalUrl] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState<string | null>(null);
  const detailStripRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const shouldLockScroll = Boolean(featuredDetail) || Boolean(originalModalUrl);
    if (shouldLockScroll) {
      document.documentElement.classList.add("modal-scroll-lock");
      document.body.classList.add("modal-scroll-lock");
    }

    return () => {
      document.documentElement.classList.remove("modal-scroll-lock");
      document.body.classList.remove("modal-scroll-lock");
    };
  }, [featuredDetail, originalModalUrl]);

  function openDetailModal(item: FeaturedProductCard) {
    setFeaturedDetail(item);
    setOriginalModalUrl(null);

    if (detailStripRef.current) {
      detailStripRef.current.scrollLeft = 0;
    }
  }

  function scrollDetailImages(direction: "left" | "right") {
    if (!detailStripRef.current) return;
    const delta = direction === "left" ? -220 : 220;
    detailStripRef.current.scrollBy({ left: delta, behavior: "smooth" });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadFeaturedProducts() {
      setLoadingFeatured(true);
      try {
        // Use the paged endpoint (same as the customer products page) — it
        // returns productIngredients, so calories/ingredients/allergens shown
        // here stay consistent with the product detail modal.
        const response = await catalogApi.pageProducts({ page: 0, size: 200, sort: "createdAt,desc" });
        if (cancelled) return;

        const activeProducts = (response.items ?? []).filter((product) => product.status === "ACTIVE");
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

            const decodedDescription = decodeDescription(product.description);
            const desc = trimDescription(decodedDescription);
            const supplementalInfo = extractSupplementalInfo(product);

            return {
              id: product.id,
              name: product.name,
              desc,
              fullDesc: decodedDescription || "（無描述）",
              price: formatPrice(product),
              ingredients: supplementalInfo.ingredients,
              calories: supplementalInfo.calories,
              allergens: supplementalInfo.allergens,
              image,
              actionTo: `/customer/products?action=group&productId=${encodeURIComponent(product.id)}`,
            };
          })
          .filter((item): item is FeaturedProductCard => item !== null);

        const nextDetailImageByProductId = finalProducts.reduce<Record<string, DetailPreviewItem[]>>((acc, product, index) => {
          const images = imageResults[index]?.status === "fulfilled" ? imageResults[index].value : [];
          const detailItems = buildDetailPreviewItems(images);
          if (detailItems.length > 0) {
            acc[product.id] = detailItems;
          }
          return acc;
        }, {});

        const nextOriginalImageByProductId = finalProducts.reduce<Record<string, string>>((acc, product, index) => {
          const images = imageResults[index]?.status === "fulfilled" ? imageResults[index].value : [];
          const originalUrl = pickOriginalImage(images);
          if (originalUrl) {
            acc[product.id] = originalUrl;
          }
          return acc;
        }, {});

        setFeaturedProducts(nextCards);
        setDetailImageByProductId(nextDetailImageByProductId);
        setOriginalImageByProductId(nextOriginalImageByProductId);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setFeaturedProducts([]);
          setDetailImageByProductId({});
          setOriginalImageByProductId({});
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

  const featuredDetailImages = featuredDetail ? detailImageByProductId[featuredDetail.id] ?? [] : [];
  const shouldCenterDetailImages = featuredDetailImages.length > 0 && featuredDetailImages.length < 3;
  const showGalleryNav = featuredDetailImages.length > 1;

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
          <h1 className="hero-title">純粹手作<br />法式甜點</h1>
          <p className="hero-subtitle">無人工香料，無防腐劑。以細緻奶油香與低糖配方，呈現適合日常與送禮的法式甜點。</p>
          <div className="hero-actions">
            <Link to="/customer/products" className="hero-btn hero-btn-primary">
              立即選購
            </Link>
            <Link to="/order-guide" className="hero-btn hero-btn-secondary">
              先看訂購流程
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section home-band home-band--milk">
        <div className="home-section-head">
          <h2>本週熱賣</h2>
          <span>店內最受歡迎的甜點風味</span>
        </div>

        {loadingFeatured && featuredProducts.length === 0 ? (
          <div style={{ color: "#6f5f50", fontSize: 14 }}>熱門商品載入中...</div>
        ) : featuredProducts.length === 0 ? (
          <div style={{ color: "#6f5f50", fontSize: 14 }}>目前尚未設定首頁熱賣商品。</div>
        ) : (
          <div className="featured-grid">
            {featuredProducts.map((item) => (
              <article key={item.id} className="featured-card customer-product-card" onClick={() => openDetailModal(item)}>
                <img src={item.image} alt={item.name} style={{ cursor: "zoom-in" }} />
                <div className="featured-body">
                  <h3>{item.name}</h3>
                  <p>{item.desc}</p>
                  <strong className="featured-price">{item.price}</strong>
                  <Link
                    to={item.actionTo}
                    className="featured-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    立即預購
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── 品牌理念 ── */}
      <section className="home-section home-band home-band--green brand-story">
        <p className="brand-story-kicker">Mermaid × Madeleine</p>
        <h2 className="brand-story-title">MERDELEINE</h2>
        <p className="brand-story-text">
          MERDELEINE 來自 Mermaid 與 Madeleine 的結合，象徵純粹、優雅與手作甜點的細緻工藝。每一份甜點皆選用天然食材製作，不添加人工香料與防腐劑，將溫柔甜點融入日常生活。
        </p>
      </section>

      {/* ── 訂購流程 ── */}
      <section className="home-section home-band home-band--cream" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ margin: 0, marginBottom: 6, fontSize: 32, fontWeight: 700, color: "#4a321f" }}>訂購流程</h2>
          <p style={{ margin: 0, fontSize: 14, color: "#888" }}>五個步驟，從挑選到取貨</p>
        </div>

        <div className="order-flow-grid">
          {ORDER_FLOW_STEPS.map((item, index) => (
            <div key={item.step} className="order-flow-node">
              <div
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  padding: 20,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: item.color,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  {item.step}
                </div>
                <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16, fontWeight: 600, color: "#4a321f" }}>
                  {item.title}
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: "#777", lineHeight: 1.6 }}>
                  {item.desc}
                </p>
              </div>

              {index < ORDER_FLOW_STEPS.length - 1 && (
                <div className="order-flow-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M5 12h11" />
                    <path d="m13 7 6 5-6 5" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── 聯絡我們 ── */}
      <section className="home-section home-band home-band--milk" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, marginBottom: 6, fontSize: 32, fontWeight: 700, color: "#4a321f" }}>聯絡我們</h2>
          <p style={{ margin: 0, fontSize: 14, color: "#888" }}>有任何問題歡迎透過以下方式與我們聯繫</p>
        </div>
        <div className="home-contact-grid">
          {/* LINE */}
          <a
            href="https://line.me/ti/p/~@490ajoi"
            target="_blank"
            rel="noopener noreferrer"
            className="home-contact-card"
          >
            <div className="home-contact-icon" style={{ background: "#06C755" }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M12 2C6.48 2 2 5.92 2 10.72c0 3.1 1.73 5.83 4.35 7.5-.14.53-.52 1.93-.6 2.23-.09.38.14.37.3.27.12-.08 1.96-1.3 2.76-1.82.37.05.75.08 1.19.08 5.52 0 10-3.92 10-8.76C20 5.92 17.52 2 12 2z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#4a321f", marginBottom: 2 }}>LINE 官方帳號</div>
              <div style={{ fontSize: 13, color: "#888" }}>@490ajoi</div>
            </div>
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/merdeleine.tw"
            target="_blank"
            rel="noopener noreferrer"
            className="home-contact-card"
          >
            <div className="home-contact-icon" style={{ background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#4a321f", marginBottom: 2 }}>Instagram</div>
              <div style={{ fontSize: 13, color: "#888" }}>@merdeleine.tw</div>
            </div>
          </a>

          {/* Email */}
          <a
            href="mailto:merdeleine.tw@gmail.com"
            className="home-contact-card"
          >
            <div className="home-contact-icon" style={{ background: "#c0855a" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#4a321f", marginBottom: 2 }}>電子郵件</div>
              <div style={{ fontSize: 13, color: "#888" }}>merdeleine.tw@gmail.com</div>
            </div>
          </a>

          {/* 服務時間 */}
          <div className="home-contact-card" style={{ cursor: "default" }}>
            <div className="home-contact-icon" style={{ background: "#a0845c" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#4a321f", marginBottom: 2 }}>服務時間</div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>週五 19:00 以後<br />週六 &amp; 週日</div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section" style={{ paddingTop: 8 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            fontSize: 13,
            color: "#6f5f50",
          }}
        >
          <button
            type="button"
            onClick={() => setOpenModal("privacy")}
            style={{
              background: "none",
              border: "none",
              color: "#6f5f50",
              fontSize: 13,
              cursor: "pointer",
              padding: 0,
              textDecoration: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            隱私權政策
          </button>
          <button
            type="button"
            onClick={() => setOpenModal("terms")}
            style={{
              background: "none",
              border: "none",
              color: "#6f5f50",
              fontSize: 13,
              cursor: "pointer",
              padding: 0,
              textDecoration: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            服務條款
          </button>
          <button
            type="button"
            onClick={() => setOpenModal("data-deletion")}
            style={{
              background: "none",
              border: "none",
              color: "#6f5f50",
              fontSize: 13,
              cursor: "pointer",
              padding: 0,
              textDecoration: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            資料刪除說明
          </button>
        </div>
      </section>

      {featuredDetail && (
        <div
          className="customer-modal-backdrop home-featured-detail-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            overflowY: "auto",
            zIndex: 120,
          }}
          onClick={() => {
            setFeaturedDetail(null);
            setOriginalModalUrl(null);
          }}
        >
          <div
            className="customer-modal-panel home-featured-detail-modal"
            style={{
              width: "100%",
              maxWidth: 680,
              maxHeight: "calc(100dvh - 32px)",
              overflowY: "auto",
              overflowX: "hidden",
              background: "#FFFDF9",
              borderRadius: 28,
              padding: "20px 20px 24px",
              position: "relative",
              boxShadow: "0 24px 70px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setFeaturedDetail(null);
                setOriginalModalUrl(null);
              }}
              aria-label="關閉視窗"
              title="關閉"
              className="modal-close-btn"
            >
              ×
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#4a321f" }}>商品詳細</div>
            </div>

            <div
              className="home-detail-gallery"
              style={{
                width: "100%",
                height: 220,
                borderRadius: 16,
                overflow: "hidden",
                background: "#F4F6F0",
                border: "1px solid rgba(199, 212, 199, 0.6)",
                position: "relative",
              }}
            >
              {featuredDetailImages.length ? (
                <>
                  {showGalleryNav && (
                    <button
                      type="button"
                      aria-label="上一張"
                      onClick={() => scrollDetailImages("left")}
                      className="home-detail-gallery-nav home-detail-gallery-nav-left"
                    >
                      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                        <path d="M12.5 4.5 7 10l5.5 5.5" />
                      </svg>
                    </button>
                  )}

                  <div
                    ref={detailStripRef}
                    className={`home-detail-gallery-strip${shouldCenterDetailImages ? " is-centered" : ""}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      overflowX: "auto",
                      overflowY: "hidden",
                      display: "flex",
                      gap: 8,
                      padding: "14px 46px",
                      boxSizing: "border-box",
                      scrollBehavior: "smooth",
                    }}
                  >
                    {featuredDetailImages.map((item, index) => (
                      <div
                        key={`${featuredDetail.id}-${index}`}
                        style={{
                          width: 190,
                          height: 190,
                          borderRadius: 10,
                          overflow: "hidden",
                          border: "1px solid rgba(199, 212, 199, 0.5)",
                          background: "#FFFDF9",
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={item.detailUrl}
                          alt={`${featuredDetail.name}-detail-${index + 1}`}
                          onClick={() => {
                            setOriginalModalUrl(item.originalUrl || originalImageByProductId[featuredDetail.id] || null);
                          }}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                            cursor: "zoom-in",
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {showGalleryNav && (
                    <button
                      type="button"
                      aria-label="下一張"
                      onClick={() => scrollDetailImages("right")}
                      className="home-detail-gallery-nav home-detail-gallery-nav-right"
                    >
                      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                        <path d="M7.5 4.5 13 10l-5.5 5.5" />
                      </svg>
                    </button>
                  )}
                </>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    color: "#999",
                  }}
                >
                  暫無 DETAIL 圖片
                </div>
              )}
            </div>

            {originalModalUrl && (
              <div
                className="customer-modal-backdrop customer-original-modal-backdrop"
                style={{
                  position: "fixed",
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.65)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                  zIndex: 130,
                }}
                onClick={() => setOriginalModalUrl(null)}
              >
                <div
                  className="customer-modal-panel customer-original-modal"
                  style={{
                    width: "min(92vw, 1200px)",
                    height: "min(88vh, 860px)",
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "#111",
                    border: "1px solid rgba(255,255,255,0.18)",
                    position: "relative",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setOriginalModalUrl(null)}
                    aria-label="關閉視窗"
                    title="關閉"
                    className="modal-close-btn modal-close-btn-dark"
                  >
                    ×
                  </button>
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 8,
                      boxSizing: "border-box",
                    }}
                  >
                    <img
                      src={originalModalUrl}
                      alt={`${featuredDetail.name}-original`}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        width: "auto",
                        height: "auto",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 14, fontSize: 18, fontWeight: 700, color: "#4A2E1F", lineHeight: 1.35 }}>{featuredDetail.name}</div>
            <div
              style={{
                marginTop: 10,
                display: "inline-flex",
                alignItems: "baseline",
                gap: 6,
                background: "#F7F2EC",
                border: "1px solid rgba(200, 169, 119, 0.3)",
                borderRadius: 999,
                padding: "7px 12px",
              }}
            >
              <span style={{ fontSize: 13, color: "#8A7A68", fontWeight: 600 }}>售價</span>
              <span style={{ fontSize: 14, color: "#7A4A2A", fontWeight: 800 }}>{featuredDetail.price}</span>
            </div>

            {(() => {
              const ingredientTags = splitInfoTags(featuredDetail.ingredients);
              const allergenTags = splitInfoTags(featuredDetail.allergens);
              return (
                <div
                  style={{
                    marginTop: 20,
                    display: "grid",
                    gap: 18,
                    padding: "20px 20px",
                    borderRadius: 20,
                    background: "linear-gradient(135deg, #F7F2EC 0%, #E3EBE3 100%)",
                    border: "1px solid rgba(199, 212, 199, 0.75)",
                  }}
                >
                  {/* 成分 */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "#2F4A3F", marginBottom: 6 }}>成分</div>
                    {ingredientTags.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {ingredientTags.map((tag, i) => (
                          <span key={i} style={{ background: "rgba(255, 253, 249, 0.9)", color: "#2F4A3F", borderRadius: 999, padding: "3px 10px", fontSize: 12, border: "1px solid #C7D4C7" }}>{tag}</span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: "#8A7A68" }}>尚未提供</div>
                    )}
                  </div>

                  {/* 過敏原 */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "#2F4A3F", marginBottom: 6 }}>過敏原</div>
                    {allergenTags.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {allergenTags.map((tag, i) => (
                          <span key={i} style={{ background: "#E3EBE3", color: "#103A33", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600, border: "1px solid #C7D4C7" }}>{tag}</span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: "#8A7A68" }}>尚未提供</div>
                    )}
                  </div>

                  {/* 熱量 */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "#2F4A3F" }}>熱量</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#2F4A3F" }}>{featuredDetail.calories}</span>
                  </div>
                </div>
              );
            })()}

            {featuredDetail.fullDesc && featuredDetail.fullDesc !== "（無描述）" && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "#2F4A3F", marginBottom: 8 }}>商品介紹</div>
                <div style={{ fontSize: 14, lineHeight: 1.8, color: "#4A2E1F", whiteSpace: "pre-wrap", overflowWrap: "break-word", wordBreak: "break-word" }}>
                  {featuredDetail.fullDesc}
                </div>
              </div>
            )}
            <div className="home-featured-detail-actions" style={{ marginTop: 14 }}>
              <Link to={featuredDetail.actionTo} className="hero-btn hero-btn-primary home-featured-detail-cta" onClick={() => setFeaturedDetail(null)}>
                加入清單
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── 隱私權政策 Modal ── */}
      {openModal === "privacy" && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.42)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: 16,
          }}
          onClick={() => setOpenModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(600px, 100%)",
              maxHeight: "80vh",
              overflow: "auto",
              background: "#fff",
              borderRadius: 10,
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
              padding: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#4a321f" }}>隱私權政策</h3>
              <button
                type="button"
                onClick={() => setOpenModal(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 24,
                  cursor: "pointer",
                  color: "#999",
                }}
                aria-label="close"
              >
                ×
              </button>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.8, color: "#5b442f" }}>
              <p>歡迎使用 Merdeleine（以下簡稱「本網站」）。</p>
              <p>當您使用本網站（包含透過 Google、LINE 登入）時，我們可能會收集以下資訊：</p>
              <h4>1. 收集的資料</h4>
              <ul>
                <li>基本資料：姓名、Email、頭像（由第三方登入提供）</li>
                <li>訂單資訊：購買商品、配送地址、聯絡電話</li>
                <li>系統資料：IP、裝置資訊（用於安全與分析）</li>
              </ul>
              <h4>2. 資料用途</h4>
              <p>我們會將您的資料用於：</p>
              <ul>
                <li>建立與管理會員帳號</li>
                <li>訂單處理與客服聯繫</li>
                <li>系統安全與防詐騙</li>
              </ul>
              <h4>3. 第三方服務</h4>
              <p>我們可能使用以下服務：</p>
              <ul>
                <li>Google / LINE（登入驗證）</li>
              </ul>
              <p>這些服務可能依其政策處理您的資料。</p>
              <h4>4. 資料保護</h4>
              <p>我們採取合理技術措施保護您的個人資料。</p>
              <h4>5. 資料刪除</h4>
              <p>您可以隨時聯繫我們要求刪除資料。</p>
              <h4>6. 聯絡方式</h4>
              <p>Email: merdeleine.tw@gmail.com</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 服務條款 Modal ── */}
      {openModal === "terms" && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.42)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: 16,
          }}
          onClick={() => setOpenModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(600px, 100%)",
              maxHeight: "80vh",
              overflow: "auto",
              background: "#fff",
              borderRadius: 10,
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
              padding: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#4a321f" }}>服務條款</h3>
              <button
                type="button"
                onClick={() => setOpenModal(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 24,
                  cursor: "pointer",
                  color: "#999",
                }}
                aria-label="close"
              >
                ×
              </button>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.8, color: "#5b442f" }}>
              <p>歡迎使用 Merdeleine。</p>
              <h4>1. 帳號使用</h4>
              <p>您可以透過 Google、LINE 登入本網站。</p>
              <p>您需確保帳號資訊正確。</p>
              <h4>2. 訂單與付款</h4>
              <p>所有訂單須經付款完成後才成立。</p>
              <p>本網站保留訂單審核與取消權利。</p>
              <h4>3. 商品與配送</h4>
              <p>商品為手工製作，可能略有差異。</p>
              <p>配送時間依實際狀況為準。</p>
              <h4>4. 責任限制</h4>
              <p>本網站不對以下情況負責：</p>
              <ul>
                <li>不可抗力（天災、物流延誤）</li>
                <li>第三方服務問題（如 PayPal）</li>
              </ul>
              <h4>5. 修改權利</h4>
              <p>本網站保留修改服務內容與條款之權利。</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 資料刪除說明 Modal ── */}
      {openModal === "data-deletion" && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.42)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: 16,
          }}
          onClick={() => setOpenModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(600px, 100%)",
              maxHeight: "80vh",
              overflow: "auto",
              background: "#fff",
              borderRadius: 10,
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
              padding: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#4a321f" }}>資料刪除說明</h3>
              <button
                type="button"
                onClick={() => setOpenModal(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 24,
                  cursor: "pointer",
                  color: "#999",
                }}
                aria-label="close"
              >
                ×
              </button>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.8, color: "#5b442f" }}>
              <p>如需刪除透過 Facebook 登入所建立的帳號資料，請來信：</p>
              <p>
                <strong>merdeleine.tw@gmail.com</strong>
              </p>
              <p>請提供你的登入 Email，我們會協助刪除帳號與相關個人資料。</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
