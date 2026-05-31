import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";

export type ModalImage = {
  detailUrl: string;
  originalUrl: string | null;
};

export type ModalCta = {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export type ProductDetailModalProps = {
  open: boolean;
  name: string;
  price: string;
  ingredients: string;
  allergens: string;
  calories: string;
  description: string;
  images: ModalImage[];
  isLoadingIngredients?: boolean;
  cta?: ModalCta;
  onClose: () => void;
};

const GALLERY_ITEM_STEP = 198; // 190px image + 8px gap

function splitTags(raw: string): string[] {
  if (!raw) return [];
  return raw.split(/[,，、]/).map((t) => t.trim()).filter(Boolean);
}

export default function ProductDetailModal({
  open,
  name,
  price,
  ingredients,
  allergens,
  calories,
  description,
  images,
  isLoadingIngredients = false,
  cta,
  onClose,
}: ProductDetailModalProps) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  const multiImage = images.length > 1;
  const ingredientTags = splitTags(ingredients);
  const allergenTags = splitTags(allergens);

  useEffect(() => {
    if (!open) {
      setActiveIndex(0);
      setOriginalUrl(null);
    }
  }, [open]);

  if (!open) return null;

  function scroll(dir: "left" | "right") {
    if (!stripRef.current) return;
    stripRef.current.scrollBy({ left: dir === "left" ? -GALLERY_ITEM_STEP : GALLERY_ITEM_STEP, behavior: "smooth" });
  }

  function handleStripScroll() {
    if (!stripRef.current) return;
    setActiveIndex(Math.round(stripRef.current.scrollLeft / GALLERY_ITEM_STEP));
  }

  function scrollToIndex(index: number) {
    if (!stripRef.current) return;
    stripRef.current.scrollTo({ left: index * GALLERY_ITEM_STEP, behavior: "smooth" });
  }

  return (
    <>
      <div
        className="customer-modal-backdrop customer-detail-modal-backdrop"
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
        onClick={onClose}
      >
        <div
          className="customer-modal-panel customer-detail-modal"
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
            onClick={onClose}
            aria-label="關閉視窗"
            title="關閉"
            className="modal-close-btn"
          >
            ×
          </button>

          <div style={{ fontWeight: 800, fontSize: 14, color: "#4a321f", marginBottom: 12 }}>
            商品詳細
          </div>

          {/* Gallery */}
          <div
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
            {images.length > 0 ? (
              <>
                {multiImage && (
                  <button
                    type="button"
                    aria-label="上一張"
                    onClick={() => scroll("left")}
                    className="gallery-nav-btn gallery-nav-btn--left"
                    style={{
                      position: "absolute",
                      left: 16,
                      top: "50%",
                      transform: "translateY(-50%)",
                      zIndex: 10,
                      width: 48,
                      height: 48,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false" style={{ display: "block", flexShrink: 0 }}>
                      <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}

                <div
                  ref={stripRef}
                  onScroll={handleStripScroll}
                  className="product-detail-gallery-strip"
                  style={{
                    width: "100%",
                    height: "100%",
                    overflowX: multiImage ? "auto" : "hidden",
                    overflowY: "hidden",
                    display: "flex",
                    justifyContent: multiImage ? "flex-start" : "center",
                    gap: 8,
                    padding: multiImage ? "14px 46px" : "14px",
                    boxSizing: "border-box",
                  }}
                >
                  {images.map((img, i) => (
                    <div
                      key={i}
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
                        src={img.detailUrl}
                        alt={`${name}-detail-${i + 1}`}
                        onClick={() => setOriginalUrl(img.originalUrl)}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                          cursor: img.originalUrl ? "zoom-in" : "default",
                        }}
                      />
                    </div>
                  ))}
                </div>

                {multiImage && (
                  <button
                    type="button"
                    aria-label="下一張"
                    onClick={() => scroll("right")}
                    className="gallery-nav-btn gallery-nav-btn--right"
                    style={{
                      position: "absolute",
                      right: 16,
                      top: "50%",
                      transform: "translateY(-50%)",
                      zIndex: 10,
                      width: 48,
                      height: 48,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false" style={{ display: "block", flexShrink: 0 }}>
                      <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </>
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#999" }}>
                暫無 DETAIL 圖片
              </div>
            )}
          </div>

          {/* Pagination dots */}
          {multiImage && (
            <div className="gallery-dots" role="tablist" aria-label="商品圖片導覽">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={`第 ${i + 1} 張圖片`}
                  onClick={() => scrollToIndex(i)}
                  className={`gallery-dot${i === activeIndex ? " is-active" : ""}`}
                />
              ))}
            </div>
          )}

          {/* Name */}
          <div style={{ marginTop: 14, fontSize: 18, fontWeight: 800, color: "#4A2E1F", lineHeight: 1.35 }}>
            {name}
          </div>

          {/* Pill price */}
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
            <span style={{ fontSize: 14, color: "#7A4A2A", fontWeight: 800 }}>{price}</span>
          </div>

          {/* Sage info card */}
          <div
            style={{
              marginTop: 20,
              display: "grid",
              gap: 14,
              padding: "16px 18px",
              borderRadius: 20,
              background: "linear-gradient(135deg, #F7F2EC 0%, #E3EBE3 100%)",
              border: "1px solid rgba(199, 212, 199, 0.75)",
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "#2F4A3F", marginBottom: 6 }}>成分</div>
              {isLoadingIngredients ? (
                <div style={{ fontSize: 13, color: "#8A7A68" }}>載入中…</div>
              ) : ingredientTags.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ingredientTags.map((tag, i) => (
                    <span key={i} style={{ background: "rgba(255, 253, 249, 0.9)", color: "#2F4A3F", borderRadius: 999, padding: "3px 10px", fontSize: 12, border: "1px solid #C7D4C7" }}>{tag}</span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#8A7A68" }}>尚未提供</div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "#2F4A3F", marginBottom: 6 }}>過敏原</div>
              {isLoadingIngredients ? (
                <div style={{ fontSize: 13, color: "#8A7A68" }}>載入中…</div>
              ) : allergenTags.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {allergenTags.map((tag, i) => (
                    <span key={i} style={{ background: "#E3EBE3", color: "#103A33", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600, border: "1px solid #C7D4C7" }}>{tag}</span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#8A7A68" }}>尚未提供</div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "#2F4A3F" }}>熱量</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#2F4A3F" }}>
                {isLoadingIngredients ? "載入中…" : calories}
              </span>
            </div>
          </div>

          {/* Description */}
          {description && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "#2F4A3F", marginBottom: 8 }}>商品介紹</div>
              <div style={{ fontSize: 14, lineHeight: 1.8, color: "#4A2E1F", whiteSpace: "pre-wrap", overflowWrap: "break-word", wordBreak: "break-word" }}>
                {description}
              </div>
            </div>
          )}

          {/* Sticky CTA */}
          {cta && (
            <div className="product-detail-modal-cta-bar">
              {cta.href ? (
                <Link
                  to={cta.href}
                  className="product-detail-modal-cta"
                  onClick={cta.onClick}
                >
                  {cta.label}
                </Link>
              ) : (
                <button
                  type="button"
                  className="product-detail-modal-cta"
                  onClick={cta.onClick}
                  disabled={cta.disabled}
                >
                  {cta.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {originalUrl && (
        <div
          className="customer-modal-backdrop customer-original-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 130,
          }}
          onClick={() => setOriginalUrl(null)}
        >
          <div
            className="customer-modal-panel customer-original-modal"
            style={{
              width: "min(92vw,1200px)",
              height: "min(88vh,860px)",
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
              onClick={() => setOriginalUrl(null)}
              aria-label="關閉視窗"
              title="關閉"
              className="modal-close-btn modal-close-btn-dark"
            >
              ×
            </button>
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, boxSizing: "border-box" }}>
              <img
                src={originalUrl}
                alt={`${name}-original`}
                style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", display: "block" }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
