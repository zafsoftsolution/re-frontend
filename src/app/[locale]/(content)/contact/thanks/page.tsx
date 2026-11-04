import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { buttonClass } from "@/components/ui/button-styles";

type Props = PageProps<"/[locale]/contact/thanks">;

/** Landing page for the no-JS contact form post (the JS form confirms in place). */
export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("sentTitle"), robots: { index: false, follow: false } };
}

const CODES = new Set(["validation", "throttled", "unavailable", "failed", "forbidden"]);

export default async function ContactThanksPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const [t, sp] = await Promise.all([getTranslations({ locale }), searchParams]);
  const status = (Array.isArray(sp.status) ? sp.status[0] : sp.status) ?? "";
  const failed = Boolean(status);
  const code = CODES.has(status) ? status : "failed";
  return (
    <div className="re-shell py-6 md:py-10">
      <Breadcrumbs items={[{ label: t("nav.home"), href: "/" }, { label: t("contact.title"), href: "/contact" }, { label: failed ? t("contact.notSent") : t("contact.sentTitle") }]} />
      <div className={`mt-8 max-w-2xl border-t-[3px] pt-6 ${failed ? "border-re-red" : "border-re-stock-in"}`}>
        <h1 className="text-[1.75rem] font-bold">{failed ? t("contact.notSent") : t("contact.sentTitle")}</h1>
        <p className="mt-3 text-re-steel-600">{failed ? t(`contact.errors.${code}` as never) : t("contact.sentBody")}</p>
        <Link href={failed ? "/contact" : "/search"} className={buttonClass({ variant: failed ? "primary" : "secondary" }, "mt-6")}>
          {failed ? t("contact.tryAgain") : t("contact.continue")}
        </Link>
      </div>
    </div>
  );
}
