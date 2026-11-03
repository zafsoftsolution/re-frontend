"use client";

/**
 * Admin → Roles & permissions.
 *
 * The role-edit drawer used to expose `permission_codes` as a JSON textarea
 * — fine for engineers, terrible for ops. This rewrite renders a grouped
 * checkbox tree powered by `/api/auth/permissions/grouped/` so the catalog
 * is self-documenting and the operator never has to type a code by hand.
 *
 * The list view stays on `ResourceManager` (data table, search, tabs).
 * `renderForm` swaps in `RoleFormDrawer` instead of the generic ResourceForm.
 */

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  RotateCcw,
  Search,
  Shield,
  X,
} from "lucide-react";
import {
  djangoAdmin,
  type PermissionGroupShape,
  type RoleAccountType,
  type RoleScope,
  type RoleShape,
} from "@/lib/django-admin";
import { useToast } from "@/context/FeedbackContext";
import ResourceManager, { type CrudClient } from "@/components/admin/ResourceManager";
import type { Column } from "@/components/admin/DataTable";
import { cn } from "@/lib/utils";

const columns: Column<RoleShape>[] = [
  {
    key: "name",
    header: "Role",
    sortable: true,
    accessor: (r) => r.name,
    render: (r) => (
      <div className="min-w-0">
        <p className="font-medium text-navy truncate">{r.name}</p>
        <p className="text-[11px] text-ink/45 tabular">{r.code}</p>
      </div>
    ),
  },
  {
    key: "scope",
    header: "Scope",
    sortable: true,
    accessor: (r) => r.scope,
    render: (r) => (
      <span className="text-[11px] tracking-[0.18em] uppercase text-ink/55">
        {r.scope}
      </span>
    ),
  },
  {
    key: "permissions",
    header: "Permissions",
    align: "right",
    accessor: (r) => r.permission_codes?.length ?? 0,
    render: (r) => (
      <span className="tabular text-sm text-ink/65">
        {r.permission_codes?.length ?? 0}
      </span>
    ),
  },
  {
    key: "system",
    header: "Type",
    accessor: (r) => (r.is_system ? "system" : "custom"),
    render: (r) => (
      <span
        className={`text-[11px] tracking-[0.18em] uppercase ${
          r.is_system ? "text-gold" : "text-ink/55"
        }`}
      >
        {r.is_system ? "System" : "Custom"}
      </span>
    ),
  },
  {
    key: "default",
    header: "Default",
    accessor: (r) => (r.is_default ? "yes" : "no"),
    render: (r) =>
      r.is_default ? (
        <span className="text-[11px] tracking-[0.18em] uppercase text-emerald-700">
          Default
        </span>
      ) : (
        <span className="text-ink/30">—</span>
      ),
  },
];

