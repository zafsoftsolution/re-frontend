"use client";

import { useEffect, useState } from "react";
import { djangoAdmin } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";
import type { FormField } from "@/components/admin/ResourceForm";

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

const MACHINE_TYPES: Array<{ value: string; label: string }> = [
  { value: "lockstitch", label: "Lockstitch (single/double needle)" },
  { value: "overlock", label: "Overlock / Serger" },
  { value: "flatlock", label: "Flatlock / Coverstitch" },
  { value: "buttonhole", label: "Buttonhole" },
  { value: "bartack", label: "Bartack" },
  { value: "button_attach", label: "Button attaching" },
  { value: "feed_off_arm", label: "Feed-off-the-arm" },
  { value: "multi_needle", label: "Multi-needle / Chainstitch" },
  { value: "blind_stitch", label: "Blind stitch" },
  { value: "special", label: "Special / Automatic" },
  { value: "other", label: "Other" },
];

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
  const [brandOptions, setBrandOptions] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    djangoAdmin.machineBrands
      .list<{ results?: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }>>({ page_size: 200 })
      .then((d) => {
        const rows = Array.isArray(d) ? d : d.results ?? [];
        setBrandOptions(rows.map((b) => ({ value: b.id, label: b.name })));
      })
      .catch(() => {});
  }, []);

  const fields: FormField[] = [
    { name: "machine_brand", label: "Machine brand", type: "select", required: true, options: brandOptions },
    { name: "machine_type", label: "Machine type", type: "select", required: true, options: MACHINE_TYPES },
    { name: "name", label: "Model name", type: "text", required: true, placeholder: "DDL-8700" },
    { name: "slug", label: "Slug", type: "slug", required: true, autoFrom: "name" },
    { name: "description", label: "Description", type: "textarea", full: true },
    { name: "order", label: "Sort order", type: "number" },
    { name: "is_active", label: "Active", type: "boolean" },
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
      initialValues={{ is_active: true, order: 0, machine_type: "lockstitch" }}
      fields={fields}
    />
  );
}
