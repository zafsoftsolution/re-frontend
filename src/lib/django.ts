/**
 * Django (auth_app) REST client.
 *
 * Owns:
 *   - JWT access/refresh storage (localStorage)
 *   - Auto-refresh on 401 followed by single retry
 *   - Mapping Django's snake_case user shape to the frontend `User` type
 *
 * Used by AuthContext for register/login/logout/me/refresh and by the
 * account page for profile updates. Cart, products, orders, and addresses
 * still run on the Next.js mock backend (Django auth_app does not model
 * those yet).
 */

import type { User } from "@/types";

const BASE =
  process.env.NEXT_PUBLIC_DJANGO_API_URL ?? "http://localhost:8000/api/auth";
const ACCESS_KEY = "jmn:django:access";
const REFRESH_KEY = "jmn:django:refresh";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DjangoUser {
  id: string;
  email: string;
  phone_number: string | null;
  first_name: string;
  last_name: string;
  middle_name: string;
  display_name: string;
  full_name: string;
  avatar_url: string;
  account_type: string;
  account_status: string;
  email_verified: boolean;
  phone_verified: boolean;
  identity_verified: boolean;
  mfa_enabled: boolean;
  marketing_opt_in: boolean;
  sms_opt_in: boolean;
  must_change_password: boolean;
  date_joined: string;
  last_login: string | null;
  preferred_language: string;
  preferred_currency: string;
  timezone: string;
  primary_organization: string | null;
  primary_store: string | null;
  metadata: Record<string, unknown>;
  roles: Array<{
    code: string;
    name: string;
    scope: string;
    is_primary: boolean;
    organization_id: string | null;
    store_id: string | null;
  }>;
}

interface AuthResponse {
  access: string;
  refresh: string;
  user: DjangoUser;
}

export class DjangoApiError extends Error {
  status: number;
  fields: Record<string, string[]>;
  constructor(message: string, status: number, fields: Record<string, string[]>) {
    super(message);
    this.name = "DjangoApiError";
    this.status = status;
    this.fields = fields;
  }
}

// ─── User mapping ────────────────────────────────────────────────────────────

export function mapDjangoUser(d: DjangoUser): User {
  return {
    id: d.id,
    email: d.email,
    firstName: d.first_name || "",
    lastName: d.last_name || "",
    name: d.full_name || d.display_name || d.email,
    avatar: d.avatar_url || undefined,
    phone: d.phone_number || undefined,
    dateOfBirth: undefined, // not modeled in auth_app
    addresses: [],
    defaultAddressId: undefined,
    orders: [],
    wishlist: [],
    loyaltyPoints: 0,
    loyaltyTier: "silver",
    createdAt: d.date_joined,
    emailVerified: d.email_verified,
    marketingOptIn: d.marketing_opt_in,
  };
}

// ─── Token storage ───────────────────────────────────────────────────────────

