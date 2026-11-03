import type { DashboardStats } from "@/types/admin";
import { products } from "./products";

const days = 14;
const today = new Date();

const salesByDay = Array.from({ length: days }, (_, i) => {
  const d = new Date(today);
  d.setDate(today.getDate() - (days - 1 - i));
  const base = 8_000 + Math.round(Math.random() * 6_000);
  return {
    date: d.toISOString().slice(0, 10),
    sales: base,
    orders: 14 + Math.round(Math.random() * 22),
  };
});

export const dashboardStats: DashboardStats = {
  revenue: {
    current: 186_430,
    currency: "USD",
    delta: { value: 12.4, trend: "up", label: "vs last period" },
  },
  orders: {
    current: 412,
    delta: { value: 8.1, trend: "up", label: "vs last period" },
  },
  customers: {
    current: 1_284,
    delta: { value: 4.2, trend: "up", label: "vs last period" },
  },
  avgOrderValue: {
    current: 452,
    currency: "USD",
    delta: { value: 1.9, trend: "up", label: "vs last period" },
  },
  conversionRate: {
    current: 3.8,
    delta: { value: 0.4, trend: "down", label: "vs last period" },
  },
  salesByDay,
  recentOrders: [],
  topProducts: products.filter((p) => p.isBestSeller).slice(0, 5),
  lowStockProducts: products
    .filter((p) => p.sizes.reduce((s, z) => s + z.stock, 0) < 20)
    .slice(0, 5),
  trafficSources: [
    { source: "Direct", visits: 18_420, share: 38 },
    { source: "Organic Search", visits: 12_840, share: 26 },
    { source: "Instagram", visits: 9_640, share: 19 },
    { source: "Referral", visits: 4_920, share: 10 },
    { source: "Other", visits: 3_160, share: 7 },
  ],
};
