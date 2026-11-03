import type { QuoteStatus } from "@/lib/django-admin";
import { QUOTE_STATUS_LABEL, QUOTE_STATUS_TONE } from "@/lib/admin/quotes";
import { cn } from "@/lib/utils";

export default function QuoteStatusPill({
  status,
  className,
}: {
  status: QuoteStatus;
  className?: string;
}) {
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center whitespace-nowrap text-[10px] font-semibold tracking-[0.14em] uppercase px-2 py-0.5 rounded-sm ring-1",
        QUOTE_STATUS_TONE[status] ?? QUOTE_STATUS_TONE.cancelled,
        className,
      )}
    >
      {QUOTE_STATUS_LABEL[status] ?? status}
    </span>
  );
}
