"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ArrowRightLeft,
  Award,
  Bell as BellIcon,
  BookOpen,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Cog,
  Cpu,
  FileText,
  FileSpreadsheet,
  Folder,
  Gift,
  HelpCircle,
  Home,
  LineChart,
  KeyRound,
  LayoutDashboard,
  Mail,
  MessagesSquare,
  Package,
  PackagePlus,
  Quote,
  Inbox,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tag,
  Ticket,
  Truck,
  UserCog,
  Users,
  Warehouse,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useNewQuoteCount } from "@/lib/admin/use-quote-count";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  /**
   * Required permission code (or list — any-match). When omitted the entry
   * is visible to every admin. Superusers see everything regardless.
   */
  permission?: string | string[];
  /** Show the live "new quotes" count badge. */
  badge?: "rfq";
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [
      // Dashboard + notifications are always visible — they're the
      // operator's home + signal of "something needs me".
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      // QUOTE-FIRST: the RFQ inbox is the primary sales queue.
      { label: "Quotes", href: "/admin/rfq", icon: Inbox, badge: "rfq",
        permission: ["sales.order.view", "sales.order.update"] },
      { label: "Notifications", href: "/admin/notifications", icon: BellIcon },
    ],
  },
  {
    // Ordered so a fresh-install operator works top-down: a Product needs
    // a Category (required FK), and optionally a Brand + Collection — those
    // come first. Products land where their references already exist.
    // Lookbooks reference Products, so they tail the list.
    section: "Catalog",
    items: [
      { label: "Machine Brands", href: "/admin/machine-brands", icon: Cpu,
        permission: "catalog.brand.manage" },
      { label: "Machine Models", href: "/admin/machine-models", icon: Cog,
        permission: "catalog.brand.manage" },
      { label: "Parts Brands", href: "/admin/brands", icon: Tag,
        permission: "catalog.brand.manage" },
      { label: "Categories", href: "/admin/categories", icon: Folder,
        permission: "catalog.category.manage" },
      { label: "Products", href: "/admin/products", icon: Package,
        permission: "catalog.product.view" },
      { label: "Import parts", href: "/admin/products/import", icon: FileSpreadsheet,
        permission: "catalog.product.create" },
    ],
  },
  {
    section: "Inventory",
    items: [
      { label: "Warehouses", href: "/admin/warehouses", icon: Warehouse,
        permission: "inventory.warehouse.manage" },
      { label: "Stock", href: "/admin/stock", icon: ClipboardList,
        permission: "inventory.stock.view" },
    ],
  },
  {
    section: "Purchasing",
    items: [
      { label: "Suppliers", href: "/admin/suppliers", icon: Truck,
        permission: "purchasing.supplier.manage" },
      { label: "Purchase Orders", href: "/admin/purchase-orders", icon: PackagePlus,
        permission: "purchasing.po.view" },
      { label: "Invoices", href: "/admin/purchase-orders/invoices", icon: FileText,
        permission: ["finance.invoice.view", "purchasing.po.view"] },
    ],
  },
  {
    section: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", icon: ShoppingBag,
        permission: "sales.order.view" },
      { label: "Returns", href: "/admin/returns", icon: RefreshCw,
        permission: ["sales.return.manage", "purchasing.return.manage"] },
      { label: "Profit & Loss", href: "/admin/financials", icon: LineChart,
        permission: "finance.report.view" },
      { label: "Coupons", href: "/admin/coupons", icon: Ticket,
        permission: "sales.coupon.manage" },
    ],
  },
  {
    section: "People",
    items: [
      { label: "Customers", href: "/admin/customers", icon: Users,
        permission: "people.customer.view" },
      { label: "Team", href: "/admin/team", icon: UserCog,
        permission: "people.team.manage" },
    ],
  },
  {
    section: "Loyalty",
    items: [
      { label: "Overview", href: "/admin/loyalty", icon: Sparkles,
        permission: ["loyalty.tier.manage", "loyalty.reward.manage", "loyalty.points.adjust"] },
      { label: "Rewards", href: "/admin/loyalty/rewards", icon: Gift,
        permission: "loyalty.reward.manage" },
      { label: "Tiers", href: "/admin/loyalty/tiers", icon: Award,
        permission: "loyalty.tier.manage" },
      { label: "Activity", href: "/admin/loyalty/transactions", icon: ClipboardList,
        permission: "loyalty.points.adjust" },
    ],
  },
  {
    section: "Site",
    items: [
      { label: "Home page", href: "/admin/homepage", icon: Home,
        permission: "marketing.homepage.manage" },
    ],
  },
  {
    section: "Marketing",
    items: [
      { label: "SEO health", href: "/admin/seo", icon: Search,
        permission: "marketing.seo.manage" },
      { label: "Redirects", href: "/admin/seo/redirects", icon: ArrowRightLeft,
        permission: "marketing.redirect.manage" },
    ],
  },
  {
    section: "Content",
    items: [
      { label: "Reviews", href: "/admin/reviews", icon: Star,
        permission: "catalog.review.manage" },
      { label: "FAQs", href: "/admin/faqs", icon: HelpCircle,
        permission: "content.faq.manage" },
      { label: "Customer factories", href: "/admin/testimonials", icon: Quote,
        permission: "content.testimonial.manage" },
    ],
  },
  {
    section: "Support",
    items: [
      { label: "Contact", href: "/admin/contact", icon: MessagesSquare,
        permission: "content.contact.manage" },
      { label: "Newsletter", href: "/admin/newsletter", icon: Mail,
        permission: "marketing.newsletter.manage" },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Roles", href: "/admin/roles", icon: Shield,
        permission: "system.role.manage" },
      { label: "Organizations", href: "/admin/organizations", icon: Building2,
        permission: "system.user.manage" },
      { label: "Stores", href: "/admin/stores", icon: Store,
        permission: "system.user.manage" },
      { label: "Audit log", href: "/admin/audit-log", icon: KeyRound,
        permission: "system.audit.view" },
      { label: "Settings", href: "/admin/settings", icon: Settings,
        permission: "system.settings.manage" },
    ],
  },
  {
    section: "Help",
    items: [
      // Always visible — every admin should be able to read the docs.
      { label: "Documentation", href: "/admin/docs", icon: BookOpen },
    ],
  },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  /** Below lg the sidebar is an off-canvas drawer. */
  mobileOpen?: boolean;
  onNavigate?: () => void;
}

