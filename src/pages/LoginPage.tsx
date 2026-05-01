import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function LoginPage() {
  const { status, loginWithGoogle, loginWithLine } = useAuth();

  if (status === "authenticated") return <Navigate to="/customer/products" replace />;

  return (
    <div className="page-container">
      <h2>登入</h2>
      <p>請選擇登入方式。</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 280 }}>
        <button onClick={loginWithGoogle}>使用 Google 登入</button>
        <button onClick={loginWithLine}>使用 LINE 登入</button>
      </div>
    </div>
  );
}