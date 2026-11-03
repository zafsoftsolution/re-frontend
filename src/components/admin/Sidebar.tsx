"use client";

import Link from "next/link";
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
  Folder,
  Gift,
  HelpCircle,
  Home,
  LineChart,
  Image as ImageIcon,
  KeyRound,
  Layers,
  LayoutDashboard,
  Mail,
  MessagesSquare,
  Package,
  PackagePlus,
  Quote,
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
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [
      // Dashboard + notifications are always visible — they're the
      // operator's home + signal of "something needs me".
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
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
    section: "Storefront",
    items: [
      { label: "Homepage", href: "/admin/homepage", icon: Home,
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
      { label: "Testimonials", href: "/admin/testimonials", icon: Quote,
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
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname() ?? "";
  const { hasPermission, admin } = useAdmin();

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
        "fixed inset-y-0 left-0 z-30 flex flex-col bg-navy text-cream/90 transition-[width] duration-300 overflow-hidden border-r border-cream/[0.04]",
        collapsed ? "w-[72px]" : "w-[260px]",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "h-16 flex items-center border-b border-cream/10 shrink-0",
          collapsed ? "justify-center" : "px-5",
        )}
      >
        <Link
          href="/admin"
          className="flex items-center gap-3 min-w-0"
          aria-label="Rakib Console"
        >
          <span className="font-display text-2xl tracking-[0.15em] text-cream shrink-0">
            Rakib
          </span>
          {!collapsed && (
            <>
              <span className="h-4 w-px bg-cream/25 shrink-0" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-gold whitespace-nowrap">
                Console
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
              collapsed && gi > 0 ? "mt-2 pt-2 border-t border-cream/[0.06]" : gi > 0 ? "mt-5" : "",
            )}
          >
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] tracking-[0.3em] uppercase text-cream/40">
                {group.section}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href === activeHref;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center rounded-md text-sm transition-colors",
                        collapsed
                          ? "h-10 w-10 mx-auto justify-center"
                          : "gap-3 px-3 py-2",
                        active
                          ? "bg-cream/10 text-cream"
                          : "text-cream/60 hover:text-cream hover:bg-cream/5",
                      )}
                    >
                      {active && (
                        <span
                          className={cn(
                            "absolute w-0.5 rounded-r bg-gold",
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
          "border-t border-cream/10 shrink-0",
          collapsed ? "px-2 py-2" : "px-3 py-3",
        )}
      >
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "w-full flex items-center rounded-md text-cream/55 hover:text-cream hover:bg-cream/5 transition-colors",
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
