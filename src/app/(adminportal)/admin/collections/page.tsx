"use client";

import { djangoAdmin } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";
import { formatDate } from "@/lib/utils";

interface Collection extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  season: string;
  description: string;
  hero_image: string;
  launch_date: string;
  is_active: boolean;
  is_featured: boolean;
}

const columns: Column<Collection>[] = [
  {
    key: "name",
    header: "Collection",
    sortable: true,
    accessor: (c) => c.name,
    render: (c) => (
      <div className="min-w-0">
        <p className="font-medium text-navy truncate">{c.name}</p>
        <p className="text-[11px] text-ink/45">/{c.slug}</p>
      </div>
    ),
  },
  {
    key: "season",
    header: "Season",
    sortable: true,
    accessor: (c) => c.season,
    render: (c) => (
      <span className="text-[11px] tracking-[0.2em] uppercase text-gold">
        {c.season}
      </span>
    ),
  },
  {
    key: "launchDate",
    header: "Launch",
    sortable: true,
    accessor: (c) => c.launch_date,
    render: (c) => (
      <span className="text-sm text-ink/65">
        {c.launch_date ? formatDate(c.launch_date) : "—"}
      </span>
    ),
  },
  {
    key: "featured",
    header: "Featured",
    accessor: (c) => (c.is_featured ? "yes" : "no"),
    render: (c) => (
      <span className={`text-[11px] tracking-[0.18em] uppercase ${c.is_featured ? "text-gold" : "text-ink/30"}`}>
        {c.is_featured ? "Featured" : "—"}
      </span>
    ),
  },
  {
    key: "active",
    header: "Active",
    accessor: (c) => (c.is_active ? "yes" : "no"),
    render: (c) => (
      <span className={`text-[11px] tracking-[0.18em] uppercase ${c.is_active ? "text-emerald-700" : "text-ink/45"}`}>
        {c.is_active ? "Active" : "Inactive"}
      </span>
    ),
  },
];

export default function AdminCollections() {
  return (
    <ResourceManager<Collection>
      eyebrow="Catalog"
      title="Collections"
      description="Seasonal lines and themed edits."
      client={djangoAdmin.collections as CrudClient<Collection>}
      rowKey={(c) => c.slug}
      rowLabel={(c) => c.name}
      columns={columns}
      searchPlaceholder="Search collections…"
      searchAccessor={(c) => `${c.name} ${c.slug} ${c.season}`}
      initialValues={{ is_active: true, is_featured: false }}
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        {
          name: "slug",
          label: "Slug",
          type: "slug",
          required: true,
          hint: "URL fragment — auto-generated from the name.",
          autoFrom: "name",
        },
        { name: "season", label: "Season", type: "text", required: true, placeholder: "SS26, FW25, …" },
        { name: "launch_date", label: "Launch date", type: "date", required: true },
        { name: "hero_image", label: "Hero image", type: "imageUrl", full: true },
        { name: "description", label: "Description", type: "textarea", full: true },
        { name: "is_active", label: "Active", type: "boolean", placeholder: "Show on storefront" },
        { name: "is_featured", label: "Featured", type: "boolean", placeholder: "Promote in nav" },
      ]}
    />
  );
}
