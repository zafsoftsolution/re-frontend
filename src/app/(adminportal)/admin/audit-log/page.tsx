"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { djangoAdmin, type PaginatedResponse } from "@/lib/django-admin";
import PageHeader from "@/components/admin/PageHeader";
import DataTable, { type Column } from "@/components/admin/DataTable";

interface AuditEntry extends Record<string, unknown> {
  id: string;
  timestamp: string;
  event: string;
  actor: string | null;
  actor_email: string | null;
  target_user: string | null;
  target_email: string | null;
  organization: string | null;
  description: string;
  ip_address: string | null;
  user_agent: string;
  metadata: Record<string, unknown>;
}

const EVENT_TONES: Record<string, string> = {
  login_success: "bg-emerald-50 text-emerald-700",
  login_failure: "bg-rose-50 text-rose-700",
  logout: "bg-ink/5 text-ink/65",
  password_changed: "bg-blue-50 text-blue-700",
  password_reset_requested: "bg-amber-50 text-amber-700",
  password_reset_completed: "bg-blue-50 text-blue-700",
  email_verified: "bg-emerald-50 text-emerald-700",
  phone_verified: "bg-emerald-50 text-emerald-700",
  mfa_enabled: "bg-emerald-50 text-emerald-700",
  mfa_disabled: "bg-amber-50 text-amber-700",
  account_locked: "bg-rose-50 text-rose-700",
  account_unlocked: "bg-emerald-50 text-emerald-700",
  account_suspended: "bg-rose-50 text-rose-700",
  account_reactivated: "bg-emerald-50 text-emerald-700",
  role_assigned: "bg-blue-50 text-blue-700",
  role_revoked: "bg-rose-50 text-rose-700",
  api_key_created: "bg-blue-50 text-blue-700",
  api_key_revoked: "bg-rose-50 text-rose-700",
};

export default function AdminAuditLog() {
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    djangoAdmin.auditLog
      .list()
      .then((data) => {
        const items =
          (data as PaginatedResponse<AuditEntry>).results ??
          (data as unknown as AuditEntry[]);
        setRows(items);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  const columns: Column<AuditEntry>[] = [
    {
      key: "timestamp",
      header: "When",
      sortable: true,
      accessor: (e) => e.timestamp,
      render: (e) => (
        <span className="text-sm text-ink/65 tabular">
          {new Date(e.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      key: "event",
      header: "Event",
      sortable: true,
      accessor: (e) => e.event,
      render: (e) => (
        <span
          className={`inline-block text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full ${
            EVENT_TONES[e.event] ?? "bg-ink/5 text-ink/65"
          }`}
        >
          {e.event.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      accessor: (e) => e.actor_email ?? "system",
      render: (e) => (
        <span className="text-sm text-ink/70">{e.actor_email ?? "system"}</span>
      ),
    },
    {
      key: "target",
      header: "Target",
      accessor: (e) => e.target_email ?? "",
      render: (e) => (
        <span className="text-sm text-ink/70">{e.target_email ?? "—"}</span>
      ),
    },
    {
      key: "ip",
      header: "IP",
      accessor: (e) => e.ip_address ?? "",
      render: (e) => (
        <span className="text-[11px] text-ink/55 tabular">
          {e.ip_address ?? "—"}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      accessor: (e) => e.description,
      render: (e) => (
        <span className="text-sm text-ink/65 line-clamp-1">
          {e.description || "—"}
        </span>
      ),
    },
  ];

  if (error) {
    return (
      <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!rows) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 size={22} className="text-navy/60 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Audit log"
        description="Append-only record of every security-relevant action across the platform."
      />

      <DataTable<AuditEntry>
        rows={rows}
        columns={columns}
        rowKey={(e) => e.id}
        searchPlaceholder="Search by event, email, IP…"
        searchAccessor={(e) =>
          `${e.event} ${e.actor_email ?? ""} ${e.target_email ?? ""} ${e.ip_address ?? ""} ${e.description}`
        }
        pageSize={25}
        emptyTitle="No audit entries yet."
      />
    </div>
  );
}
