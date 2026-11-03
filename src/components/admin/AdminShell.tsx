"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAdmin } from "@/context/AdminContext";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

/**
 * Admin chrome (sidebar + topbar + content) with auth gating.
 *
 * /admin/login renders without the shell. Every other /admin route
 * requires an authenticated admin; otherwise we redirect to /admin/login.
 */
export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { admin, loading, isAuthenticated } = useAdmin();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoginRoute = pathname.startsWith("/admin/login");

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated && !isLoginRoute) {
      router.replace("/admin/login");
    }
    if (isAuthenticated && isLoginRoute) {
      router.replace("/admin");
    }
  }, [loading, isAuthenticated, isLoginRoute, router]);

  if (isLoginRoute) return <>{children}</>;

  if (loading || !isAuthenticated || !admin) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F4F5F7]">
        <div className="h-10 w-10 rounded-full border-2 border-navy/20 border-t-navy animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-ink flex">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-20 bg-black/40"
        />
      )}

      <div
        className={cn(
          "flex-1 min-w-0 flex flex-col transition-[margin] duration-150",
          collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"
        )}
      >
        <Topbar admin={admin} onMenu={() => setMobileOpen(true)} />
        <main id="admin-main" className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
