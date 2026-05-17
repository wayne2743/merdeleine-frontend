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

      {/* ── 訂購流程 ── */}
      <section className="home-section" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ margin: 0, marginBottom: 6, fontSize: 32, fontWeight: 700, color: "#4a321f" }}>訂購流程</h2>
          <p style={{ margin: 0, fontSize: 14, color: "#888" }}>五個步驟，從挑選到取貨</p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          {[
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
          ].map((item) => (
            <div
              key={item.step}
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
          ))}
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
