import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function LoginPage() {
  const { status, loginWithGoogle } = useAuth();

  if (status === "authenticated") return <Navigate to="/customer/products" replace />;

  return (
    <div className="page-container">
      <h2>登入</h2>
      <p>請先使用 Google 登入。</p>
      <button onClick={loginWithGoogle}>使用 Google 登入</button>
    </div>
  );
}