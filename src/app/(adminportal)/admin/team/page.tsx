"use client";

import { useEffect, useState } from "react";
import { Ban, CheckCircle2, KeyRound, Loader2, Lock, Unlock, X } from "lucide-react";
import {
  djangoAdmin,
  type AdminUserShape,
  type PaginatedResponse,
} from "@/lib/django-admin";
import { formatDate } from "@/lib/utils";
import PageHeader from "@/components/admin/PageHeader";
import DataTable, { type Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";

export default function AdminTeam() {
  const [users, setUsers] = useState<AdminUserShape[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<AdminUserShape | null>(null);

  // State is only set in promise callbacks so the mount effect can call
  // this without a synchronous setState (react-hooks/set-state-in-effect).
  const load = () =>
    djangoAdmin.users
      .list({
        account_type: "staff",
        ordering: "-date_joined",
      })
      .then(
        (data) => {
          setError(null);
          const rows =
            (data as PaginatedResponse<AdminUserShape>).results ??
            (data as unknown as AdminUserShape[]);
          setUsers(rows);
        },
        (e) => setError((e as Error).message),
      );

  useEffect(() => {
    load();
  }, []);

  const columns: Column<AdminUserShape>[] = [
    {
      key: "name",
      header: "Member",
      sortable: true,
      accessor: (u) => u.full_name || u.email,
      render: (u) => (
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-9 w-9 shrink-0 rounded-full bg-navy text-cream grid place-items-center text-sm font-medium">
            {(u.first_name?.[0] || u.email[0]).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-navy truncate">
              {u.full_name || u.email}
            </p>
            <p className="text-[11px] text-ink/45 truncate">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      accessor: (u) =>
        u.is_superuser
          ? "superuser"
          : u.roles?.[0]?.code ?? "—",
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.is_superuser && (
            <span className="text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full bg-gold/20 text-navy">
              Superuser
            </span>
          )}
          {u.roles?.slice(0, 2).map((r) => (
            <span
              key={r.code}
              className="text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full bg-navy/5 text-navy"
            >
              {r.name}
            </span>
          ))}
          {!u.is_superuser && (!u.roles || u.roles.length === 0) && (
            <span className="text-[10px] tracking-[0.18em] uppercase text-ink/35">
              No role
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (u) => u.account_status,
      render: (u) => <StatusPill status={u.account_status} />,
    },
    {
      key: "mfa",
      header: "MFA",
      accessor: (u) => (u.mfa_enabled ? "yes" : "no"),
      render: (u) => (
        <span
          className={`text-[11px] tracking-[0.18em] uppercase ${
            u.mfa_enabled ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {u.mfa_enabled ? "Enabled" : "Required"}
        </span>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      sortable: true,
      accessor: (u) => u.date_joined,
      render: (u) => (
        <span className="text-sm text-ink/65">{formatDate(u.date_joined)}</span>
      ),
    },
    {
      key: "lastLogin",
      header: "Last login",
      sortable: true,
      accessor: (u) => u.last_login ?? "",
      render: (u) => (
        <span className="text-sm text-ink/65">
          {u.last_login ? formatDate(u.last_login) : "—"}
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

  if (!users) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 size={22} className="text-navy/60 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Team"
        description="Staff accounts with console access. Lock, suspend, or force a password reset."
      />

      <DataTable<AdminUserShape>
        rows={users}
        columns={columns}
        rowKey={(u) => u.id}
        searchPlaceholder="Search by name or email…"
        searchAccessor={(u) => `${u.full_name} ${u.email}`}
        pageSize={20}
        emptyTitle="No staff accounts yet."
        onRowClick={setActive}
      />

      {active && (
        <TeamDrawer
          user={active}
          onClose={() => setActive(null)}
          onChanged={async () => {
            await load();
            const fresh = await djangoAdmin.users.get(active.id);
            setActive(fresh);
          }}
        />
      )}
    </div>
  );
}

function TeamDrawer({
  user,
  onClose,
  onChanged,
}: {
  user: AdminUserShape;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const isLocked = user.account_status === "locked";
  const isSuspended = user.account_status === "suspended";

  return (
    <div
      className="fixed inset-0 z-[80] bg-navy/40 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[var(--jmn-line)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-12 w-12 rounded-full bg-navy text-cream grid place-items-center text-lg font-medium">
              {(user.first_name?.[0] || user.email[0]).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="font-display text-xl text-navy truncate">
                {user.full_name || user.email}
              </p>
              <p className="text-[11px] text-ink/55 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 grid place-items-center rounded-md hover:bg-[#F4F5F7] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 border-b border-[var(--jmn-line)] space-y-3">
          <p className="text-[10px] tracking-[0.3em] uppercase text-ink/55">
            Roles
          </p>
          <div className="flex flex-wrap gap-1.5">
            {user.is_superuser && (
              <span className="text-[10px] tracking-[0.18em] uppercase px-2 py-1 rounded-full bg-gold/20 text-navy">
                Superuser
              </span>
            )}
            {user.roles?.map((r) => (
              <span
                key={r.code}
                className="text-[10px] tracking-[0.18em] uppercase px-2 py-1 rounded-full bg-navy/5 text-navy"
              >
                {r.name}
              </span>
            ))}
            {!user.is_superuser && (!user.roles || user.roles.length === 0) && (
              <span className="text-[10px] tracking-[0.18em] uppercase text-ink/35">
                No role assigned
              </span>
            )}
          </div>
        </div>

        <div className="px-6 py-5 space-y-2">
          <p className="text-[10px] tracking-[0.3em] uppercase text-ink/55 mb-2">
            Actions
          </p>

          {isLocked ? (
            <ActionButton
              icon={<Unlock size={14} />}
              label="Unlock account"
              tone="emerald"
              busy={busy === "unlock"}
              onClick={() => run("unlock", () => djangoAdmin.users.unlock(user.id))}
            />
          ) : (
            <ActionButton
              icon={<Lock size={14} />}
              label="Lock account"
              busy={busy === "lock"}
              onClick={() => run("lock", () => djangoAdmin.users.lock(user.id))}
            />
          )}

          {isSuspended ? (
            <ActionButton
              icon={<CheckCircle2 size={14} />}
              label="Reactivate account"
              tone="emerald"
              busy={busy === "reactivate"}
              onClick={() =>
                run("reactivate", () => djangoAdmin.users.reactivate(user.id))
              }
            />
          ) : (
            <ActionButton
              icon={<Ban size={14} />}
              label="Suspend account"
              tone="rose"
              busy={busy === "suspend"}
              onClick={() => run("suspend", () => djangoAdmin.users.suspend(user.id))}
            />
          )}

          <ActionButton
            icon={<KeyRound size={14} />}
            label="Force password reset on next login"
            busy={busy === "force-reset"}
            onClick={() =>
              run("force-reset", () =>
                djangoAdmin.users.forcePasswordReset(user.id),
              )
            }
          />

          {error && <p className="text-sm text-rose-700 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  tone,
  busy,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "rose" | "emerald";
  busy?: boolean;
  onClick: () => void;
}) {
  const toneClass =
    tone === "rose"
      ? "border-rose-200 text-rose-700 hover:bg-rose-50"
      : tone === "emerald"
      ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
      : "border-[var(--jmn-line)] text-navy hover:bg-[#F4F5F7]";
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md border text-sm transition-colors disabled:opacity-50 ${toneClass}`}
    >
      {icon}
      <span>{busy ? "Working…" : label}</span>
    </button>
  );
}
