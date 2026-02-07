"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

interface UserInfo {
  id: number;
  username: string;
  displayName: string;
  role: "master_admin" | "admin" | "viewer";
  plan?: "free" | "starter" | "premium" | "max";
  planLabel?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  logout: async () => {},
  refreshAuth: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// 認証不要のパス
const publicPaths = ["/login", "/signup", "/terms", "/api"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    // 公開パスの場合は認証チェックをスキップ
    if (publicPaths.some(path => pathname.startsWith(path))) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/check");
      const data = await response.json();
      
      if (data.authenticated) {
        setIsAuthenticated(true);
        setUser(data.user || null);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        // Freeプラン期限切れの場合はメッセージ付きでリダイレクト
        if (data.expired) {
          router.push("/login?expired=true");
        } else {
          router.push("/login");
        }
      }
    } catch {
      setIsAuthenticated(false);
      setUser(null);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAuth = async () => {
    await checkAuth();
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsAuthenticated(false);
      setUser(null);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
