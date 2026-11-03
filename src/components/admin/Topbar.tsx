"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu, Search, UserCircle2 } from "lucide-react";
import type { AdminUser } from "@/types/admin";
import { useAdmin } from "@/context/AdminContext";
import NotificationBell from "@/components/admin/NotificationBell";
import { cn } from "@/lib/utils";

const SEGMENT_LABEL: Record<string, string> = {
  admin: "Console",
  rfq: "Quotes",
  homepage: "Home page",
  "machine-brands": "Machine brands",
  "machine-models": "Machine models",
  brands: "Parts brands",
  products: "Products",
  orders: "Orders",
  customers: "Customers",
  categories: "Categories",
  settings: "Settings",
};

function buildCrumbs(pathname: string) {
  const segs = pathname.split("/").filter(Boolean);
  const out: { label: string; href: string }[] = [];
  let acc = "";
  segs.forEach((s, i) => {
    acc += `/${s}`;
    const isId = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(s);
    const label = isId
      ? segs[i - 1] === "rfq" ? "Quote" : "Detail"
      : SEGMENT_LABEL[s] ?? prettify(s);
    out.push({ label, href: acc });
  });
  return out;
}

function prettify(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Topbar({
  admin,
  onMenu,
}: {
  admin: AdminUser;
  /** Opens the off-canvas sidebar below the lg breakpoint. */
  onMenu?: () => void;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { logout } = useAdmin();
  const crumbs = buildCrumbs(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-[var(--jmn-line)]">
      <div className="h-16 px-4 sm:px-6 lg:px-10 flex items-center gap-3 sm:gap-6">
        {onMenu && (
          <button
            type="button"
            onClick={onMenu}
            aria-label="Open navigation"
            className="lg:hidden -ml-1 h-11 w-11 grid place-items-center text-navy hover:bg-[#F4F5F7]"
          >
            <Menu size={20} />
          </button>
        )}
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-[12px] text-ink/55 min-w-0">
          {crumbs.map((c, i) => (
            <span key={c.href} className="flex items-center gap-2 min-w-0">
              {i > 0 && <span className="text-ink/25">/</span>}
              {i === crumbs.length - 1 ? (
                <span className="text-navy tracking-[0.05em] font-medium truncate">
                  {c.label}
                </span>
              ) : (
                <Link
                  href={c.href}
                  className="hover:text-navy transition-colors truncate"
                >
                  {c.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {/* Search */}
        {/* Quick search: RFQ references / phones go to the quotes inbox,
            anything else searches parts (part numbers, SKUs, names). */}
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            const term = q.trim();
            if (!term) return;
            const isQuote = /^rfq[-\s]?/i.test(term) || /^\+?[\d\s-]{8,}$/.test(term);
            router.push(
              `${isQuote ? "/admin/rfq" : "/admin/products"}?search=${encodeURIComponent(term)}`,
            );
          }}
          className="hidden md:flex flex-1 max-w-md ml-auto items-center gap-2 px-3 h-9 rounded-sm bg-[#F4F5F7] border border-transparent focus-within:border-re-blue"
        >
          <Search size={15} className="text-ink/55" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search parts or quotes"
            placeholder="Part no., SKU, RFQ reference or phone…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink/40"
          />
        </form>

        {/* Right cluster */}
        <div className="ml-auto md:ml-0 flex items-center gap-2">
          <NotificationBell />

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 h-9 pl-2 pr-3 rounded-md hover:bg-[#F4F5F7] transition-colors"
            >
              <span className="h-7 w-7 rounded-full bg-navy text-cream grid place-items-center text-sm font-medium">
                {admin.name?.[0] ?? admin.email[0].toUpperCase()}
              </span>
              <span className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-[12px] text-navy font-medium">
                  {admin.name ?? admin.email.split("@")[0]}
                </span>
                <span className="text-[10px] text-ink/55 capitalize">
                  {admin.role.replace("_", " ")}
                </span>
              </span>
              <ChevronDown
                size={14}
                className={cn(
                  "text-ink/45 transition-transform",
                  menuOpen && "rotate-180"
                )}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-11 w-60 bg-white rounded-lg border border-[var(--jmn-line)] shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--jmn-line)]">
                  <p className="text-sm font-medium text-navy truncate">
                    {admin.email}
                  </p>
                  <p className="text-[11px] text-ink/55 capitalize mt-0.5">
                    {admin.role.replace("_", " ")} · {admin.permissions.length} permissions
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/admin/settings");
                  }}
                  className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#F4F5F7]"
                >
                  <UserCircle2 size={15} className="text-ink/55" />
                  Account settings
                </button>
                <button
                  onClick={() => {
                    logout();
                    router.replace("/admin/login");
                  }}
                  className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-rose-700 hover:bg-rose-50 border-t border-[var(--jmn-line)]"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
