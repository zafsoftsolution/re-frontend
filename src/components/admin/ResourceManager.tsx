"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import PageHeader from "./PageHeader";
import DataTable, { type Column } from "./DataTable";
import ResourceForm, { hasDraft, type FormField } from "./ResourceForm";
import { useConfirm, useToast } from "@/context/FeedbackContext";

/**
 * Generic admin CRUD page.
 *
 * Plug a Django REST resource client + column + field config in, get a
 * list view + create/edit drawer + delete with confirmation. The drawer
 * surfaces field-level errors returned by the server (DRF returns
 * `{field: ["msg"]}` shapes).
 */

export interface CrudClient<T> {
  list(query?: Record<string, unknown>): Promise<{ count: number; results: T[] } | T[]>;
  get?(key: string): Promise<T>;
  create?(data: Partial<T>): Promise<T>;
  update?(key: string, data: Partial<T>): Promise<T>;
  delete?(key: string): Promise<void>;
}

interface Props<T> {
  eyebrow?: string;
  title: string;
  /** Singular noun used on the "New X" button. Defaults to title without trailing s. */
  singular?: string;
  description?: string;
  client: CrudClient<T>;
  rowKey: (row: T) => string;
  rowLabel?: (row: T) => string;
  columns: Column<T>[];
  /** Omit to render a read-only list (no New button, no edit drawer). */
  fields?: FormField[];
  initialValues?: Partial<T>;
  searchPlaceholder?: string;
  searchAccessor?: (row: T) => string;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Shown under the empty state when the table has no rows at all — e.g. a
   *  "Load standard list" button. Gets `refresh` to reload after it runs. */
  emptyAction?: (refresh: () => Promise<void>) => ReactNode;
  /** Called after a successful create / edit (e.g. to refresh suggestions). */
  onSaved?: () => void;
  /** Renders inside the row-actions cell, ahead of Edit/Delete. */
  customActions?: (row: T, refresh: () => Promise<void>) => ReactNode;
  /**
   * Extra buttons shown in the page-header action row, between Refresh and
   * the New button. Used for Export CSV, Bulk import, etc. Receives the
   * current row set so callers can decide whether to disable / hide.
   */
  extraActions?: (rows: T[] | null, refresh: () => Promise<void>) => ReactNode;
  /** Filter chip tabs above the table. */
  tabs?: Array<{ key: string; label: string; predicate: (row: T) => boolean }>;
  /**
   * Override the default ResourceForm drawer with a custom editor.
   * Useful for bespoke flows like the homepage manager that needs a live
   * preview pane next to the form.
   */
  renderForm?: (props: {
    mode: "create" | "edit";
    initial: T | undefined;
    onClose: () => void;
    onSubmit: (data: Partial<T>) => Promise<void>;
  }) => ReactNode;
}

