"use client";

import { djangoAdmin, type SupplierShape } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";

const STATUS_TONE: Record<string, string> = {
  active: "text-emerald-700",
  inactive: "text-ink/45",
  blocked: "text-rose-700",
};

const columns: Column<SupplierShape>[] = [
  {
    key: "supplier",
    header: "Supplier",
    sortable: true,
    accessor: (s) => s.name,
    render: (s) => (
      <div className="min-w-0">
        <p className="font-medium text-navy truncate">{s.name}</p>
        <p className="text-[11px] text-ink/45 tabular">{s.code}</p>
      </div>
    ),
  },
  {
    key: "contact",
    header: "Contact",
    accessor: (s) => `${s.contact_name} ${s.email}`,
    render: (s) => (
      <div className="min-w-0">
        <p className="text-sm text-ink/80 truncate">{s.contact_name || "—"}</p>
        <p className="text-[11px] text-ink/55 truncate">{s.email || s.phone || ""}</p>
      </div>
    ),
  },
  {
    key: "location",
    header: "Location",
    accessor: (s) => `${s.city} ${s.country}`,
    render: (s) => (
      <span className="text-sm text-ink/70">
        {[s.city, s.country].filter(Boolean).join(", ") || "—"}
      </span>
    ),
  },
  {
    key: "terms",
    header: "Terms",
    accessor: (s) => s.payment_terms_days,
    render: (s) => (
      <span className="text-sm text-ink/70 tabular">
        {s.payment_terms_days === 0
          ? "Prepaid / COD"
          : `Net ${s.payment_terms_days}`}
      </span>
    ),
    align: "right",
  },
  {
    key: "open",
    header: "Open POs",
    accessor: (s) => s.open_po_count ?? 0,
    render: (s) =>
      (s.open_po_count ?? 0) > 0 ? (
        <span className="text-sm font-medium text-navy tabular">
          {s.open_po_count}
        </span>
      ) : (
        <span className="text-ink/30">—</span>
      ),
    align: "right",
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    accessor: (s) => s.status,
    render: (s) => (
      <span
        className={`text-[11px] tracking-[0.18em] uppercase ${
          STATUS_TONE[s.status] ?? "text-ink/45"
        }`}
      >
        {s.status}
      </span>
    ),
  },
];

export default function AdminSuppliers() {
  return (
    <ResourceManager<SupplierShape>
      eyebrow="Purchasing"
      title="Suppliers"
      singular="supplier"
      description="Vendors you buy from. Used as the counterparty on purchase orders."
      client={djangoAdmin.suppliers as unknown as CrudClient<SupplierShape>}
      rowKey={(s) => s.id}
      rowLabel={(s) => s.name}
      columns={columns}
      searchPlaceholder="Search suppliers…"
      searchAccessor={(s) =>
        `${s.name} ${s.code} ${s.legal_name} ${s.contact_name} ${s.email} ${s.city} ${s.country}`
      }
      initialValues={{
        status: "active",
        default_currency: "BDT",
        payment_terms_days: 30,
      }}
      tabs={[
        { key: "all", label: "All", predicate: () => true },
        { key: "active", label: "Active", predicate: (s) => s.status === "active" },
        { key: "inactive", label: "Inactive", predicate: (s) => s.status === "inactive" },
        { key: "blocked", label: "Blocked", predicate: (s) => s.status === "blocked" },
      ]}
      fields={[
        { name: "code", label: "Code", type: "text", required: true, placeholder: "SUP-NIKE" },
        { name: "name", label: "Display name", type: "text", required: true },
        { name: "legal_name", label: "Legal name", type: "text", full: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "blocked", label: "Blocked" },
          ],
        },
        {
          name: "default_currency",
          label: "Currency",
          type: "select",
          options: [
            { value: "BDT", label: "BDT" },
            { value: "EUR", label: "EUR" },
            { value: "GBP", label: "GBP" },
            { value: "BDT", label: "BDT" },
            { value: "INR", label: "INR" },
            { value: "CNY", label: "CNY" },
          ],
        },
        {
          name: "payment_terms_days",
          label: "Payment terms (days)",
          type: "number",
          hint: "0 means prepaid / COD",
        },
        { name: "contact_name", label: "Contact name", type: "text" },
        { name: "email", label: "Email", type: "text" },
        { name: "phone", label: "Phone", type: "text" },
        { name: "website", label: "Website", type: "text", full: true },
        { name: "address_line1", label: "Address line 1", type: "text", full: true },
        { name: "address_line2", label: "Address line 2", type: "text", full: true },
        { name: "city", label: "City", type: "text" },
        { name: "region", label: "Region / state", type: "text" },
        { name: "postcode", label: "Postcode", type: "text" },
        { name: "country", label: "Country", type: "text" },
        { name: "tax_id", label: "Tax ID", type: "text", hint: "VAT / GST / TIN" },
        { name: "notes", label: "Notes", type: "textarea", full: true },
      ]}
    />
  );
}
