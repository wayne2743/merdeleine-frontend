import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/authApi";
import { setTokenGetter } from "../api/http";
import type { AuthMeResponse, AuthUser, Role } from "../types/auth";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  token: string | null;
  roles: Role[];
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  /** 直接用後端回傳的 MeResponse 佔用 auth context（例如註冊後拿到新 JWT）*/
  applyAuthResponse: (data: AuthMeResponse) => void;
  hasRole: (role: Role) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isAuthMeResponse(data: unknown): data is AuthMeResponse {
  if (!data || typeof data !== "object") return false;

  const value = data as Partial<AuthMeResponse>;
  if (typeof value.id !== "string") return false;
  if (typeof value.email !== "string") return false;
  if (typeof value.displayName !== "string") return false;
  if (typeof value.provider !== "string") return false;
  if (!Array.isArray(value.roles)) return false;
  if (!value.roles.every((r) => typeof r === "string")) return false;
  if (typeof value.token !== "string" || value.token.trim() === "") return false;

  return true;
}

// axios 跟隨 302 後常拿到 HTML，這裡一律視為未登入
function looksLikeHtml(data: unknown): boolean {
  return (
    typeof data === "string" &&
    /<!doctype html|<html[\s>]|<head[\s>]|<body[\s>]/i.test(data)
  );
}

function normalizeRoles(rawRoles: string[]): string[] {
  return rawRoles.map((r) => (r.startsWith("ROLE_") ? r.slice(5) : r));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("accessToken"));

  const roles = user?.roles ?? [];

  function clearAuth() {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem("accessToken");
    setStatus("anonymous");
  }

  function applyAuthResponse(data: AuthMeResponse) {
    const normalized = normalizeRoles(data.roles);
    const { token: jwt, ...rest } = data;
    setUser({ ...rest, roles: normalized });
    setToken(jwt);
    sessionStorage.setItem("accessToken", jwt);
    setStatus("authenticated");
  }

  async function refreshMe() {
    try {
      const meUnknown = (await authApi.me()) as unknown;

      // /auth/me 被導去登入頁時，多半拿到 HTML，不可視為 authenticated
      if (looksLikeHtml(meUnknown)) {
        clearAuth();
        return;
      }

      if (!isAuthMeResponse(meUnknown)) {
        clearAuth();
        return;
      }

      const normalized = normalizeRoles(meUnknown.roles);
      const { token: jwt, ...rest } = meUnknown;

      setUser({ ...rest, roles: normalized });
      setToken(jwt);
      sessionStorage.setItem("accessToken", jwt);
      setStatus("authenticated");
    } catch {
      clearAuth();
    }
  }

  useEffect(() => {
    void refreshMe();
  }, []);

  useEffect(() => {
    setTokenGetter(() => token);
  }, [token]);

  function loginWithGoogle() {
    authApi.startGoogleLogin();
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      clearAuth();
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      token,
      roles,
      loginWithGoogle,
      logout,
      refreshMe,
      applyAuthResponse,
      hasRole: (role) => roles.includes(role),
    }),
    [status, user, token, roles]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}