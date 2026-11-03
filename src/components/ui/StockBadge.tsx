import { Ban, CircleCheck, CircleX, Clock, TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Availability } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const STYLE: Record<Availability, { icon: LucideIcon; className: string }> = {
  in_stock: { icon: CircleCheck, className: "text-re-stock-in" },
  low_stock: { icon: TriangleAlert, className: "bg-re-stock-low-bg text-re-stock-low px-1.5" },
  out_of_stock: { icon: CircleX, className: "text-re-stock-out" },
  on_request: { icon: Clock, className: "text-re-blue" },
  discontinued: { icon: Ban, className: "text-re-stock-out line-through decoration-1" },
};

/** Stock state = colour + icon + text, never colour alone. */
export function StockBadge({
  availability,
  qty,
  className,
}: {
  availability: Availability;
  /** Optional exact quantity, shown in mono after the label. */
  qty?: number;
  className?: string;
}) {
  const t = useTranslations("ui.stock");
  const { icon: Icon, className: tone } = STYLE[availability];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-re-sm py-0.5 text-[0.8125rem] font-semibold leading-tight",
        tone,
        className,
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0" strokeWidth={2} />
      <span>{t(availability)}</span>
      {qty !== undefined && availability !== "out_of_stock" && availability !== "discontinued" && (
        <span className="re-mono font-normal opacity-80">· {qty}</span>
      )}
    </span>
  );
}
