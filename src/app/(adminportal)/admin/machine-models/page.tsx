"use client";

import { useCallback, useEffect, useState } from "react";
import { djangoAdmin } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";
import type { FormField } from "@/components/admin/ResourceForm";
import { MACHINE_TYPES, descriptionFields, seoFields } from "@/lib/admin/catalog-fields";
import StandardCatalogLoader from "@/components/admin/StandardCatalogLoader";
import { machineModelSuggestions, useMachineCatalogSuggestions } from "@/lib/admin/machine-catalog";

interface BrandOption {
  id: string;
  name: string;
  slug: string;
}

interface MachineModel extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  machine_brand: string;
  machine_brand_name?: string;
  machine_type: string;
  machine_type_display?: string;
  order: number;
  is_active: boolean;
}

const columns: Column<MachineModel>[] = [
  {
    key: "model",
    header: "Model",
    sortable: true,
    accessor: (m) => m.name,
    render: (m) => (
      <div className="min-w-0">
        <p className="font-medium text-navy truncate">{m.name}</p>
        <p className="text-[11px] text-ink/45">{m.machine_brand_name || "—"}</p>
      </div>
    ),
  },
  {
    key: "type",
    header: "Machine type",
    sortable: true,
    accessor: (m) => m.machine_type,
    render: (m) => (
      <span className="text-[11px] tracking-[0.14em] uppercase text-ink/65">
        {m.machine_type_display || m.machine_type}
      </span>
    ),
  },
  {
    key: "active",
    header: "Status",
    accessor: (m) => (m.is_active ? "active" : "inactive"),
    render: (m) => (
      <span className={`text-[11px] tracking-[0.18em] uppercase ${m.is_active ? "text-emerald-700" : "text-ink/45"}`}>
        {m.is_active ? "Active" : "Inactive"}
      </span>
    ),
  },
];

export default function AdminMachineModels() {
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const { data: catalog, reload } = useMachineCatalogSuggestions();

  const loadBrands = useCallback(
    () =>
      djangoAdmin.machineBrands
        .list<{ results?: BrandOption[] } | BrandOption[]>({ page_size: 200 })
        .then((d) => setBrands(Array.isArray(d) ? d : d.results ?? []))
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const brandOptions = brands.map((b) => ({ value: b.id, label: b.name }));
  const slugOfBrand = (id: unknown) => brands.find((b) => b.id === id)?.slug;
  const afterSeed = async (refresh: () => Promise<void>) => {
    await Promise.all([refresh(), loadBrands(), reload()]);
  };

  const fields: FormField[] = [
    { name: "machine_brand", label: "Machine brand", type: "select", required: true, options: brandOptions },
    {
      name: "name",
      label: "Model name",
      type: "combobox",
      required: true,
      placeholder: "Choose from the list or type a model",
      hint: "Pick the brand first to see its common models — picking one sets the machine type.",
      suggestions: (values, mode) =>
        machineModelSuggestions(catalog, slugOfBrand(values.machine_brand), values, mode),
    },
    { name: "machine_type", label: "Machine type", type: "select", required: true, options: MACHINE_TYPES },
    {
      name: "slug",
      label: "Slug",
      type: "slug",
      required: true,
      // "juki-ddl-8700" — model names repeat across brands.
      autoFrom: ["machine_brand", "name"],
      autoValue: (v) => (v.name ? `${slugOfBrand(v.machine_brand) ?? ""} ${String(v.name)}` : ""),
    },
    ...descriptionFields(),
    { name: "image", label: "Image", type: "imageUrl", full: true },
    { name: "order", label: "Sort order", type: "number" },
    { name: "is_active", label: "Active", type: "boolean" },
    ...seoFields({ og: false }),
  ];

  return (
    <ResourceManager<MachineModel>
      eyebrow="Catalog"
      title="Machine Models"
      singular="machine model"
      description="Specific machine models under each brand (Juki DDL-8700, Pegasus M700…). Each carries a machine type — parts inherit their type from the models they fit."
      client={djangoAdmin.machineModels as unknown as CrudClient<MachineModel>}
      rowKey={(m) => m.slug}
      rowLabel={(m) => `${m.machine_brand_name ?? ""} ${m.name}`.trim()}
      columns={columns}
      searchPlaceholder="Search models…"
      searchAccessor={(m) => `${m.name} ${m.machine_brand_name} ${m.machine_type}`}
      emptyTitle="No machine models yet."
      emptyDescription="Load the standard brands and their common industrial models (Juki DDL-8700, Brother S-7300A, Pegasus M952…) in one go."
      emptyAction={(refresh) => (
        <StandardCatalogLoader target="machines" onDone={() => afterSeed(refresh)} />
      )}
      extraActions={(rows, refresh) =>
        rows && rows.length > 0 ? (
          <StandardCatalogLoader
            target="machines"
            variant="subtle"
            label="Add missing standard"
            onDone={() => afterSeed(refresh)}
          />
        ) : null
      }
      onSaved={reload}
      initialValues={{ is_active: true, order: 0, machine_type: "lockstitch" }}
      fields={fields}
    />
  );
}
