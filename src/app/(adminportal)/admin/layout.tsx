import { Suspense } from "react";
import AdminShell from "@/components/admin/AdminShell";

export const metadata = { title: "Admin — Rakib Enterprise" };

/**
 * Cache Components: AdminShell reads usePathname(), which on dynamic admin
 * routes (/admin/products/[id]/edit, /admin/purchase-orders/[id]) is only
 * known at request time. The Suspense boundary lets those routes stream; the
 * fallback is the same spinner AdminShell shows while the session loads, so
 * nothing changes visually.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center bg-[#F4F5F7]">
          <div className="h-10 w-10 rounded-full border-2 border-navy/20 border-t-navy animate-spin" />
        </div>
      }
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
