import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link${isActive ? " is-active" : ""}`;

export default function NavBar() {
  const location = useLocation();
  const { user, roles, status, logout, loginWithGoogle, loginWithLine } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const isUser = roles.includes("USER");
  const isAdmin = roles.includes("ADMIN");
  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
    <div className="nav-shell">
      <div className="nav-inner">
        <NavLink to="/" className="nav-brand">
          merdeleine.tw
        </NavLink>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={isMenuOpen}
          aria-controls="main-nav-menu"
          onClick={() => setIsMenuOpen((prev) => !prev)}
        >
          選單
        </button>

        <div id="main-nav-menu" className={`nav-menu${isMenuOpen ? " is-open" : ""}`}>
          <div className="nav-links">
            <NavLink to="/" className={navLinkClass}>
              首頁
            </NavLink>

            {isUser && (
              <>
                <NavLink to="/customer/products" className={navLinkClass}>
                  商品列表
                </NavLink>
                <NavLink to="/customer/sell-windows" className={navLinkClass}>
                  檔期列表
                </NavLink>
                <NavLink to="/customer/orders" className={navLinkClass}>
                  我的訂單
                </NavLink>
                <NavLink to="/customer/profile" className={navLinkClass}>
                  個人資料
                </NavLink>
              </>
            )}

            {isAdmin && (
              <>
                {/* <NavLink to="/admin" end className={navLinkClass}>
                  總覽
                </NavLink> */}
                <NavLink to="/admin/products" className={navLinkClass}>
                  商品管理
                </NavLink>
                <NavLink to="/admin/payments" className={navLinkClass}>
                  付款管理
                </NavLink>
                <NavLink to="/admin/sell-window-crud" className={navLinkClass}>
                  檔期管理
                </NavLink>
                <NavLink to="/admin/store-pickup-locations" className={navLinkClass}>
                  門市取貨點管理
                </NavLink>
                {/* <NavLink to="/admin/confirm" className={navLinkClass}>
                  後台：Confirm 成團
                </NavLink> */}
              </>
            )}
          </div>

          <div className="nav-spacer" />
          <div className="nav-auth">
            {isAuthenticated ? (
              <>
                <span className="nav-user">{user?.displayName ?? user?.email ?? ""}</span>
                <button onClick={() => void logout()}>登出</button>
              </>
            ) : (
              <button onClick={() => setIsLoginModalOpen(true)}>登入</button>
            )}
          </div>
        </div>
      </div>
    </div>

      {isLoginModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setIsLoginModalOpen(false)}
        >
          <div
            style={{
              background: "#2a2a20",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 16,
              padding: "32px 28px",
              width: "min(90vw, 340px)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e7dfd2", marginBottom: 4 }}>選擇登入方式</div>
            <button
              onClick={() => { loginWithGoogle(); setIsLoginModalOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "12px 20px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.06)",
                color: "#e7dfd2",
                fontSize: 15,
                cursor: "pointer",
                width: "100%",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.1 0 5.8 1.1 8 2.9l6-6C34.2 3.1 29.4 1 24 1 14.7 1 6.9 6.8 3.5 15l7 5.4C12.2 14 17.6 9.5 24 9.5z"/><path fill="#FBBC05" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.5 2.8-2.2 5.2-4.7 6.8l7.2 5.6c4.2-3.9 6.3-9.6 6.3-16.4z"/><path fill="#34A853" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.6l-7-5.4A23 23 0 0 0 1 24c0 3.7.9 7.2 2.5 10.3l7-5.7z"/><path fill="#4285F4" d="M24 47c5.4 0 10-1.8 13.3-4.8l-7.2-5.6c-1.8 1.2-4.1 2-6.1 2-6.4 0-11.8-4.3-13.5-10.1l-7 5.7C6.9 41.2 14.7 47 24 47z"/></svg>
              使用 Google 登入
            </button>
            <button
              onClick={() => { loginWithLine(); setIsLoginModalOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "12px 20px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "#06C755",
                color: "#fff",
                fontSize: 15,
                cursor: "pointer",
                width: "100%",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
              使用 LINE 登入
            </button>
            <button
              onClick={() => setIsLoginModalOpen(false)}
              style={{
                marginTop: 4,
                background: "none",
                border: "none",
                color: "#aaa",
                fontSize: 13,
                cursor: "pointer",
                padding: "4px 0",
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </>
  );
}