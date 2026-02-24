import { NavLink } from "react-router-dom";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  padding: "8px 10px",
  borderRadius: 8,
  textDecoration: "none",
  color: isActive ? "white" : "#111",
  background: isActive ? "#111" : "transparent",
});

export default function NavBar() {
  return (
    <div style={{ borderBottom: "1px solid #eee" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 12, display: "flex", gap: 8 }}>
        <strong style={{ marginRight: 12 }}>merdeleine.tw</strong>
        <NavLink to="/customer/products" style={linkStyle}>
          客人：商品列表
        </NavLink>
        <NavLink to="/customer/sell-windows" style={linkStyle}>
          客人：檔期列表
        </NavLink>
        <NavLink to="/customer/orders" style={linkStyle}>
          客人：我的訂單
        </NavLink>

        <div style={{ flex: 1 }} />

        <NavLink to="/admin" style={linkStyle}>
          後台：總覽
        </NavLink>
        <NavLink to="/admin/sell-windows" style={linkStyle}>
          後台：檔期管理
        </NavLink>
        <NavLink to="/admin/confirm" style={linkStyle}>
          後台：Confirm 成團
        </NavLink>
        <NavLink to="/admin/production" style={linkStyle}>
          後台：生產工單
        </NavLink>
      </div>
    </div>
  );
}