import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function RoleHomeRedirect() {
  const { status, roles } = useAuth();

  if (status === "loading") return <div style={{ padding: 16 }}>載入中...</div>;
  if (status === "anonymous") return <Navigate to="/login" replace />;

  if (roles.includes("ADMIN")) return <Navigate to="/admin" replace />;
  return <Navigate to="/customer/products" replace />;
}