export default function ResourceManager<T extends Record<string, unknown>>({
  eyebrow,
  title,
  singular,
  description,
  client,
  rowKey,
  rowLabel,
  columns,
  fields,
  initialValues,
  searchPlaceholder,
  searchAccessor,
  pageSize = 12,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onSaved,
  customActions,
  extraActions,
  tabs,
  renderForm,
}: Props<T>) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(tabs?.[0]?.key ?? "all");
  const confirm = useConfirm();
  const toast = useToast();

  // Stable per-resource key used to namespace localStorage drafts. Two
  // forms can be open in two tabs (e.g. Products + Suppliers) without
  // colliding because the title segment differs.
  const draftKeyBase = useMemo(
    () => (singular ?? title).toLowerCase().replace(/[^a-z0-9]+/g, "_"),
    [singular, title],
  );

  // On the initial load (and whenever the client changes), restore an
  // in-progress draft if there is one. This makes a refresh during editing
  // non-destructive: the modal pops back open with the typed values. Manual
  // reloads skip it — the modal clears its draft on close anyway.
  const restoreDraft = useCallback(
    (items: T[]) => {
      // Look for a "create" draft first (no suffix), then any "edit:<id>".
      if (hasDraft(`${draftKeyBase}:create`)) {
        setCreating(true);
        return;
      }
      for (const row of items) {
        const key = `${draftKeyBase}:edit:${rowKey(row)}`;
        if (hasDraft(key)) {
          setEditing(row);
          return;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draftKeyBase],
  );

  // State is only set in promise callbacks so the effect can call this
  // without a synchronous setState (react-hooks/set-state-in-effect).
  const fetchRows = useCallback(
    (restore: boolean) =>
      client.list().then(
        (data) => {
          const items = Array.isArray(data) ? data : data.results;
          setError(null);
          setRows(items);
          if (restore) restoreDraft(items);
        },
        (e) => setError((e as Error).message),
      ),
    [client, restoreDraft],
  );
  const load = useCallback(() => fetchRows(false), [fetchRows]);

  useEffect(() => {
    fetchRows(true);
  }, [fetchRows]);

  const canCreate = (!!fields || !!renderForm) && !!client.create;
  const canEdit = (!!fields || !!renderForm) && !!client.update;
  const canDelete = !!client.delete;

  const filtered = (() => {
    if (!rows) return [];
    if (!tabs) return rows;
    const tab = tabs.find((t) => t.key === activeTab);
    return tab ? rows.filter(tab.predicate) : rows;
  })();

  const cols: Column<T>[] = [...columns];
  if (canEdit || canDelete || customActions) {
    cols.push({
      key: "_actions",
      header: "",
      align: "right",
      render: (row) => (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex justify-end gap-1"
        >
          {customActions?.(row, load)}
          {canEdit && (
            <button
              onClick={() => setEditing(row)}
              className="text-[11px] tracking-[0.18em] uppercase text-navy hover:text-gold transition-colors px-2 py-1"
            >
              Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={async () => {
                const label = rowLabel?.(row) ?? "this item";
                const ok = await confirm({
                  title: `Delete ${label}?`,
                  description: "This can't be undone.",
                  tone: "danger",
                  confirmLabel: "Delete",
                });
                if (!ok) return;
                try {
                  await client.delete!(rowKey(row));
                  await load();
                  toast.success(`${label} deleted`);
                } catch (e) {
                  toast.error("Couldn't delete", (e as Error).message);
                }
              }}
              className="text-[11px] tracking-[0.18em] uppercase text-rose-700 hover:text-rose-900 transition-colors px-2 py-1"
            >
              Delete
            </button>
          )}
        </div>
      ),
    });
  }

  if (error && !rows) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={eyebrow} title={title} description={description} />
        <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
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

  const newLabel = singular ?? title.toLowerCase().replace(/s$/, "");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              disabled={refreshing}
              className="h-9 px-3 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
            {extraActions?.(rows, load)}
            {canCreate && (
              <button
                onClick={() => setCreating(true)}
                className="h-9 px-4 rounded-md bg-navy text-cream text-[12px] tracking-[0.1em] uppercase hover:bg-navy-deep transition-colors flex items-center gap-2"
              >
                <Plus size={13} /> New {newLabel}
              </button>
            )}
          </div>
        }
      />

      {tabs && (
        <div className="flex flex-wrap gap-1 border-b border-[var(--jmn-line)]">
          {tabs.map((t) => {
            const isActive = activeTab === t.key;
            const count = rows.filter(t.predicate).length;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2.5 text-[12px] tracking-[0.15em] uppercase transition-colors border-b-2 -mb-px flex items-center gap-2 ${
                  isActive
                    ? "text-navy border-gold"
                    : "text-ink/55 border-transparent hover:text-navy"
                }`}
              >
                {t.label}
                <span
                  className={`text-[10px] tabular px-1.5 rounded-full ${
                    isActive ? "bg-gold/20 text-navy" : "bg-ink/5 text-ink/55"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <DataTable<T>
        rows={filtered}
        columns={cols}
        rowKey={rowKey}
        searchPlaceholder={searchPlaceholder}
        searchAccessor={searchAccessor}
        pageSize={pageSize}
        emptyTitle={emptyTitle ?? "Nothing here yet."}
        emptyDescription={emptyDescription}
        emptyAction={rows.length === 0 ? emptyAction?.(load) : undefined}
        onRowClick={canEdit ? setEditing : undefined}
      />

      {(creating || editing) &&
        (renderForm
          ? renderForm({
              mode: editing ? "edit" : "create",
              initial: editing ?? undefined,
              onClose: () => {
                setCreating(false);
                setEditing(null);
              },
              onSubmit: async (data) => {
                if (editing && client.update) {
                  await client.update(rowKey(editing), data);
                } else if (client.create) {
                  await client.create(data);
                }
                setCreating(false);
                setEditing(null);
                await load();
                onSaved?.();
              },
            })
          : fields && (
              <ResourceForm
                title={singular ?? title.replace(/s$/, "")}
                fields={fields}
                initialValues={
                  (editing as Record<string, unknown> | null) ??
                  (initialValues as Record<string, unknown> | undefined)
                }
                mode={editing ? "edit" : "create"}
                draftKey={
                  editing
                    ? `${draftKeyBase}:edit:${rowKey(editing)}`
                    : `${draftKeyBase}:create`
                }
                onClose={() => {
                  setCreating(false);
                  setEditing(null);
                }}
                onSubmit={async (data) => {
                  if (editing && client.update) {
                    await client.update(rowKey(editing), data as Partial<T>);
                  } else if (client.create) {
                    await client.create(data as Partial<T>);
                  }
                  setCreating(false);
                  setEditing(null);
                  await load();
                  onSaved?.();
                }}
              />
            ))}
    </div>
  );
}
