"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { djangoAdmin } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import { descriptionFields, nameBnField, seoFields } from "@/lib/admin/catalog-fields";
import type { Column } from "@/components/admin/DataTable";
import StandardCatalogLoader from "@/components/admin/StandardCatalogLoader";
import { partsBrandSuggestions, useMachineCatalogSuggestions } from "@/lib/admin/machine-catalog";

interface Brand extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  is_oem: boolean;
  machine_brands?: string[];
  machine_brand_slugs?: string[];
  is_active: boolean;
  created_at: string;
}

const columns: Column<Brand>[] = [
  {
    key: "name",
    header: "Brand",
    sortable: true,
    accessor: (b) => b.name,
    render: (b) => (
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 shrink-0 rounded-md bg-bone overflow-hidden grid place-items-center">
          {b.logo ? (
            <Image src={b.logo} alt="" width={36} height={36} className="h-full w-full object-contain" unoptimized />
          ) : (
            <span className="text-[11px] text-ink/40">{b.name[0]}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-navy truncate">{b.name}</p>
          <p className="text-[11px] text-ink/45">/{b.slug}</p>
        </div>
      </div>
    ),
  },
  {
    key: "kind",
    header: "Type",
    accessor: (b) => (b.is_oem ? "oem" : "aftermarket"),
    render: (b) =>
      b.is_oem ? (
        <span className="text-[10px] tracking-[0.15em] uppercase text-gold border border-gold/40 rounded px-2 py-0.5">
          OEM
        </span>
      ) : (
        <span className="text-[11px] tracking-[0.14em] uppercase text-ink/55">Aftermarket</span>
      ),
  },
  {
    key: "coverage",
    header: "Fits machines",
    accessor: (b) => (b.machine_brand_slugs ?? []).join(" "),
    render: (b) => (
      <span className="text-[11px] tracking-[0.1em] uppercase text-ink/60">
        {(b.machine_brand_slugs ?? []).length
          ? (b.machine_brand_slugs ?? []).slice(0, 4).join(" · ")
          : "all / universal"}
      </span>
    ),
  },
  {
    key: "active",
    header: "Status",
    sortable: true,
    accessor: (b) => (b.is_active ? "active" : "inactive"),
    render: (b) => (
      <span className={`text-[11px] tracking-[0.18em] uppercase ${b.is_active ? "text-emerald-700" : "text-ink/45"}`}>
        {b.is_active ? "Active" : "Inactive"}
      </span>
    ),
  },
];

export default function AdminBrands() {
  const { data: catalog, reload } = useMachineCatalogSuggestions();
  const [machineBrands, setMachineBrands] = useState<Array<{ id: string; name: string }>>([]);
  const loadMachineBrands = useCallback(
    () =>
      djangoAdmin.machineBrands
        .list<{ results?: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }>>({ page_size: 200 })
        .then((d) => setMachineBrands(Array.isArray(d) ? d : d.results ?? []))
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    loadMachineBrands();
  }, [loadMachineBrands]);
  const idsByName = useMemo(
    () => Object.fromEntries(machineBrands.map((b) => [b.name.toLowerCase(), b.id])),
    [machineBrands],
  );
  const afterSeed = async (refresh: () => Promise<void>) => {
    await Promise.all([refresh(), loadMachineBrands(), reload()]);
  };

  return (
    <ResourceManager<Brand>
      eyebrow="Catalog"
      title="Parts Brands"
      singular="parts brand"
      description="Who makes the spare part — genuine OEM labels or aftermarket makers (Organ, Groz-Beckert, Hirose, Strong H). Choose which machine brands each one covers."
      client={djangoAdmin.brands as CrudClient<Brand>}
      rowKey={(b) => b.slug}
      rowLabel={(b) => b.name}
      columns={columns}
      searchPlaceholder="Search parts brands…"
      searchAccessor={(b) => `${b.name} ${b.slug}`}
      emptyTitle="No parts brands yet."
      emptyDescription="Load the standard list — genuine Juki / Brother / Pegasus… labels, needle makers (Organ, Groz-Beckert, Schmetz) and common aftermarket makers — together with the machine brands."
      emptyAction={(refresh) => (
        <StandardCatalogLoader target="machines" label="Load standard brands" onDone={() => afterSeed(refresh)} />
      )}
      onSaved={reload}
      initialValues={{ is_active: true, is_oem: false, machine_brands: [] }}
      fields={[
        {
          name: "name",
          label: "Name",
          type: "combobox",
          required: true,
          placeholder: "Choose from the list or type a new brand",
          hint: "Pick a known parts brand (fills OEM + machine brands) or type a new one.",
          suggestions: (values, mode) => partsBrandSuggestions(catalog, idsByName, values, mode),
        },
        nameBnField,
        {
          name: "slug",
          label: "Slug",
          type: "slug",
          required: true,
          hint: "URL fragment — auto-generated from the name.",
          autoFrom: "name",
        },
        { name: "is_oem", label: "Genuine / OEM", type: "boolean", placeholder: "Original manufacturer parts" },
        {
          name: "machine_brands",
          label: "Makes parts for",
          type: "multiselect",
          full: true,
          options: machineBrands.map((b) => ({ value: b.id, label: b.name })),
          placeholder: "Add machine brands first (Machine Brands page).",
          hint: "Leave all off if the brand fits every machine (e.g. needles).",
        },
        { name: "logo", label: "Logo", type: "imageUrl", full: true },
        ...descriptionFields(),
        { name: "is_active", label: "Active", type: "boolean", placeholder: "Show on the site" },
        ...seoFields(),
      ]}
    />
  );
}
