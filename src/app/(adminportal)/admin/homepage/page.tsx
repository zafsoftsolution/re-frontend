"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { djangoAdmin, type HomeBlockKind } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";
import HomeBlockEditor, {
  type HomeBlockEditorValues,
} from "@/components/admin/HomeBlockEditor";

interface HomeBlockRow extends Record<string, unknown> {
  id: string;
  kind: HomeBlockKind;
  name: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  image: string;
  secondary_image: string;
  cta_label: string;
  cta_href: string;
  text_color: string;
  linked_collection: string | null;
  linked_lookbook: string | null;
  featured_products: string[];
  featured_categories: string[];
  is_active: boolean;
  order: number;
  metadata: Record<string, unknown>;
  updated_at: string;
}

interface Option {
  value: string;
  label: string;
}

const KIND_LABELS: Record<HomeBlockKind, string> = {
  hero: "01 — Hero",
  marquee: "Marquee",
  category_grid: "02 — Categories",
  featured_edit: "03 — Featured edit",
  manifesto: "04 — Manifesto",
  new_arrivals: "05 — New arrivals",
  lookbook_feature: "06 — Lookbook",
  best_sellers: "07 — Best sellers",
  testimonials: "08 — Testimonials",
  newsletter_cta: "10 — Newsletter",
  custom: "Custom",
};

const KIND_ORDER: HomeBlockKind[] = [
  "hero",
  "marquee",
  "category_grid",
  "featured_edit",
  "manifesto",
  "new_arrivals",
  "lookbook_feature",
  "best_sellers",
  "testimonials",
  "newsletter_cta",
  "custom",
];

const columns: Column<HomeBlockRow>[] = [
  {
    key: "block",
    header: "Block",
    sortable: true,
    accessor: (b) => b.name || b.title || b.kind,
    render: (b) => (
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-14 shrink-0 rounded bg-bone overflow-hidden border border-[var(--jmn-line)]">
          {b.image ? (
            <Image
              src={b.image}
              alt=""
              width={56}
              height={40}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-bone to-cream/40" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-navy truncate">
            {b.name || b.title || `Untitled ${KIND_LABELS[b.kind] ?? b.kind}`}
          </p>
          <p className="text-[11px] text-ink/45 truncate">
            {b.eyebrow ? `${b.eyebrow} · ` : ""}{b.subtitle || b.cta_label || "—"}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "kind",
    header: "Section",
    sortable: true,
    accessor: (b) => b.kind,
    render: (b) => (
      <span className="text-[11px] tracking-[0.2em] uppercase text-gold">
        {KIND_LABELS[b.kind] ?? b.kind}
      </span>
    ),
  },
  {
    key: "order",
    header: "Order",
    sortable: true,
    accessor: (b) => b.order,
    render: (b) => <span className="tabular text-sm text-ink/65">{b.order}</span>,
  },
  {
    key: "active",
    header: "Status",
    accessor: (b) => (b.is_active ? "yes" : "no"),
    render: (b) => (
      <span
        className={`text-[11px] tracking-[0.18em] uppercase ${
          b.is_active ? "text-emerald-700" : "text-ink/45"
        }`}
      >
        {b.is_active ? "Live" : "Hidden"}
      </span>
    ),
  },
];

export default function AdminHomepage() {
  const [collections, setCollections] = useState<Option[] | null>(null);
  const [lookbooks, setLookbooks] = useState<Option[] | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cols, looks] = await Promise.all([
          djangoAdmin.collections.list() as Promise<unknown>,
          djangoAdmin.lookbooks.list() as Promise<unknown>,
        ]);
        if (cancelled) return;
        setCollections(toOptions(cols, "name"));
        setLookbooks(toOptions(looks, "title"));
      } catch (e) {
        if (!cancelled) setOptionsError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs = useMemo(
    () => [
      { key: "all", label: "All", predicate: () => true },
      ...KIND_ORDER.map((k) => ({
        key: k,
        label: KIND_LABELS[k],
        predicate: (b: HomeBlockRow) => b.kind === k,
      })),
    ],
    [],
  );

  if (optionsError) {
    return (
      <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
        Couldn&rsquo;t load homepage options: {optionsError}
      </div>
    );
  }

  if (!collections || !lookbooks) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 size={22} className="text-navy/60 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HomepageMap />
      <ResourceManager<HomeBlockRow>
        eyebrow="Storefront"
        title="Homepage"
        singular="block"
        description="Every section of the public homepage. Click a row to edit with a live preview, or add a new block from any section."
        client={djangoAdmin.homeBlocks as CrudClient<HomeBlockRow>}
        rowKey={(b) => b.id}
        rowLabel={(b) => b.name || b.title || `${KIND_LABELS[b.kind] ?? b.kind} block`}
        columns={columns}
        searchPlaceholder="Search by name, headline, eyebrow…"
        searchAccessor={(b) => `${b.name} ${b.title} ${b.subtitle} ${b.eyebrow} ${b.body}`}
        pageSize={20}
        tabs={tabs}
        renderForm={({ mode, initial, onClose, onSubmit }) => (
          <HomeBlockEditor
            mode={mode}
            initial={initial as Partial<HomeBlockEditorValues> | undefined}
            collections={collections}
            lookbooks={lookbooks}
            onClose={onClose}
            onSubmit={(data) => onSubmit(data as Partial<HomeBlockRow>)}
          />
        )}
      />
    </div>
  );
}

// ─── Top-of-page diagram ────────────────────────────────────────────────────

function HomepageMap() {
  const slots: Array<{ kind: HomeBlockKind; label: string; num: string }> = [
    { kind: "hero", label: "Hero", num: "01" },
    { kind: "marquee", label: "Marquee", num: "—" },
    { kind: "category_grid", label: "Categories", num: "02" },
    { kind: "featured_edit", label: "Edit", num: "03" },
    { kind: "manifesto", label: "Manifesto", num: "04" },
    { kind: "new_arrivals", label: "New In", num: "05" },
    { kind: "lookbook_feature", label: "Lookbook", num: "06" },
    { kind: "best_sellers", label: "Best Sellers", num: "07" },
    { kind: "testimonials", label: "Testimonials", num: "08" },
    { kind: "newsletter_cta", label: "Newsletter", num: "10" },
  ];
  return (
    <div className="rounded-md border border-[var(--jmn-line)] bg-[#FAFAF9] p-5">
      <p className="text-[10px] tracking-[0.3em] uppercase text-ink/45 mb-3">
        Where these sections show on your storefront
      </p>
      <div className="flex flex-wrap gap-2">
        {slots.map((s) => (
          <div
            key={s.kind}
            className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-navy bg-white border border-[var(--jmn-line)] rounded-full px-3 py-1.5"
          >
            <span className="tabular text-ink/40">{s.num}</span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-ink/55 leading-relaxed">
        Each block kind drives a specific part of the page. Add or edit any
        row below — you&rsquo;ll get a live side-by-side preview while you type.
      </p>
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

function toOptions(payload: unknown, labelKey: string): Option[] {
  const list = Array.isArray(payload)
    ? payload
    : ((payload as { results?: unknown[] })?.results ?? []);
  return list
    .map((item) => {
      const r = item as Record<string, unknown>;
      const id = String(r.id ?? "");
      const label = String(r[labelKey] ?? r.slug ?? id);
      return { value: id, label };
    })
    .filter((o) => o.value);
}
