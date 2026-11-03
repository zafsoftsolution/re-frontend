"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AdminUser } from "@/types/admin";
import {
  djangoAdmin,
  readCachedUser,
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

export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminState>({ admin: null, loading: true });

  const persist = useCallback((shape: AdminUserShape | null) => {
    setState({ admin: shape ? mapAdmin(shape) : null, loading: false });
  }, []);

  useEffect(() => {
    if (!djangoAdmin.hasSession()) {
      setState({ admin: null, loading: false });
      return;
    }
    // Paint cached identity instantly, then verify with the server.
    const cached = readCachedUser();
    if (cached) persist(cached);

    djangoAdmin
      .me()
      .then(persist)
      .catch(() => {
        djangoAdmin.logout().catch(() => {});
        setState({ admin: null, loading: false });
      });
  }, [persist]);

  const login: AdminContextType["login"] = async (email, password) => {
    try {
      const user = await djangoAdmin.login(email, password);
      persist(user);
      return { ok: true };
    } catch (err) {
      const msg = (err as Error)?.message ?? "Sign-in failed";
      return { ok: false, error: msg };
    }
  };

  const logout = () => {
    djangoAdmin.logout().catch(() => {});
    setState({ admin: null, loading: false });
  };

  const refresh = async () => {
    try {
      const user = await djangoAdmin.me();
      persist(user);
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
