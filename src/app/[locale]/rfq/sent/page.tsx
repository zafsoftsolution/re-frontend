import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { getBootstrap } from "@/lib/api/site";
import { RFQ_REFERENCE } from "@/lib/forms/forward";
import { telHref } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { buttonClass } from "@/components/ui/button-styles";
import { WhatsAppLink } from "@/components/catalog/WhatsAppLink";
import { ContactLine } from "@/components/content/BusinessFacts";

type Props = PageProps<"/[locale]/rfq/sent">;

/** Reads searchParams → rendered per request; no Suspense so it works without JS. */
export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "rfq" });
  return { title: t("sent.metaTitle"), robots: { index: false, follow: true } };
}

const ERROR_CODES = new Set(["validation", "phone_invalid", "empty", "throttled", "unavailable", "file_type", "file_size", "file_empty", "file_count", "file_rejected", "items_rejected", "forbidden", "bad_request", "failed", "too_many_items"]);
/** Codes whose message lives in the `fixes.rfq` namespace. */
const FIX_CODES = new Set(["invalid_lines", "too_large"]);

export default async function RfqSentPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const [t, boot, sp] = await Promise.all([getTranslations({ locale }), getBootstrap(locale), searchParams]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const ref = one(sp.ref).trim().toUpperCase();
  const valid = RFQ_REFERENCE.test(ref);
  const errorCode = one(sp.error);
  const wa = boot.settings.whatsappNumber || boot.settings.contactPhone;
  const tel = telHref(boot.settings.contactPhone);

  if (!valid) {
    const code = ERROR_CODES.has(errorCode) || FIX_CODES.has(errorCode) ? errorCode : "failed";
    const badLines = one(sp.lines).split(",").filter((n) => /^\d{1,3}$/.test(n)).slice(0, 50).join(", ");
    return (
      <div className="re-shell py-6 md:py-10">
        <Breadcrumbs items={[{ label: t("nav.home"), href: "/" }, { label: t("rfq.title"), href: "/rfq" }, { label: t("rfq.sent.errorTitle") }]} />
        <div className="mt-8 max-w-2xl border-t-[3px] border-re-red pt-6">
          <h1 className="text-[1.75rem] font-bold">{t("rfq.sent.errorTitle")}</h1>
          <p className="mt-3 text-[1.0625rem] text-re-ink">{FIX_CODES.has(code) ? t(`fixes.rfq.${code}` as never, { lines: badLines || "?" } as never) : t(`rfq.errors.${code}` as never)}</p>
          <p className="mt-2 text-re-steel-600">{t("rfq.sent.errorHelp")}</p>
          <ContactLine settings={boot.settings} reply className="mt-3" />
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/rfq" className={buttonClass({ variant: "primary" })}>
              {t("rfq.sent.tryAgain")}
            </Link>
            <WhatsAppLink number={wa} text={t("rfq.waHeader")} variant="whatsapp">
              {t("rfq.sendWhatsapp")}
            </WhatsAppLink>
          </div>
        </div>
      </div>
    );
  }

  const steps = ["1", "2", "3"] as const;
  return (
    <div className="re-shell py-6 md:py-10">
      <Breadcrumbs items={[{ label: t("nav.home"), href: "/" }, { label: t("rfq.title"), href: "/rfq" }, { label: t("rfq.sent.crumb") }]} />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <p className="re-label flex items-center gap-2">
            <span aria-hidden className="inline-block size-2.5 bg-re-stock-in" />
            {t("rfq.sent.eyebrow")}
          </p>
          <h1 className="mt-3 text-[2rem] leading-tight font-extrabold [font-stretch:80%] bn:font-bold bn:[font-stretch:100%] sm:text-[2.5rem]">
            {t("rfq.sent.title")}
          </h1>
          <div className="mt-6 inline-block border border-re-ink">
            <p className="re-label border-b border-re-ink bg-re-ink px-4 py-2 !text-white/70">{t("rfq.sent.reference")}</p>
            <p translate="no" className="re-mono px-4 py-4 text-[1.75rem] font-semibold tracking-wide text-re-ink select-all sm:text-[2.5rem]" data-testid="rfq-reference">
              {ref}
            </p>
          </div>
          <p className="mt-4 max-w-xl text-re-steel-600">{t("rfq.sent.keepRef")}</p>

          <h2 className="mt-10 text-[1.25rem] font-bold">{t("rfq.sent.nextTitle")}</h2>
          <ol className="mt-4 max-w-2xl divide-y divide-re-steel-200 border-y border-re-steel-200">
            {steps.map((s) => (
              <li key={s} className="grid grid-cols-[2.5rem_1fr] gap-3 py-4">
                <span className="re-mono text-lg font-semibold text-re-red-text">0{s}</span>
                <div>
                  <p className="font-semibold">{t(`rfq.sent.step${s}Title`)}</p>
                  <p className="mt-1 text-[0.9375rem] text-re-steel-600">{t(`rfq.sent.step${s}Body`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <aside className="self-start border border-re-steel-200 bg-re-steel-50 p-5">
          <p className="font-semibold">{t("rfq.sent.followTitle")}</p>
          <p className="mt-1 text-[0.9375rem] text-re-steel-600">{t("rfq.sent.followBody")}</p>
          <WhatsAppLink number={wa} text={t("rfq.sent.waText", { ref })} size="lg" className="mt-4 w-full">
            {t("rfq.sent.followWhatsapp")}
          </WhatsAppLink>
          {tel && (
            <a href={tel} className={buttonClass({ variant: "secondary" }, "mt-3 w-full")}>
              {t("rfq.sent.call")} <span className="re-mono">{boot.settings.contactPhone}</span>
            </a>
          )}
          <ContactLine settings={boot.settings} reply className="mt-4 border-t border-re-steel-200 pt-3 text-[0.875rem]" />
          <Link href="/search" className={buttonClass({ variant: "link" }, "mt-4")}>
            {t("rfq.sent.continue")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
