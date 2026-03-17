import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link${isActive ? " is-active" : ""}`;

export default function NavBar() {
  const location = useLocation();
  const { user, roles, status, logout, loginWithGoogle } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isUser = roles.includes("USER");
  const isAdmin = roles.includes("ADMIN");
  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
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
                <NavLink to="/admin" className={navLinkClass}>
                  後台：總覽
                </NavLink>
                <NavLink to="/admin/sell-windows" className={navLinkClass}>
                  後台：檔期管理
                </NavLink>
                <NavLink to="/admin/confirm" className={navLinkClass}>
                  後台：Confirm 成團
                </NavLink>
                <NavLink to="/admin/production" className={navLinkClass}>
                  後台：生產工單
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
              <button onClick={loginWithGoogle}>Google 登入</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}