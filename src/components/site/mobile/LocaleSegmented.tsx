"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Language as a two-segment control (English | বাংলা) for the menu sheet and
 * the phone footer. Keeps the path and query; the current language is the
 * pressed segment (aria-current), the other one is a link.
 */
type Props = { className?: string; tone?: "light" | "dark"; label: string };

export function LocaleSegmented(props: Props) {
  return (
    <Suspense fallback={<Segments {...props} query={{}} />}>
      <WithQuery {...props} />
    </Suspense>
  );
}

function WithQuery(props: Props) {
  const search = useSearchParams();
  return <Segments {...props} query={Object.fromEntries(search.entries())} />;
}

function Segments({ className, tone = "light", label, query }: Props & { query: Record<string, string> }) {
  const t = useTranslations("site.lang");
  const locale = useLocale();
  const pathname = usePathname();
  const dark = tone === "dark";

  return (
    <div
      role="group"
      aria-label={label}
      className={cn("grid grid-cols-2 border p-0.5", dark ? "border-white/25" : "border-re-steel-500 bg-re-paper", className)}
    >
      {routing.locales.map((l) => {
        const current = l === locale;
        const cls = cn(
          "flex min-h-11 items-center justify-center px-3 text-[0.9375rem] font-semibold transition-colors duration-150 ease-re",
          l === "bn" ? "font-re-bn" : "font-re-sans",
          current
            ? dark
              ? "bg-white text-re-ink"
              : "bg-re-ink text-white"
            : dark
              ? "text-white/85 active:bg-white/10"
              : "text-re-ink active:bg-re-steel-100",
        );
        return current ? (
          <span key={l} aria-current="true" lang={l} className={cls}>
            {t(l)}
          </span>
        ) : (
          <Link key={l} href={{ pathname, query }} locale={l} hrefLang={l} lang={l} className={cls}>
            {t(l)}
          </Link>
        );
      })}
    </div>
  );
}
