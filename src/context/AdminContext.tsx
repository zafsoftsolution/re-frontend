"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AdminUser } from "@/types/admin";
import {
  djangoAdmin,
  sessionSnapshot,
  subscribeSession,
  type AdminUserShape,
} from "@/lib/django-admin";

interface AdminState {
  admin: AdminUser | null;
  loading: boolean;
}

interface AdminContextType extends AdminState {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
  /**
   * Does the current admin have permission `code`? Superusers always pass.
   * Accepts a string or array of strings — any-match semantics for arrays.
   *
   *   hasPermission("catalog.product.create")
   *   hasPermission(["sales.order.update", "sales.order.cancel"])
   */
  hasPermission: (code: string | string[]) => boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

function mapAdmin(user: AdminUserShape): AdminUser {
  // Best-effort role label — superuser wins, otherwise the first declared role,
  // falling back to a generic "manager" so the UI always has something to show.
  const role: AdminUser["role"] = user.is_superuser
    ? "super_admin"
    : user.roles?.find((r) => r.code === "super_admin")
    ? "super_admin"
    : user.roles?.find((r) => r.code === "org_admin" || r.code === "org_owner")
    ? "manager"
    : user.roles?.find((r) => r.code === "content_editor")
    ? "editor"
    : user.roles?.find((r) =>
        r.code === "customer_support_agent" || r.code === "customer_support_lead",
      )
    ? "support"
    : user.is_staff
    ? "manager"
    : "support";

  return {
    id: user.id,
    email: user.email,
    name: user.full_name || user.display_name || user.email,
    role,
    avatar: user.avatar_url || undefined,
    // Role codes (for the avatar menu's "Manager / Editor / …" label).
    roleCodes: user.roles?.map((r) => r.code) ?? [],
    // Granular permission codes — drives `hasPermission()` + sidebar gating.
    permissions: user.effective_permissions ?? [],
    isSuperuser: !!user.is_superuser,
    lastLoginAt: user.last_login ?? undefined,
  };
}

const serverSnapshot = () => null;

export function AdminProvider({ children }: { children: ReactNode }) {
  // Stored session (tokens + cached user) as an external store: null while
  // server-rendering / hydrating, "" when signed out, "1|<json>" otherwise.
  const snapshot = useSyncExternalStore(subscribeSession, sessionSnapshot, serverSnapshot);
  // Has /auth/me/ confirmed the stored session in this page load?
  const [verified, setVerified] = useState<"pending" | "ok" | "failed">("pending");
  const hasToken = !!snapshot;

  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;
    // me() refreshes the cached user (→ snapshot) on success.
    djangoAdmin.me().then(
      () => !cancelled && setVerified("ok"),
      () => {
        if (cancelled) return;
        djangoAdmin.logout().catch(() => {});
        setVerified("failed");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [hasToken]);

  const state = useMemo<AdminState>(() => {
    if (snapshot === null) return { admin: null, loading: true };
    if (!snapshot || verified === "failed") return { admin: null, loading: false };
    const raw = snapshot.slice(2);
    let shape: AdminUserShape | null = null;
    try {
      shape = raw ? (JSON.parse(raw) as AdminUserShape) : null;
    } catch {
      shape = null;
    }
    // Paint the cached identity instantly; without one, wait for /me.
    if (!shape) return { admin: null, loading: verified === "pending" };
    return { admin: mapAdmin(shape), loading: false };
  }, [snapshot, verified]);

  const login: AdminContextType["login"] = async (email, password) => {
    try {
      await djangoAdmin.login(email, password); // stores tokens + user → snapshot
      setVerified("ok");
      return { ok: true };
    } catch (err) {
      const msg = (err as Error)?.message ?? "Sign-in failed";
      return { ok: false, error: msg };
    }
  };

  const logout = () => {
    // Tokens are cleared after the blacklist call; the snapshot follows.
    djangoAdmin.logout().catch(() => {});
    setVerified("pending");
  };

  const refresh = async () => {
    try {
      await djangoAdmin.me(); // re-caches the user → snapshot
    } catch {
      /* token might just be expired between calls */
    }
  };

  const hasPermission: AdminContextType["hasPermission"] = (code) => {
    const a = state.admin;
    if (!a) return false;
    if (a.isSuperuser) return true;
    const codes = Array.isArray(code) ? code : [code];
    if (codes.length === 0) return true;
    const set = new Set(a.permissions);
    return codes.some((c) => set.has(c));
  };

  return (
    <AdminContext.Provider
      value={{
        ...state,
        isAuthenticated: !!state.admin,
        login,
        logout,
        refresh,
        hasPermission,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
