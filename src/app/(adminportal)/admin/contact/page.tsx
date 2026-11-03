"use client";

import { djangoAdmin } from "@/lib/django-admin";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";
import { formatDate } from "@/lib/utils";

interface ContactSubmission extends Record<string, unknown> {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  handled_by: string | null;
  response_notes: string;
  created_at: string;
}

const STATUS_TONES: Record<string, string> = {
  new: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  resolved: "bg-emerald-50 text-emerald-700",
  spam: "bg-rose-50 text-rose-700",
};

const columns: Column<ContactSubmission>[] = [
  {
    key: "from",
    header: "From",
    sortable: true,
    accessor: (c) => c.name,
    render: (c) => (
      <div className="min-w-0">
        <p className="font-medium text-navy truncate">{c.name}</p>
        <p className="text-[11px] text-ink/45 truncate">{c.email}</p>
      </div>
    ),
  },
  {
    key: "subject",
    header: "Subject",
    accessor: (c) => c.subject,
    render: (c) => (
      <div className="min-w-0">
        <p className="font-medium text-navy truncate">{c.subject}</p>
        <p className="text-[11px] text-ink/55 line-clamp-1">{c.message}</p>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    accessor: (c) => c.status,
    render: (c) => (
      <span
        className={`inline-block text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full ${
          STATUS_TONES[c.status] ?? "bg-ink/5 text-ink/65"
        }`}
      >
        {c.status.replace(/_/g, " ")}
      </span>
    ),
  },
  {
    key: "created",
    header: "Received",
    sortable: true,
    accessor: (c) => c.created_at,
    render: (c) => (
      <span className="text-sm text-ink/65">{formatDate(c.created_at)}</span>
    ),
  },
];

export default function AdminContact() {
  return (
    <ResourceManager<ContactSubmission>
      eyebrow="Support"
      title="Contact submissions"
      singular="message"
      description="Messages from the public contact form. Triage and respond."
      client={djangoAdmin.contact as unknown as CrudClient<ContactSubmission>}
      rowKey={(c) => c.id}
      rowLabel={(c) => `the message from ${c.name}`}
      columns={columns}
      searchPlaceholder="Search by name, email, subject…"
      searchAccessor={(c) => `${c.name} ${c.email} ${c.subject} ${c.message}`}
      tabs={[
        { key: "all", label: "All", predicate: () => true },
        { key: "new", label: "New", predicate: (c) => c.status === "new" },
        { key: "in_progress", label: "In progress", predicate: (c) => c.status === "in_progress" },
        { key: "resolved", label: "Resolved", predicate: (c) => c.status === "resolved" },
        { key: "spam", label: "Spam", predicate: (c) => c.status === "spam" },
      ]}
      fields={[
        { name: "name", label: "From", type: "text", readOnlyOnEdit: true },
        { name: "email", label: "Email", type: "email", readOnlyOnEdit: true },
        { name: "subject", label: "Subject", type: "text", full: true, readOnlyOnEdit: true },
        { name: "message", label: "Message", type: "textarea", full: true, rows: 6, readOnlyOnEdit: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          options: [
            { value: "new", label: "New" },
            { value: "in_progress", label: "In progress" },
            { value: "resolved", label: "Resolved" },
            { value: "spam", label: "Spam" },
          ],
        },
        { name: "response_notes", label: "Internal notes", type: "textarea", full: true, rows: 4 },
      ]}
    />
  );
}
