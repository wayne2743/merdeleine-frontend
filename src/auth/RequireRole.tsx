import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import type { Role } from "../types/auth";

export default function RequireRole({ allow }: { allow: Role[] }) {
  const { status, roles } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <div style={{ padding: 16 }}>權限檢查中...</div>;
  }

  // 關鍵：未登入直接回 login，而不是掉到 forbidden
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 可同時支援 USER 與 ROLE_USER
  const ok = allow.some((r) => roles.includes(r) || roles.includes("ROLE_" + r));

  if (!ok) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}