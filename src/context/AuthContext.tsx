"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@/types";
import { djangoAuth } from "@/lib/django";

const USER_KEY = "jmn:auth:user";

interface AuthState {
  user: User | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (args: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    if (!djangoAuth.hasSession()) {
      setState({ user: null, loading: false });
      return;
    }
    // Paint cached user immediately, then re-fetch from server in background.
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) setState({ user: JSON.parse(raw) as User, loading: false });
    } catch {
      /* ignore parse error */
    }
    djangoAuth
      .me()
      .then((user) => persist(user))
      .catch(() => {
        // Token rejected — wipe and force re-auth
        try {
          localStorage.removeItem(USER_KEY);
        } catch {}
        djangoAuth.logout().catch(() => {});
        setState({ user: null, loading: false });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (user: User) => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
    setState({ user, loading: false });
  };

  const login: AuthContextType["login"] = async (email, password) => {
    try {
      const user = await djangoAuth.login(email, password);
      persist(user);
      return { ok: true };
    } catch (err) {
      const msg = (err as Error)?.message ?? "Login failed";
      return { ok: false, error: msg };
    }
  };

  const register: AuthContextType["register"] = async (args) => {
    try {
      const user = await djangoAuth.register(args);
      persist(user);
      return { ok: true };
    } catch (err) {
      const msg = (err as Error)?.message ?? "Registration failed";
      return { ok: false, error: msg };
    }
  };

  const logout = () => {
    djangoAuth.logout().catch(() => {});
    try {
      localStorage.removeItem(USER_KEY);
    } catch {}
    setState({ user: null, loading: false });
  };

  const updateUser = (patch: Partial<User>) => {
    setState((prev) => {
      if (!prev.user) return prev;
      const user = { ...prev.user, ...patch };
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {}
      return { ...prev, user };
    });
  };

  const refresh = async () => {
    try {
      const user = await djangoAuth.me();
      persist(user);
    } catch {
      /* ignore — token might just be expired between calls */
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAuthenticated: !!state.user,
        login,
        register,
        logout,
        updateUser,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
