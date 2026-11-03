import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type PartGrade = "genuine" | "oem" | "compatible";

const TONE: Record<PartGrade, string> = {
  // Genuine = solid ink (the strongest claim), OEM = ink outline,
  // Compatible = quiet steel outline. Red is reserved for CTAs.
  genuine: "bg-re-ink text-white border-re-ink",
  oem: "bg-re-paper text-re-ink border-re-ink",
  compatible: "bg-re-paper text-re-steel-600 border-re-steel-400",
};

export function Badge({ grade, className }: { grade: PartGrade; className?: string }) {
  const t = useTranslations("ui.badge");
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-re-sm border px-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.06em]",
        TONE[grade],
        className,
      )}
    >
      {t(grade)}
    </span>
  );
}
