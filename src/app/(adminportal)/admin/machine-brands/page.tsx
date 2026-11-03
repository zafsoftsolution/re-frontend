"use client";

import { djangoAdmin } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import { descriptionFields, seoFields } from "@/lib/admin/catalog-fields";
import type { Column } from "@/components/admin/DataTable";

interface MachineBrand extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  country: string;
  model_count?: number;
  order: number;
  is_featured: boolean;
  is_active: boolean;
}

const columns: Column<MachineBrand>[] = [
  {
    key: "brand",
    header: "Machine brand",
    sortable: true,
    accessor: (b) => b.name,
    render: (b) => (
      <div className="min-w-0">
        <p className="font-medium text-navy truncate">{b.name}</p>
        <p className="text-[11px] text-ink/45">{b.country || "—"}</p>
      </div>
    ),
  },
  {
    key: "models",
    header: "Models",
    align: "right",
    accessor: (b) => b.model_count ?? 0,
    render: (b) => <span className="tabular text-sm text-navy">{b.model_count ?? 0}</span>,
  },
  {
    key: "featured",
    header: "Featured",
    accessor: (b) => (b.is_featured ? "yes" : "no"),
    render: (b) =>
      b.is_featured ? (
        <span className="text-[11px] tracking-[0.18em] uppercase text-gold">Featured</span>
      ) : (
        <span className="text-ink/30">—</span>
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

export default function AdminMachineBrands() {
  return (
    <ResourceManager<MachineBrand>
      eyebrow="Catalog"
      title="Machine Brands"
      singular="machine brand"
      description="Sewing-machine manufacturers — Juki, Brother, Yamato, Pegasus, Siruba, Kansai. Add machine models under each."
      client={djangoAdmin.machineBrands as unknown as CrudClient<MachineBrand>}
      rowKey={(b) => b.slug}
      rowLabel={(b) => b.name}
      columns={columns}
      searchPlaceholder="Search machine brands…"
      searchAccessor={(b) => `${b.name} ${b.country}`}
      initialValues={{ is_active: true, is_featured: false, order: 0 }}
      fields={[
        { name: "name", label: "Name", type: "text", required: true, placeholder: "Juki" },
        { name: "slug", label: "Slug", type: "slug", required: true, autoFrom: "name" },
        { name: "country", label: "Country of origin", type: "text", placeholder: "Japan" },
        ...descriptionFields(),
        { name: "logo", label: "Logo", type: "imageUrl", full: true },
        { name: "order", label: "Sort order", type: "number" },
        { name: "is_featured", label: "Featured on home page", type: "boolean" },
        { name: "is_active", label: "Active", type: "boolean" },
        ...seoFields(),
      ]}
    />
  );
}
