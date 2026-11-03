"use client";

/**
 * Header notification bell.
 *
 *   - Polls `/notifications/inbox/unread_count/` every 30s for the badge.
 *   - Click opens a dropdown with the 10 most recent notifications.
 *   - Each row: event icon, subject, snippet, "X ago". Unread rows have a
 *     soft accent dot. Clicking a row marks it read and, if the notification
 *     payload includes a `reference_url`, navigates there.
 *   - Footer has "Mark all read" and a "See all" link to /admin/notifications.
 *
 * The dropdown lazily fetches the list the first time it opens, then refreshes
 * on each open after that — cheap and avoids polling the full list itself.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Megaphone,
  PackageMinus,
  PackagePlus,
  RefreshCw,
  ShoppingBag,
  Truck,
  Undo2,
  Wallet,
} from "lucide-react";
import {
  djangoAdmin,
  type NotificationShape,
  type PaginatedResponse,
} from "@/lib/django-admin";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;
const MAX_DROPDOWN_ROWS = 10;

/**
 * Map event codes to (icon, accent class) so each row has a recognisable
 * left-hand glyph. Unknown events fall back to a generic Bell.
 */
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
  const found = EVENT_ICON[event];
  return found ?? { icon: Bell, tone: "bg-ink/10 text-ink/60" };
}

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.floor((now - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [rows, setRows] = useState<NotificationShape[] | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ── Polling: cheap unread_count endpoint runs forever in the background.
  // State is only set in the promise callback so the effect can call this
  // without a synchronous setState (react-hooks/set-state-in-effect).
  const refreshCount = useCallback(
    () =>
      djangoAdmin.notifications.unreadCount().then(
        (data) => setUnread(data.count),
        () => {
          // Silent — a 401 on logout shouldn't spam the console.
        },
      ),
    [],
  );
  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(id);
  }, [refreshCount]);

  // ── Click-outside to close.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // ── Fetch the recent list on every open (and refresh count too).
  async function loadList() {
    setLoadingList(true);
    try {
      const data = await djangoAdmin.notifications.list({
        page_size: MAX_DROPDOWN_ROWS,
        ordering: "-queued_at",
      });
      const list =
        (data as PaginatedResponse<NotificationShape>).results ??
        (data as unknown as NotificationShape[]);
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }
  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      loadList();
      refreshCount();
    }
  }

  async function handleRowClick(n: NotificationShape) {
    if (!n.is_read) {
      // Optimistic update so the badge feels snappy.
      setRows((prev) =>
        (prev ?? []).map((r) => (r.id === n.id ? { ...r, is_read: true } : r)),
      );
      setUnread((c) => Math.max(0, c - 1));
      try {
        await djangoAdmin.notifications.markRead(n.id);
      } catch {
        // Revert if it failed.
        refreshCount();
      }
    }
    const target = typeof n.payload?.reference_url === "string" ? n.payload.reference_url : null;
    setOpen(false);
    if (target) router.push(target);
  }

  async function markAll() {
    if (unread === 0) return;
    setMarkingAll(true);
    try {
      await djangoAdmin.notifications.markAllRead();
      setRows((prev) => (prev ?? []).map((r) => ({ ...r, is_read: true })));
      setUnread(0);
    } catch {
      refreshCount();
    } finally {
      setMarkingAll(false);
    }
  }

  const badgeText = useMemo(() => {
    if (unread <= 0) return null;
    if (unread > 99) return "99+";
    return String(unread);
  }, [unread]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Notifications"
        aria-expanded={open}
        className={cn(
          "relative h-9 w-9 grid place-items-center rounded-md transition-colors",
          open
            ? "bg-navy/5 text-navy"
            : "text-ink/55 hover:text-navy hover:bg-[#F4F5F7]",
        )}
      >
        {unread > 0 ? <BellRing size={17} /> : <Bell size={17} />}
        {badgeText && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center",
              "rounded-full bg-rose-600 text-white text-[10px] font-medium tabular shadow",
            )}
          >
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-[380px] max-w-[90vw] bg-white rounded-lg border border-[var(--jmn-line)] shadow-xl overflow-hidden z-30">
          <header className="px-4 py-3 border-b border-[var(--jmn-line)] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-navy">Notifications</h3>
              <p className="text-[11px] text-ink/55">
                {unread > 0 ? `${unread} unread` : "All caught up"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={loadList}
                disabled={loadingList}
                title="Refresh"
                aria-label="Refresh"
                className="h-7 w-7 grid place-items-center rounded-md text-ink/55 hover:text-navy hover:bg-[#F4F5F7] disabled:opacity-50"
              >
                <RefreshCw
                  size={13}
                  className={loadingList ? "animate-spin" : ""}
                />
              </button>
              <button
                type="button"
                onClick={markAll}
                disabled={markingAll || unread === 0}
                className="text-[10px] tracking-[0.18em] uppercase text-navy hover:underline disabled:opacity-40 disabled:no-underline px-2 h-7"
              >
                {markingAll ? "…" : "Mark all read"}
              </button>
            </div>
          </header>

          <div className="max-h-[420px] overflow-y-auto">
            {loadingList && !rows && (
              <div className="grid place-items-center py-10">
                <Loader2 size={18} className="text-navy/60 animate-spin" />
              </div>
            )}
            {rows && rows.length === 0 && (
              <div className="px-6 py-10 text-center">
                <Bell size={20} className="text-ink/30 mx-auto mb-2" />
                <p className="text-sm text-ink/55">No notifications yet.</p>
              </div>
            )}
            {rows && rows.length > 0 && (
              <ul className="divide-y divide-[var(--jmn-line)]">
                {rows.map((n) => (
                  <BellRow key={n.id} notif={n} onClick={() => handleRowClick(n)} />
                ))}
              </ul>
            )}
          </div>

          <footer className="px-4 py-2.5 bg-[#FAFAFA] border-t border-[var(--jmn-line)] flex items-center justify-between">
            <span className="text-[11px] text-ink/45">
              Updates every {Math.round(POLL_MS / 1000)}s
            </span>
            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="text-[11px] tracking-[0.18em] uppercase text-navy hover:underline flex items-center gap-1"
            >
              See all
              <ChevronRight size={11} />
            </Link>
          </footer>
        </div>
      )}
    </div>
  );
}

