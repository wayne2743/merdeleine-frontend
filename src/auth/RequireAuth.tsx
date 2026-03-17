import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <div style={{ padding: 16 }}>登入狀態載入中...</div>;
  if (status === "anonymous") return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}