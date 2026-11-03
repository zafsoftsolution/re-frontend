"use client";

import { djangoAdmin } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";

interface Organization extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  legal_name: string;
  tax_id: string;
  contact_email: string;
  billing_email: string;
  support_email: string;
  website: string;
  default_currency: string;
  default_locale: string;
  default_timezone: string;
  is_active: boolean;
}

const columns: Column<Organization>[] = [
  {
    key: "name",
    header: "Organization",
    sortable: true,
    accessor: (o) => o.name,
    render: (o) => (
      <div className="min-w-0">
        <p className="font-medium text-navy truncate">{o.name}</p>
        <p className="text-[11px] text-ink/45">/{o.slug}</p>
      </div>
    ),
  },
  {
    key: "contact",
    header: "Contact",
    accessor: (o) => o.contact_email,
    render: (o) => (
      <span className="text-sm text-ink/70 truncate">{o.contact_email || "—"}</span>
    ),
  },
  {
    key: "currency",
    header: "Currency",
    sortable: true,
    accessor: (o) => o.default_currency,
    render: (o) => (
      <span className="text-[11px] tracking-[0.18em] uppercase text-ink/55">
        {o.default_currency}
      </span>
    ),
  },
  {
    key: "active",
    header: "Status",
    sortable: true,
    accessor: (o) => (o.is_active ? "active" : "inactive"),
    render: (o) => (
      <span
        className={`text-[11px] tracking-[0.18em] uppercase ${
          o.is_active ? "text-emerald-700" : "text-ink/45"
        }`}
      >
        {o.is_active ? "Active" : "Inactive"}
      </span>
    ),
  },
];

export default function AdminOrganizations() {
  return (
    <ResourceManager<Organization>
      eyebrow="System"
      title="Organizations"
      singular="organization"
      description="Top-level enterprise tenant. For single-vendor deployments this is typically one row."
      client={djangoAdmin.organizations as CrudClient<Organization>}
      rowKey={(o) => o.id}
      rowLabel={(o) => o.name}
      columns={columns}
      searchPlaceholder="Search organizations…"
      searchAccessor={(o) => `${o.name} ${o.slug} ${o.legal_name}`}
      initialValues={{
        is_active: true,
        default_currency: "BDT",
        default_locale: "en-US",
        default_timezone: "UTC",
      }}
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
        { name: "legal_name", label: "Legal name", type: "text", full: true },
        { name: "tax_id", label: "Tax ID", type: "text" },
        { name: "website", label: "Website", type: "url" },
        { name: "contact_email", label: "Contact email", type: "email" },
        { name: "billing_email", label: "Billing email", type: "email" },
        { name: "support_email", label: "Support email", type: "email" },
        { name: "default_currency", label: "Default currency", type: "text", placeholder: "BDT" },
        { name: "default_locale", label: "Default locale", type: "text", placeholder: "en-US" },
        { name: "default_timezone", label: "Default timezone", type: "text", placeholder: "UTC" },
        { name: "is_active", label: "Active", type: "boolean" },
      ]}
    />
  );
}
