import type { Order, Product } from "./index";

export type AdminRole = "super_admin" | "manager" | "editor" | "support";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  avatar?: string;
  /** Role codes (legacy — used for the role label in the avatar menu). */
  roleCodes: string[];
  /**
   * Effective permission codes — the union of every role's permissions,
   * walking parent chains. Drives `hasPermission()` and sidebar gating.
   */
  permissions: string[];
  /** Convenience flag — superusers bypass every gate. */
  isSuperuser: boolean;
  lastLoginAt?: string;
}

export interface KpiDelta {
  value: number;
  trend: "up" | "down" | "flat";
  label: string;           // "vs last week"
}

export interface DashboardStats {
  revenue: { current: number; delta: KpiDelta; currency: string };
  orders: { current: number; delta: KpiDelta };
  customers: { current: number; delta: KpiDelta };
  avgOrderValue: { current: number; delta: KpiDelta; currency: string };
  conversionRate: { current: number; delta: KpiDelta };
  salesByDay: { date: string; sales: number; orders: number }[];
  recentOrders: Order[];
  topProducts: Product[];
  lowStockProducts: Product[];
  trafficSources: { source: string; visits: number; share: number }[];
}
