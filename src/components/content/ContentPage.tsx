import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getBootstrap } from "@/lib/api/site";
import { breadcrumbJsonLd } from "@/lib/catalog/page";
import { catalogMetadata } from "@/lib/seo/metadata";
import type { Crumb } from "@/components/ui/Breadcrumbs";
import { SheetHeader } from "@/components/catalog/SheetHeader";
import { JsonLd } from "@/components/catalog/JsonLd";

/** Metadata (canonical + hreflang + OG) for a content page. */
export async function contentMetadata(locale: Locale, href: string, title: string, description: string, opts: { noindex?: boolean } = {}): Promise<Metadata> {
  const [t, boot] = await Promise.all([getTranslations({ locale }), getBootstrap(locale)]);
  return catalogMetadata({ locale, href, title, description, noindex: opts.noindex, siteName: boot.settings.siteName || t("meta.siteName") });
}

/**
 * Trust / knowledge page frame: parts-book sheet header, BreadcrumbList
 * JSON-LD from the visible trail, extra JSON-LD, then the body.
 */
export function ContentPage({
  locale,
  href,
  crumbs,
  eyebrow,
  title,
  lead,
  meta,
  jsonLd = [],
  children,
}: {
  locale: Locale;
  href: string;
  crumbs: Crumb[];
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  meta?: { label: string; value: ReactNode }[];
  jsonLd?: object[];
  children: ReactNode;
}) {
  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs, locale, href), ...jsonLd]} />
      <SheetHeader crumbs={crumbs} eyebrow={eyebrow} title={title} lead={lead} meta={meta} />
      <div className="re-shell py-8 md:py-12">{children}</div>
    </>
  );
}

/** Long-form copy column (policies, guides): readable measure, document rules. */
export function Prose({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`max-w-[68ch] text-[1.0625rem] leading-[1.7] text-re-ink bn:text-[1.0625rem] bn:leading-[1.8] [&_h2]:mt-10 [&_h2]:border-t [&_h2]:border-re-steel-200 [&_h2]:pt-5 [&_h2]:text-[1.375rem] [&_h2]:font-bold [&_h2]:leading-snug [&_h3]:mt-6 [&_h3]:text-[1.125rem] [&_h3]:font-semibold [&_li]:mt-1.5 [&_p]:mt-4 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:font-semibold [&_a]:text-re-blue [&_a]:underline-offset-2 hover:[&_a]:underline ${className}`}
    >
      {children}
    </div>
  );
}
