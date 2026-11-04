"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** EN / বাং toggle that keeps the current path and query string. */
type Props = { className?: string; tone?: "light" | "dark" };

export function LocaleSwitch(props: Props) {
  // The query string is request data: read it inside Suspense so the shell
  // still prerenders (the fallback is the same link without the query).
  return (
    <Suspense fallback={<SwitchLink {...props} query={{}} />}>
      <WithQuery {...props} />
    </Suspense>
  );
}

function WithQuery(props: Props) {
  const search = useSearchParams();
  // Keep filters / search terms when switching language.
  return <SwitchLink {...props} query={Object.fromEntries(search.entries())} />;
}

function SwitchLink({ className, tone = "light", query }: Props & { query: Record<string, string> }) {
  const t = useTranslations("header");
  const locale = useLocale();
  const pathname = usePathname();
  const target = locale === "bn" ? "en" : "bn";

  return (
    <Link
      href={{ pathname, query }}
      locale={target}
      hrefLang={target}
      // Accessible name starts with the visible text (WCAG 2.5.3); `lang`
      // only on the part in the other language.
      aria-label={`${t("switchToShort")} — ${t("switchToLabel")}`}
      className={cn(
        "inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold transition-colors duration-150",
        tone === "dark" ? "text-white/85 hover:text-white" : "text-re-ink hover:text-re-blue",
        className,
      )}
    >
      <span aria-hidden className={cn("re-mono text-xs", tone === "dark" ? "text-white/50" : "text-re-steel-600")}>
        {locale.toUpperCase()} /
      </span>
      <span lang={target} className={target === "bn" ? "font-re-bn" : undefined}>
        {t("switchToShort")}
      </span>
    </Link>
  );
}
