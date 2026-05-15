import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { catalogApi } from "../api/catalogApi";
import type { Product, ProductImage } from "../types/domain";

type FeaturedProductCard = {
  id: string;
  name: string;
  desc: string;
  fullDesc: string;
  price: string;
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

export default function HomePage() {
  const season = getSeason();
  const hero = seasonalHero[season];
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProductCard[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [featuredDetail, setFeaturedDetail] = useState<FeaturedProductCard | null>(null);
  const [detailImageByProductId, setDetailImageByProductId] = useState<Record<string, DetailPreviewItem[]>>({});
  const [originalImageByProductId, setOriginalImageByProductId] = useState<Record<string, string>>({});
  const [originalModalUrl, setOriginalModalUrl] = useState<string | null>(null);
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
              fullDesc: decodeDescription(product.description) || "（無描述）",
              price: formatPrice(product),
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

      <section className="home-section">
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
                  <div className="featured-row">
                    <strong>{item.price}</strong>
                    <Link
                      to={item.actionTo}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      加入清單
                    </Link>
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
            color: "#6f5f50",
          }}
        >
          <Link to="/privacy-policy">隱私權政策</Link>
          <Link to="/terms">服務條款</Link>
          <Link to="/data-deletion">資料刪除說明</Link>
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
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              position: "relative",
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
              <div style={{ fontWeight: 800, fontSize: 16, color: "#4a321f" }}>商品詳細</div>
            </div>

            <div
              className="home-detail-gallery"
              style={{
                width: "100%",
                height: 220,
                borderRadius: 12,
                overflow: "hidden",
                background: "#f4f4f4",
                border: "1px solid #eee",
                position: "relative",
              }}
            >
              {detailImageByProductId[featuredDetail.id]?.length ? (
                <>
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

                  <div
                    ref={detailStripRef}
                    className="home-detail-gallery-strip"
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
                    {detailImageByProductId[featuredDetail.id].map((item, index) => (
                      <div
                        key={`${featuredDetail.id}-${index}`}
                        style={{
                          width: 190,
                          height: 190,
                          borderRadius: 10,
                          overflow: "hidden",
                          border: "1px solid #eee",
                          background: "#fff",
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

            <div style={{ marginTop: 14, fontSize: 18, fontWeight: 700, color: "#4a321f" }}>{featuredDetail.name}</div>
            <div style={{ marginTop: 8, fontSize: 14, color: "#5b442f" }}>售價：{featuredDetail.price}</div>
            <div style={{ marginTop: 8, fontSize: 13, color: "#6c5642", whiteSpace: "pre-wrap" }}>
              {featuredDetail.fullDesc}
            </div>
            <div style={{ marginTop: 14 }}>
              <Link to={featuredDetail.actionTo} className="hero-btn hero-btn-primary" onClick={() => setFeaturedDetail(null)}>
                加入清單
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
