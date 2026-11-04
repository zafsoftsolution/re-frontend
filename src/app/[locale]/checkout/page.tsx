import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { getBootstrap } from "@/lib/api/site";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { IntlScope } from "@/components/content/IntlScope";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { OrderingDisabled } from "@/components/checkout/OrderingDisabled";

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const [t, boot] = await Promise.all([getTranslations({ locale }), getBootstrap(locale)]);
  const s = boot.settings;
  return (
    <div className="re-shell py-6 md:py-10">
      <Breadcrumbs items={[{ label: t("nav.home"), href: "/" }, { label: t("cart.title"), href: "/cart" }, { label: t("checkout.title") }]} />
      <SectionHeader as="h1" title={t("checkout.title")} subtitle={s.directOrdersEnabled ? t("checkout.lead") : undefined} className="mt-4" />
      <IntlScope namespaces={["cart", "checkout"]}>
        {s.directOrdersEnabled ? <CheckoutForm shipping={s.shipping} codEnabled={s.codEnabled} /> : <OrderingDisabled />}
      </IntlScope>
    </div>
  );
}
