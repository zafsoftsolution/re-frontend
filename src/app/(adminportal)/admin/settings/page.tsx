"use client";

/**
 * Admin → Settings.
 *
 * One page, multiple tabs, all backed by the SiteSettings singleton on the
 * server (one row, id=1). Each tab is a focused form on a subset of fields;
 * Save patches just the dirty fields and refreshes the document. Reset
 * snaps back to the last server state without a network round trip.
 *
 * Backend: GET / PATCH  /api/inventory/site-settings/
 */

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Bell,
  Building2,
  CheckCircle2,
  Globe,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  Package,
  RotateCcw,
  Save,
  ShieldAlert,
  Truck,
} from "lucide-react";
import {
  djangoAdmin,
  type SiteSettingsShape,
  type SiteSettingsUpdateInput,
} from "@/lib/django-admin";
import { useToast } from "@/context/FeedbackContext";
import PageHeader from "@/components/admin/PageHeader";
import { cn, formatDate } from "@/lib/utils";

type TabKey =
  | "general"
  | "branding"
  | "shipping"
  | "inventory"
  | "seo"
  | "notifications"
  | "maintenance";

const TABS: Array<{
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}> = [
  {
    key: "general",
    label: "General",
    icon: Building2,
    description: "Store name, contact info, and locale.",
  },
  {
    key: "branding",
    label: "Branding",
    icon: ImageIcon,
    description: "Logo, colors, and footer text.",
  },
  {
    key: "shipping",
    label: "Shipping & Tax",
    icon: Truck,
    description: "Free-shipping threshold, fees, tax, and cash-on-delivery.",
  },
  {
    key: "inventory",
    label: "Inventory & Purchasing",
    icon: Package,
    description: "Low-stock alerts and purchase-order defaults.",
  },
  {
    key: "seo",
    label: "SEO & Social",
    icon: Globe,
    description: "Search-engine metadata and social profile links.",
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Which lifecycle events trigger automated emails.",
  },
  {
    key: "maintenance",
    label: "Maintenance",
    icon: ShieldAlert,
    description: "Take the storefront offline temporarily.",
  },
];

// Fields each tab is allowed to dirty. Used to scope the PATCH payload so a
// half-finished change on another tab doesn't get silently overwritten.
const TAB_FIELDS: Record<TabKey, Array<keyof SiteSettingsShape>> = {
  general: [
    "site_name", "site_tagline",
    "contact_email", "contact_phone", "business_address",
    "default_currency", "default_locale", "timezone",
  ],
  branding: [
    "logo_url", "logo_dark_url", "favicon_url", "og_image_url",
    "primary_color", "accent_color", "footer_text",
  ],
  shipping: [
    "free_shipping_threshold", "flat_shipping_fee", "tax_rate",
    "cod_enabled", "cod_extra_fee",
  ],
  inventory: [
    "low_stock_threshold_default",
    "default_payment_terms_days", "over_receipt_allowed_default",
    "auto_cancel_unpaid_after_hours",
  ],
  seo: [
    // Defaults
    "seo_title", "seo_description", "seo_title_template", "seo_keywords",
    "default_robots", "canonical_base_url",
    "twitter_handle", "twitter_card_type",
    // Verification
    "google_site_verification", "bing_site_verification",
    "pinterest_site_verification", "facebook_domain_verification",
    // Analytics
    "ga4_measurement_id", "gtm_container_id", "meta_pixel_id",
    "hotjar_id", "microsoft_clarity_id", "tiktok_pixel_id",
    // Structured data + sitemap + robots
    "organization_schema_json",
    "sitemap_enabled", "sitemap_changefreq",
    "sitemap_priority_product", "sitemap_priority_category",
    "robots_txt_override",
    // Social
    "facebook_url", "instagram_url", "youtube_url", "whatsapp_number",
  ],
  notifications: [
    "notify_order_placed", "notify_order_paid",
    "notify_order_shipped", "notify_order_delivered",
    "notify_low_stock",
    "notification_from_name", "notification_reply_to",
  ],
  maintenance: ["maintenance_mode", "maintenance_message"],
};

