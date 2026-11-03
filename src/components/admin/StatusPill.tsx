import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  // Order statuses
  pending_payment: "bg-amber-50 text-amber-700 ring-amber-200",
  processing: "bg-blue-50 text-blue-700 ring-blue-200",
  ready_to_ship: "bg-blue-50 text-blue-700 ring-blue-200",
  shipped: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  out_for_delivery: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  returned: "bg-rose-50 text-rose-700 ring-rose-200",
  refunded: "bg-rose-50 text-rose-700 ring-rose-200",

  // Product statuses
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  draft: "bg-ink/5 text-ink/60 ring-ink/15",
  archived: "bg-ink/5 text-ink/45 ring-ink/15",

  // Loyalty
  silver: "bg-ink/5 text-ink/65 ring-ink/15",
  gold: "bg-amber-50 text-amber-700 ring-amber-200",
  platinum: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  obsidian: "bg-navy/10 text-navy ring-navy/20",
};

interface Props {
  status: string;
  className?: string;
}

export default function StatusPill({ status, className }: Props) {
  const tone = TONES[status] ?? "bg-ink/5 text-ink/65 ring-ink/15";
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full ring-1",
        tone,
        className
      )}
    >
      {label}
    </span>
  );
}
