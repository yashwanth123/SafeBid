import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { api, clearTokens, setTokens } from "./api";

export type Me = {
  id: string;
  email: string;
  name: string;
  role: string;
  verificationStatus: string;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
};

type AuthState = {
  user: Me | null;
  loading: boolean;
  setSession: (access: string, refresh: string, user: Me) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    try {
      const data = await api<{ user: Me }>("/api/users/me");
      setUser(data.user);
    } catch {
      setUser(null);
      await clearTokens();
    }
  }

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      setSession: async (access, refresh, next) => {
        await setTokens(access, refresh);
        setUser(next);
      },
      refreshUser,
      logout: async () => {
        try {
          await api("/api/auth/logout", { method: "POST" });
        } catch {
          /* ignore */
        }
        await clearTokens();
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