export default function AdminSettings() {
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>("general");
  const [server, setServer] = useState<SiteSettingsShape | null>(null);
  const [draft, setDraft] = useState<SiteSettingsShape | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Initial load + reload-after-save helper.
  async function load() {
    setLoadError(null);
    try {
      const data = await djangoAdmin.siteSettings.get();
      setServer(data);
      setDraft(data);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  // Has the user changed anything in the current tab?
  const tabDirty = useMemo(() => {
    if (!server || !draft) return false;
    return TAB_FIELDS[tab].some(
      (k) => String(server[k] ?? "") !== String(draft[k] ?? ""),
    );
  }, [server, draft, tab]);

  function set<K extends keyof SiteSettingsShape>(
    name: K,
    value: SiteSettingsShape[K],
  ) {
    setDraft((d) => (d ? { ...d, [name]: value } : d));
  }

  function resetTab() {
    if (!server) return;
    setDraft((d) => {
      if (!d) return d;
      const reset = { ...d };
      for (const k of TAB_FIELDS[tab]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (reset as any)[k] = server[k];
      }
      return reset;
    });
  }

  async function saveTab() {
    if (!draft || !server) return;
    // Patch only the fields scoped to the active tab — server merges them
    // into the singleton row. This prevents a stale draft on another tab
    // from clobbering live data.
    const payload: SiteSettingsUpdateInput = {};
    for (const k of TAB_FIELDS[tab]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload as any)[k] = (draft as any)[k];
    }
    setSaving(true);
    try {
      const updated = await djangoAdmin.siteSettings.update(payload);
      setServer(updated);
      setDraft(updated);
      toast.success("Settings saved", TABS.find((t) => t.key === tab)?.label);
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string[]> };
      const msg =
        err.fields && Object.keys(err.fields).length
          ? `${Object.keys(err.fields)[0]}: ${Object.values(err.fields)[0]?.[0] ?? ""}`
          : err.message;
      toast.error("Couldn't save", msg);
    } finally {
      setSaving(false);
    }
  }

  if (loadError && !draft) {
    return (
      <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
        {loadError}
      </div>
    );
  }
  if (!draft) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 size={22} className="text-navy/60 animate-spin" />
      </div>
    );
  }

  const activeTab = TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Tune the storefront, checkout math, branding, and notifications. Changes take effect on the next request — no restart needed."
        actions={
          server?.updated_at ? (
            <p className="text-[11px] text-ink/45 tabular">
              Last saved {formatDate(server.updated_at)}
            </p>
          ) : null
        }
      />

      {draft.maintenance_mode && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">Maintenance mode is ON.</p>
            <p className="text-[12px] opacity-80 mt-0.5">
              The storefront shows the maintenance message instead of the
              normal pages. Turn it off in the{" "}
              <button
                type="button"
                onClick={() => setTab("maintenance")}
                className="underline hover:text-navy"
              >
                Maintenance
              </button>{" "}
              tab when you&rsquo;re ready to go live.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[240px_1fr] gap-6">
        {/* Tab nav */}
        <nav className="bg-white border border-[var(--jmn-line)] rounded-lg p-2 h-fit lg:sticky lg:top-4">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left",
                  active
                    ? "bg-navy/5 text-navy"
                    : "text-ink/65 hover:text-navy hover:bg-[#FAFAFA]",
                )}
              >
                <Icon
                  size={15}
                  className={cn("mt-0.5 shrink-0", active ? "text-navy" : "text-ink/55")}
                />
                <span className="min-w-0 flex-1">
                  <span className="block leading-tight">{t.label}</span>
                  <span className="block text-[10px] tracking-[0.14em] uppercase text-ink/40 mt-0.5">
                    {t.description.split(" ").slice(0, 3).join(" ")}…
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Panel */}
        <section className="bg-white border border-[var(--jmn-line)] rounded-lg overflow-hidden flex flex-col">
          <header className="px-6 pt-6 pb-4 border-b border-[var(--jmn-line)]">
            <h2 className="font-display text-2xl text-navy">{activeTab.label}</h2>
            <p className="mt-1 text-sm text-ink/55">{activeTab.description}</p>
          </header>

          <div className="px-6 py-5 flex-1 overflow-y-auto space-y-5">
            {tab === "general" && (
              <GeneralTab value={draft} onChange={set} />
            )}
            {tab === "branding" && (
              <BrandingTab value={draft} onChange={set} />
            )}
            {tab === "shipping" && (
              <ShippingTab value={draft} onChange={set} />
            )}
            {tab === "inventory" && (
              <InventoryTab value={draft} onChange={set} />
            )}
            {tab === "seo" && <SeoTab value={draft} onChange={set} />}
            {tab === "notifications" && (
              <NotificationsTab value={draft} onChange={set} />
            )}
            {tab === "maintenance" && (
              <MaintenanceTab value={draft} onChange={set} />
            )}
          </div>

          <footer className="px-6 py-4 bg-[#FAFAFA] border-t border-[var(--jmn-line)] flex items-center justify-between gap-3">
            <span className="text-[11px] tracking-[0.18em] uppercase text-ink/55">
              {tabDirty ? (
                <span className="text-amber-700">Unsaved changes</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 size={11} /> All saved
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetTab}
                disabled={!tabDirty || saving}
                className="h-9 px-3 rounded-md text-[11px] tracking-[0.18em] uppercase text-ink/55 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-40 transition-colors inline-flex items-center gap-1.5"
              >
                <RotateCcw size={12} />
                Reset
              </button>
              <button
                type="button"
                onClick={saveTab}
                disabled={!tabDirty || saving}
                className="h-9 px-4 rounded-md bg-navy text-cream text-[11px] tracking-[0.18em] uppercase hover:opacity-90 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Save size={13} />
                )}
                Save changes
              </button>
            </div>
          </footer>
        </section>
      </div>

      <style jsx global>{`
        .stg-input {
          width: 100%;
          min-height: 38px;
          padding: 8px 12px;
          border: 1px solid var(--jmn-line);
          border-radius: 6px;
          background: white;
          font-size: 14px;
          color: var(--jmn-ink, #0a0a0a);
          transition: border-color 120ms, box-shadow 120ms;
        }
        .stg-input:focus {
          outline: none;
          border-color: var(--jmn-navy, #0e1a3a);
          box-shadow: 0 0 0 3px rgba(14, 26, 58, 0.08);
        }
        .stg-input::placeholder {
          color: rgba(10, 10, 10, 0.35);
        }
        textarea.stg-input {
          min-height: 80px;
          font-family: inherit;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

// ─── Tab forms ──────────────────────────────────────────────────────────────

type Setter = <K extends keyof SiteSettingsShape>(
  name: K,
  value: SiteSettingsShape[K],
) => void;

function GeneralTab({
  value,
  onChange,
}: {
  value: SiteSettingsShape;
  onChange: Setter;
}) {
  return (
    <>
      <Field label="Store name" required>
        <input
          value={value.site_name}
          onChange={(e) => onChange("site_name", e.target.value)}
          placeholder="Rakib Enterprise"
          className="stg-input"
        />
      </Field>
      <Field
        label="Tagline"
        hint="A short line shown under the store name on emails and the storefront."
      >
        <input
          value={value.site_tagline}
          onChange={(e) => onChange("site_tagline", e.target.value)}
          placeholder="Modern Bangladeshi tailoring"
          className="stg-input"
        />
      </Field>

      <Row>
        <Field label="Contact email">
          <input
            type="email"
            value={value.contact_email}
            onChange={(e) => onChange("contact_email", e.target.value)}
            placeholder="hello@rakibenterprise-bd.com"
            className="stg-input"
          />
        </Field>
        <Field label="Contact phone">
          <input
            value={value.contact_phone}
            onChange={(e) => onChange("contact_phone", e.target.value)}
            placeholder="+880 1700 000 000"
            className="stg-input"
          />
        </Field>
      </Row>

      <Field label="Business address">
        <textarea
          value={value.business_address}
          onChange={(e) => onChange("business_address", e.target.value)}
          rows={3}
          placeholder="Shop name, street, area, city"
          className="stg-input"
        />
      </Field>

      <Section title="Localization">
        <Row cols={3}>
          <Field label="Currency" hint="3-letter ISO code (BDT, USD, …)">
            <input
              value={value.default_currency}
              onChange={(e) =>
                onChange("default_currency", e.target.value.toUpperCase())
              }
              maxLength={3}
              className="stg-input tabular uppercase"
            />
          </Field>
          <Field label="Default locale">
            <select
              value={value.default_locale}
              onChange={(e) => onChange("default_locale", e.target.value)}
              className="stg-input"
            >
              <option value="en">English (en)</option>
              <option value="bn">Bangla (bn)</option>
            </select>
          </Field>
          <Field label="Timezone">
            <input
              value={value.timezone}
              onChange={(e) => onChange("timezone", e.target.value)}
              placeholder="Asia/Dhaka"
              className="stg-input"
            />
          </Field>
        </Row>
      </Section>
    </>
  );
}

function BrandingTab({
  value,
  onChange,
}: {
  value: SiteSettingsShape;
  onChange: Setter;
}) {
  return (
    <>
      <Section title="Logo & marks">
        <Row>
          <Field label="Logo URL (light backgrounds)">
            <ImageInput
              value={value.logo_url}
              onChange={(v) => onChange("logo_url", v)}
            />
          </Field>
          <Field label="Logo URL (dark backgrounds)" hint="Optional inverse mark">
            <ImageInput
              value={value.logo_dark_url}
              onChange={(v) => onChange("logo_dark_url", v)}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Favicon URL">
            <ImageInput
              value={value.favicon_url}
              onChange={(v) => onChange("favicon_url", v)}
              square
            />
          </Field>
          <Field
            label="OG / social card URL"
            hint="1200×630 image used when the site is shared"
          >
            <ImageInput
              value={value.og_image_url}
              onChange={(v) => onChange("og_image_url", v)}
            />
          </Field>
        </Row>
      </Section>

      <Section title="Theme colors">
        <Row>
          <Field label="Primary" hint="Brand navy — buttons, headlines">
            <ColorInput
              value={value.primary_color}
              onChange={(v) => onChange("primary_color", v)}
            />
          </Field>
          <Field label="Accent" hint="Gold — eyebrows, highlights">
            <ColorInput
              value={value.accent_color}
              onChange={(v) => onChange("accent_color", v)}
            />
          </Field>
        </Row>
      </Section>

      <Field label="Footer text" hint="Shown at the bottom of every storefront page.">
        <textarea
          value={value.footer_text}
          onChange={(e) => onChange("footer_text", e.target.value)}
          rows={3}
          placeholder="© Rakib Enterprise — Made in Bangladesh."
          className="stg-input"
        />
      </Field>
    </>
  );
}

function ShippingTab({
  value,
  onChange,
}: {
  value: SiteSettingsShape;
  onChange: Setter;
}) {
  const taxPct = (Number(value.tax_rate || 0) * 100).toFixed(2);
  return (
    <>
      <Section title="Shipping fees">
        <Row>
          <Field
            label={`Free-shipping threshold (${value.default_currency})`}
            hint="Orders above this subtotal ship for free."
          >
            <input
              type="number"
              min={0}
              step="0.01"
              value={value.free_shipping_threshold}
              onChange={(e) =>
                onChange("free_shipping_threshold", e.target.value)
              }
              className="stg-input tabular"
            />
          </Field>
          <Field
            label={`Flat shipping fee (${value.default_currency})`}
            hint="Charged when below the threshold."
          >
            <input
              type="number"
              min={0}
              step="0.01"
              value={value.flat_shipping_fee}
              onChange={(e) => onChange("flat_shipping_fee", e.target.value)}
              className="stg-input tabular"
            />
          </Field>
        </Row>
      </Section>

      <Section title="Tax">
        <Field
          label={`Tax rate (currently ${taxPct}%)`}
          hint="Fraction between 0 and 1. Example: 0.08 = 8% VAT."
        >
          <input
            type="number"
            min={0}
            max={1}
            step="0.0001"
            value={value.tax_rate}
            onChange={(e) => onChange("tax_rate", e.target.value)}
            className="stg-input tabular"
          />
        </Field>
      </Section>

      <Section title="Cash on delivery">
        <Toggle
          label="Enable COD"
          hint="Lets customers choose cash on delivery at checkout."
          checked={value.cod_enabled}
          onChange={(v) => onChange("cod_enabled", v)}
        />
        {value.cod_enabled && (
          <Field
            label={`COD surcharge (${value.default_currency})`}
            hint="Added to the total when the customer picks COD."
          >
            <input
              type="number"
              min={0}
              step="0.01"
              value={value.cod_extra_fee}
              onChange={(e) => onChange("cod_extra_fee", e.target.value)}
              className="stg-input tabular"
            />
          </Field>
        )}
      </Section>
    </>
  );
}

function InventoryTab({
  value,
  onChange,
}: {
  value: SiteSettingsShape;
  onChange: Setter;
}) {
  return (
    <>
      <Section title="Stock alerts">
        <Field
          label="Default low-stock threshold"
          hint="Used when a new stock row is created. Per-variant overrides on the Stock page take precedence."
        >
          <input
            type="number"
            min={0}
            value={value.low_stock_threshold_default}
            onChange={(e) =>
              onChange(
                "low_stock_threshold_default",
                Number(e.target.value) || 0,
              )
            }
            className="stg-input tabular w-40"
          />
        </Field>
      </Section>

      <Section title="Purchase orders">
        <Row>
          <Field
            label="Default payment terms (days)"
            hint="Net X terms applied to new POs. Per-supplier defaults still take priority."
          >
            <input
              type="number"
              min={0}
              value={value.default_payment_terms_days}
              onChange={(e) =>
                onChange(
                  "default_payment_terms_days",
                  Number(e.target.value) || 0,
                )
              }
              className="stg-input tabular"
            />
          </Field>
          <Field
            label="Auto-cancel unpaid orders (hours)"
            hint="0 disables. Otherwise unpaid orders older than this are cancelled by the system."
          >
            <input
              type="number"
              min={0}
              value={value.auto_cancel_unpaid_after_hours}
              onChange={(e) =>
                onChange(
                  "auto_cancel_unpaid_after_hours",
                  Number(e.target.value) || 0,
                )
              }
              className="stg-input tabular"
            />
          </Field>
        </Row>
        <Toggle
          label="Allow over-receipt by default"
          hint="If on, new POs can receive more units than ordered without warning. Each PO still has its own override."
          checked={value.over_receipt_allowed_default}
          onChange={(v) => onChange("over_receipt_allowed_default", v)}
        />
      </Section>
    </>
  );
}

function SeoTab({
  value,
  onChange,
}: {
  value: SiteSettingsShape;
  onChange: Setter;
}) {
  const titleLen = (value.seo_title || "").length;
  const descLen = (value.seo_description || "").length;
  return (
    <>
      <Section title="Search engines">
        <Field
          label="Default SEO title"
          hint={`Shown in browser tabs and search results. Currently ${titleLen} characters — aim for 50–60.`}
        >
          <input
            value={value.seo_title}
            onChange={(e) => onChange("seo_title", e.target.value)}
            placeholder="Rakib Enterprise — Modern Bangladeshi tailoring"
            className="stg-input"
          />
        </Field>
        <Field
          label="Title template"
          hint="Used on pages that have their own title. %s is replaced by the page name."
        >
          <input
            value={value.seo_title_template}
            onChange={(e) => onChange("seo_title_template", e.target.value)}
            placeholder="%s | Rakib Enterprise"
            className="stg-input tabular"
          />
        </Field>
        <Field
          label="Default SEO description"
          hint={`Aim for 150–160 characters. Currently ${descLen}.`}
        >
          <textarea
            value={value.seo_description}
            onChange={(e) => onChange("seo_description", e.target.value)}
            rows={3}
            placeholder="Hand-cut, hand-stitched clothing for the modern Bangladeshi wardrobe."
            className="stg-input"
          />
        </Field>
        <Field
          label="Default meta keywords"
          hint="Comma-separated. Most engines ignore this now, but some tools still use it."
        >
          <input
            value={value.seo_keywords}
            onChange={(e) => onChange("seo_keywords", e.target.value)}
            placeholder="fashion, tailoring, panjabi, kurta, bangladeshi clothing"
            className="stg-input"
          />
        </Field>
        <Row>
          <Field
            label="Default robots directive"
            hint="Applied when a page has no override."
          >
            <select
              value={value.default_robots}
              onChange={(e) => onChange("default_robots", e.target.value)}
              className="stg-input"
            >
              <option value="index,follow">index, follow</option>
              <option value="index,nofollow">index, nofollow</option>
              <option value="noindex,follow">noindex, follow</option>
              <option value="noindex,nofollow">noindex, nofollow (private)</option>
            </select>
          </Field>
          <Field
            label="Canonical base URL"
            hint="Empty = use the request host. Set to your prod domain to lock canonicals down."
          >
            <input
              value={value.canonical_base_url}
              onChange={(e) => onChange("canonical_base_url", e.target.value)}
              placeholder="https://rakibenterprise-bd.com"
              className="stg-input"
            />
          </Field>
        </Row>
      </Section>

      <Section title="Open Graph & Twitter cards">
        <Row>
          <Field label="Twitter / X handle" hint="With the @ — used as twitter:site.">
            <input
              value={value.twitter_handle}
              onChange={(e) => onChange("twitter_handle", e.target.value)}
              placeholder="@rakibenterprise"
              className="stg-input"
            />
          </Field>
          <Field label="Twitter card type">
            <select
              value={value.twitter_card_type}
              onChange={(e) =>
                onChange(
                  "twitter_card_type",
                  e.target.value as SiteSettingsShape["twitter_card_type"],
                )
              }
              className="stg-input"
            >
              <option value="summary_large_image">Summary with large image</option>
              <option value="summary">Summary</option>
              <option value="app">App</option>
              <option value="player">Player</option>
            </select>
          </Field>
        </Row>
        <p className="text-[12px] text-ink/55">
          The default OG image lives under <strong>Branding</strong> →
          OG / social card. Per-product overrides take priority when set.
        </p>
      </Section>

      <Section title="Search Console verification">
        <p className="text-[12px] text-ink/55 -mt-2">
          Paste just the <strong>content</strong> value of the meta tag — not the full
          &lt;meta&gt; line. Each platform’s setup page tells you which token to grab.
        </p>
        <Row>
          <Field label="Google Search Console">
            <input
              value={value.google_site_verification}
              onChange={(e) =>
                onChange("google_site_verification", e.target.value)
              }
              placeholder="abcdef123456…"
              className="stg-input tabular"
            />
          </Field>
          <Field label="Bing Webmaster">
            <input
              value={value.bing_site_verification}
              onChange={(e) =>
                onChange("bing_site_verification", e.target.value)
              }
              placeholder="ABCDEF1234…"
              className="stg-input tabular"
            />
          </Field>
        </Row>
        <Row>
          <Field label="Pinterest">
            <input
              value={value.pinterest_site_verification}
              onChange={(e) =>
                onChange("pinterest_site_verification", e.target.value)
              }
              className="stg-input tabular"
            />
          </Field>
          <Field label="Facebook domain">
            <input
              value={value.facebook_domain_verification}
              onChange={(e) =>
                onChange("facebook_domain_verification", e.target.value)
              }
              className="stg-input tabular"
            />
          </Field>
        </Row>
      </Section>

      <Section title="Analytics & pixels">
        <Row>
          <Field label="GA4 Measurement ID" hint="Looks like G-XXXXXXX.">
            <input
              value={value.ga4_measurement_id}
              onChange={(e) => onChange("ga4_measurement_id", e.target.value)}
              placeholder="G-XXXXXXXXXX"
              className="stg-input tabular"
            />
          </Field>
          <Field label="GTM container" hint="Looks like GTM-XXXXXX.">
            <input
              value={value.gtm_container_id}
              onChange={(e) => onChange("gtm_container_id", e.target.value)}
              placeholder="GTM-XXXXXXX"
              className="stg-input tabular"
            />
          </Field>
        </Row>
        <Row>
          <Field label="Meta / Facebook Pixel">
            <input
              value={value.meta_pixel_id}
              onChange={(e) => onChange("meta_pixel_id", e.target.value)}
              placeholder="1234567890123456"
              className="stg-input tabular"
            />
          </Field>
          <Field label="TikTok Pixel">
            <input
              value={value.tiktok_pixel_id}
              onChange={(e) => onChange("tiktok_pixel_id", e.target.value)}
              placeholder="CXXXXXXXXXXXXXXXXX"
              className="stg-input tabular"
            />
          </Field>
        </Row>
        <Row>
          <Field label="Hotjar site ID">
            <input
              value={value.hotjar_id}
              onChange={(e) => onChange("hotjar_id", e.target.value)}
              className="stg-input tabular"
            />
          </Field>
          <Field label="Microsoft Clarity ID">
            <input
              value={value.microsoft_clarity_id}
              onChange={(e) =>
                onChange("microsoft_clarity_id", e.target.value)
              }
              className="stg-input tabular"
            />
          </Field>
        </Row>
      </Section>

      <Section title="Organization structured data (JSON-LD)">
        <Field
          label="Custom Organization schema"
          hint="Leave empty to auto-generate from store name, logo, and contact info. JSON only — no surrounding script tag."
        >
          <textarea
            value={value.organization_schema_json}
            onChange={(e) =>
              onChange("organization_schema_json", e.target.value)
            }
            rows={8}
            placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Rakib Enterprise",\n  "url": "https://rakibenterprise-bd.com",\n  "logo": "https://…/logo.png",\n  "sameAs": [\n    "https://facebook.com/rakibenterprise"\n  ]\n}'}
            className="stg-input"
            style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}
          />
        </Field>
      </Section>

      <Section title="Sitemap">
        <Toggle
          label="Sitemap enabled"
          hint="When off, /sitemap.xml returns 404. Crawlers will fall back to discovering URLs from internal links."
          checked={value.sitemap_enabled}
          onChange={(v) => onChange("sitemap_enabled", v)}
        />
        <Row cols={3}>
          <Field label="Default change frequency">
            <select
              value={value.sitemap_changefreq}
              onChange={(e) =>
                onChange(
                  "sitemap_changefreq",
                  e.target.value as SiteSettingsShape["sitemap_changefreq"],
                )
              }
              className="stg-input"
            >
              <option value="always">always</option>
              <option value="hourly">hourly</option>
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
              <option value="yearly">yearly</option>
              <option value="never">never</option>
            </select>
          </Field>
          <Field label="Product priority" hint="0.00 – 1.00">
            <input
              type="number"
              min={0}
              max={1}
              step="0.01"
              value={value.sitemap_priority_product}
              onChange={(e) =>
                onChange("sitemap_priority_product", e.target.value)
              }
              className="stg-input tabular"
            />
          </Field>
          <Field label="Category priority" hint="0.00 – 1.00">
            <input
              type="number"
              min={0}
              max={1}
              step="0.01"
              value={value.sitemap_priority_category}
              onChange={(e) =>
                onChange("sitemap_priority_category", e.target.value)
              }
              className="stg-input tabular"
            />
          </Field>
        </Row>
      </Section>

      <Section title="robots.txt">
        <Field
          label="Override robots.txt"
          hint="Leave empty to use the safe default (allow everything except /admin, /api, /account, /cart, /checkout)."
        >
          <textarea
            value={value.robots_txt_override}
            onChange={(e) => onChange("robots_txt_override", e.target.value)}
            rows={6}
            placeholder={"User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: https://example.com/sitemap.xml"}
            className="stg-input"
            style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}
          />
        </Field>
      </Section>

      <Section title="Social profiles">
        <Row>
          <Field label="Facebook URL">
            <input
              value={value.facebook_url}
              onChange={(e) => onChange("facebook_url", e.target.value)}
              placeholder="https://facebook.com/rakibenterprise"
              className="stg-input"
            />
          </Field>
          <Field label="Instagram URL">
            <input
              value={value.instagram_url}
              onChange={(e) => onChange("instagram_url", e.target.value)}
              placeholder="https://instagram.com/rakibenterprise"
              className="stg-input"
            />
          </Field>
        </Row>
        <Row>
          <Field label="YouTube URL">
            <input
              value={value.youtube_url}
              onChange={(e) => onChange("youtube_url", e.target.value)}
              placeholder="https://youtube.com/@rakibenterprise"
              className="stg-input"
            />
          </Field>
          <Field label="WhatsApp number" hint="Powers the floating chat link.">
            <input
              value={value.whatsapp_number}
              onChange={(e) => onChange("whatsapp_number", e.target.value)}
              placeholder="+880 1700 000 000"
              className="stg-input"
            />
          </Field>
        </Row>
      </Section>
    </>
  );
}

function NotificationsTab({
  value,
  onChange,
}: {
  value: SiteSettingsShape;
  onChange: Setter;
}) {
  return (
    <>
      <Section title="Customer emails">
        <p className="text-[12px] text-ink/55 -mt-2 flex items-start gap-1.5">
          <Megaphone size={13} className="mt-0.5 text-ink/45" />
          When a toggle is off, that event won&rsquo;t trigger an automated
          email. Manual sends from the order page still work.
        </p>
        <Toggle
          label="Order placed"
          checked={value.notify_order_placed}
          onChange={(v) => onChange("notify_order_placed", v)}
        />
        <Toggle
          label="Payment received"
          checked={value.notify_order_paid}
          onChange={(v) => onChange("notify_order_paid", v)}
        />
        <Toggle
          label="Order shipped"
          checked={value.notify_order_shipped}
          onChange={(v) => onChange("notify_order_shipped", v)}
        />
        <Toggle
          label="Order delivered"
          checked={value.notify_order_delivered}
          onChange={(v) => onChange("notify_order_delivered", v)}
        />
      </Section>

      <Section title="Internal alerts">
        <Toggle
          label="Low-stock alerts"
          hint="Email the team when a product variant drops to its threshold."
          checked={value.notify_low_stock}
          onChange={(v) => onChange("notify_low_stock", v)}
        />
      </Section>

      <Section title="Sender">
        <Row>
          <Field label="From name" hint="Shown as the sender in the inbox.">
            <input
              value={value.notification_from_name}
              onChange={(e) =>
                onChange("notification_from_name", e.target.value)
              }
              placeholder="Rakib Enterprise"
              className="stg-input"
            />
          </Field>
          <Field label="Reply-to email">
            <input
              type="email"
              value={value.notification_reply_to}
              onChange={(e) =>
                onChange("notification_reply_to", e.target.value)
              }
              placeholder="hello@rakibenterprise-bd.com"
              className="stg-input"
            />
          </Field>
        </Row>
      </Section>
    </>
  );
}

function MaintenanceTab({
  value,
  onChange,
}: {
  value: SiteSettingsShape;
  onChange: Setter;
}) {
  return (
    <>
      <Toggle
        label="Maintenance mode"
        hint="When on, the storefront serves the maintenance message instead of the catalog. The admin keeps working."
        checked={value.maintenance_mode}
        onChange={(v) => onChange("maintenance_mode", v)}
      />
      <Field
        label="Maintenance message"
        hint="Plain text — shown to customers while the storefront is offline."
      >
        <textarea
          value={value.maintenance_message}
          onChange={(e) => onChange("maintenance_message", e.target.value)}
          rows={4}
          className="stg-input"
        />
      </Field>
    </>
  );
}

// ─── Reusable bits ─────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] tracking-[0.2em] uppercase text-ink/55 mb-1.5">
        {label}
        {required && <span className="text-rose-700"> *</span>}
      </span>
      {children}
      {hint && <p className="mt-1 text-[11px] text-ink/45">{hint}</p>}
    </label>
  );
}

function Row({
  cols = 2,
  children,
}: {
  cols?: 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-4", cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      {children}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-1">
      <h3 className="text-[10px] tracking-[0.3em] uppercase text-gold mb-3">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <span className="relative inline-block w-10 h-6 mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="block w-10 h-6 rounded-full bg-ink/20 peer-checked:bg-navy transition-colors" />
        <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm text-navy">{label}</span>
        {hint && <span className="block text-[11px] text-ink/55 mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-12 rounded-md border border-[var(--jmn-line)] cursor-pointer shrink-0"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#0E1A3A"
        className="stg-input tabular uppercase"
      />
    </div>
  );
}

function ImageInput({
  value,
  onChange,
  square,
}: {
  value: string;
  onChange: (v: string) => void;
  square?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "shrink-0 overflow-hidden rounded bg-[#F4F5F7] border border-[var(--jmn-line)] grid place-items-center",
          square ? "h-12 w-12" : "h-12 w-20",
        )}
      >
        {value ? (
          <Image
            src={value}
            alt=""
            width={square ? 48 : 80}
            height={48}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <ImageIcon size={14} className="text-ink/30" />
        )}
      </div>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://…/image.png"
        className="stg-input"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-[11px] text-ink/55 hover:text-rose-700 shrink-0"
        >
          Clear
        </button>
      )}
    </div>
  );
}