export default function AdminRoles() {
  return (
    <ResourceManager<RoleShape>
      eyebrow="System"
      title="Roles"
      singular="role"
      description="Bundles of permissions assignable to staff. System roles cannot be modified."
      client={djangoAdmin.roles as unknown as CrudClient<RoleShape>}
      rowKey={(r) => r.id}
      rowLabel={(r) => r.name}
      columns={columns}
      searchPlaceholder="Search roles…"
      searchAccessor={(r) => `${r.name} ${r.code}`}
      tabs={[
        { key: "all", label: "All", predicate: () => true },
        { key: "custom", label: "Custom", predicate: (r) => !r.is_system },
        { key: "system", label: "System", predicate: (r) => r.is_system },
      ]}
      renderForm={({ mode, initial, onClose, onSubmit }) => (
        <RoleFormDrawer
          mode={mode}
          initial={initial}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    />
  );
}

// ── Role drawer ────────────────────────────────────────────────────────────

interface RoleFormProps {
  mode: "create" | "edit";
  initial: RoleShape | undefined;
  onClose: () => void;
  onSubmit: (data: Partial<RoleShape>) => Promise<void>;
}

const ACCOUNT_TYPE_OPTIONS: Array<{ value: RoleAccountType; label: string }> = [
  { value: "", label: "— Any —" },
  { value: "staff", label: "Staff" },
  { value: "customer", label: "Customer" },
  { value: "service", label: "Service account" },
];

const SCOPE_OPTIONS: Array<{ value: RoleScope; label: string }> = [
  { value: "global", label: "Global" },
  { value: "organization", label: "Organization" },
  { value: "store", label: "Store" },
  { value: "department", label: "Department" },
];

function deriveCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function RoleFormDrawer({ mode, initial, onClose, onSubmit }: RoleFormProps) {
  const toast = useToast();
  const isSystem = !!initial?.is_system;

  // Identity fields
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [codeTouched, setCodeTouched] = useState(!!initial?.code);
  const [scope, setScope] = useState<RoleScope>(initial?.scope ?? "organization");
  const [accountType, setAccountType] = useState<RoleAccountType>(
    (initial?.applies_to_account_type as RoleAccountType) ?? "",
  );
  const [isDefault, setIsDefault] = useState(!!initial?.is_default);
  const [description, setDescription] = useState(initial?.description ?? "");

  // Permission state
  const [groups, setGroups] = useState<PermissionGroupShape[] | null>(null);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial?.permission_codes ?? []),
  );
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Load the permission catalog once.
  useEffect(() => {
    djangoAdmin.permissions
      .grouped()
      .then(setGroups)
      .catch((e) => setGroupsError((e as Error).message));
  }, []);

  // Keep `code` auto-derived from `name` until the user types into it.
  function changeName(v: string) {
    setName(v);
    if (!codeTouched) setCode(deriveCode(v));
  }

  // Filter groups by the search term. Matches on permission name / code /
  // description so an operator can find "refund" without knowing the module.
  const filtered = useMemo(() => {
    if (!groups) return [];
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.permissions.length > 0);
  }, [groups, search]);

  const totalAvailable = groups?.reduce((s, g) => s + g.permissions.length, 0) ?? 0;
  const selectedCount = selected.size;

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleGroup(group: PermissionGroupShape, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of group.permissions) {
        if (checked) next.add(p.code);
        else next.delete(p.code);
      }
      return next;
    });
  }

  function selectAll() {
    if (!groups) return;
    setSelected(new Set(groups.flatMap((g) => g.permissions.map((p) => p.code))));
  }

  function clearAll() {
    setSelected(new Set());
  }

  function toggleCollapse(module: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSystem) {
      toast.error("System roles cannot be modified");
      return;
    }
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!code.trim()) {
      toast.error("Code is required");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        code: code.trim(),
        scope,
        applies_to_account_type: accountType || null,
        is_default: isDefault,
        description,
        permission_codes: Array.from(selected).sort(),
      } as Partial<RoleShape>);
      toast.success(mode === "edit" ? "Role updated" : "Role created");
    } catch (err) {
      const e = err as Error & { fields?: Record<string, string[]> };
      const msg =
        e.fields && Object.keys(e.fields).length
          ? `${Object.keys(e.fields)[0]}: ${Object.values(e.fields)[0]?.[0] ?? ""}`
          : e.message;
      toast.error("Couldn't save role", msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-navy/40 backdrop-blur-sm flex justify-end"
      onClick={(e) => e.stopPropagation()}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-3xl h-full overflow-hidden flex flex-col shadow-2xl shadow-navy/20 jmn-drawer-in"
      >
        <header className="px-6 py-5 border-b border-[var(--jmn-line)] flex items-start justify-between shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-1">
              {mode === "edit" ? "Edit role" : "New role"}
              {isSystem && (
                <span className="ml-2 text-rose-700 font-medium">
                  · Read-only system role
                </span>
              )}
            </p>
            <h2 className="font-display text-2xl text-navy truncate">
              {name || "Untitled role"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 grid place-items-center rounded-md hover:bg-[#F4F5F7] transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Identity */}
          <Section title="Identity">
            <Row>
              <Field label="Name" required>
                <input
                  value={name}
                  onChange={(e) => changeName(e.target.value)}
                  placeholder="Catalog manager"
                  disabled={isSystem}
                  className="role-input"
                />
              </Field>
              <Field
                label="Code"
                required
                hint="Stable identifier — auto-generated from the name."
              >
                <input
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setCodeTouched(true);
                  }}
                  placeholder="catalog_manager"
                  disabled={isSystem}
                  className="role-input tabular"
                />
              </Field>
            </Row>
            <Row>
              <Field label="Scope" required>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as RoleScope)}
                  disabled={isSystem}
                  className="role-input"
                >
                  {SCOPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Account type restriction"
                hint="Who this role can be assigned to."
              >
                <select
                  value={accountType ?? ""}
                  onChange={(e) =>
                    setAccountType(e.target.value as RoleAccountType)
                  }
                  disabled={isSystem}
                  className="role-input"
                >
                  {ACCOUNT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value ?? "any"} value={o.value ?? ""}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </Row>
            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSystem}
                rows={2}
                placeholder="What this role is for. Visible to other admins."
                className="role-input"
              />
            </Field>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                disabled={isSystem}
                className="h-4 w-4 accent-navy"
              />
              <span className="text-sm text-navy">
                Default for the chosen account type
              </span>
              <span className="text-[11px] text-ink/45">
                — auto-assigned to new users.
              </span>
            </label>
          </Section>

          {/* Permissions */}
          <Section
            title="Permissions"
            right={
              <span className="text-[11px] tracking-[0.18em] uppercase text-ink/55 tabular">
                {selectedCount} of {totalAvailable} selected
              </span>
            }
          >
            {/* Search + bulk toggles */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[180px] flex items-center gap-2 h-9 px-3 bg-[#FAFAFA] rounded-md">
                <Search size={14} className="text-ink/45" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search permissions by name, code, or module…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink/40"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-ink/45 hover:text-navy"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={selectAll}
                disabled={isSystem}
                className="h-9 px-3 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-navy hover:bg-[#FAFAFA] disabled:opacity-40"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={isSystem || selectedCount === 0}
                className="h-9 px-3 rounded-md text-[11px] tracking-[0.18em] uppercase text-ink/55 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-40 inline-flex items-center gap-1.5"
              >
                <RotateCcw size={12} />
                Clear
              </button>
            </div>

            {groupsError && (
              <p className="text-sm text-rose-700">{groupsError}</p>
            )}
            {!groups && !groupsError && (
              <div className="grid place-items-center py-10">
                <Loader2 size={18} className="text-navy/60 animate-spin" />
              </div>
            )}

            {groups && filtered.length === 0 && (
              <div className="px-4 py-10 text-center rounded-md border border-dashed border-[var(--jmn-line)]">
                <p className="text-sm text-ink/55">
                  No permissions match &quot;{search}&quot;.
                </p>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="space-y-3">
                {filtered.map((g) => (
                  <PermissionGroup
                    key={g.module}
                    group={g}
                    selected={selected}
                    onTogglePermission={toggle}
                    onToggleGroup={(c) => toggleGroup(g, c)}
                    collapsed={collapsed.has(g.module)}
                    onToggleCollapse={() => toggleCollapse(g.module)}
                    disabled={isSystem}
                    highlight={search}
                  />
                ))}
              </div>
            )}
          </Section>
        </div>

        <footer className="px-6 py-4 border-t border-[var(--jmn-line)] flex items-center justify-between gap-3 shrink-0 bg-[#FAFAFA]">
          <span className="text-[11px] tracking-[0.18em] uppercase text-ink/55">
            <Shield size={11} className="inline mr-1.5 text-ink/45" />
            {selectedCount} permission{selectedCount === 1 ? "" : "s"} granted
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isSystem}
              className="h-9 px-4 rounded-md bg-navy text-cream text-[11px] tracking-[0.18em] uppercase hover:opacity-90 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              {mode === "edit" ? "Save changes" : "Create role"}
            </button>
          </div>
        </footer>

        <style jsx global>{`
          .role-input {
            width: 100%;
            min-height: 38px;
            padding: 8px 12px;
            border: 1px solid var(--jmn-line);
            border-radius: 6px;
            background: white;
            font-size: 14px;
            color: var(--jmn-ink, #0a0a0a);
          }
          .role-input:focus {
            outline: none;
            border-color: var(--jmn-navy, #0e1a3a);
            box-shadow: 0 0 0 3px rgba(14, 26, 58, 0.08);
          }
          .role-input:disabled {
            background: #f4f5f7;
            color: #65676b;
            cursor: not-allowed;
          }
          textarea.role-input {
            min-height: 64px;
            line-height: 1.45;
            font-family: inherit;
          }
        `}</style>
      </form>
    </div>
  );
}

