import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { NotFoundView } from "@/components/content/NotFoundView";

type Props = PageProps<"/[locale]/[...rest]">;

/**
 * The localized 404 body for unknown paths. src/proxy.ts sends unknown
 * document requests here (/<locale>/404/not-found, prerendered) and serves
 * the HTML with status 404; client-side navigations are plain rewrites.
 *
 * It renders the UI itself instead of calling notFound(): with this root
 * layout, notFound() only streams an empty `__next_error__` shell whose
 * content needs JavaScript.
 */
export function generateStaticParams() {
  return [{ rest: ["404", "not-found"] }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "notFound" });
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default async function CatchAll({ params }: Props) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  return <NotFoundView />;
}
