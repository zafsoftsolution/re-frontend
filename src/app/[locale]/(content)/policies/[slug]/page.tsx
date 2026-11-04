import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { POLICY_SLUGS, type PolicySlug } from "@/content/slugs";
import { ContentPage, contentMetadata, Prose } from "@/components/content/ContentPage";
import { Inline } from "@/components/content/RichText";
import { cn } from "@/lib/utils";
import { getBootstrap } from "@/lib/api/site";
import { ContactLine } from "@/components/content/BusinessFacts";

type Props = PageProps<"/[locale]/policies/[slug]">;

/**
 * Draft policy copy lives in messages (`policies.items.<slug>`) so the client
 * can edit en/bn without code. Flip POLICIES_DRAFT to false once reviewed —
 * it hides the "draft" notice.
 */
const POLICIES_DRAFT = true;

type PolicySection = { h: string; p?: string[]; list?: string[] };

const isPolicy = (s: string): s is PolicySlug => (POLICY_SLUGS as readonly string[]).includes(s);

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => POLICY_SLUGS.map((slug) => ({ locale, slug })));
}

async function load(params: Props["params"]) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  if (!isPolicy(slug)) notFound();
  return { locale, slug };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await load(params);
  const t = await getTranslations({ locale, namespace: "policies" });
  return contentMetadata(locale, `/policies/${slug}`, t(`items.${slug}.title`), t(`items.${slug}.summary`));
}

export default async function PolicyPage({ params }: Props) {
  const { locale, slug } = await load(params);
  setRequestLocale(locale);
  const [t, boot] = await Promise.all([getTranslations({ locale }), getBootstrap(locale)]);
  const sections = t.raw(`policies.items.${slug}.sections`) as PolicySection[];

  return (
    <ContentPage
      locale={locale}
      href={`/policies/${slug}`}
      crumbs={[{ label: t("nav.home"), href: "/" }, { label: t("policies.title"), href: "/policies" }, { label: t(`policies.items.${slug}.title`) }]}
      eyebrow={t("policies.eyebrow")}
      title={t(`policies.items.${slug}.title`)}
      lead={<p>{t(`policies.items.${slug}.summary`)}</p>}
    >
      <div className="grid gap-8 md:gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-16">
        <div className="min-w-0">
          {POLICIES_DRAFT && (
            <p className="mb-6 max-w-[68ch] border-l-[3px] border-re-stock-low bg-re-stock-low-bg px-4 py-3 text-[0.875rem]" data-testid="policy-draft">
              {t("policies.draftNotice")}
            </p>
          )}
          <Prose>
            {sections.map((s, i) => (
              <details
                key={i}
                open={i === 0}
                aria-labelledby={`s-${i}`}
                className="group/s lg:[&::details-content]:block lg:[&::details-content]:[content-visibility:visible]"
              >
                <summary className="list-none lg:pointer-events-none [&::-webkit-details-marker]:hidden">
                  <h2
                    id={`s-${i}`}
                    className={cn("flex items-start justify-between gap-3 max-lg:min-h-11 max-lg:cursor-pointer", i === 0 && "!mt-0 !border-t-0 !pt-0")}
                  >
                    {s.h}
                    <ChevronDown aria-hidden className="mt-1 size-5 shrink-0 text-re-steel-600 transition-transform duration-150 group-open/s:rotate-180 lg:hidden" />
                  </h2>
                </summary>
                {s.p?.map((p, k) => (
                  <p key={k}>
                    <Inline text={p} />
                  </p>
                ))}
                {s.list && (
                  <ul>
                    {s.list.map((li, k) => (
                      <li key={k}>
                        <Inline text={li} />
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            ))}
          </Prose>
          <p className="mt-10 max-w-[68ch] border-t border-re-steel-200 pt-5 text-[0.9375rem] text-re-steel-600">
            {t("policies.questions")}{" "}
            <Link href="/contact" className="font-semibold text-re-blue hover:underline">
              {t("policies.contactLink")}
            </Link>
          </p>
          <ContactLine settings={boot.settings} className="mt-2 max-w-[68ch]" />
        </div>
        <nav aria-label={t("policies.title")} className="order-first min-w-0 lg:order-none">
          <p className="re-label max-lg:sr-only">{t("policies.title")}</p>
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-6 md:px-6 lg:mx-0 lg:mt-2 lg:block lg:space-y-px lg:overflow-visible lg:border-l lg:border-re-steel-200 lg:px-0 lg:pb-0">
            {POLICY_SLUGS.map((p) => (
              <li key={p}>
                <Link
                  href={`/policies/${p}`}
                  aria-current={p === slug ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center border px-3 text-[0.9375rem] whitespace-nowrap lg:-ml-px lg:block lg:min-h-0 lg:border-y-0 lg:border-r-0 lg:border-l lg:py-1.5 lg:pr-0 lg:pl-3 lg:whitespace-normal",
                    p === slug ? "border-re-ink font-semibold text-re-ink lg:border-re-red" : "border-re-steel-200 hover:border-re-ink hover:text-re-blue lg:border-transparent",
                  )}
                >
                  {t(`policies.items.${p}.title`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </ContentPage>
  );
}