export default function Sidebar({
  collapsed: collapsedProp,
  onToggle,
  mobileOpen = false,
  onNavigate,
}: Props) {
  // The drawer always shows labels; "collapsed" only applies on desktop.
  const collapsed = collapsedProp && !mobileOpen;
  const pathname = usePathname() ?? "";
  const { hasPermission, admin } = useAdmin();
  const newQuotes = useNewQuoteCount();

  // Filter the nav down to entries the current admin can actually use, then
  // drop entire sections that ended up empty. Superusers see everything;
  // unauthenticated calls (admin layout shouldn't render us in that state,
  // but defensive) also see everything so we don't dead-lock anyone out.
  const visibleNav = (() => {
    if (!admin) return NAV;
    return NAV
      .map((group) => ({
        ...group,
        items: group.items.filter((it) =>
          !it.permission ? true : hasPermission(it.permission),
        ),
      }))
      .filter((g) => g.items.length > 0);
  })();

  // Highlight the item whose href is the longest prefix of pathname. Plain
  // startsWith would light up both /admin/purchase-orders AND
  // /admin/purchase-orders/invoices when the user is on the invoices page —
  // longest-prefix wins keeps a single item active.
  const activeHref = (() => {
    let best = "";
    for (const group of visibleNav) {
      for (const it of group.items) {
        const matches =
          pathname === it.href ||
          (it.href !== "/admin" &&
            (pathname === it.href || pathname.startsWith(it.href + "/")));
        if (matches && it.href.length > best.length) best = it.href;
      }
    }
    return best;
  })();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col bg-re-ink text-white transition-[width,transform] duration-150 overflow-hidden border-r border-black",
        collapsed ? "w-[72px]" : "w-[260px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "h-16 flex items-center border-b border-white/10 border-t-2 border-t-re-red shrink-0",
          collapsed ? "justify-center" : "px-5",
        )}
      >
        <Link
          href="/admin"
          className="flex items-center gap-3 min-w-0"
          aria-label="Rakib Console"
        >
          <Image
            src="/logo/rakib-enterprise-light.png"
            alt="Rakib Enterprise"
            width={434}
            height={240}
            className="h-8 w-auto shrink-0"
          />
          {!collapsed && (
            <>
              <span className="h-4 w-px bg-white/25 shrink-0" />
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/85 whitespace-nowrap">
                Admin
              </span>
            </>
          )}
        </Link>
      </div>

      {/* Nav — `no-scrollbar` hides the visual bar but keeps scroll behavior. */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto no-scrollbar",
          collapsed ? "py-3" : "py-4",
        )}
      >
        {visibleNav.map((group, gi) => (
          <div
            key={group.section}
            className={cn(
              collapsed ? "px-2" : "px-3",
              // Visual divider between sections when collapsed (no labels to
              // separate the groups otherwise).
              collapsed && gi > 0 ? "mt-2 pt-2 border-t border-white/10" : gi > 0 ? "mt-5" : "",
            )}
          >
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-white/60">
                {group.section}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href === activeHref;
                const Icon = item.icon;
                const badge = item.badge === "rfq" && newQuotes > 0 ? newQuotes : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      aria-label={
                        collapsed
                          ? badge ? `${item.label} (${badge} new)` : item.label
                          : undefined
                      }
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center rounded-sm text-sm transition-colors duration-150",
                        collapsed
                          ? "h-10 w-10 mx-auto justify-center"
                          : "gap-3 px-3 py-2",
                        active
                          ? "bg-white/10 text-white font-medium"
                          : "text-white/75 hover:text-white hover:bg-white/5",
                      )}
                    >
                      {active && (
                        <span
                          className={cn(
                            "absolute w-[3px] bg-re-red",
                            collapsed
                              ? "left-0 top-1.5 bottom-1.5"
                              : "left-0 top-1.5 bottom-1.5",
                          )}
                        />
                      )}
                      <Icon size={16} className="shrink-0" />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                      {badge > 0 && (
                        <span
                          aria-label={collapsed ? undefined : `${badge} new`}
                          className={cn(
                            "tabular bg-re-red-cta text-white text-[10px] font-semibold leading-none",
                            collapsed
                              ? "absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 grid place-items-center"
                              : "ml-auto min-w-5 h-5 px-1.5 grid place-items-center",
                          )}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer / collapse toggle */}
      <div
        className={cn(
          "border-t border-white/10 shrink-0",
          collapsed ? "px-2 py-2" : "px-3 py-3",
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "w-full flex items-center rounded-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors",
            collapsed ? "justify-center h-10" : "justify-center gap-2 py-2",
          )}
        >
          {collapsed ? (
            <ChevronsRight size={16} />
          ) : (
            <>
              <ChevronsLeft size={16} />
              <span className="text-[11px] tracking-[0.2em] uppercase">
                Collapse
              </span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
