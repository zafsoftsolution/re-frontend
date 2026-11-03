"use client";

/**
 * Global feedback layer — toasts + confirm dialogs.
 *
 *   const toast = useToast();
 *   toast.success("Saved");
 *   toast.error("Couldn't save", "Please try again.");
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Delete this product?", tone: "danger" }))) return;
 *
 * Implementation: a single context owns the toast queue and the (single)
 * confirm modal. `useConfirm()` returns a Promise that resolves true/false
 * when the user picks an action — no callback hell, plays nicely with
 * `async`/`await`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type ToastTone = "success" | "error" | "info";

interface ToastEntry {
  id: string;
  tone: ToastTone;
  message: string;
  description?: string;
  duration: number;
}

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" → rose accent + "Delete" default label. */
  tone?: "default" | "danger";
}

interface FeedbackCtxValue {
  push: (e: Omit<ToastEntry, "id" | "duration"> & { duration?: number }) => string;
  dismiss: (id: string) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<FeedbackCtxValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [confirmState, setConfirmState] = useState<{
    opts: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback<FeedbackCtxValue["push"]>(
    (e) => {
      const id = Math.random().toString(36).slice(2, 10);
      const entry: ToastEntry = {
        id,
        duration: e.duration ?? (e.tone === "error" ? 6000 : 4000),
        tone: e.tone,
        message: e.message,
        description: e.description,
      };
      setToasts((prev) => [...prev, entry]);
      if (entry.duration > 0) {
        setTimeout(() => dismiss(id), entry.duration);
      }
      return id;
    },
    [dismiss],
  );

  const confirm = useCallback<FeedbackCtxValue["confirm"]>((opts) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ opts, resolve });
    });
  }, []);

  const value = useMemo(
    () => ({ push, dismiss, confirm }),
    [push, dismiss, confirm],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismiss} />
      {confirmState && (
        <ConfirmDialog
          opts={confirmState.opts}
          onClose={(result) => {
            confirmState.resolve(result);
            setConfirmState(null);
          }}
        />
      )}
    </Ctx.Provider>
  );
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

function useFeedback(): FeedbackCtxValue {
  const c = useContext(Ctx);
  if (!c) {
    throw new Error(
      "useToast / useConfirm must be used inside <FeedbackProvider>.",
    );
  }
  return c;
}

/**
 * `toast.success(msg)`, `toast.error(msg, desc?)`, `toast.info(msg)`,
 * `toast.dismiss(id)`. Errors stay visible 6s by default; everything else 4s.
 */
export function useToast() {
  const { push, dismiss } = useFeedback();
  return useMemo(
    () => ({
      success: (message: string, description?: string) =>
        push({ tone: "success", message, description }),
      error: (message: string, description?: string) =>
        push({ tone: "error", message, description }),
      info: (message: string, description?: string) =>
        push({ tone: "info", message, description }),
      dismiss,
    }),
    [push, dismiss],
  );
}

/**
 * `await confirm({ title, description?, tone?, confirmLabel? })` → resolves
 * true when the user confirms, false on cancel/backdrop/Escape.
 */
export function useConfirm() {
  const { confirm } = useFeedback();
  return confirm;
}

// ─── Toast host ─────────────────────────────────────────────────────────────

const TONE_STYLES: Record<
  ToastTone,
  { bg: string; ring: string; text: string; icon: string }
> = {
  success: {
    bg: "bg-emerald-50",
    ring: "ring-emerald-200",
    text: "text-emerald-900",
    icon: "text-emerald-700",
  },
  error: {
    bg: "bg-rose-50",
    ring: "ring-rose-200",
    text: "text-rose-900",
    icon: "text-rose-700",
  },
  info: {
    bg: "bg-blue-50",
    ring: "ring-blue-200",
    text: "text-blue-900",
    icon: "text-blue-700",
  },
};

function ToastHost({
  toasts,
  onDismiss,
}: {
  toasts: ToastEntry[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-0 z-[200] flex flex-col items-end justify-end gap-2 p-4 sm:p-6"
    >
      {toasts.map((t) => {
        const styles = TONE_STYLES[t.tone];
        const Icon =
          t.tone === "success"
            ? CheckCircle2
            : t.tone === "error"
            ? AlertTriangle
            : Info;
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto w-full sm:w-96 rounded-md ring-1 shadow-lg px-4 py-3 flex items-start gap-3 jmn-toast-in",
              styles.bg,
              styles.ring,
              styles.text,
            )}
          >
            <Icon size={18} className={cn("shrink-0 mt-0.5", styles.icon)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug">{t.message}</p>
              {t.description && (
                <p className="mt-0.5 text-xs opacity-80 leading-snug">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="shrink-0 -mr-1 p-1 rounded hover:bg-black/5 transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
      <style jsx global>{`
        @keyframes jmn-toast-in {
          from {
            transform: translate(8px, 8px);
            opacity: 0;
          }
          to {
            transform: translate(0, 0);
            opacity: 1;
          }
        }
        .jmn-toast-in {
          animation: jmn-toast-in 220ms cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </div>
  );
}

// ─── Confirm dialog ─────────────────────────────────────────────────────────

function ConfirmDialog({
  opts,
  onClose,
}: {
  opts: ConfirmOptions;
  onClose: (result: boolean) => void;
}) {
  const danger = opts.tone === "danger";

  // Escape key cancels.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose(false);
      if (e.key === "Enter") onClose(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[210] bg-navy/40 backdrop-blur-sm grid place-items-center p-4 jmn-toast-in"
      onClick={() => onClose(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-lg shadow-xl ring-1 ring-black/5"
      >
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 h-9 w-9 rounded-full grid place-items-center ring-1 shrink-0",
                danger
                  ? "bg-rose-50 text-rose-700 ring-rose-200"
                  : "bg-blue-50 text-blue-700 ring-blue-200",
              )}
            >
              {danger ? <AlertTriangle size={18} /> : <Info size={18} />}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-navy">{opts.title}</h3>
              {opts.description && (
                <p className="mt-1 text-sm text-ink/70 leading-snug">
                  {opts.description}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="px-5 py-3 bg-[#FAFAFA] border-t border-[var(--jmn-line)] flex justify-end gap-2 rounded-b-lg">
          <button
            onClick={() => onClose(false)}
            className="h-9 px-4 rounded-md text-sm border border-[var(--jmn-line)] hover:bg-white text-ink/75"
          >
            {opts.cancelLabel ?? "Cancel"}
          </button>
          <button
            autoFocus
            onClick={() => onClose(true)}
            className={cn(
              "h-9 px-4 rounded-md text-sm font-medium text-white",
              danger ? "bg-rose-600 hover:bg-rose-700" : "bg-navy hover:opacity-90",
            )}
          >
            {opts.confirmLabel ?? (danger ? "Delete" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