function BellRow({
  notif,
  onClick,
}: {
  notif: NotificationShape;
  onClick: () => void;
}) {
  const { icon: Icon, tone } = eventBadge(notif.event);
  const snippet =
    (notif.body || "").length > 110
      ? notif.body.slice(0, 110).trim() + "…"
      : notif.body;
  const isClickable =
    typeof notif.payload?.reference_url === "string" && notif.payload.reference_url;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full text-left px-3 py-3 flex items-start gap-3 transition-colors",
          notif.is_read ? "bg-white" : "bg-amber-50/40",
          isClickable ? "hover:bg-[#FAFAFA] cursor-pointer" : "hover:bg-[#FAFAFA]",
        )}
      >
        <span
          className={cn(
            "shrink-0 h-9 w-9 grid place-items-center rounded-full",
            tone,
          )}
        >
          <Icon size={15} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm leading-tight truncate",
                notif.is_read ? "text-ink/75" : "text-navy font-medium",
              )}
            >
              {notif.subject || notif.event_label || notif.event}
            </p>
            {!notif.is_read && (
              <span className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-gold" />
            )}
          </div>
          {snippet && (
            <p className="text-[12px] text-ink/55 mt-0.5 leading-snug line-clamp-2">
              {snippet}
            </p>
          )}
          <p className="text-[10px] tracking-[0.14em] uppercase text-ink/40 tabular mt-1">
            {timeAgo(notif.queued_at)} · {notif.event_label || notif.event}
          </p>
        </div>
      </button>
    </li>
  );
}