// ── Permission group card ──────────────────────────────────────────────────

function PermissionGroup({
  group,
  selected,
  onTogglePermission,
  onToggleGroup,
  collapsed,
  onToggleCollapse,
  disabled,
  highlight,
}: {
  group: PermissionGroupShape;
  selected: Set<string>;
  onTogglePermission: (code: string) => void;
  onToggleGroup: (allChecked: boolean) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  disabled: boolean;
  highlight: string;
}) {
  const total = group.permissions.length;
  const count = group.permissions.filter((p) => selected.has(p.code)).length;
  const allChecked = count === total && total > 0;
  const someChecked = count > 0 && count < total;

  return (
    <section className="border border-[var(--jmn-line)] rounded-lg overflow-hidden">
      <header className="bg-[#FAFAFA] px-4 py-2.5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center gap-2 text-left min-w-0"
        >
          {collapsed ? (
            <ChevronRight size={14} className="text-ink/55 shrink-0" />
          ) : (
            <ChevronDown size={14} className="text-ink/55 shrink-0" />
          )}
          <h3 className="text-sm font-medium text-navy truncate">
            {group.label}
          </h3>
          <span className="text-[10px] tracking-[0.18em] uppercase text-ink/55 tabular">
            {count}/{total}
          </span>
        </button>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none shrink-0">
          <span className="text-[11px] tracking-[0.18em] uppercase text-ink/55">
            All
          </span>
          <input
            type="checkbox"
            checked={allChecked}
            ref={(el) => {
              if (el) el.indeterminate = someChecked;
            }}
            onChange={(e) => onToggleGroup(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 accent-navy"
          />
        </label>
      </header>

      {!collapsed && (
        <ul className="divide-y divide-[var(--jmn-line)]">
          {group.permissions.map((p) => {
            const checked = selected.has(p.code);
            return (
              <li key={p.id}>
                <label
                  className={cn(
                    "flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                    checked ? "bg-amber-50/30" : "hover:bg-[#FAFAFA]",
                    disabled && "cursor-not-allowed opacity-70",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onTogglePermission(p.code)}
                    disabled={disabled}
                    className="h-4 w-4 mt-0.5 shrink-0 accent-navy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-navy leading-tight">
                      <Highlight text={p.name} term={highlight} />
                    </p>
                    {p.description && (
                      <p className="text-[12px] text-ink/55 mt-0.5 leading-snug">
                        <Highlight text={p.description} term={highlight} />
                      </p>
                    )}
                    <p className="text-[10px] tracking-[0.14em] uppercase text-ink/40 tabular mt-1">
                      <Highlight text={p.code} term={highlight} />
                    </p>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// Tiny inline highlight — wraps matches in a <mark>. Cheaper than installing
// a library and the term is always a single substring.
function Highlight({ text, term }: { text: string; term: string }): ReactNode {
  const q = term.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-gold/30 text-navy rounded px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

// ── Tiny layout helpers (local to this drawer) ─────────────────────────────

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-[10px] tracking-[0.3em] uppercase text-gold">
          {title}
        </h3>
        {right}
      </header>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3">{children}</div>;
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] tracking-[0.2em] uppercase text-ink/55 mb-1.5">
        {label}
        {required && <span className="text-rose-700"> *</span>}
      </span>
      {children}
      {hint && (
        <span className="block mt-1 text-[11px] text-ink/45">{hint}</span>
      )}
    </label>
  );
}
