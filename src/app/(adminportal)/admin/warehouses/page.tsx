"use client";

import { djangoAdmin } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";

interface Warehouse extends Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
  is_active: boolean;
  is_default: boolean;
}

const columns: Column<Warehouse>[] = [
  {
    key: "warehouse",
    header: "Warehouse",
    sortable: true,
    accessor: (w) => w.name,
    render: (w) => (
      <div className="min-w-0">
        <p className="font-medium text-navy truncate">{w.name}</p>
        <p className="text-[11px] text-ink/45 tabular">{w.code}</p>
      </div>
    ),
  },
  {
    key: "location",
    header: "Location",
    accessor: (w) => `${w.city} ${w.country}`,
    render: (w) => (
      <span className="text-sm text-ink/70">
        {[w.city, w.region, w.country].filter(Boolean).join(", ") || "—"}
      </span>
    ),
  },
  {
    key: "default",
    header: "Default",
    accessor: (w) => (w.is_default ? "yes" : "no"),
    render: (w) =>
      w.is_default ? (
        <span className="text-[11px] tracking-[0.18em] uppercase text-gold">
          Default
        </span>
      ) : (
        <span className="text-ink/30">—</span>
      ),
  },
  {
    key: "active",
    header: "Status",
    sortable: true,
    accessor: (w) => (w.is_active ? "active" : "inactive"),
    render: (w) => (
      <span
        className={`text-[11px] tracking-[0.18em] uppercase ${
          w.is_active ? "text-emerald-700" : "text-ink/45"
        }`}
      >
        {w.is_active ? "Active" : "Inactive"}
      </span>
    ),
  },
];

export default function AdminWarehouses() {
  return (
    <ResourceManager<Warehouse>
      eyebrow="Inventory"
      title="Warehouses"
      singular="warehouse"
      description="Physical locations stock is held — at least one must be marked default."
      client={djangoAdmin.warehouses as CrudClient<Warehouse>}
      rowKey={(w) => w.id}
      rowLabel={(w) => w.name}
      columns={columns}
      searchPlaceholder="Search warehouses…"
      searchAccessor={(w) => `${w.name} ${w.code} ${w.city} ${w.country}`}
      initialValues={{ is_active: true, is_default: false }}
      fields={[
        { name: "code", label: "Code", type: "text", required: true, placeholder: "NYC-FLAGSHIP" },
        { name: "name", label: "Name", type: "text", required: true },
        { name: "address_line1", label: "Address line 1", type: "text", full: true },
        { name: "address_line2", label: "Address line 2", type: "text", full: true },
        { name: "city", label: "City", type: "text" },
        { name: "region", label: "Region / state", type: "text" },
        { name: "postcode", label: "Postcode", type: "text" },
        { name: "country", label: "Country", type: "text" },
        { name: "is_active", label: "Active", type: "boolean" },
        { name: "is_default", label: "Default warehouse", type: "boolean", hint: "New orders reserve from here" },
      ]}
    />
  );
}
