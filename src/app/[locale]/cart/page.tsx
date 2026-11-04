import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/params";
import { getBootstrap } from "@/lib/api/site";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { IntlScope } from "@/components/content/IntlScope";
import { CartView } from "@/components/checkout/CartView";
import { OrderingDisabled } from "@/components/checkout/OrderingDisabled";

export async function generateMetadata({ params }: PageProps<"/[locale]/cart">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "cart" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Dormant until a part is sold direct (bootstrap `direct_orders_enabled`); hidden from nav otherwise. */
export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const [t, boot] = await Promise.all([getTranslations({ locale }), getBootstrap(locale)]);
  return (
    <div className="re-shell py-6 md:py-10">
      <Breadcrumbs items={[{ label: t("nav.home"), href: "/" }, { label: t("cart.title") }]} />
      <SectionHeader as="h1" title={t("cart.title")} subtitle={boot.settings.directOrdersEnabled ? t("cart.lead") : undefined} className="mt-4" />
      <IntlScope namespaces={["cart"]}>{boot.settings.directOrdersEnabled ? <CartView /> : <OrderingDisabled />}</IntlScope>
    </div>
  );
}
