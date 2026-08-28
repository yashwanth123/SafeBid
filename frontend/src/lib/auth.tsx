"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, clearTokens, setTokens } from "./api";

export type Me = {
  id: string;
  email: string;
  name: string;
  photoUrl?: string | null;
  bio?: string | null;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusKm: number;
  role: "USER" | "PROVIDER" | "ADMIN";
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  ratingAvg: number;
  ratingCount: number;
  twoFactorEnabled: boolean;
  stripeAccountReady: boolean;
};

type AuthState = {
  user: Me | null;
  loading: boolean;
  setSession: (access: string, refresh: string, user: Me) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    try {
      const data = await api<{ user: Me }>("/api/users/me");
      setUser(data.user);
    } catch {
      setUser(null);
      clearTokens();
    }
  }

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      setSession: (access, refresh, next) => {
        setTokens(access, refresh);
        setUser(next);
      },
      refreshUser,
      logout: async () => {
        try {
          await api("/api/auth/logout", { method: "POST" });
        } catch {
          /* ignore */
        }
        clearTokens();
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
