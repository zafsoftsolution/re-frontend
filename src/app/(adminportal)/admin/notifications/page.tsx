"use client";

/**
 * Notifications inbox — the full version of what the header bell shows.
 *
 *   - Filter tabs: All / Unread / Read
 *   - Event-type dropdown (cosmetic filter)
 *   - Search box (client-side over subject + body)
 *   - List view with the same row shape as the bell dropdown
 *   - Pagination via "Load more"
 *   - Bulk mark-all-read + per-row mark-read + per-row delete
 *
 * Same endpoint as the bell — `/notifications/inbox/` — just with bigger
 * page size and richer UI.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Loader2,
  Megaphone,
  PackageMinus,
  PackagePlus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
  Undo2,
  Wallet,
  X,
} from "lucide-react";
import {
  djangoAdmin,
  type NotificationEventCode,
  type NotificationShape,
  type PaginatedResponse,
} from "@/lib/django-admin";
import { useConfirm, useToast } from "@/context/FeedbackContext";
import PageHeader from "@/components/admin/PageHeader";
import { cn } from "@/lib/utils";

type Tab = "all" | "unread" | "read";

const TAB_LABEL: Record<Tab, string> = {
  all: "All",
  unread: "Unread",
  read: "Read",
};

const EVENT_ICON: Record<
  string,
  { icon: React.ComponentType<{ size?: number; className?: string }>; tone: string }
> = {
  "order.placed": { icon: ShoppingBag, tone: "bg-navy/10 text-navy" },
  "order.paid": { icon: Wallet, tone: "bg-emerald-100 text-emerald-700" },
  "order.shipped": { icon: Truck, tone: "bg-blue-100 text-blue-700" },
  "order.delivered": { icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-700" },
  "order.cancelled": { icon: AlertCircle, tone: "bg-rose-100 text-rose-700" },
  "order.refunded": { icon: Undo2, tone: "bg-amber-100 text-amber-800" },
  "stock.low": { icon: PackageMinus, tone: "bg-amber-100 text-amber-800" },
  "stock.out": { icon: PackageMinus, tone: "bg-rose-100 text-rose-700" },
  "stock.back_in_stock": { icon: PackagePlus, tone: "bg-emerald-100 text-emerald-700" },
  "system.announcement": { icon: Megaphone, tone: "bg-gold/20 text-gold" },
};
function eventBadge(event: string) {
  return EVENT_ICON[event] ?? { icon: Bell, tone: "bg-ink/10 text-ink/60" };
}
function timeAgo(iso: string) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 7 * 86400) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

const PAGE_SIZE = 25;

export default function NotificationsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  const [rows, setRows] = useState<NotificationShape[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<NotificationEventCode | "">("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [error, setError] = useState<string | null>(null);

  // State is only set in promise callbacks so effects can call this without
  // a synchronous setState (react-hooks/set-state-in-effect).
  const load = useCallback(
    (resetPage = false) => {
      const targetPage = resetPage ? 1 : page;
      return djangoAdmin.notifications
        .list({
          page: targetPage,
          page_size: PAGE_SIZE,
          event: eventFilter || undefined,
          ordering: "-queued_at",
        })
        .then(
          (data) => {
            setError(null);
            const next = (data as PaginatedResponse<NotificationShape>).results ?? [];
            setRows((prev) => (resetPage || targetPage === 1 ? next : [...prev, ...next]));
            setTotal((data as PaginatedResponse<NotificationShape>).count ?? next.length);
            setHasMore(!!(data as PaginatedResponse<NotificationShape>).next);
            if (resetPage) setPage(1);
          },
          (e) => setError((e as Error).message),
        )
        .finally(() => setLoading(false));
    },
    [page, eventFilter],
  );

  // Re-load whenever the event filter changes (resets to page 1). The
  // filter's onChange flips `loading` on.
  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventFilter]);

  // Keep the badge in sync with the page.
  const refreshUnread = useCallback(
    () =>
      djangoAdmin.notifications.unreadCount().then(
        (data) => setUnreadCount(data.count),
        () => {
          /* ignore */
        },
      ),
    [],
  );
  useEffect(() => {
    refreshUnread();
  }, [refreshUnread, rows]);

  // Client-side search + tab filter.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (tab === "unread") list = list.filter((n) => !n.is_read);
    if (tab === "read") list = list.filter((n) => n.is_read);
    if (q) {
      list = list.filter(
        (n) =>
          n.subject.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          n.event.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, tab, search]);

  // Distinct event types in the current row set — drives the filter dropdown.
  const eventOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.event));
    return Array.from(set).sort();
  }, [rows]);

  async function markRead(n: NotificationShape) {
    if (n.is_read) return;
    setRows((prev) =>
      prev.map((r) => (r.id === n.id ? { ...r, is_read: true } : r)),
    );
    try {
      await djangoAdmin.notifications.markRead(n.id);
    } catch {
      refreshUnread();
    }
  }

  async function handleClick(n: NotificationShape) {
    await markRead(n);
    const ref = typeof n.payload?.reference_url === "string" ? n.payload.reference_url : null;
    if (ref) router.push(ref);
  }

  async function destroy(n: NotificationShape) {
    const ok = await confirm({
      title: "Delete this notification?",
      description: "This removes it from your inbox only.",
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setRows((prev) => prev.filter((r) => r.id !== n.id));
    try {
      await djangoAdmin.notifications.delete(n.id);
    } catch (e) {
      toast.error("Couldn't delete", (e as Error).message);
      // Re-fetch to recover state.
      await load(true);
    }
  }

  async function markAllRead() {
    try {
      await djangoAdmin.notifications.markAllRead();
      setRows((prev) => prev.map((r) => ({ ...r, is_read: true })));
      setUnreadCount(0);
      toast.success("Marked all as read");
    } catch (e) {
      toast.error("Couldn't mark all read", (e as Error).message);
    }
  }

  async function loadMore() {
    setPage((p) => p + 1);
    // page state update triggers a re-render; we manually fire the next load
    // here so we don't have to wait for an effect.
    setLoading(true);
    try {
      const next = page + 1;
      const data = await djangoAdmin.notifications.list({
        page: next,
        page_size: PAGE_SIZE,
        event: eventFilter || undefined,
        ordering: "-queued_at",
      });
      const list = (data as PaginatedResponse<NotificationShape>).results ?? [];
      setRows((prev) => [...prev, ...list]);
      setHasMore(!!(data as PaginatedResponse<NotificationShape>).next);
    } catch (e) {
      toast.error("Couldn't load more", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (error && rows.length === 0) {
    return (
      <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description={`${total} total · ${unreadCount} unread`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="h-9 px-3 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              <CheckCircle2 size={13} />
              Mark all read
            </button>
            <button
              type="button"
              onClick={async () => {
                setRefreshing(true);
                await load(true);
                await refreshUnread();
                setRefreshing(false);
              }}
              disabled={refreshing}
              className="h-9 px-3 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Filters */}
      <section className="bg-white border border-[var(--jmn-line)] rounded-lg p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-[#FAFAFA] rounded-md p-1">
          {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 h-8 rounded text-[11px] tracking-[0.18em] uppercase transition-colors flex items-center gap-1.5",
                tab === t
                  ? "bg-white text-navy shadow-sm"
                  : "text-ink/55 hover:text-navy",
              )}
            >
              {TAB_LABEL[t]}
              {t === "unread" && unreadCount > 0 && (
                <span className="text-[10px] tabular bg-rose-600 text-white px-1.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-[180px] flex items-center gap-2 h-9 px-3 bg-[#FAFAFA] rounded-md">
          <Search size={14} className="text-ink/45" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject or body…"
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

        <select
          value={eventFilter}
          onChange={(e) => {
            setLoading(true);
            setEventFilter(e.target.value as NotificationEventCode);
          }}
          className="h-9 px-3 rounded-md bg-[#FAFAFA] text-sm text-navy outline-none"
        >
          <option value="">All events</option>
          {eventOptions.map((ev) => (
            <option key={ev} value={ev}>
              {ev.replace(/[._]/g, " ")}
            </option>
          ))}
        </select>
      </section>

      {/* List */}
      {loading && rows.length === 0 ? (
        <div className="grid place-items-center py-20">
          <Loader2 size={22} className="text-navy/60 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[var(--jmn-line)] rounded-lg px-6 py-16 text-center">
          <Bell size={22} className="mx-auto text-ink/30 mb-2" />
          <p className="text-sm text-ink/55">
            {rows.length === 0
              ? "You have no notifications yet."
              : "No notifications match this filter."}
          </p>
        </div>
      ) : (
        <section className="bg-white border border-[var(--jmn-line)] rounded-lg overflow-hidden">
          <ul className="divide-y divide-[var(--jmn-line)]">
            {filtered.map((n) => (
              <Row
                key={n.id}
                notif={n}
                onClick={() => handleClick(n)}
                onMarkRead={() => markRead(n)}
                onDelete={() => destroy(n)}
              />
            ))}
          </ul>
        </section>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="h-9 px-4 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : null}
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

function Row({
  notif,
  onClick,
  onMarkRead,
  onDelete,
}: {
  notif: NotificationShape;
  onClick: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const { icon: Icon, tone } = eventBadge(notif.event);
  const refUrl =
    typeof notif.payload?.reference_url === "string" ? notif.payload.reference_url : null;
  return (
    <li
      className={cn(
        "px-5 py-4 flex items-start gap-3 transition-colors group",
        notif.is_read ? "bg-white hover:bg-[#FAFAFA]" : "bg-amber-50/40 hover:bg-amber-50/60",
      )}
    >
      <span
        className={cn(
          "shrink-0 h-10 w-10 grid place-items-center rounded-full",
          tone,
        )}
      >
        <Icon size={17} />
      </span>
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              "text-sm leading-tight",
              notif.is_read ? "text-ink/75" : "text-navy font-medium",
            )}
          >
            {notif.subject || notif.event_label || notif.event}
          </p>
          {!notif.is_read && (
            <span className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-gold" />
          )}
        </div>
        {notif.body && (
          <p className="text-[13px] text-ink/65 mt-1 leading-snug line-clamp-2">
            {notif.body}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2 text-[10px] tracking-[0.14em] uppercase text-ink/45 tabular">
          <span>{timeAgo(notif.queued_at)}</span>
          <span>·</span>
          <span>{notif.event_label || notif.event}</span>
          {refUrl && (
            <>
              <span>·</span>
              <Link
                href={refUrl}
                onClick={(e) => e.stopPropagation()}
                className="text-navy hover:underline normal-case tracking-normal lowercase font-medium"
              >
                {refUrl}
              </Link>
            </>
          )}
        </div>
      </button>
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notif.is_read && (
          <button
            type="button"
            onClick={onMarkRead}
            title="Mark as read"
            aria-label="Mark as read"
            className="h-8 w-8 grid place-items-center rounded text-ink/55 hover:text-emerald-700 hover:bg-emerald-50"
          >
            <CheckCircle2 size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          aria-label="Delete"
          className="h-8 w-8 grid place-items-center rounded text-ink/55 hover:text-rose-700 hover:bg-rose-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}
