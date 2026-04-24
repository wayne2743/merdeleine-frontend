import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link${isActive ? " is-active" : ""}`;

export default function NavBar() {
  const location = useLocation();
  const { user, roles, status, logout, loginWithGoogle, loginWithFacebook } = useAuth();
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
              </>
            )}

            {isAdmin && (
              <>
                {/* <NavLink to="/admin" end className={navLinkClass}>
                  總覽
                </NavLink> */}
                <NavLink to="/admin/products" className={navLinkClass}>
                  商品管理
                </NavLink>                <NavLink to="/admin/payments" className={navLinkClass}>
                  後台：付款管理
                </NavLink>                <NavLink to="/admin/sell-window-crud" className={navLinkClass}>
                  檔期 CRUD
                </NavLink>
                {/* <NavLink to="/admin/confirm" className={navLinkClass}>
                  後台：Confirm 成團
                </NavLink> */}
                <NavLink to="/admin/production-planning" className={navLinkClass}>
                  生產規劃 CRUD
                </NavLink>
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
              onClick={() => { loginWithFacebook(); setIsLoginModalOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "12px 20px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "#1877F2",
                color: "#fff",
                fontSize: 15,
                cursor: "pointer",
                width: "100%",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.79-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
              使用 Facebook 登入
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