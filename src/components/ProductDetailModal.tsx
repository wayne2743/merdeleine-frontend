import { useRef, useState } from "react";

export type DetailImage = {
  detailUrl: string;
  originalUrl: string | null;
};

export type ProductDetailModalProps = {
  name: string;
  price: string;
  ingredients: string;
  allergens: string;
  calories: string;
  description: string;
  images: DetailImage[];
  isLoadingIngredients?: boolean;
  onClose: () => void;
};

function splitTags(raw: string): string[] {
  if (!raw || raw === "（無描述）") return [];
  return raw.split(/[,，、]/).map((t) => t.trim()).filter(Boolean);
}

export default function ProductDetailModal({
  name,
  price,
  ingredients,
  allergens,
  calories,
  description,
  images,
  isLoadingIngredients = false,
  onClose,
}: ProductDetailModalProps) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  const multiImage = images.length > 1;

  function scroll(dir: "left" | "right") {
    if (!stripRef.current) return;
    stripRef.current.scrollBy({ left: dir === "left" ? -210 : 210, behavior: "smooth" });
  }

  const ingredientTags = splitTags(ingredients);
  const allergenTags = splitTags(allergens);

  return (
    <>
      {/* Backdrop */}
      <div
        className="customer-modal-backdrop product-detail-modal-backdrop"
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
        {/* Panel */}
        <div
          className="customer-modal-panel product-detail-modal-panel"
          style={{
            width: "100%",
            maxWidth: 680,
            maxHeight: "calc(100dvh - 32px)",
            overflowY: "auto",
            overflowX: "hidden",
            background: "#fff",
            borderRadius: 16,
            padding: "20px 20px 24px",
            position: "relative",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉視窗"
            title="關閉"
            className="modal-close-btn"
          >
            ×
          </button>

          {/* Title */}
          <div style={{ fontWeight: 800, fontSize: 20, color: "#4a321f", marginBottom: 16 }}>
            商品詳細
          </div>

          {/* Gallery */}
          <div
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
            {images.length > 0 ? (
              <>
                {multiImage && (
                  <button
                    type="button"
                    aria-label="上一張"
                    onClick={() => scroll("left")}
                    style={{
                      position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                      zIndex: 2, width: 40, height: 40, borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.7)",
                      background: "linear-gradient(135deg,#5c3d20 0%,#3e2710 100%)",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.4)", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    <span aria-hidden="true" style={{ color: "#fff", fontSize: 28, fontWeight: 900, lineHeight: 1, textShadow: "0 1px 3px rgba(0,0,0,0.45)", marginTop: -2 }}>‹</span>
                  </button>
                )}

                <div
                  ref={stripRef}
                  style={{
                    width: "100%", height: "100%",
                    overflowX: multiImage ? "auto" : "hidden", overflowY: "hidden",
                    display: "flex",
                    justifyContent: multiImage ? "flex-start" : "center",
                    gap: 8,
                    padding: multiImage ? "14px 46px" : "14px",
                    boxSizing: "border-box", scrollBehavior: "smooth",
                  }}
                >
                  {images.map((img, i) => (
                    <div
                      key={i}
                      style={{
                        width: 190, height: 190, borderRadius: 10, overflow: "hidden",
                        border: "1px solid #eee", background: "#fff", flexShrink: 0,
                      }}
                    >
                      <img
                        src={img.detailUrl}
                        alt={`${name}-detail-${i + 1}`}
                        onClick={() => setOriginalUrl(img.originalUrl)}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: img.originalUrl ? "zoom-in" : "default" }}
                      />
                    </div>
                  ))}
                </div>

                {multiImage && (
                  <button
                    type="button"
                    aria-label="下一張"
                    onClick={() => scroll("right")}
                    style={{
                      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                      zIndex: 2, width: 40, height: 40, borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.7)",
                      background: "linear-gradient(135deg,#5c3d20 0%,#3e2710 100%)",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.4)", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    <span aria-hidden="true" style={{ color: "#fff", fontSize: 28, fontWeight: 900, lineHeight: 1, textShadow: "0 1px 3px rgba(0,0,0,0.45)", marginTop: -2 }}>›</span>
                  </button>
                )}
              </>
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#999" }}>
                暫無 DETAIL 圖片
              </div>
            )}
          </div>

          {/* Name & price */}
          <div style={{ marginTop: 18, fontSize: 22, fontWeight: 800, color: "#3d2c1f", lineHeight: 1.3 }}>
            {name}
          </div>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700, color: "#8c5425" }}>
            {price}
          </div>

          {/* Info card */}
          <div
            style={{
              marginTop: 20, display: "grid", gap: 18,
              padding: "20px", borderRadius: 14,
              background: "#faf6f0", border: "1px solid #ece0cf",
            }}
          >
            {/* 成分 */}
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.04em", color: "#a07d54", marginBottom: 10 }}>成分</div>
              {isLoadingIngredients ? (
                <div style={{ fontSize: 14, color: "#b0a090" }}>載入中…</div>
              ) : ingredientTags.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {ingredientTags.map((tag, i) => (
                    <span key={i} style={{ background: "#fff", color: "#5b442f", borderRadius: 999, padding: "7px 16px", fontSize: 15, border: "1px solid #e3d3bd" }}>{tag}</span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 15, color: "#8a7560" }}>尚未提供</div>
              )}
            </div>

            {/* 過敏原 */}
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.04em", color: "#a07d54", marginBottom: 10 }}>過敏原</div>
              {isLoadingIngredients ? (
                <div style={{ fontSize: 14, color: "#b0a090" }}>載入中…</div>
              ) : allergenTags.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {allergenTags.map((tag, i) => (
                    <span key={i} style={{ background: "#fdf0ec", color: "#b5532e", borderRadius: 999, padding: "7px 16px", fontSize: 15, fontWeight: 600, border: "1px solid #f1cdbf" }}>{tag}</span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 15, color: "#8a7560" }}>尚未提供</div>
              )}
            </div>

            {/* 熱量 */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.04em", color: "#a07d54" }}>熱量</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: "#5b442f" }}>
                {isLoadingIngredients ? "載入中…" : calories}
              </span>
            </div>
          </div>

          {/* 商品介紹 */}
          {description && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.04em", color: "#a07d54", marginBottom: 10 }}>商品介紹</div>
              <div style={{ fontSize: 16, lineHeight: 1.9, color: "#54402d", whiteSpace: "pre-wrap", overflowWrap: "break-word", wordBreak: "break-word" }}>
                {description}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Original image lightbox */}
      {originalUrl && (
        <div
          className="customer-modal-backdrop customer-original-modal-backdrop"
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16, zIndex: 130,
          }}
          onClick={() => setOriginalUrl(null)}
        >
          <div
            className="customer-modal-panel customer-original-modal"
            style={{
              width: "min(92vw,1200px)", height: "min(88vh,860px)",
              borderRadius: 12, overflow: "hidden",
              background: "#111", border: "1px solid rgba(255,255,255,0.18)",
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