function getAccess(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

function getRefresh(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

function setTokens(access: string, refresh: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ─── Request helper with auto-refresh ────────────────────────────────────────

async function tryRefresh(): Promise<string | null> {
  const refresh = getRefresh();
  if (!refresh) return null;
  try {
    const res = await fetch(`${BASE}/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) {
      clearTokens();
      return null;
    }
    const json = (await res.json()) as { access: string; refresh?: string };
    if (json.refresh) {
      setTokens(json.access, json.refresh);
    } else {
      localStorage.setItem(ACCESS_KEY, json.access);
    }
    return json.access;
  } catch {
    return null;
  }
}

interface RequestInit_ extends RequestInit {
  /** Skip Authorization header even if a token is present. */
  anon?: boolean;
}

async function request<T>(path: string, init: RequestInit_ = {}): Promise<T> {
  const { anon, headers: rawHeaders, ...rest } = init;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((rawHeaders as Record<string, string>) ?? {}),
  };
  if (!anon) {
    const token = getAccess();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(`${BASE}${path}`, { ...rest, headers });

  if (res.status === 401 && !anon) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${refreshed}`;
      res = await fetch(`${BASE}${path}`, { ...rest, headers });
    }
  }

  if (!res.ok) {
    let body: Record<string, unknown> = {};
    try {
      body = await res.json();
    } catch {
      /* ignore non-JSON */
    }
    const fields: Record<string, string[]> = {};
    let detail: string | undefined;
    for (const [k, v] of Object.entries(body)) {
      if (k === "detail" && typeof v === "string") {
        detail = v;
      } else if (Array.isArray(v)) {
        fields[k] = v.map(String);
      } else if (typeof v === "string") {
        fields[k] = [v];
      }
    }
    const message =
      detail ??
      Object.values(fields).flat().join("; ") ??
      `Request failed (${res.status})`;
    throw new DjangoApiError(message || `Request failed (${res.status})`, res.status, fields);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Public client ───────────────────────────────────────────────────────────

export const djangoAuth = {
  hasSession(): boolean {
    return typeof window !== "undefined" && !!localStorage.getItem(ACCESS_KEY);
  },

  async login(email: string, password: string): Promise<User> {
    const res = await request<AuthResponse>("/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      anon: true,
    });
    setTokens(res.access, res.refresh);
    return mapDjangoUser(res.user);
  },

  async register(args: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    marketingOptIn?: boolean;
  }): Promise<User> {
    const body: Record<string, unknown> = {
      email: args.email,
      password: args.password,
      password_confirm: args.password,
      first_name: args.firstName,
      last_name: args.lastName,
      marketing_opt_in: !!args.marketingOptIn,
      accept_terms: true,
    };
    if (args.phone) body.phone_number = args.phone;
    const res = await request<AuthResponse>("/register/", {
      method: "POST",
      body: JSON.stringify(body),
      anon: true,
    });
    setTokens(res.access, res.refresh);
    return mapDjangoUser(res.user);
  },

  async me(): Promise<User> {
    const d = await request<DjangoUser>("/me/", { method: "GET" });
    return mapDjangoUser(d);
  },

  async updateProfile(patch: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    marketingOptIn?: boolean;
    preferredLanguage?: string;
    preferredCurrency?: string;
    timezone?: string;
  }): Promise<User> {
    const body: Record<string, unknown> = {};
    if (patch.firstName !== undefined) body.first_name = patch.firstName;
    if (patch.lastName !== undefined) body.last_name = patch.lastName;
    if (patch.phone !== undefined) body.phone_number = patch.phone || null;
    if (patch.marketingOptIn !== undefined) body.marketing_opt_in = patch.marketingOptIn;
    if (patch.preferredLanguage !== undefined) body.preferred_language = patch.preferredLanguage;
    if (patch.preferredCurrency !== undefined) body.preferred_currency = patch.preferredCurrency;
    if (patch.timezone !== undefined) body.timezone = patch.timezone;

    const d = await request<DjangoUser>("/me/", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return mapDjangoUser(d);
  },

  async logout(): Promise<void> {
    const refresh = getRefresh();
    if (refresh) {
      try {
        await request("/logout/", {
          method: "POST",
          body: JSON.stringify({ refresh }),
        });
      } catch {
        /* clear tokens regardless of server response */
      }
    }
    clearTokens();
  },

  async changePassword(args: { oldPassword: string; newPassword: string }) {
    return request<{ detail: string }>("/password/change/", {
      method: "POST",
      body: JSON.stringify({
        old_password: args.oldPassword,
        new_password: args.newPassword,
        new_password_confirm: args.newPassword,
      }),
    });
  },

  async requestPasswordReset(email: string) {
    return request<{ detail: string; dev_token?: string }>("/password/reset/", {
      method: "POST",
      body: JSON.stringify({ email }),
      anon: true,
    });
  },

  async confirmPasswordReset(token: string, newPassword: string) {
    return request<{ detail: string }>("/password/reset/confirm/", {
      method: "POST",
      body: JSON.stringify({
        token,
        new_password: newPassword,
        new_password_confirm: newPassword,
      }),
      anon: true,
    });
  },

  async requestEmailVerify() {
    return request<{ detail: string; dev_token?: string; expires_at?: string }>(
      "/email/verify/",
      { method: "POST" },
    );
  },

  async confirmEmailVerify(token: string) {
    return request<{ detail: string }>("/email/verify/confirm/", {
      method: "POST",
      body: JSON.stringify({ token }),
      anon: true,
    });
  },

  async requestOtp(purpose: string) {
    return request<{ detail: string; dev_code?: string; expires_at?: string }>(
      "/otp/request/",
      { method: "POST", body: JSON.stringify({ purpose }) },
    );
  },

  async verifyOtp(purpose: string, code: string) {
    return request<{ detail: string }>("/otp/verify/", {
      method: "POST",
      body: JSON.stringify({ purpose, code }),
    });
  },
};
