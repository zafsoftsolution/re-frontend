import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { POLICY_SLUGS, type PolicySlug } from "@/content/slugs";
import { ContentPage, contentMetadata, Prose } from "@/components/content/ContentPage";
import { Inline } from "@/components/content/RichText";
import { cn } from "@/lib/utils";

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
  const t = await getTranslations({ locale });
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
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-16">
        <div>
          {POLICIES_DRAFT && (
            <p className="mb-6 max-w-[68ch] border-l-[3px] border-re-stock-low bg-re-stock-low-bg px-4 py-3 text-[0.875rem]" data-testid="policy-draft">
              {t("policies.draftNotice")}
            </p>
          )}
          <Prose>
            {sections.map((s, i) => (
              <section key={i} aria-labelledby={`s-${i}`}>
                <h2 id={`s-${i}`} className={cn(i === 0 && "!mt-0 !border-t-0 !pt-0")}>
                  {s.h}
                </h2>
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
              </section>
            ))}
          </Prose>
          <p className="mt-10 max-w-[68ch] border-t border-re-steel-200 pt-5 text-[0.9375rem] text-re-steel-600">
            {t("policies.questions")}{" "}
            <Link href="/contact" className="font-semibold text-re-blue hover:underline">
              {t("policies.contactLink")}
            </Link>
          </p>
        </div>
        <nav aria-label={t("policies.title")} className="order-first lg:order-none">
          <p className="re-label">{t("policies.title")}</p>
          <ul className="mt-2 space-y-px border-l border-re-steel-200">
            {POLICY_SLUGS.map((p) => (
              <li key={p}>
                <Link
                  href={`/policies/${p}`}
                  aria-current={p === slug ? "page" : undefined}
                  className={cn("-ml-px block border-l py-1.5 pl-3 text-[0.9375rem]", p === slug ? "border-re-red font-semibold text-re-ink" : "border-transparent hover:border-re-ink hover:text-re-blue")}
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
