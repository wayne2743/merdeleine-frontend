import { NavLink } from "react-router-dom";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  padding: "8px 10px",
  borderRadius: 10,
  textDecoration: "none",
  color: isActive ? "#1a281f" : "#eadfbd",
  background: isActive
    ? "linear-gradient(180deg, #e2c37f 0%, #c79f52 100%)"
    : "rgba(255,255,255,0.04)",
  border: `1px solid ${isActive ? "#cda95e" : "rgba(205, 169, 94, 0.35)"}`,
  boxShadow: isActive ? "0 6px 14px rgba(0,0,0,0.28)" : "none",
});

export default function NavBar() {
  return (
    <div style={{ borderBottom: "1px solid rgba(207, 173, 102, 0.35)", background: "rgba(8,20,16,0.72)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <strong style={{ marginRight: 12, color: "#f0dfb3", letterSpacing: 0.5 }}>merdeleine.tw</strong>
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