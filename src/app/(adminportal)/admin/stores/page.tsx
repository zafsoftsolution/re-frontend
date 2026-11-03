"use client";

import { useEffect, useState } from "react";
import { djangoAdmin } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";

interface Store extends Record<string, unknown> {
  id: string;
  organization: string;
  name: string;
  slug: string;
  type: string;
  currency: string;
  locale: string;
  timezone: string;
  is_active: boolean;
}

interface OrgOption {
  id: string;
  name: string;
}

const columns: Column<Store>[] = [
  {
    key: "name",
    header: "Store",
    sortable: true,
    accessor: (s) => s.name,
    render: (s) => (
      <div className="min-w-0">
        <p className="font-medium text-navy truncate">{s.name}</p>
        <p className="text-[11px] text-ink/45">/{s.slug}</p>
      </div>
    ),
  },
  {
    key: "type",
    header: "Type",
    sortable: true,
    accessor: (s) => s.type,
    render: (s) => (
      <span className="text-[11px] tracking-[0.18em] uppercase text-ink/55">
        {s.type}
      </span>
    ),
  },
  {
    key: "currency",
    header: "Currency",
    accessor: (s) => s.currency,
    render: (s) => (
      <span className="text-[11px] tracking-[0.18em] uppercase text-ink/55">
        {s.currency}
      </span>
    ),
  },
  {
    key: "active",
    header: "Status",
    sortable: true,
    accessor: (s) => (s.is_active ? "active" : "inactive"),
    render: (s) => (
      <span
        className={`text-[11px] tracking-[0.18em] uppercase ${
          s.is_active ? "text-emerald-700" : "text-ink/45"
        }`}
      >
        {s.is_active ? "Active" : "Inactive"}
      </span>
    ),
  },
];

export default function AdminStores() {
  const [orgOptions, setOrgOptions] = useState<OrgOption[]>([]);

  useEffect(() => {
    djangoAdmin.organizations
      .list()
      .then((data) => {
        const items = (data as { results?: OrgOption[] }).results
          ?? (data as unknown as OrgOption[]);
        setOrgOptions(items.map((o) => ({ id: o.id, name: o.name })));
      })
      .catch(() => {});
  }, []);

  return (
    <ResourceManager<Store>
      eyebrow="System"
      title="Stores"
      singular="store"
      description="Sales channels: web, B2B portal, POS, mobile, marketplace listings."
      client={djangoAdmin.stores as CrudClient<Store>}
      rowKey={(s) => s.id}
      rowLabel={(s) => s.name}
      columns={columns}
      searchPlaceholder="Search stores…"
      searchAccessor={(s) => `${s.name} ${s.slug} ${s.type}`}
      initialValues={{
        is_active: true,
        type: "web",
        currency: "BDT",
        locale: "en-US",
        timezone: "UTC",
      }}
      fields={[
        {
          name: "organization",
          label: "Organization",
          type: "select",
          required: true,
          options: orgOptions.map((o) => ({ value: o.id, label: o.name })),
        },
        { name: "name", label: "Name", type: "text", required: true },
        {
          name: "slug",
          label: "Slug",
          type: "slug",
          required: true,
          hint: "URL fragment — auto-generated from the name.",
          autoFrom: "name",
        },
        {
          name: "type",
          label: "Channel type",
          type: "select",
          required: true,
          options: [
            { value: "web", label: "Web storefront" },
            { value: "b2b", label: "B2B portal" },
            { value: "pos", label: "Point of sale" },
            { value: "mobile", label: "Mobile app" },
            { value: "wholesale", label: "Wholesale" },
            { value: "external", label: "External marketplace" },
          ],
        },
        { name: "currency", label: "Currency", type: "text", placeholder: "BDT" },
        { name: "locale", label: "Locale", type: "text", placeholder: "en-US" },
        { name: "timezone", label: "Timezone", type: "text", placeholder: "UTC" },
        { name: "is_active", label: "Active", type: "boolean" },
      ]}
    />
  );
}
