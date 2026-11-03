"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** EN / বাং toggle that keeps the current path. */
export function LocaleSwitch({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const t = useTranslations("header");
  const locale = useLocale();
  const pathname = usePathname();
  const target = locale === "bn" ? "en" : "bn";

  return (
    <Link
      href={pathname}
      locale={target}
      hrefLang={target}
      lang={target}
      aria-label={t("switchToLabel")}
      className={cn(
        "inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold transition-colors duration-150",
        tone === "dark" ? "text-white/85 hover:text-white" : "text-re-ink hover:text-re-blue",
        className,
      )}
    >
      <span aria-hidden className={cn("re-mono text-xs", tone === "dark" ? "text-white/50" : "text-re-steel-600")}>
        {locale.toUpperCase()} /
      </span>
      <span className={target === "bn" ? "font-re-bn" : undefined}>{t("switchToShort")}</span>
    </Link>
  );
}
