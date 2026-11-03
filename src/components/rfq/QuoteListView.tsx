"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { quoteItemKey, useQuoteList } from "@/lib/stores/quote-list";
import { whatsappHref } from "@/lib/format";
import { PartNumber } from "@/components/ui/PartNumber";
import { buttonClass } from "@/components/ui/button-styles";
import { WhatsAppIcon } from "@/components/icons/brand";

/**
 * Interim /rfq (Phase 0): the persistent quote list with qty edit/remove and
 * a WhatsApp hand-off. The full RFQ form (company, BIN, uploads → POST
 * /api/site/rfq/) replaces the hand-off in Phase 2.
 */
export function QuoteListView({ whatsapp }: { whatsapp: string }) {
  const t = useTranslations("rfq");
  const { items, update, remove, clear } = useQuoteList();

  if (items.length === 0) {
    return (
      <div className="mt-8 max-w-2xl border border-dashed border-re-steel-400 p-6">
        <p className="text-lg font-semibold">{t("empty")}</p>
        <p className="mt-2 text-re-steel-600">{t("emptyHelp")}</p>
        <Link href="/search" className={buttonClass({ variant: "secondary" }, "mt-5")}>
          {t("item")} →
        </Link>
      </div>
    );
  }

  const text = [
    t("waHeader"),
    "",
    ...items.map(
      (i, n) => `${n + 1}. ${i.partNumber ? `[${i.partNumber}] ` : ""}${i.name} × ${i.qty}${i.note ? ` — ${i.note}` : ""}`,
    ),
  ].join("\n");
  const wa = whatsappHref(whatsapp, text);

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="re-mono text-sm text-re-steel-600">{t("lines", { count: items.length })}</span>
        <button type="button" onClick={clear} className="h-11 px-2 text-sm font-semibold text-re-red-text hover:underline">
          {t("clear")}
        </button>
      </div>
      <ol className="divide-y divide-re-steel-200 border-y border-re-ink">
        {items.map((i, n) => {
          const key = quoteItemKey(i);
          return (
            <li key={key} className="grid grid-cols-[2rem_1fr] gap-x-3 gap-y-3 py-4 md:grid-cols-[2rem_14rem_1fr_auto_auto] md:items-center">
              <span className="re-mono text-sm text-re-steel-400">{String(n + 1).padStart(2, "0")}</span>
              <span className="md:order-none">{i.partNumber ? <PartNumber value={i.partNumber} size="sm" /> : <span className="re-mono text-re-steel-400">—</span>}</span>
              <span className="col-start-2 font-semibold md:col-start-auto">
                {i.productSlug ? (
                  <Link href={`/parts/${i.productSlug}`} className="hover:text-re-blue hover:underline">
                    {i.name}
                  </Link>
                ) : (
                  i.name
                )}
              </span>
              <span className="col-start-2 inline-flex w-max items-stretch border border-re-steel-400 md:col-start-auto">
                <button
                  type="button"
                  aria-label="−1"
                  onClick={() => update(key, { qty: i.qty - 1 })}
                  className="grid size-11 place-items-center hover:bg-re-steel-100"
                >
                  <Minus aria-hidden className="size-4" />
                </button>
                <label className="flex items-center border-x border-re-steel-400">
                  <span className="sr-only">{t("qty")}</span>
                  <input
                    inputMode="numeric"
                    value={i.qty}
                    onChange={(e) => update(key, { qty: Number(e.target.value.replace(/\D/g, "")) || 1 })}
                    className="re-mono h-11 w-16 bg-transparent text-center outline-none"
                  />
                </label>
                <button
                  type="button"
                  aria-label="+1"
                  onClick={() => update(key, { qty: i.qty + 1 })}
                  className="grid size-11 place-items-center hover:bg-re-steel-100"
                >
                  <Plus aria-hidden className="size-4" />
                </button>
              </span>
              <button
                type="button"
                onClick={() => remove(key)}
                aria-label={t("remove", { name: i.name || i.partNumber })}
                className="col-start-2 grid size-11 place-items-center justify-self-start text-re-steel-600 hover:text-re-red-text md:col-start-auto"
              >
                <Trash2 aria-hidden className="size-5" strokeWidth={1.75} />
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {wa && (
          <a href={wa} target="_blank" rel="noopener" className={buttonClass({ variant: "whatsapp", size: "lg" })}>
            <WhatsAppIcon />
            {t("sendWhatsapp")}
          </a>
        )}
        <p className="text-sm text-re-steel-600">{t("formSoon")}</p>
      </div>
    </div>
  );
}
