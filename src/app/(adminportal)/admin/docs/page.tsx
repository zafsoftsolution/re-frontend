"use client";

/**
 * In-app documentation hub.
 *
 * Single scrollable page split into anchored sections, with a sticky
 * table-of-contents on the left. The TOC highlights the section currently
 * in view via IntersectionObserver, and clicking jumps with smooth scroll
 * + an offset that accounts for the admin top bar.
 *
 * Content lives in this file as JSX (not Markdown) so it gets type-checked
 * along with the rest of the admin and stays in lockstep with code links.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Award,
  Bell,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Download,
  FileText,
  Folder,
  Gift,
  Globe,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  LineChart,
  Mail,
  Package,
  PackagePlus,
  Quote,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  ShoppingBag,
  Sparkles,
  Tag,
  Ticket,
  Truck,
  Users,
  Warehouse,
  Workflow,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Section schema — top-level rail entries
// ─────────────────────────────────────────────────────────────────────────────

interface DocSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const SECTIONS: DocSection[] = [
  { id: "getting-started", title: "Getting started", icon: BookOpen },
  { id: "catalog", title: "Catalog", icon: Package },
  { id: "inventory", title: "Inventory", icon: Warehouse },
  { id: "purchasing", title: "Purchasing", icon: PackagePlus },
  { id: "sales", title: "Sales & orders", icon: ShoppingBag },
  { id: "returns", title: "Returns", icon: RefreshCw },
  { id: "invoices", title: "Invoices & PDFs", icon: FileText },
  { id: "financials", title: "Profit & loss", icon: LineChart },
  { id: "customers", title: "Customers", icon: Users },
  { id: "loyalty", title: "Loyalty", icon: Sparkles },
  { id: "notifications", title: "Notifications", icon: Bell },
  { id: "seo", title: "SEO & redirects", icon: Globe },
  { id: "storefront", title: "Storefront content", icon: LayoutDashboard },
  { id: "people", title: "People & permissions", icon: Workflow },
  { id: "settings", title: "Settings", icon: SettingsIcon },
  { id: "exports", title: "CSV exports", icon: Download },
  { id: "system", title: "System", icon: Wrench },
  { id: "workflows", title: "Common workflows", icon: ClipboardList },
  { id: "api", title: "API reference", icon: ChevronRight },
];

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDocsPage() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const [query, setQuery] = useState("");

  // Highlight the section currently in the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  function jumpTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
  }

  const visibleSections = query
    ? SECTIONS.filter((s) =>
        s.title.toLowerCase().includes(query.toLowerCase()),
      )
    : SECTIONS;

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-10 lg:gap-14">
      {/* ── Sticky TOC ────────────────────────────────────────────── */}
      <aside className="hidden lg:block">
        {/*
         * Cap the TOC at the viewport height (minus the top offset that
         * keeps it under the admin topbar) and let it scroll internally.
         * Without this, once the topic list outgrew the viewport the
         * bottom items (System / Workflows / API) were unreachable —
         * the sticky panel couldn't grow past the page bottom and the
         * window scroll wouldn't move because the sidebar was already
         * fully on-screen. Internal overflow lets the rail scroll while
         * the content area keeps doing its own thing.
         */}
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] flex flex-col">
          <div className="mb-4 flex items-center gap-2 px-3 h-9 rounded-md bg-[#F4F5F7] shrink-0">
            <Search size={14} className="text-ink/45" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topics…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink/40"
            />
          </div>
          <p className="px-3 mb-2 text-[10px] tracking-[0.3em] uppercase text-ink/40 shrink-0">
            Topics
          </p>
          <nav className="space-y-0.5 overflow-y-auto pr-1 -mr-1 no-scrollbar">
            {visibleSections.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === active;
              return (
                <button
                  key={s.id}
                  onClick={() => jumpTo(s.id)}
                  className={cn(
                    "group w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors",
                    isActive
                      ? "bg-navy/5 text-navy font-medium"
                      : "text-ink/65 hover:text-navy hover:bg-[#FAFAFA]",
                  )}
                >
                  <Icon
                    size={14}
                    className={cn("shrink-0", isActive ? "text-navy" : "text-ink/40")}
                  />
                  <span className="truncate">{s.title}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className="min-w-0 max-w-3xl">
        <header className="mb-10">
          <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-3">
            Rakib Enterprise · Admin guide
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-navy leading-tight">
            Documentation
          </h1>
          <p className="mt-4 text-ink/65 leading-relaxed max-w-xl">
            How to run Rakib Enterprise day to day — every section of the admin,
            every workflow, every gotcha. Use the index to jump around, or
            scroll top-to-bottom for a full tour.
          </p>
        </header>

        <SectionGettingStarted />
        <SectionCatalog />
        <SectionInventory />
        <SectionPurchasing />
        <SectionSales />
        <SectionReturns />
        <SectionInvoices />
        <SectionFinancials />
        <SectionCustomers />
        <SectionLoyalty />
        <SectionNotifications />
        <SectionSeo />
        <SectionStorefront />
        <SectionPeople />
        <SectionSettings />
        <SectionExports />
        <SectionSystem />
        <SectionWorkflows />
        <SectionApi />

        <footer className="mt-20 pt-10 border-t border-[var(--jmn-line)] text-sm text-ink/55">
          Need help no doc covers? Check the activity log on the relevant
          page or reach the engineering team — they have access to the full
          admin trail and can replay any change.
        </footer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable bits — keep all docs visually consistent
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  id,
  title,
  eyebrow,
  intro,
  children,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 mb-20 pb-20 border-b border-[var(--jmn-line)] last:border-0"
    >
      {eyebrow && (
        <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-3">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-3xl md:text-4xl text-navy mb-4 leading-tight">
        {title}
      </h2>
      {intro && (
        <div className="text-ink/75 leading-relaxed text-base mb-8">
          {intro}
        </div>
      )}
      <div className="space-y-8">{children}</div>
    </section>
  );
}

function SubSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className={cn(id && "scroll-mt-24")}>
      <h3 className="font-display text-xl text-navy mb-3">{title}</h3>
      <div className="space-y-3 text-[15px] leading-relaxed text-ink/80">
        {children}
      </div>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2.5 list-none counter-reset-step">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="shrink-0 h-6 w-6 grid place-items-center rounded-full bg-navy text-cream text-xs tabular font-medium mt-0.5">
            {i + 1}
          </span>
          <div className="flex-1 pt-0.5">{it}</div>
        </li>
      ))}
    </ol>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 list-disc pl-5 marker:text-ink/40">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

function Path({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[13px] tracking-[0.02em] bg-bone/60 text-navy px-1.5 py-0.5 rounded border border-[var(--jmn-line)]">
      {children}
    </code>
  );
}

function GoTo({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-navy/20 text-[11px] tracking-[0.18em] uppercase text-navy hover:bg-navy hover:text-cream transition-colors"
    >
      {children}
      <ChevronRight size={11} />
    </Link>
  );
}

function Note({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "success";
  children: React.ReactNode;
}) {
  const tones = {
    info: "bg-blue-50 ring-blue-200 text-blue-900",
    warning: "bg-amber-50 ring-amber-200 text-amber-900",
    success: "bg-emerald-50 ring-emerald-200 text-emerald-900",
  };
  return (
    <div
      className={cn(
        "rounded-md ring-1 px-4 py-3 text-sm leading-relaxed",
        tones[tone],
      )}
    >
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="font-mono text-[13px] leading-relaxed bg-navy text-cream rounded-md px-4 py-3 overflow-x-auto">
      <code>{children}</code>
    </pre>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-ink/5 border border-[var(--jmn-line)] text-ink/85">
      {children}
    </kbd>
  );
}

