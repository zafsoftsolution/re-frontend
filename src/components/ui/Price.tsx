import { useTranslations } from "next-intl";
import { formatBDT } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Price in ৳ with Latin digits in mono (also in the bn UI). Quote-first: when
 * `amount` is null (the default for every part unless its sales mode is
 * "direct") it renders the localized "Price on request" — never a fake 0.
 */
export function Price({
  amount,
  compareAt,
  size = "md",
  className,
}: {
  amount: number | null;
  compareAt?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const t = useTranslations("ui");
  if (amount === null) {
    return (
      <span className={cn("text-[0.875rem] font-medium text-re-steel-600", className)}>
        {t("priceOnRequest")}
      </span>
    );
  }
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span translate="no" className={cn("re-mono font-semibold text-re-ink", text)}>
        {formatBDT(amount)}
      </span>
      {compareAt != null && compareAt > amount && (
        <s translate="no" className="re-mono text-sm text-re-steel-600">
          {formatBDT(compareAt)}
        </s>
      )}
    </span>
  );
}
