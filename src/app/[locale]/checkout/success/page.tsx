import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FileDown } from "lucide-react";
import { resolveLocale } from "@/i18n/params";
import { Link } from "@/i18n/navigation";
import { ApiError, apiFetch } from "@/lib/api/client";
import { getBootstrap } from "@/lib/api/site";
import { UUID } from "@/lib/forms/forward";
import { formatBDT } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { buttonClass } from "@/components/ui/button-styles";
import { WhatsAppLink } from "@/components/catalog/WhatsAppLink";

type Props = PageProps<"/[locale]/checkout/success">;

/** Per-request (order UUID in the query), rendered without Suspense so it works without JS. */
export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("success.metaTitle"), robots: { index: false, follow: true } };
}

type Raw = Record<string, unknown>;
interface OrderView {
  id: string;
  number: string;
  paymentMethod: string;
  status: string;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  phone: string;
  address: string;
  items: { name: string; sku: string; qty: number; unit: number; total: number }[];
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const s = (v: unknown) => (typeof v === "string" ? v : "");

/** Uncached on purpose: the order was just placed and is private to the link holder. */
async function loadOrder(id: string, locale: string): Promise<OrderView | null> {
  if (!UUID.test(id)) return null;
  try {
    const o = await apiFetch<Raw>(`/inventory/orders/${id}/`, { locale, timeoutMs: 10_000 });
    const a = (o.shipping_address && typeof o.shipping_address === "object" ? o.shipping_address : {}) as Raw;
    return {
      id,
      number: s(o.order_number),
      paymentMethod: s(o.payment_method),
      status: s(o.status),
      subtotal: n(o.subtotal),
      discount: n(o.discount),
      shipping: n(o.shipping),
      tax: n(o.tax),
      total: n(o.total),
      phone: s(o.customer_phone),
      address: [s(a.line1), s(a.line2), s(a.city), s(a.state)].filter(Boolean).join(", "),
      items: (Array.isArray(o.items) ? (o.items as Raw[]) : []).map((i) => ({
        name: s(i.product_name),
        sku: s(i.sku),
        qty: n(i.quantity),
        unit: n(i.unit_price),
        total: n(i.total),
      })),
    };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null;
    throw err;
  }
}

export default async function CheckoutSuccessPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const sp = await searchParams;
  const id = (Array.isArray(sp.order) ? sp.order[0] : sp.order) ?? "";
  const [t, boot, order] = await Promise.all([getTranslations({ locale }), getBootstrap(locale), loadOrder(id, locale)]);
  const wa = boot.settings.whatsappNumber || boot.settings.contactPhone;

  if (!order) {
    return (
      <div className="re-shell py-6 md:py-10">
        <Breadcrumbs items={[{ label: t("nav.home"), href: "/" }, { label: t("checkout.success.notFound") }]} />
        <div className="mt-8 max-w-2xl border-t-[3px] border-re-red pt-6">
          <h1 className="text-[1.75rem] font-bold">{t("checkout.success.notFound")}</h1>
          <p className="mt-3 text-re-steel-600">{t("checkout.success.notFoundBody")}</p>
          <WhatsAppLink number={wa} text={t("checkout.success.waHelp")} className="mt-6">
            {t("checkout.success.askWhatsapp")}
          </WhatsAppLink>
        </div>
      </div>
    );
  }

  const rows: [string, number][] = [
    [t("checkout.subtotal"), order.subtotal],
    ...(order.discount > 0 ? ([[t("checkout.discount"), -order.discount]] as [string, number][]) : []),
    [t("checkout.shipping"), order.shipping],
    ...(order.tax > 0 ? ([[t("checkout.vat"), order.tax]] as [string, number][]) : []),
  ];

  return (
    <div className="re-shell py-6 md:py-10">
      <Breadcrumbs items={[{ label: t("nav.home"), href: "/" }, { label: t("checkout.success.crumb") }]} />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <p className="re-label flex items-center gap-2">
            <span aria-hidden className="inline-block size-2.5 bg-re-stock-in" />
            {t("checkout.success.eyebrow")}
          </p>
          <h1 className="mt-3 text-[2rem] leading-tight font-extrabold [font-stretch:80%] bn:font-bold bn:[font-stretch:100%] sm:text-[2.5rem]">{t("checkout.success.title")}</h1>
          <div className="mt-6 inline-block border border-re-ink">
            <p className="re-label border-b border-re-ink bg-re-ink px-4 py-2 !text-white/70">{t("checkout.success.orderNumber")}</p>
            <p translate="no" className="re-mono px-4 py-4 text-[1.75rem] font-semibold select-all sm:text-[2.25rem]" data-testid="order-number">
              {order.number}
            </p>
          </div>
          <p className="mt-4 max-w-xl text-re-steel-600">{t("checkout.success.next", { phone: order.phone })}</p>

          <table className="mt-8 w-full max-w-2xl border-collapse text-[0.9375rem]">
            <caption className="re-label pb-2 text-left">{t("checkout.summary")}</caption>
            <thead>
              <tr className="border-y border-re-ink text-left">
                <th className="py-2 font-semibold">{t("checkout.success.item")}</th>
                <th className="py-2 text-right font-semibold">{t("checkout.success.qty")}</th>
                <th className="py-2 text-right font-semibold">{t("checkout.success.lineTotal")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-re-steel-200">
              {order.items.map((i, k) => (
                <tr key={k}>
                  <td className="py-2.5 pr-3">
                    <span className="font-semibold">{i.name}</span>
                    <span className="re-mono block text-[0.75rem] text-re-steel-600">
                      {i.sku} · {formatBDT(i.unit)}
                    </span>
                  </td>
                  <td className="re-mono py-2.5 text-right">{i.qty}</td>
                  <td className="re-mono py-2.5 text-right">{formatBDT(i.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {rows.map(([label, v]) => (
                <tr key={label}>
                  <td colSpan={2} className="pt-2 text-right">{label}</td>
                  <td className="re-mono pt-2 text-right">{v < 0 ? `− ${formatBDT(-v)}` : formatBDT(v)}</td>
                </tr>
              ))}
              <tr className="border-t border-re-ink text-[1.0625rem] font-semibold">
                <td colSpan={2} className="pt-2 text-right">
                  {t("checkout.total")}
                </td>
                <td className="re-mono pt-2 text-right" data-testid="order-total">
                  {formatBDT(order.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <aside className="self-start border border-re-steel-200 bg-re-steel-50 p-5">
          <dl className="space-y-3 text-[0.9375rem]">
            <div>
              <dt className="re-label">{t("checkout.success.payment")}</dt>
              <dd className="mt-0.5 font-semibold">{order.paymentMethod === "cod" ? t("checkout.cod") : t("checkout.bankTransfer")}</dd>
            </div>
            {order.address && (
              <div>
                <dt className="re-label">{t("checkout.success.deliverTo")}</dt>
                <dd className="mt-0.5">{order.address}</dd>
              </div>
            )}
          </dl>
          <a href={`/api/checkout/invoice/${order.id}`} target="_blank" rel="noopener" className={buttonClass({ variant: "secondary" }, "mt-5 w-full")}>
            <FileDown aria-hidden />
            {t("checkout.success.invoice")}
          </a>
          <WhatsAppLink number={wa} text={t("checkout.success.waText", { order: order.number })} className="mt-3 w-full">
            {t("checkout.success.askWhatsapp")}
          </WhatsAppLink>
          <Link href="/search" className={buttonClass({ variant: "link" }, "mt-4")}>
            {t("checkout.success.continue")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
