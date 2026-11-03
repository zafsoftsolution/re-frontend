"use client";

import { djangoAdmin } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";
import { formatDate } from "@/lib/utils";

interface NewsletterSubscription extends Record<string, unknown> {
  id: string;
  email: string;
  source: string;
  is_active: boolean;
  subscribed_at: string;
  unsubscribed_at: string | null;
}

const columns: Column<NewsletterSubscription>[] = [
  {
    key: "email",
    header: "Email",
    sortable: true,
    accessor: (s) => s.email,
    render: (s) => (
      <span className="font-medium text-navy">{s.email}</span>
    ),
  },
  {
    key: "source",
    header: "Source",
    sortable: true,
    accessor: (s) => s.source ?? "",
    render: (s) =>
      s.source ? (
        <span className="text-[11px] tracking-[0.18em] uppercase text-ink/55">
          {s.source}
        </span>
      ) : (
        <span className="text-ink/30">—</span>
      ),
  },
  {
    key: "active",
    header: "Status",
    sortable: true,
    accessor: (s) => (s.is_active ? "active" : "unsubscribed"),
    render: (s) => (
      <span
        className={`text-[11px] tracking-[0.18em] uppercase ${
          s.is_active ? "text-emerald-700" : "text-ink/45"
        }`}
      >
        {s.is_active ? "Active" : "Unsubscribed"}
      </span>
    ),
  },
  {
    key: "subscribed",
    header: "Subscribed",
    sortable: true,
    accessor: (s) => s.subscribed_at,
    render: (s) => (
      <span className="text-sm text-ink/65">{formatDate(s.subscribed_at)}</span>
    ),
  },
  {
    key: "unsubscribed",
    header: "Unsubscribed",
    sortable: true,
    accessor: (s) => s.unsubscribed_at ?? "",
    render: (s) => (
      <span className="text-sm text-ink/65">
        {s.unsubscribed_at ? formatDate(s.unsubscribed_at) : "—"}
      </span>
    ),
  },
];

export default function AdminNewsletter() {
  return (
    <ResourceManager<NewsletterSubscription>
      eyebrow="Support"
      title="Newsletter"
      singular="subscriber"
      description="Letters-from-the-atelier subscribers. Delete unsubscribes them."
      client={djangoAdmin.newsletter as unknown as CrudClient<NewsletterSubscription>}
      rowKey={(s) => s.id}
      rowLabel={(s) => s.email}
      columns={columns}
      searchPlaceholder="Search by email or source…"
      searchAccessor={(s) => `${s.email} ${s.source}`}
      tabs={[
        { key: "all", label: "All", predicate: () => true },
        { key: "active", label: "Active", predicate: (s) => s.is_active },
        { key: "inactive", label: "Unsubscribed", predicate: (s) => !s.is_active },
      ]}
    />
  );
}