function Table({
  head,
  rows,
}: {
  head: React.ReactNode[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-[var(--jmn-line)]">
      <table className="w-full text-sm">
        <thead className="bg-[#FAFAFA] text-[10px] tracking-[0.18em] uppercase text-ink/55">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="text-left font-medium px-4 py-2.5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-[var(--jmn-line)]">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — Getting started
// ─────────────────────────────────────────────────────────────────────────────

function SectionGettingStarted() {
  return (
    <Section
      id="getting-started"
      eyebrow="01"
      title="Getting started"
      intro={
        <P>
          The admin runs the full house: catalog, inventory, sales, customers,
          loyalty, and the public storefront content. You sign in once at{" "}
          <Path>/admin/login</Path>; everything else is one of the items in the
          left sidebar.
        </P>
      }
    >
      <SubSection title="Signing in">
        <P>
          Open <Path>/admin/login</Path>. Use your staff email + password —
          the same identity you use elsewhere on the site, but only accounts
          with a staff role can reach the admin. Customer-only accounts are
          rejected at the login screen.
        </P>
        <Note>
          A successful sign-in stores a JWT under{" "}
          <Path>localStorage[&quot;jmn:admin:access&quot;]</Path>. It refreshes
          automatically; you&apos;ll only be sent back to login if the token
          truly expires or your account is suspended.
        </Note>
      </SubSection>

      <SubSection title="Sidebar tour">
        <P>
          Sections, top to bottom, and what lives in each:
        </P>
        <Table
          head={["Section", "What it manages"]}
          rows={[
            ["Overview", <>The dashboard at <Path>/admin</Path> — KPIs, revenue chart, recent orders, low stock.</>],
            ["Catalog", <>Products, categories, brands, collections, lookbooks. Drives <em>everything</em> the customer sees.</>],
            ["Inventory", <>Warehouses (where stock lives) + Stock (per-variant on-hand levels).</>],
            ["Purchasing", <>Suppliers and Purchase Orders — the only place stock <strong>increases</strong>.</>],
            ["Sales", <>Orders + Coupons. Receive, refund, ship.</>],
            ["People", <>Customers + your team.</>],
            ["Loyalty", <>Tiers, rewards catalog, point activity, manual adjustments.</>],
            ["Storefront", <>Homepage blocks (hero, marquee, manifesto, etc.) — the public site is fully driven from here.</>],
            ["Content", <>Reviews, FAQs, testimonials.</>],
            ["Support", <>Contact form submissions + newsletter list.</>],
            ["System", <>Roles & permissions, organizations, stores, audit log, settings.</>],
            ["Help", <>This documentation.</>],
          ]}
        />
      </SubSection>

      <SubSection title="Currency, language, and the basics">
        <Bullets
          items={[
            <>All money in the system is in <strong>BDT (৳)</strong>. Both backend defaults and frontend formatting use the taka glyph.</>,
            <>Dates and times use your browser&apos;s locale (so they&apos;ll look right wherever you sign in from).</>,
            <>The whole admin is a SPA: most pages auto-refresh after an action; a few have a <strong>Refresh</strong> button if you need to force a re-fetch.</>,
            <>Permission errors don&apos;t crash the admin — you&apos;ll just see a red banner explaining what role you&apos;d need.</>,
          ]}
        />
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — Catalog
// ─────────────────────────────────────────────────────────────────────────────

function SectionCatalog() {
  return (
    <Section
      id="catalog"
      eyebrow="02"
      title="Catalog"
      intro={
        <P>
          The catalog is the source of truth for everything customers see on
          the storefront — products, the sections to browse them under, the
          brands and collections they belong to, and the editorial lookbooks.
        </P>
      }
    >
      {/* Products */}
      <SubSection title="Products">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/products"><Package size={11} /> Products</GoTo>
        </div>
        <P>
          Each product carries a name, slug, SKU, gender, category, brand,
          collection, price (in ৳), images, fit, material, size variants,
          color variants, and editorial copy. The admin list shows everything
          with filter tabs for All / Active / Draft / Archived / Low stock.
        </P>

        <Note tone="warning">
          <strong>Status matters:</strong> a new product defaults to{" "}
          <code>draft</code>. Drafts are <em>hidden from customers</em>. Use
          the inline <strong>Publish</strong> button on the product list (or
          set status = active in the editor) to make it live.
        </Note>

        <P><strong>To add a product:</strong></P>
        <Steps
          items={[
            <>Click <strong>+ New product</strong> on <Path>/admin/products</Path>.</>,
            <>Fill required fields (name, sku, price, category). Slug auto-derives from the name.</>,
            <>Add at least one image URL (or paste a CDN URL). Multiple images become a gallery.</>,
            <>Add size variants under <em>Sizes</em> (XS, S, M, L, etc.) and optional color variants under <em>Colors</em> (each with name + hex). If a product has no colors, customers can still add it to cart with just a size.</>,
            <>Set marketing flags as needed: <em>is_new</em>, <em>is_featured</em>, <em>is_best_seller</em>, <em>is_limited</em>.</>,
            <>Save — it lands in <strong>Draft</strong>. Click <strong>👁 Publish</strong> on the row when ready.</>,
          ]}
        />

        <P>
          Once active, the product appears under{" "}
          <Path>/products</Path>, in its category at{" "}
          <Path>/categories/&lt;slug&gt;</Path>, and in any home block it&apos;s
          referenced from. Edits propagate within ~60s (storefront cache TTL).
        </P>

        <Note>
          <strong>Stock:</strong> products start with zero stock. Stock is{" "}
          <em>added</em> by receiving a Purchase Order (see Purchasing) or by
          editing a stock row directly under <strong>Stock</strong>. The
          product list shows <span className="text-rose-700">red</span>{" "}
          stock count when zero, <span className="text-amber-700">amber</span>{" "}
          under 20, and navy otherwise.
        </Note>
      </SubSection>

      {/* Categories */}
      <SubSection title="Categories">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/categories"><Folder size={11} /> Categories</GoTo>
        </div>
        <P>
          Two-level hierarchy via a self-FK <em>parent</em>. Each category
          has a slug (used in the URL <Path>/categories/&lt;slug&gt;</Path>),
          gender (men / women / unisex / kids), an image, an optional{" "}
          <em>banner_image</em> (used as the immersive hero on the category
          page), description, and a featured flag.
        </P>
        <Bullets
          items={[
            <><strong>Featured categories</strong> appear on the homepage
              category grid block.</>,
            <>Every category page (<Path>/categories/&lt;slug&gt;</Path>)
              renders breadcrumb, hero, sub-category pills, full filter rail,
              and sibling-categories nav at the bottom — completely driven by
              the category record + its child products.</>,
          ]}
        />
      </SubSection>

      {/* Brands */}
      <SubSection title="Brands">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/brands"><Tag size={11} /> Brands</GoTo>
        </div>
        <P>
          Used to group products under a label (in-house brand, supplier
          brand, etc.). Each brand has a slug, logo, and description; it
          gets its own page at <Path>/brands/&lt;slug&gt;</Path>.
        </P>
      </SubSection>

      {/* Collections */}
      <SubSection title="Collections">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/collections"><Layers size={11} /> Collections</GoTo>
        </div>
        <P>
          Time-based groupings (e.g. <em>SS26 Ascension</em>, <em>FW25
          Manuscript</em>). Set a launch date, hero image, and you can mark
          one as featured. Linked from the homepage&apos;s lookbook /
          featured-edit blocks.
        </P>
      </SubSection>

      {/* Lookbooks */}
      <SubSection title="Lookbooks">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/lookbooks"><ImageIcon size={11} /> Lookbooks</GoTo>
        </div>
        <P>
          Editorial story pages — covers, image grids, photographer/stylist
          credits. Tag products in a lookbook so visitors can shop the look.
          The homepage lookbook strip pulls the most-recent published
          lookbooks automatically.
        </P>
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — Inventory
// ─────────────────────────────────────────────────────────────────────────────

function SectionInventory() {
  return (
    <Section
      id="inventory"
      eyebrow="03"
      title="Inventory"
      intro={
        <P>
          Stock is tracked per <em>(product, color, size, warehouse)</em>{" "}
          tuple. Two pages cover it: <strong>Warehouses</strong> for the
          physical locations and <strong>Stock</strong> for the actual
          on-hand quantities.
        </P>
      }
    >
      <SubSection title="Warehouses">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/warehouses"><Warehouse size={11} /> Warehouses</GoTo>
        </div>
        <P>
          You need at least one active warehouse marked <em>default</em>. New
          orders reserve stock from the default warehouse, and goods
          received via a Purchase Order land in the warehouse picked on the
          PO header.
        </P>
        <Bullets
          items={[
            <><strong>code</strong> — short identifier (e.g. WH-MAIN, NYC-FLAGSHIP).</>,
            <><strong>address</strong> — used on shipping documents and order timelines.</>,
            <><strong>is_default</strong> — exactly one warehouse is the default. Tick it to switch.</>,
            <><strong>is_active</strong> — un-tick to retire a warehouse without deleting it (keeps history intact).</>,
          ]}
        />
      </SubSection>

      <SubSection title="Stock levels">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/stock"><ClipboardList size={11} /> Stock</GoTo>
        </div>
        <P>
          One row per <em>(product, color, size, warehouse)</em>. Three
          numbers per row:
        </P>
        <Table
          head={["Field", "Meaning"]}
          rows={[
            [<strong key="q">quantity</strong>, "Total physical stock at this warehouse for this variant."],
            [<strong key="r">reserved</strong>, "Locked by in-flight orders that have been placed but not yet shipped/refunded."],
            [<strong key="a">available</strong>, "quantity − reserved. The number that's actually buyable right now."],
          ]}
        />
        <P>
          Click any row to open the adjust drawer. You can change{" "}
          <em>quantity</em> directly (creates an <code>adjusted</code>{" "}
          movement in the journal) and the <em>low_stock_threshold</em> that
          drives the <span className="text-amber-700">amber</span> badge on
          the product list.
        </P>
        <Note>
          <strong>Where does stock <em>increase</em>?</strong> Three sources:
          posting a <strong>Goods Receipt</strong> (purchasing flow), a
          customer <strong>refund</strong> on a delivered order, or a manual
          quantity edit here. Every change is journaled.
        </Note>
      </SubSection>

      <SubSection title="Stock movements (journal)">
        <P>
          The <em>StockMovement</em> table is append-only — every change to
          a stock level (sold, returned, received, adjusted, reserved,
          unreserved, damaged, transferred) writes a row. You can replay the
          journal to recompute the current quantity, which is what makes
          stock fully auditable.
        </P>
        <P>
          The journal isn&apos;t directly browsable in the admin yet — the
          activity surfaces on each PO detail (under <em>Goods receipts</em>)
          and order timeline. For raw access, use the Django admin at{" "}
          <Path>/admin/inventory/stockmovement/</Path>.
        </P>
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — Purchasing
// ─────────────────────────────────────────────────────────────────────────────

function SectionPurchasing() {
  return (
    <Section
      id="purchasing"
      eyebrow="04"
      title="Purchasing"
      intro={
        <P>
          The purchasing module is the only place stock comes <em>in</em>{" "}
          (other than manual edits or refunds). It mirrors the lifecycle of
          a real PO with a state machine: Draft → Awaiting Approval →
          Approved → Ordered → Partial Received → Received → Closed (or
          Cancelled at any point before receive).
        </P>
      }
    >
      <SubSection title="Suppliers">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/suppliers"><Truck size={11} /> Suppliers</GoTo>
        </div>
        <P>
          The vendor you buy from. Each supplier carries contact details,
          tax id, default currency, and <em>payment_terms_days</em>{" "}
          (Net X — 0 means prepaid / COD). Status: <em>active</em>,{" "}
          <em>inactive</em>, or <em>blocked</em>. A supplier can&apos;t be
          deleted while open POs exist — change status instead.
        </P>
      </SubSection>

      <SubSection title="Creating a Purchase Order (POS-style)">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/purchase-orders"><PackagePlus size={11} /> Purchase Orders</GoTo>
        </div>
        <P>
          Click <strong>+ New purchase order</strong>. The page is a POS-
          style fast-entry form:
        </P>
        <Steps
          items={[
            <>Top strip: pick the <strong>supplier</strong> (currency + payment terms auto-fill from the supplier&apos;s defaults), pick the <strong>warehouse</strong> goods will land in.</>,
            <>The big search box auto-focuses. Type a product name or SKU; results appear in a dropdown with thumbnail · cost · variants · stock badge.</>,
            <><Kbd>Enter</Kbd> or click adds the product to the lines table below — search clears and refocuses for the next item. Same product+variant scanned twice just bumps the qty on the existing row.</>,
            <>Edit any cell inline: color/size dropdowns (auto-populated from the product), qty, unit cost, discount %, tax %. Tab moves cell to cell.</>,
            <>The right-hand totals panel updates live with subtotal, line discounts, doc-level discount/tax/shipping/other charges, and the running total.</>,
            <>Add notes for the supplier and internal notes (the latter never gets sent out).</>,
            <>Click <strong>Save as draft</strong>. You land on the PO detail.</>,
          ]}
        />

        <Note>
          For ad-hoc lines that aren&apos;t in the catalog (hangtags,
          packaging, etc.) click <strong>+ Add non-catalog line</strong> and
          type a product name + SKU directly into the row.
        </Note>
      </SubSection>

      <SubSection title="The PO lifecycle">
        <P>
          Every PO has a status. The detail page shows a banner telling you
          the next action and a sticky right rail with the appropriate
          buttons.
        </P>
        <Table
          head={["Status", "What it means", "Next action"]}
          rows={[
            ["draft", "Being authored. Lines editable.", "Submit for approval (or Approve directly)"],
            ["awaiting_approval", "Pending sign-off.", "Approve → Approved"],
            ["approved", "Approved internally, not yet sent.", "Place with supplier → Ordered"],
            ["ordered", "Sent. Awaiting goods.", "Receive goods when delivery arrives"],
            ["partial_received", "Some lines have come in.", "Receive next delivery"],
            ["received", "All lines fully received.", "(Optional) Close the PO"],
            ["closed", "Final state.", "—"],
            ["cancelled", "Pulled before any receipt.", "—"],
          ]}
        />
      </SubSection>

      <SubSection title="Receiving goods (real-time stock)">
        <P>
          On a PO in <em>ordered</em> or <em>partial_received</em> status,
          click <strong>Receive goods</strong>. The lines table morphs into
          an editable mode pre-filled with each line&apos;s remaining
          quantity. Adjust as needed, add the supplier&apos;s packing slip
          and any notes.
        </P>
        <P>
          A sticky bottom bar shows{" "}
          <em>&quot;Receiving N units across M lines · Stock at WH-XXX will
          increase&quot;</em> with the big green{" "}
          <strong>Post receipt &amp; update stock</strong> button. The post
          is atomic on the backend:
        </P>
        <Bullets
          items={[
            <>Each receipt line increments <Path>StockLevel.quantity</Path>{" "}
              (creating the row if this is the first time you&apos;ve
              received this exact variant + warehouse combo).</>,
            <>A <code>received</code> entry lands in the stock movements
              journal with the PO + GR numbers as the reference.</>,
            <>The PO line&apos;s <em>received_quantity</em> ticks up.</>,
            <>The PO status flips to <em>partial_received</em> or <em>received</em> based on whether all lines are fully received.</>,
          ]}
        />
        <Note tone="success">
          Stock is live the moment the green button returns success — no
          waiting for batch jobs. Refresh the Stock page to see the new
          rows; refresh the storefront after a 60s cache window.
        </Note>
        <P>
          By default a receipt can&apos;t exceed the ordered quantity. If the
          supplier shipped extras and you want to accept them, tick{" "}
          <em>Allow over-receipt</em> on the PO header before posting.
        </P>
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — Sales
// ─────────────────────────────────────────────────────────────────────────────

function SectionSales() {
  return (
    <Section
      id="sales"
      eyebrow="05"
      title="Sales & orders"
      intro={
        <P>
          Customer-placed orders, staff-created orders, refunds, shipments,
          coupons. Stock <em>reservations</em> happen at order placement;
          stock <em>deductions</em> happen when the order is marked paid.
        </P>
      }
    >
      <SubSection title="Order list & detail">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/orders"><ShoppingBag size={11} /> Orders</GoTo>
        </div>
        <P>
          Order rows show number (e.g. <code>RE-26-XXXXXX</code>),
          customer email, status pills, payment status, total, and placed
          date. Filter by status / payment status; search by order number,
          email, or phone.
        </P>
        <P>
          Order numbers are random hex (<code>RE-25-A3F1C2</code>), not
          sequential — competitors can&apos;t estimate volume from them.
        </P>
      </SubSection>

      <SubSection title="Status state machine">
        <P>
          Every status change writes an <em>OrderTimeline</em> row + fires
          a notification (email by default; SMS / push are available with
          provider configured). The flow:
        </P>
        <Code>
{`pending_payment → processing → ready_to_ship
  → shipped → out_for_delivery → delivered
  ↘ cancelled / returned / refunded (terminal)`}
        </Code>
        <P>
          Use the action buttons in the detail right rail to advance the
          status. The detail also shows the timeline (every change with
          actor + timestamp).
        </P>
      </SubSection>

      <SubSection title="Mark paid (commits stock)">
        <P>
          When an order arrives it has{" "}
          <Path>payment_status = pending</Path>. Click <strong>Mark paid</strong>{" "}
          to flip it to <em>paid</em>. Two things happen automatically:
        </P>
        <Bullets
          items={[
            <>The reservation on each line item is converted to a deduction:
              <em>StockLevel.quantity</em> drops by the order&apos;s qty,
              <em>StockLevel.reserved</em> drops by the same, and a{" "}
              <code>sold</code> entry is journaled.</>,
            <>The customer is auto-awarded loyalty points (see Loyalty
              section). Tier may be promoted.</>,
          ]}
        />
        <Note tone="warning">
          Payment confirmation is currently admin-driven. There&apos;s no
          live PSP webhook yet, so a real payment integration (Stripe /
          SSLCommerz / bKash) is the natural next step.
        </Note>
      </SubSection>

      <SubSection title="Customer checkout (storefront)">
        <P>
          The public checkout at <Path>/checkout</Path> works <strong>without
          a login</strong>. The customer fills:
        </P>
        <Bullets
          items={[
            <><strong>Phone (required)</strong> — uses the country-aware{" "}
              <em>react-phone-number-input</em> field, defaults to
              Bangladesh (+880).</>,
            <><strong>Email (optional)</strong> — used for order confirmation
              if provided.</>,
            <><strong>Shipping address</strong> — first/last name, line1,
              city, postcode, country are required. Billing defaults to
              shipping.</>,
            <><strong>Payment method</strong> — card / paypal / apple_pay /
              google_pay / bank_transfer / cod.</>,
            <><strong>Optional coupon code</strong>.</>,
          ]}
        />
        <P>
          The order is created with <Path>user=null</Path> for guests;
          when a logged-in customer checks out, it&apos;s linked to their
          account so it appears in their order history. The success page at{" "}
          <Path>/checkout/success?order=XYZ</Path> works for guests too —
          the order endpoint accepts anonymous retrieve-by-UUID.
        </P>
      </SubSection>

      <SubSection title="Coupons">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/coupons"><Ticket size={11} /> Coupons</GoTo>
        </div>
        <P>
          Three types: <em>percent</em>, <em>fixed</em>, <em>shipping</em>{" "}
          (free shipping). Per-coupon controls: validity dates, total usage
          limit, per-user limit, min spend, max discount, eligible
          categories / products, first-order-only flag.
        </P>
        <Note>
          Loyalty redemptions also create coupons (codes start with{" "}
          <code>LOY-</code>) — single use, scoped to the redeeming customer
          via the RewardRedemption record.
        </Note>
      </SubSection>

      <SubSection title="Shipments & refunds">
        <P>
          A shipment groups order items being sent in a single physical
          delivery — carrier, tracking number, status (pending / in_transit
          / delivered / returned / lost).
        </P>
        <P>
          Refunds are amount-based, with a reason (requested / defective /
          wrong_item / late / other) and a status (pending / approved /
          denied / processed). Approving a refund credits the points back
          to the customer&apos;s loyalty balance.
        </P>
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — Customers
// ─────────────────────────────────────────────────────────────────────────────

function SectionCustomers() {
  return (
    <Section
      id="customers"
      eyebrow="09"
      title="Customers"
      intro={
        <P>
          The customer list is your roster of registered shoppers. (Guest
          orders aren&apos;t listed here — they live on the order itself by
          email.)
        </P>
      }
    >
      <SubSection title="Customer list & status">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/customers"><Users size={11} /> Customers</GoTo>
        </div>
        <P>
          Each row shows email, name, account status, loyalty tier, and a
          quick view of recent activity. The account status machine is:
        </P>
        <Table
          head={["Status", "Effect"]}
          rows={[
            ["pending", "Created but email not yet verified."],
            ["active", "Normal — can sign in, place orders, redeem points."],
            ["suspended", "Sign-in blocked. Tokens revoked on next request via SessionAwareJWTAuthentication."],
            ["locked", "Auto-locked after 5 failed login attempts (15-min cooldown). Unlock manually if needed."],
            ["banned", "Permanent block."],
            ["deactivated", "Customer-initiated close. Keeps order history."],
          ]}
        />
        <P>
          Use the row actions to lock / unlock / suspend / reactivate / force
          password reset. Every action is journaled in the audit log.
        </P>
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — Loyalty
// ─────────────────────────────────────────────────────────────────────────────

function SectionLoyalty() {
  return (
    <Section
      id="loyalty"
      eyebrow="10"
      title="Loyalty program"
      intro={
        <P>
          A complete tiered points program. Customers earn points on paid
          orders, advance through tiers as their lifetime spend grows, and
          spend points on rewards from a catalog you control.
        </P>
      }
    >
      <SubSection title="How earning works">
        <P>
          When an order&apos;s payment status flips to <em>paid</em>, the
          system runs (atomically):
        </P>
        <Steps
          items={[
            <><em>CustomerProfile.lifetime_value</em> += order subtotal.</>,
            <>Tier is recomputed from the new lifetime value (admin can edit thresholds).</>,
            <>Points are awarded using the <strong>new tier&apos;s</strong> multiplier:{" "}
              <code>floor(subtotal × points_per_currency × multiplier)</code>.</>,
            <>The award lands in the loyalty ledger as an <code>order_award</code> entry, with <em>balance_after</em> snapshot.</>,
          ]}
        />
        <Note tone="success">
          The whole flow is <strong>idempotent</strong> on{" "}
          <em>(user, order_number)</em>. Re-saving the same order won&apos;t
          double-award. Refunding it will claw back the points{" "}
          (<code>order_refund_clawback</code>) and roll back the lifetime
          value.
        </Note>
      </SubSection>

      <SubSection title="Tier configuration">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/loyalty/tiers"><Award size={11} /> Tiers</GoTo>
        </div>
        <P>
          Five fixed tiers (Bronze → Silver → Gold → Platinum → Obsidian).
          Each row exposes:
        </P>
        <Bullets
          items={[
            <><strong>Minimum lifetime value</strong> — when LTV reaches this, the customer joins this tier. Bronze starts at 0.</>,
            <><strong>Points per ৳</strong> — base earn rate (default 1.00).</>,
            <><strong>Points multiplier</strong> — the tier&apos;s perk on top of the base rate. Default scale: 1.00 / 1.25 / 1.50 / 2.00 / 3.00.</>,
            <><strong>Perks</strong> — bullet list shown on the customer&apos;s loyalty hub.</>,
            <><strong>Badge color</strong> — the round badge used in the customer UI + admin dashboard.</>,
            <><strong>Active</strong> — toggle off to hide a tier (customers won&apos;t be promoted to it).</>,
          ]}
        />
        <P>
          Save per row — changes apply to the next paid order. Existing
          customers stay where they are unless they place an order or you
          run the recompute service manually.
        </P>
      </SubSection>

      <SubSection title="Rewards catalog">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/loyalty/rewards"><Gift size={11} /> Rewards</GoTo>
        </div>
        <P>
          What customers can spend points on. Three reward types — all
          mint a single-use Coupon scoped to the redeeming customer:
        </P>
        <Table
          head={["Type", "Value field meaning"]}
          rows={[
            ["coupon_percent", "Percent off the order (0–100)"],
            ["coupon_fixed", "Flat ৳ amount off"],
            ["coupon_shipping", "Free shipping (value ignored)"],
          ]}
        />
        <P>Other knobs:</P>
        <Bullets
          items={[
            <><strong>points_cost</strong> — what the customer pays in points.</>,
            <><strong>min_spend / max_discount</strong> — coupon-level guards.</>,
            <><strong>coupon_validity_days</strong> — how long the issued coupon stays valid after redemption.</>,
            <><strong>minimum_tier</strong> — restrict to Gold+ etc.</>,
            <><strong>inventory_limit / per_user_limit</strong> — total + per-customer redemption caps.</>,
            <><strong>is_active</strong> — toggle off to retire a reward without deleting it.</>,
          ]}
        />
      </SubSection>

      <SubSection title="Customer experience">
        <P>
          Logged-in customers see a <strong>Loyalty</strong> tab on their{" "}
          <Path>/account</Path>. It shows the tier badge, current points, a
          progress bar to the next tier (with the ৳ amount left to spend),
          their tier&apos;s perks, any active coupon vouchers ready to copy,
          the rewards catalog (with smart redeem buttons that disable when
          unaffordable or tier-gated), and recent activity.
        </P>
      </SubSection>

      <SubSection title="Admin: activity ledger & manual adjustments">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/loyalty/transactions"><ClipboardList size={11} /> Activity</GoTo>
        </div>
        <P>
          The ledger is read-only — corrections go through a balancing
          entry, never an edit (audit trail stays clean). Filter by reason
          (order award, redemption, refund clawback, etc.) and search by
          customer email.
        </P>
        <P>
          Click <strong>Manual adjustment</strong> to credit or debit a
          customer&apos;s points outside the normal flow (goodwill,
          correction, contest prize). The adjustment is journaled with your
          account as the actor.
        </P>
      </SubSection>

      <SubSection title="Loyalty dashboard">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/loyalty"><Sparkles size={11} /> Overview</GoTo>
        </div>
        <P>
          KPIs at a glance: members, points outstanding, last-30d earned vs
          spent, redemption count, active rewards. Plus tier distribution
          bars and a top-earners leaderboard.
        </P>
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — Storefront content
// ─────────────────────────────────────────────────────────────────────────────

function SectionStorefront() {
  return (
    <Section
      id="storefront"
      eyebrow="13"
      title="Storefront content"
      intro={
        <P>
          The customer-facing site is fully content-managed from the admin.
          The homepage especially — every section is a HomeBlock you can
          edit with a live preview.
        </P>
      }
    >
      <SubSection title="Homepage blocks">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/homepage"><LayoutDashboard size={11} /> Homepage</GoTo>
        </div>
        <P>
          The homepage is built from typed blocks. Each <em>kind</em> drives
          a specific section of the page:
        </P>
        <Table
          head={["Kind", "Where it shows"]}
          rows={[
            ["hero", "Top hero — banner image + eyebrow + title + CTA"],
            ["marquee", "Animated text strip just under the hero"],
            ["category_grid", "Featured categories grid (uses the categories you mark featured)"],
            ["featured_edit", "Hand-picked products (or featured_products selection)"],
            ["manifesto", "Brand-story split — image + copy"],
            ["new_arrivals", "Carousel of products marked is_new"],
            ["lookbook_feature", "Editorial lookbook strip (recent published lookbooks)"],
            ["best_sellers", "Grid of products marked is_best_seller"],
            ["testimonials", "Auto-rotating customer quotes"],
            ["newsletter_cta", "Final newsletter signup section"],
          ]}
        />
        <Note>
          A fresh install ships with one of each block already seeded. If
          you delete a block, that <em>section</em> disappears from the
          public page entirely. Rebuild it via <strong>+ New block</strong>{" "}
          and pick the kind. Run <code>python manage.py seed_homepage</code>{" "}
          to recreate the defaults.
        </Note>
      </SubSection>

      <SubSection title="FAQs, testimonials, contact, newsletter">
        <Bullets
          items={[
            <><GoTo href="/admin/faqs">FAQs</GoTo>{" "}
              — categorized Q&amp;A shown on <Path>/faq</Path>.</>,
            <><GoTo href="/admin/testimonials"><Quote size={11} /> Testimonials</GoTo>{" "}
              — customer quotes, fed into the homepage testimonials block.</>,
            <><GoTo href="/admin/contact"><Mail size={11} /> Contact</GoTo>{" "}
              — submissions from the public contact form. Status (new / in_progress / resolved / spam) is set by staff.</>,
            <><GoTo href="/admin/newsletter">Newsletter</GoTo>{" "}
              — every email signed up via the newsletter CTA, with source (footer / popup / home).</>,
          ]}
        />
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — People & permissions
// ─────────────────────────────────────────────────────────────────────────────

function SectionPeople() {
  return (
    <Section
      id="people"
      eyebrow="14"
      title="People & permissions"
      intro={
        <P>
          Staff identity, roles, organizations, and stores. Permissions are
          dotted codes (e.g. <code>orders.refund.approve</code>) bundled
          into roles, scoped to the org / store / department level.
        </P>
      }
    >
      <SubSection title="Team (staff list)">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/team">Team</GoTo>
        </div>
        <P>
          Every staff account that can sign into the admin. Lock / suspend
          / reactivate from the row actions; the account&apos;s next request
          revalidates the status, so a suspension takes effect even on a
          token that&apos;s still cryptographically valid.
        </P>
      </SubSection>

      <SubSection title="Roles">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/roles">Roles</GoTo>
        </div>
        <P>
          A role is a named bundle of permission codes. Roles can inherit
          from a parent role (the inheritance chain is walked at runtime, max
          16 hops). System-defined roles are immutable; custom roles can be
          created per organization.
        </P>
        <P>
          The role drawer is a real UX, not a JSON textarea. Permissions are
          rendered as grouped checkboxes (one card per module: Catalog,
          Inventory, Sales, …) with search-across-name-+-code, per-group{" "}
          <strong>Select all</strong>, indeterminate header checkboxes, and a
          live &quot;X of Y selected&quot; counter. Submit sends a flat
          <Path> permission_codes</Path> array; unknown codes get a friendly
          400 rather than being silently dropped.
        </P>
        <Note>
          The full permission catalog (56 codes across 10 modules) is seeded
          from <code>auth_app/permissions_catalog.py</code> via a{" "}
          <code>post_migrate</code> signal — runs on every <code>migrate</code>,
          idempotent. Add a new permission by appending one entry to that
          file and redeploying.
        </Note>
      </SubSection>

      <SubSection title="How permissions gate the UI">
        <P>
          The <code>useAdmin()</code> context exposes a{" "}
          <code>hasPermission(code | code[])</code> helper. Superusers always
          pass. Sidebar entries declare an optional <code>permission</code>{" "}
          field, and the sidebar filters items the current admin can&apos;t
          access — empty sections are dropped entirely so the rail stays tidy.
        </P>
        <P>
          Backend-side, every privileged viewset checks via the{" "}
          <code>HasRequiredPermission</code> class. Effective permissions for
          the current user are returned on <Path>/api/auth/me/</Path> as the{" "}
          <code>effective_permissions</code> array — the union across every
          assigned role and its parent chain.
        </P>
      </SubSection>

      <SubSection title="Organizations & stores">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/organizations">Organizations</GoTo>{" "}
          <GoTo href="/admin/stores">Stores</GoTo>
        </div>
        <P>
          A two-level tenancy hierarchy: <strong>Organization → Store</strong>
          . Most installations have one organization and several stores
          (web, B2B portal, POS, mobile). Permissions can be scoped to a
          specific store; an org-level role covers any store within it.
        </P>
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10 — System
// ─────────────────────────────────────────────────────────────────────────────

function SectionSystem() {
  return (
    <Section
      id="system"
      eyebrow="17"
      title="System"
      intro={
        <P>
          Cross-cutting operational concerns: the audit log, settings, and
          where to look when something doesn&apos;t add up.
        </P>
      }
    >
      <SubSection title="Audit log">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/audit-log">Audit log</GoTo>
        </div>
        <P>
          Append-only journal of every auth + privileged action: logins
          (success and failure), password resets, role assignments, OTP
          requests, MFA changes, account locks. Useful when investigating
          &quot;who did what when?&quot;
        </P>
      </SubSection>

      <SubSection title="Settings">
        <div className="flex items-center gap-2 mb-2">
          <GoTo href="/admin/settings">Settings</GoTo>
        </div>
        <P>
          Surface for store-wide preferences. Most operational config lives
          in environment variables (read by Django settings); the admin
          settings page is for things you genuinely want non-engineers to
          tweak.
        </P>
      </SubSection>

      <SubSection title="Soft-delete & history">
        <P>
          Several models use <code>safedelete</code>: deleted rows are
          marked, not actually removed (UserAccount, Organization, Role,
          Brand, Category, Product, Order, ApiKey, LookbookEntry). To
          restore a deleted row, an engineer can use the Django shell:
        </P>
        <Code>{`from storefront.models import Product
Product.all_objects.filter(slug="polo").first().undelete()`}</Code>
        <P>
          Models with audit history (UserAccount, Role, Product, Order, PO,
          NotificationTemplate) keep every save in a parallel{" "}
          <em>historical</em> table — the request user is captured
          automatically.
        </P>
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 11 — Common workflows (cookbook)
// ─────────────────────────────────────────────────────────────────────────────

function SectionWorkflows() {
  return (
    <Section
      id="workflows"
      eyebrow="18"
      title="Common workflows"
      intro={
        <P>
          The recipes you&apos;ll run weekly. Each one cross-references the
          relevant admin pages.
        </P>
      }
    >
      <SubSection title="Add a new product end-to-end">
        <Steps
          items={[
            <>Go to <GoTo href="/admin/products">Products</GoTo>{" "}→{" "}
              <strong>+ New product</strong>. Fill required fields. Save.</>,
            <>Add color/size variants if needed. Re-save.</>,
            <>Click the green <strong>👁 Publish</strong> on the product row to flip status to active.</>,
            <>(Optional) Mark as <em>is_featured</em> / <em>is_new</em> /{" "}
              <em>is_best_seller</em> to surface on the homepage.</>,
            <>Add stock either via a Purchase Order receipt (preferred —
              keeps cost history) or a manual edit on{" "}
              <GoTo href="/admin/stock">Stock</GoTo>.</>,
            <>Verify on the storefront by visiting <Path>/products/&lt;slug&gt;</Path>.</>,
          ]}
        />
      </SubSection>

      <SubSection title="Restock from a supplier">
        <Steps
          items={[
            <>Open <GoTo href="/admin/suppliers">Suppliers</GoTo> and confirm the supplier exists. Create one if not.</>,
            <>Go to <GoTo href="/admin/purchase-orders">Purchase Orders</GoTo>{" "}→{" "}
              <strong>+ New purchase order</strong>.</>,
            <>Pick supplier + warehouse. Use the search box to scan products into the lines table.</>,
            <>Set per-line quantities and unit costs. Verify the totals panel. <strong>Save as draft</strong>.</>,
            <>On the PO detail: <strong>Submit → Approve → Place with supplier</strong>. The PO is now <em>ordered</em>.</>,
            <>When the goods arrive, click <strong>Receive goods</strong>. Adjust quantities if anything was short, add the supplier packing slip, and <strong>Post receipt &amp; update stock</strong>.</>,
            <>Refresh <GoTo href="/admin/stock">Stock</GoTo> — the new on-hand quantities are live.</>,
          ]}
        />
      </SubSection>

      <SubSection title="Run a discount campaign">
        <Steps
          items={[
            <>Go to <GoTo href="/admin/coupons">Coupons</GoTo>{" "}→{" "}
              <strong>+ New coupon</strong>.</>,
            <>Pick the type: percent (with optional max_discount cap), fixed (flat ৳), or shipping (free shipping).</>,
            <>Set valid_from and valid_until dates, plus optional min_spend, total usage_limit, and per-user usage_limit_per_user.</>,
            <>(Optional) Restrict to specific categories or products.</>,
            <>Save → the code is immediately usable at checkout. Customers paste it in the coupon field.</>,
          ]}
        />
      </SubSection>

      <SubSection title="Edit the homepage">
        <Steps
          items={[
            <>Go to <GoTo href="/admin/homepage">Homepage</GoTo>. Each block is a row.</>,
            <>Click any row to open the editor with a live preview pane.</>,
            <>Change title / eyebrow / image / CTA / linked entities, save.</>,
            <>Open the public site and hard-refresh to bust the 60s cache.</>,
            <>To add a brand-new block, use <strong>+ New block</strong> and pick a kind. To remove a section entirely, deactivate or delete its block.</>,
          ]}
        />
      </SubSection>

      <SubSection title="Process a refund">
        <Steps
          items={[
            <>Open the order. Click <strong>+ New refund</strong>.</>,
            <>Pick which order items to refund and the amount. Choose a reason.</>,
            <>Status starts as <em>pending</em>. Approve → <em>approved</em>. Process → <em>processed</em>.</>,
            <>Approval credits the loyalty points back to the customer (if any were earned for this order) and rolls back the lifetime value contribution.</>,
            <>Stock for the returned items has to be added back via a manual edit on the Stock page or by creating an inbound StockMovement.</>,
          ]}
        />
      </SubSection>

      <SubSection title="Investigate a customer issue">
        <Steps
          items={[
            <>Find the customer on <GoTo href="/admin/customers">Customers</GoTo>. Open the detail.</>,
            <>Check their order list (orders show against the email).</>,
            <>For loyalty-related issues, check{" "}
              <GoTo href="/admin/loyalty/transactions">Activity</GoTo>{" "}
              and search by email — every credit / debit is journaled with reason + actor.</>,
            <>For login / security issues, check the audit log filtered to that user.</>,
            <>If a goodwill credit is appropriate, use <strong>Manual adjustment</strong> on the loyalty activity page.</>,
          ]}
        />
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 12 — API reference
// ─────────────────────────────────────────────────────────────────────────────

function SectionApi() {
  return (
    <Section
      id="api"
      eyebrow="19"
      title="API reference"
      intro={
        <P>
          The admin talks to the Django backend over a single REST API. The
          endpoints below are the most commonly used; the full auto-generated
          DRF browsable API lives at <Path>/api/&lt;namespace&gt;/</Path>{" "}
          when <code>DEBUG=True</code>.
        </P>
      }
    >
      <SubSection title="Top-level prefixes">
        <Table
          head={["Prefix", "Domain"]}
          rows={[
            [<Path key="auth">/api/auth/</Path>, "Identity, login, JWT, RBAC"],
            [<Path key="site">/api/site/</Path>, "Catalog (products / categories / brands / collections / lookbooks / reviews / FAQs / testimonials / homepage / newsletter / contact)"],
            [<Path key="inv">/api/inventory/</Path>, "Cart, checkout, orders, stock, warehouses, addresses, coupons, suppliers, purchase orders, goods receipts, refunds, shipments, dashboard"],
            [<Path key="not">/api/notifications/</Path>, "Templates, preferences, inbox, push subscriptions"],
            [<Path key="loy">/api/loyalty/</Path>, "Tier config, rewards catalog, transactions, redemptions, customer-facing /me/"],
          ]}
        />
      </SubSection>

      <SubSection title="Auth">
        <Code>{`POST   /api/auth/login/              { email, password } → { access, refresh, user }
POST   /api/auth/refresh/            { refresh } → { access }
POST   /api/auth/logout/             { refresh } → 204
GET    /api/auth/me/                 → current user
PATCH  /api/auth/me/                 → update profile
POST   /api/auth/password/change/    → change password
POST   /api/auth/password/reset/     → start reset (always 200)
POST   /api/auth/password/reset/confirm/  → confirm reset
GET    /api/auth/users/              → admin: list users (?account_type=customer)
POST   /api/auth/users/{id}/lock/    → admin: lock account
POST   /api/auth/users/{id}/suspend/ → admin: suspend account`}</Code>
      </SubSection>

      <SubSection title="Catalog">
        <Code>{`GET    /api/site/products/?search=&category__slug=&page=
GET    /api/site/products/{slug}/    → product detail (incl. stock_by_size + stock_by_variant)
GET    /api/site/categories/         → list
GET    /api/site/categories/{slug}/  → detail (with subcategories)
GET    /api/site/brands/, /collections/, /lookbooks/
GET    /api/site/home/               → aggregated homepage payload (blocks + featured products)
POST   /api/site/contact/            → public contact form
POST   /api/site/newsletter/         → public signup`}</Code>
      </SubSection>

      <SubSection title="Inventory & checkout">
        <Code>{`GET    /api/inventory/cart/                      → current user's cart
POST   /api/inventory/cart/items/                → add to cart
PATCH  /api/inventory/cart/items/                → update qty
DELETE /api/inventory/cart/items/?id=...         → remove
POST   /api/inventory/cart/coupon/               → apply / remove coupon

POST   /api/inventory/checkout/                  → cart-based checkout (auth required)
POST   /api/inventory/guest-checkout/            → guest-friendly checkout (items in body)

GET    /api/inventory/orders/                    → list (own + admin)
GET    /api/inventory/orders/{id}/               → public retrieve by UUID
POST   /api/inventory/orders/{id}/update_status/ → admin
POST   /api/inventory/orders/{id}/mark_paid/     → admin (commits stock)

GET    /api/inventory/stock-levels/              → admin
PATCH  /api/inventory/stock-levels/{id}/         → adjust
GET    /api/inventory/dashboard/?days=14         → KPIs

GET    /api/inventory/suppliers/                 → admin CRUD
GET    /api/inventory/purchase-orders/           → admin CRUD
POST   /api/inventory/purchase-orders/{id}/submit|approve|place-order|cancel|close|receive/`}</Code>
      </SubSection>

      <SubSection title="Loyalty">
        <Code>{`# Customer-facing
GET    /api/loyalty/me/                          → dashboard payload
GET    /api/loyalty/me/transactions/?page=&page_size=  → ledger
GET    /api/loyalty/rewards/                     → catalog
POST   /api/loyalty/redeem/  { reward: <uuid> }  → mints a coupon

# Admin
GET    /api/loyalty/admin/dashboard/             → KPIs
GET    /api/loyalty/admin/tiers/                 → tier configs
PATCH  /api/loyalty/admin/tiers/{id}/            → update tier
GET    /api/loyalty/admin/rewards/               → CRUD
GET    /api/loyalty/admin/transactions/?reason=  → ledger
GET    /api/loyalty/admin/redemptions/           → list
POST   /api/loyalty/admin/redemptions/{id}/revoke/   → undo a redemption
POST   /api/loyalty/admin/adjust/  { user, points, note }  → manual adjust
GET    /api/loyalty/admin/customers/{user_id}/   → admin view of one customer's loyalty`}</Code>
      </SubSection>

      <SubSection title="Authentication header">
        <P>
          Every authenticated call needs a JWT in the standard header:
        </P>
        <Code>{`Authorization: Bearer <access_token>`}</Code>
        <P>
          Tokens come from <Path>POST /api/auth/login/</Path>. The admin SPA
          stores them in <Path>localStorage[&quot;jmn:admin:access&quot;]</Path>{" "}
          and refreshes on 401 automatically. The customer SPA uses{" "}
          <Path>localStorage[&quot;jmn:django:access&quot;]</Path>.
        </P>
        <Note tone="warning">
          Currently tokens live in <code>localStorage</code> (XSS-readable).
          For production, the engineering plan is to move to{" "}
          <code>httpOnly + SameSite=Strict</code> cookies issued by a
          Next.js auth route handler.
        </Note>
      </SubSection>

      <SubSection title="Throttling">
        <P>
          DRF throttle scopes (see <code>config/settings.py</code>): user
          1000/hour, anon 100/hour. Scoped routes:
        </P>
        <Bullets
          items={[
            <><code>login</code> — 10/min</>,
            <><code>register</code> — 5/hour</>,
            <><code>otp</code> — 5/min</>,
            <><code>password_reset</code> — 5/hour</>,
            <><code>guest_checkout</code> — 20/hour per IP</>,
          ]}
        />
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION — Returns (sales + purchase)
// ─────────────────────────────────────────────────────────────────────────────

function SectionReturns() {
  return (
    <Section
      id="returns"
      eyebrow="06"
      title="Returns"
      intro={
        <P>
          Two flavours, mirror images of each other. <strong>Sales returns</strong>{" "}
          flow stock back <em>into</em> inventory and money back to the customer.{" "}
          <strong>Purchase returns</strong> pull stock <em>out</em> and record a
          credit from the supplier. Both live on a single page at{" "}
          <Path>/admin/returns</Path> with a Sales / Purchase tab switch.
        </P>
      }
    >
      <SubSection title="Sales returns — customer flow">
        <P>
          Triggered from an order&apos;s drawer with <strong>Process return</strong>.
          The state machine: <Path>requested</Path> → <Path>approved</Path> →{" "}
          <Path>received</Path> (stock goes back to the chosen warehouse) →{" "}
          <Path>refunded</Path> (money out, Order.payment_status flips). Any
          pre-received state can be <Path>rejected</Path>.
        </P>
        <Bullets
          items={[
            <>Per-line <strong>condition</strong>: <em>Resalable</em> restocks the variant; <em>Damaged</em> / <em>Opened</em> are written off and never re-enter inventory.</>,
            <>Restocking fee? Set the <strong>Refund amount</strong> lower than the items total — the difference stays with you.</>,
            <>Full refund on the only return flips the order to <Path>returned</Path>; partial refunds flip to <Path>partially_refunded</Path>.</>,
          ]}
        />
        <Steps
          items={[
            <>Open the order → click <strong>Process return</strong>.</>,
            <>Pick items, set quantity + condition, choose the restock warehouse, write a reason.</>,
            <>Submit. The return appears in <Path>/admin/returns</Path> as <em>Requested</em>.</>,
            <>From there: <strong>Approve</strong> → <strong>Mark goods received</strong> → <strong>Issue refund</strong>. Each click is atomic and journaled.</>,
          ]}
        />
        <GoTo href="/admin/returns">Open returns</GoTo>
      </SubSection>

      <SubSection title="Purchase returns — supplier flow">
        <P>
          Spawned from a PO detail page with <strong>Return to supplier</strong>{" "}
          (visible once goods have been received). States:{" "}
          <Path>draft</Path> → <Path>posted</Path> (stock pulled, PO line&apos;s
          received_quantity rolled back) → <Path>refunded</Path> (supplier credit
          recorded). Draft returns can be <Path>cancelled</Path>.
        </P>
        <Note>
          The PO&apos;s original <Path>amount_paid</Path> is <strong>not</strong>{" "}
          touched. Supplier credits are tracked separately so the payment
          ledger stays a clean audit trail. The financials report subtracts
          them from the period&apos;s purchase spend.
        </Note>
      </SubSection>

      <SubSection title="Stock guards">
        <Bullets
          items={[
            <>Sales return can&apos;t receive more units than were sold on the line.</>,
            <>Purchase return can&apos;t pull more units than were received on the line.</>,
            <>If a destination warehouse doesn&apos;t have enough <em>available</em> stock to release (because some is reserved), posting the return fails with a clear error.</>,
            <>Concurrent posts on the same (product, color, size, warehouse) serialise via <code>select_for_update</code> — no double-counted stock.</>,
          ]}
        />
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION — Invoices & PDFs
// ─────────────────────────────────────────────────────────────────────────────

function SectionInvoices() {
  return (
    <Section
      id="invoices"
      eyebrow="07"
      title="Invoices & PDFs"
      intro={
        <P>
          Two flavours of printable document. <strong>Customer invoices</strong>{" "}
          (a.k.a. delivery slips) — given to the rider at dispatch.{" "}
          <strong>Supplier invoices</strong> — the PO-as-invoice view, with
          payment history and balance due. Both are server-rendered PDFs via
          ReportLab; both stream as <Path>application/pdf</Path>.
        </P>
      }
    >
      <SubSection title="Customer invoice / delivery slip">
        <P>
          On any order — <strong>Invoice PDF</strong> in the order drawer, or
          the small PDF icon on every row in the orders list.
        </P>
        <Bullets
          items={[
            <>Big bold order number + payment-status pill.</>,
            <>Large-font customer phone + shipping address (what the rider needs at the door).</>,
            <>Highlighted <strong>Collect on delivery</strong> callout when payment isn&apos;t done — impossible to miss.</>,
            <>Signature box at the foot for the rider to capture proof of delivery.</>,
            <>Endpoint: <Path>GET /api/inventory/orders/&lt;id&gt;/invoice-pdf/</Path>. Public-readable by UUID, the same way the storefront&apos;s order-success page works.</>,
          ]}
        />
      </SubSection>

      <SubSection title="Supplier / purchase invoices">
        <P>
          A dedicated page at <Path>/admin/purchase-orders/invoices</Path>{" "}
          shows every billable PO with total, paid, balance, status, due date.
          Excludes draft + cancelled POs.
        </P>
        <Bullets
          items={[
            <>Header KPIs: Billed / Paid / Outstanding / Overdue.</>,
            <><strong>Supplier balance strip</strong> — total owed per supplier with overdue-count flag. Click a row to filter the table.</>,
            <>Filter tabs: <em>All / Unpaid / Partial / Paid / Overdue</em>.</>,
            <>Row click opens a drawer with the full payment ledger and an inline <strong>Record payment</strong> form (method, reference, paid-on date, note).</>,
            <>Download the PO PDF from the drawer footer or the row PDF icon.</>,
            <>Endpoints: <Path>GET /api/inventory/purchase-orders/invoices/</Path>, <Path>GET .../supplier-dues/</Path>, <Path>POST .../&lt;id&gt;/pay/</Path>, <Path>GET .../&lt;id&gt;/invoice-pdf/</Path>.</>,
          ]}
        />
        <GoTo href="/admin/purchase-orders/invoices">Open invoices</GoTo>
      </SubSection>

      <SubSection title="Overpayment guard">
        <P>
          You can&apos;t pay more than a PO owes. The{" "}
          <Path>record_purchase_payment</Path> service rejects any positive
          payment that would push <Path>amount_paid</Path> past <Path>total</Path>{" "}
          with a friendly &quot;Remaining: ৳ X&quot; message. Negative entries
          (refund corrections) are still allowed.
        </P>
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION — Profit & loss / Financials
// ─────────────────────────────────────────────────────────────────────────────

function SectionFinancials() {
  return (
    <Section
      id="financials"
      eyebrow="08"
      title="Profit & loss"
      intro={
        <P>
          Live revenue, COGS, margin, supplier spend, and returns — all
          netted out — at <Path>/admin/financials</Path>. Refreshes from{" "}
          <Path>/api/inventory/financials/?days=N</Path>; period selector
          covers 7d / 30d / 90d / 1y.
        </P>
      }
    >
      <SubSection title="What's on the page">
        <Bullets
          items={[
            <><strong>KPIs</strong> with vs-prev-period deltas: Revenue, COGS, Gross profit, Margin %, Supplier spend, Net profit, Paid orders, Owed to suppliers.</>,
            <><strong>Returns strip</strong>: Gross revenue, Sales returns, Supplier credits, Return rate.</>,
            <><strong>Daily chart</strong> overlaying revenue / COGS / profit lines with hover tooltips. Negative profit is highlighted.</>,
            <><strong>Top products</strong> tabs: by Revenue / by Profit / by Units. Plus a <strong>Loss makers</strong> tab listing items that sold below cost.</>,
            <><strong>Data-quality banner</strong> when any sold line has no cost on file — fixes always link to the right product.</>,
          ]}
        />
      </SubSection>

      <SubSection title="How profit is computed">
        <P>
          <Path>OrderItem.cost_price_snapshot</Path> is captured at order-create
          time so historical reports stay accurate even when product cost prices
          change later. The query prefers the snapshot, falls back to the live
          <Path>Product.cost_price</Path>, else 0 (and counts as &quot;unknown
          cost&quot; for the data-quality banner).
        </P>
        <Bullets
          items={[
            <><strong>Revenue</strong> = sum of <Path>Order.total</Path> for paid orders in the window <strong>minus</strong> sales-return refund amounts whose <Path>refunded_at</Path> falls in the window.</>,
            <><strong>COGS</strong> = sum of <Path>cost_price_snapshot × quantity</Path> for those orders <strong>minus</strong> the cost of resalable returned lines (damaged/opened items stay sunk).</>,
            <><strong>Supplier spend</strong> = positive PurchasePayments in the window <strong>minus</strong> refunds received from purchase returns refunded in the window.</>,
            <><strong>Net profit</strong> = gross profit (revenue − COGS − shipping − tax) − supplier spend.</>,
          ]}
        />
        <Note>
          The revenue filter uses <Path>paid_at IS NOT NULL</Path> (not{" "}
          <Path>payment_status = PAID</Path>) so an order that was paid and
          then partially / fully refunded still contributes its original
          revenue — refunds are tracked separately in the returns ledger.
        </Note>
      </SubSection>

      <SubSection title="Export">
        <P>
          The dashboard&apos;s <strong>Export report</strong> button assembles
          a multi-section CSV in-browser from the loaded stats: KPI summary,
          sales-by-day, recent orders, top products, low-stock products. No
          extra server round-trip.
        </P>
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION — Notifications
// ─────────────────────────────────────────────────────────────────────────────

function SectionNotifications() {
  return (
    <Section
      id="notifications"
      eyebrow="11"
      title="Notifications"
      intro={
        <P>
          Three surfaces: the <strong>bell</strong> in the topbar (badge +
          dropdown), the full <strong>inbox</strong> at{" "}
          <Path>/admin/notifications</Path>, and the underlying delivery
          ledger. Backed by the <code>notification</code> Django app.
        </P>
      }
    >
      <SubSection title="Header bell">
        <Bullets
          items={[
            <><strong>Polls</strong> <Path>/api/notifications/inbox/unread_count/</Path> every 30 seconds → updates the rose badge.</>,
            <>Click opens a 380px dropdown of the 10 most recent rows. Each has an event-coloured icon (order=navy, paid=emerald, low-stock=amber, …).</>,
            <>Clicking a notification marks it read and, if its <Path>payload.reference_url</Path> is set, navigates there (e.g. straight to the order detail).</>,
            <><strong>Mark all read</strong> from the dropdown header. <strong>See all →</strong> jumps to the full inbox.</>,
          ]}
        />
      </SubSection>

      <SubSection title="Inbox at /admin/notifications">
        <Bullets
          items={[
            <>Tabs: <em>All / Unread / Read</em> (unread tab shows the count).</>,
            <>Client-side search across subject + body, event-type dropdown for filtering.</>,
            <>Per-row actions: Mark read, Delete. Bulk <strong>Mark all read</strong> button.</>,
            <><strong>Load more</strong> paginated at 25 rows per page.</>,
          ]}
        />
      </SubSection>

      <SubSection title="Per-user read state for broadcasts">
        <P>
          Admin notifications (low-stock, new orders, returns) are{" "}
          <strong>broadcast</strong>: one <Path>Notification</Path> row with{" "}
          <Path>for_admins=True</Path> and <Path>user=null</Path>, visible to
          every staff inbox. Per-user read state lives in a separate{" "}
          <Path>NotificationRead</Path> join — one admin reading doesn&apos;t
          dismiss the badge for everyone else.
        </P>
      </SubSection>

      <SubSection title="What triggers admin notifications">
        <Table
          head={["Event", "Fires when"]}
          rows={[
            ["order.placed", "Any new order is created. Customer also receives an email."],
            ["order.paid", "payment_status flips to paid. Customer also receives an email."],
            ["order.shipped / delivered / cancelled", "Status changes to those values."],
            ["stock.low", "available stock crosses below low_stock_threshold (transition edge, not every save)."],
            ["stock.out", "available stock crosses to zero."],
            ["order.refunded", "Sales return is refunded — broadcasts with amount + reference URL."],
            ["order.refunded (supplier)", "Purchase return is refunded — supplier credit received."],
          ]}
        />
      </SubSection>

      <SubSection title="Sending channels">
        <Bullets
          items={[
            <><strong>Email</strong> — wired via Django <code>send_mail</code>. Toggled per event in <Path>/admin/settings</Path> → Notifications.</>,
            <><strong>In-app</strong> — fully working, drives the bell + inbox.</>,
            <><strong>SMS / Web push</strong> — provider stubs in <code>notification/services.py</code>; rows are still recorded so the audit trail is consistent.</>,
          ]}
        />
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION — SEO & redirects
// ─────────────────────────────────────────────────────────────────────────────

function SectionSeo() {
  return (
    <Section
      id="seo"
      eyebrow="12"
      title="SEO & redirects"
      intro={
        <P>
          Enterprise-level SEO surface: configurable defaults, verification
          tags, analytics IDs, structured data, auto-generated sitemap +
          robots.txt, URL redirect manager, and a catalog-wide health
          audit. All powered off <Path>SiteSettings</Path> (singleton) +{" "}
          <Path>Redirect</Path>.
        </P>
      }
    >
      <SubSection title="SEO settings tab">
        <P>
          Open <Path>/admin/settings</Path> → SEO. Eight grouped sub-sections:
        </P>
        <Bullets
          items={[
            <><strong>Search engines</strong> — default title + template (<code>%s | Rakib Enterprise</code>), description, keywords, robots directive, canonical base URL.</>,
            <><strong>OG & Twitter</strong> — handle, card type, default OG image (lives under Branding).</>,
            <><strong>Search Console verification</strong> — Google, Bing, Pinterest, Facebook domain verification tokens (just the content value, not the full meta tag).</>,
            <><strong>Analytics & pixels</strong> — GA4, GTM, Meta Pixel, TikTok Pixel, Hotjar, Microsoft Clarity.</>,
            <><strong>Organization JSON-LD</strong> — raw schema.org markup. Validated on save (must parse as JSON). Empty = auto-generated from contact info.</>,
            <><strong>Sitemap</strong> — enable toggle, default changefreq, per-content-type priority.</>,
            <><strong>robots.txt override</strong> — empty = safe default (allow everything except /admin /api /account /cart /checkout, plus Sitemap line).</>,
            <><strong>Social profiles</strong> — Facebook, Instagram, YouTube URLs + WhatsApp number for the floating chat link.</>,
          ]}
        />
      </SubSection>

      <SubSection title="Per-page SEO overrides">
        <P>
          <Path>Product</Path>, <Path>Category</Path>, <Path>Brand</Path>, and{" "}
          <Path>Collection</Path> each have <Path>seo_title</Path>,{" "}
          <Path>seo_description</Path>, and <Path>og_image</Path> fields. Leave
          blank to fall back to the SiteSettings default.
        </P>
      </SubSection>

      <SubSection title="Sitemap & robots — auto-generated">
        <Bullets
          items={[
            <><Path>GET /sitemap.xml</Path> — fully public, no auth. Pulls every active product, category, brand, collection, and published lookbook. Respects the SiteSettings priorities + changefreq.</>,
            <><Path>GET /robots.txt</Path> — fully public. Uses the override verbatim if set, otherwise the safe default.</>,
            <>Both URLs are mounted at the site root, not under <code>/api/</code>, so crawlers find them where they expect.</>,
          ]}
        />
      </SubSection>

      <SubSection title="SEO audit dashboard">
        <P>
          <Path>/admin/seo</Path> renders a one-shot health check:
        </P>
        <Bullets
          items={[
            <><strong>Traffic-light score</strong> 0-100 (heuristic) — emerald above 85, amber 60-85, rose below 60.</>,
            <>Stat cards: total products, missing titles, missing descriptions, no-image products.</>,
            <>Severity-tagged issue list (no GSC verification, no analytics, missing OG image, redirect loops detected, …).</>,
            <>Tabbed product issue tables: Missing title / Missing description / Title too long (&gt; 70) / Description too long (&gt; 160) / No images.</>,
            <>Per-taxonomy missing-SEO cards for categories, brands, collections.</>,
            <>Quick links: open the generated <Path>/sitemap.xml</Path>, <Path>/robots.txt</Path>, jump to <Path>/admin/seo/redirects</Path>.</>,
          ]}
        />
        <GoTo href="/admin/seo">Open SEO audit</GoTo>
      </SubSection>

      <SubSection title="URL redirects (301 / 302)">
        <P>
          Manage at <Path>/admin/seo/redirects</Path>. Path normalisation is
          done server-side — <code>/Mens-Shirts/</code> stores as{" "}
          <code>/mens-shirts</code> and matches any case / trailing-slash
          variant.
        </P>
        <Bullets
          items={[
            <>Inline-create row at the top of the page. From-path + To-path + 301/302 + Add.</>,
            <>Each row shows hit count and last-hit timestamp so you can prune old rules crawlers stopped requesting.</>,
            <>Per-row <strong>ON/OFF</strong> toggle disables without deleting.</>,
            <>Self-loops (<code>from === to</code>) rejected with a clear error.</>,
            <>Edit drawer for the full set of fields including notes (admin-only).</>,
            <><strong>RedirectMiddleware</strong> sits between <code>CommonMiddleware</code> and the view dispatch. Bypasses <code>/api/</code>, <code>/admin/</code>, <code>/static/</code>, <code>/media/</code>, etc. so static asset requests don&apos;t hit the DB.</>,
          ]}
        />
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION — Settings
// ─────────────────────────────────────────────────────────────────────────────

function SectionSettings() {
  return (
    <Section
      id="settings"
      eyebrow="15"
      title="Settings"
      intro={
        <P>
          <Path>/admin/settings</Path> exposes every admin-tunable global value
          backed by the <Path>SiteSettings</Path> singleton. Seven tabs, each
          patches its own subset so a half-finished change on another tab can&apos;t
          clobber live data.
        </P>
      }
    >
      <SubSection title="Tabs">
        <Table
          head={["Tab", "Controls"]}
          rows={[
            ["General", "Store name + tagline, contact email / phone / address, default currency / locale / timezone."],
            ["Branding", "Logo + dark logo + favicon + OG image URLs, primary + accent hex colors, footer text."],
            ["Shipping & Tax", "Free-shipping threshold, flat shipping fee, tax rate (0–1 fraction), COD on/off, COD surcharge."],
            ["Inventory & Purchasing", "Default low-stock threshold, default Net X payment terms, allow-over-receipt default, auto-cancel unpaid orders after N hours."],
            ["SEO & Social", "(see the SEO section above) — title template, defaults, verification, analytics, sitemap, robots, social profiles."],
            ["Notifications", "Per-event toggles for order placed / paid / shipped / delivered / low stock; from-name + reply-to email."],
            ["Maintenance", "Maintenance-mode flag + customer-facing message. Banner appears at the top of every admin page when on."],
          ]}
        />
      </SubSection>

      <SubSection title="Live wiring">
        <P>
          The checkout services (<Path>place_order</Path>,{" "}
          <Path>create_admin_order</Path>, <Path>place_direct_order</Path>) read
          <Path> free_shipping_threshold</Path>, <Path>flat_shipping_fee</Path>,
          and <Path>tax_rate</Path> from the singleton on every order — an
          edit takes effect on the next checkout, no server restart.
        </P>
      </SubSection>

      <SubSection title="Validation">
        <Bullets
          items={[
            <>Tax rate must be 0–1 (0.08 = 8%). Sending 1.5 returns a 400 with a friendly explanation.</>,
            <>Primary / accent colors must be hex (<code>#RGB</code> / <code>#RRGGBB</code> / <code>#RRGGBBAA</code>).</>,
            <>Organization JSON-LD must parse as JSON. Validation error includes the line + column of the issue.</>,
          ]}
        />
      </SubSection>

      <SubSection title="UX touches">
        <Bullets
          items={[
            <>Dirty-state indicator + per-tab <strong>Reset</strong> button — snaps the form back to the last server state without a network call.</>,
            <>Save button is disabled until something changes.</>,
            <>&quot;Last saved …&quot; timestamp in the page header.</>,
            <>Live-percentage hint on the tax-rate field (currently 8.00%).</>,
          ]}
        />
        <GoTo href="/admin/settings">Open settings</GoTo>
      </SubSection>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION — CSV exports
// ─────────────────────────────────────────────────────────────────────────────

function SectionExports() {
  return (
    <Section
      id="exports"
      eyebrow="16"
      title="CSV exports"
      intro={
        <P>
          Every major admin list page has a working <strong>Export CSV</strong>{" "}
          button. Streams the currently filtered queryset row-by-row so a 50k-row
          export doesn&apos;t spike memory. Excel-on-Windows reads the BDT ৳
          glyph correctly (UTF-8 BOM included).
        </P>
      }
    >
      <SubSection title="Where the button lives">
        <Table
          head={["Page", "Endpoint", "Filename"]}
          rows={[
            [<Path>/admin/orders</Path>, <Path>/api/inventory/orders/export.csv/</Path>, "orders.csv"],
            [<Path>/admin/products</Path>, <Path>/api/site/products/export.csv/</Path>, "products.csv"],
            [<Path>/admin/customers</Path>, <Path>/api/auth/users/export.csv/</Path>, "customers.csv"],
            [<Path>/admin/purchase-orders</Path>, <Path>/api/inventory/purchase-orders/export.csv/</Path>, "purchase-orders.csv"],
            [<Path>/admin/stock</Path>, <Path>/api/inventory/stock-levels/export.csv/</Path>, "stock-levels.csv"],
            [<Path>/admin/returns (Sales)</Path>, <Path>/api/inventory/order-returns/export.csv/</Path>, "order-returns.csv"],
            [<Path>/admin/returns (Purchase)</Path>, <Path>/api/inventory/purchase-returns/export.csv/</Path>, "purchase-returns.csv"],
            [<Path>/admin (Dashboard)</Path>, "client-built", "dashboard-YYYY-MM-DD.csv"],
          ]}
        />
      </SubSection>

      <SubSection title="What ends up in the file">
        <Bullets
          items={[
            <><strong>Filters honoured</strong> — the export reuses the JSON list endpoint&apos;s filter / search / ordering backends. What&apos;s on screen is what lands in the file.</>,
            <><strong>RFC-4180 quoted</strong> — commas, quotes, and newlines inside values are properly escaped.</>,
            <><strong>Dates</strong> as <code>YYYY-MM-DD HH:MM:SS</code> in the project timezone. Decimals 2dp. Booleans as <code>true</code>/<code>false</code>.</>,
            <><strong>Computed columns</strong> like &quot;Available&quot; (quantity − reserved), &quot;Balance due&quot; (total − amount_paid), &quot;Items&quot; (line count).</>,
            <><strong>Streaming</strong> — emitted row-by-row via <Path>StreamingHttpResponse</Path>; <code>iterator(chunk_size=500)</code> keeps memory flat.</>,
          ]}
        />
      </SubSection>

      <SubSection title="Adding a new CSV">
        <P>
          The pattern is reusable — drop an <code>@action export_csv</code>{" "}
          on any DRF viewset:
        </P>
        <Code>{`from .csv_export import stream_csv

@action(detail=False, methods=["get"], url_path="export.csv")
def export_csv(self, request):
    qs = self.filter_queryset(self.get_queryset())
    return stream_csv(
        qs,
        columns=[
            ("Order #", "order_number"),
            ("Email", "customer_email"),
            ("Total", lambda o: f"{o.currency} {o.total}"),
            ("Placed", "placed_at"),
        ],
        filename="orders.csv",
    )`}</Code>
        <P>
          Accessors are either dotted strings (<code>&quot;supplier.name&quot;</code>,{" "}
          <code>&quot;customer__email&quot;</code>) or callables for computed values.
        </P>
      </SubSection>

      <SubSection title="Frontend helper">
        <P>
          On the client side, <Path>djangoAdmin.X.exportCsv(query)</Path>{" "}
          handles the auth header, the 401-refresh-retry, and the
          programmatic-download dance. Pass the same filter shape you&apos;d pass
          to <Path>.list()</Path>.
        </P>
      </SubSection>
    </Section>
  );
}
