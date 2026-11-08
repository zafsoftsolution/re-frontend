"use client";

import { useCallback, useEffect, useState } from "react";
import { djangoAdmin } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";
import StandardCatalogLoader from "@/components/admin/StandardCatalogLoader";
import { descriptionFields, nameBnField, seoFields } from "@/lib/admin/catalog-fields";

interface Category extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  parent: string | null;
  gender: string;
  image: string;
  banner_image: string;
  description: string;
  is_featured: boolean;
  /** Listed under "Devices" in the site navigation instead of "Parts". */
  is_device?: boolean;
  is_active: boolean;
  order: number;
  children: Array<{ id: string; name: string; slug: string }>;
}

const columns: Column<Category>[] = [
  {
    key: "name",
    header: "Category",
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
    key: "parent",
    header: "Parent",
    accessor: (c) => c.parent ?? "",
    render: (c) => (
      <span className="text-sm text-ink/65">
        {c.parent ? "Sub-category" : "Top level"}
      </span>
    ),
  },
  {
    key: "subcategories",
    header: "Subcategories",
    align: "right",
    accessor: (c) => c.children?.length ?? 0,
    render: (c) => (
      <span className="tabular text-sm text-ink/65">
        {c.children?.length ?? 0}
      </span>
    ),
  },
  {
    key: "featured",
    header: "Featured",
    sortable: true,
    accessor: (c) => (c.is_featured ? "yes" : "no"),
    render: (c) => (
      <span
        className={`text-[11px] tracking-[0.18em] uppercase ${
          c.is_featured ? "text-gold" : "text-ink/30"
        }`}
      >
        {c.is_featured ? "Featured" : "—"}
      </span>
    ),
  },
  {
    key: "device",
    header: "Devices",
    sortable: true,
    accessor: (c) => (c.is_device ? "yes" : "no"),
    render: (c) => (
      <span className={`text-[11px] tracking-[0.18em] uppercase ${c.is_device ? "text-navy" : "text-ink/30"}`}>
        {c.is_device ? "Device" : "—"}
      </span>
    ),
  },
  {
    key: "order",
    header: "Order",
    sortable: true,
    align: "right",
    accessor: (c) => c.order,
    render: (c) => (
      <span className="tabular text-sm text-ink/65">{c.order}</span>
    ),
  },
];

export default function AdminCategories() {
  const [parentOptions, setParentOptions] = useState<Array<{ value: string; label: string }>>([]);

  const loadParents = useCallback(
    () =>
      djangoAdmin.categories
        .list()
        .then((data) => {
          const items =
            (data as { results?: Category[] }).results ??
            (data as unknown as Category[]);
          setParentOptions(
            items.map((c) => ({
              value: c.id,
              label: c.parent ? `↳ ${c.name}` : c.name,
            })),
          );
        })
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    loadParents();
  }, [loadParents]);

  return (
    <ResourceManager<Category>
      eyebrow="Catalog"
      title="Categories"
      singular="category"
      description="Part types (hooks, needles, feed dogs…) — two levels. Shown in the site navigation and category pages."
      client={djangoAdmin.categories as CrudClient<Category>}
      emptyTitle="No categories yet."
      emptyDescription="Load the standard spare-parts and devices categories (needles, hooks & loopers, servo motors…) in English and Bangla, then adjust them."
      emptyAction={(refresh) => (
        <StandardCatalogLoader
          target="categories"
          onDone={async () => {
            await Promise.all([refresh(), loadParents()]);
          }}
        />
      )}
      onSaved={loadParents}
      rowKey={(c) => c.slug}
      rowLabel={(c) => c.name}
      columns={columns}
      searchPlaceholder="Search by name or slug…"
      searchAccessor={(c) => `${c.name} ${c.slug}`}
      tabs={[
        { key: "all", label: "All", predicate: () => true },
        { key: "top", label: "Top level", predicate: (c) => !c.parent },
        { key: "sub", label: "Sub-categories", predicate: (c) => !!c.parent },
        { key: "featured", label: "Featured", predicate: (c) => c.is_featured },
        { key: "devices", label: "Devices", predicate: (c) => !!c.is_device },
      ]}
      initialValues={{
        is_active: true,
        is_featured: false,
        is_device: false,
        order: 0,
      }}
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        nameBnField,
        {
          name: "slug",
          label: "Slug",
          type: "slug",
          required: true,
          hint: "URL fragment — auto-generated from the name.",
          autoFrom: "name",
        },
        {
          name: "parent",
          label: "Parent category",
          type: "select",
          options: parentOptions,
          hint: "Leave empty for a top-level category",
        },
        { name: "order", label: "Display order", type: "number", hint: "Lower numbers first" },
        { name: "image", label: "Image", type: "imageUrl", full: true },
        { name: "banner_image", label: "Banner image", type: "imageUrl", full: true },
        ...descriptionFields(4),
        { name: "is_featured", label: "Featured", type: "boolean", placeholder: "Home page category grid" },
        {
          name: "is_device",
          label: "Show under Devices",
          type: "boolean",
          placeholder: "List in the site's Devices menu (motors, control boxes, attachments…) instead of Parts",
        },
        { name: "is_active", label: "Active", type: "boolean", placeholder: "Visible on the site" },
        ...seoFields(),
      ]}
    />
  );
}
