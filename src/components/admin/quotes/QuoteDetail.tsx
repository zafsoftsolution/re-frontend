"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Ban,
  Check,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileImage,
  FileText,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  RotateCcw,
  Send,
  ShoppingCart,
  ThumbsDown,
  ThumbsUp,
  Unlink,
} from "lucide-react";
import {
  DjangoApiError,
  djangoAdmin,
  saveBlob,
  type QuoteConvertInput,
  type QuoteItemShape,
  type QuoteSendResponse,
  type QuoteShape,
  type QuoteStatus,
} from "@/lib/django-admin";
import {
  PREFERRED_CONTACT_LABEL,
  QUOTE_STATUS_LABEL,
  formatBytes,
  formatDateTime,
  formatDay,
  formatMoney,
  telLink,
  toMoneyString,
  toNumber,
  whatsappLink,
} from "@/lib/admin/quotes";
import { notifyQuotesChanged } from "@/lib/admin/use-quote-count";
import { useConfirm, useToast } from "@/context/FeedbackContext";
import AdminDialog, { btn, field } from "@/components/admin/ui/AdminDialog";
import QuoteStatusPill from "./QuoteStatusPill";
import ProductLinker from "./ProductLinker";
import { cn } from "@/lib/utils";

/** Statuses mark-quoted accepts (backend QuoteRequestViewSet.mark_quoted). */
const PRICEABLE: QuoteStatus[] = ["new", "in_review", "quoted", "expired"];
const CONVERTIBLE: QuoteStatus[] = ["quoted", "accepted"];

interface LineDraft {
  price: string;
  note: string;
  /** undefined = unchanged; null = unlink; string = slug to link */
  link?: string | null;
  linkLabel?: string;
}

function draftsFrom(q: QuoteShape): Record<string, LineDraft> {
  const out: Record<string, LineDraft> = {};
  for (const it of q.items) {
    out[it.id] = { price: it.quoted_unit_price ?? "", note: it.admin_notes ?? "" };
  }
  return out;
}

export default function QuoteDetail({ id }: { id: string }) {
  const toast = useToast();
  const confirm = useConfirm();

  const [quote, setQuote] = useState<QuoteShape | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, LineDraft>>({});
  const [totalOverride, setTotalOverride] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [sendResult, setSendResult] = useState<QuoteSendResponse | null>(null);

  /** Replace local state with a fresh server copy. */
  const adopt = useCallback((q: QuoteShape) => {
    setQuote(q);
    setDrafts(draftsFrom(q));
    setTotalOverride("");
    setValidUntil(q.valid_until ?? "");
    setAdminNotes(q.admin_notes ?? "");
  }, []);

  useEffect(() => {
    let cancelled = false;
    djangoAdmin.rfq.get(id).then(
      (q) => !cancelled && adopt(q),
      (e: Error) => !cancelled && setLoadError(e.message),
    );
    return () => {
      cancelled = true;
    };
  }, [id, adopt]);

  const currency = quote?.currency || "BDT";
  const editable = !!quote && PRICEABLE.includes(quote.status);

  const computed = useMemo(() => {
    if (!quote) return { sum: 0, priced: 0, invalid: [] as string[] };
    let sum = 0;
    let priced = 0;
    const invalid: string[] = [];
    for (const it of quote.items) {
      const raw = drafts[it.id]?.price ?? "";
      if (raw === "") continue;
      const n = toNumber(raw);
      if (n === null || n < 0) {
        invalid.push(it.id);
        continue;
      }
      sum += n * it.quantity;
      priced += 1;
    }
    return { sum, priced, invalid };
  }, [quote, drafts]);

  const dirty = useMemo(() => {
    if (!quote) return false;
    if (totalOverride !== "") return true;
    if ((quote.valid_until ?? "") !== validUntil) return true;
    if ((quote.admin_notes ?? "") !== adminNotes) return true;
    return quote.items.some((it) => {
      const d = drafts[it.id];
      return (
        !!d &&
        ((it.quoted_unit_price ?? "") !== d.price ||
          (it.admin_notes ?? "") !== d.note ||
          d.link !== undefined)
      );
    });
  }, [quote, drafts, totalOverride, validUntil, adminNotes]);

  if (loadError) {
    return (
      <div className="max-w-xl">
        <BackLink />
        <p className="mt-6 text-sm text-rose-700" role="alert">
          Couldn&apos;t load this quote: {loadError}
        </p>
      </div>
    );
  }
  if (!quote) {
    return (
      <div className="py-24 grid place-items-center text-ink/55">
        <Loader2 className="animate-spin" size={22} aria-label="Loading quote" />
      </div>
    );
  }

  const q = quote;
  const allowed = new Set(q.allowed_transitions);
  const wa = whatsappLink(q.phone, `Hello ${q.contact_name || ""}, regarding your quote request ${q.reference}`.replace("  ", " "));

  const setLine = (itemId: string, patch: Partial<LineDraft>) =>
    setDrafts((d) => ({ ...d, [itemId]: { ...d[itemId], ...patch } }));

  // ── Actions ────────────────────────────────────────────────────────────

  async function changeStatus(next: QuoteStatus, verb: string, ask?: { title: string; description?: string; danger?: boolean }) {
    if (ask) {
      const ok = await confirm({
        title: ask.title,
        description: ask.description,
        confirmLabel: verb,
        tone: ask.danger ? "danger" : "default",
      });
      if (!ok) return;
    }
    const prev = q;
    setBusy(next);
    setQuote({ ...q, status: next }); // optimistic
    try {
      const fresh = await djangoAdmin.rfq.update(q.id, { status: next });
      setQuote(fresh);
      notifyQuotesChanged();
      toast.success(`${q.reference}: ${QUOTE_STATUS_LABEL[next]}`);
    } catch (e) {
      setQuote(prev);
      toast.error("Status not changed", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function markQuoted() {
    if (computed.invalid.length) {
      toast.error("Check the prices", "Unit prices must be numbers ≥ 0.");
      return;
    }
    const override = totalOverride.trim();
    if (override && (toNumber(override) === null || toNumber(override)! < 0)) {
      toast.error("Check the quoted total", "Must be a number ≥ 0.");
      return;
    }
    if (!override && computed.priced === 0) {
      toast.error("Nothing to quote", "Enter at least one unit price or a quoted total.");
      return;
    }
    const unpriced = q.items.length - computed.priced;
    if (unpriced > 0 && !override) {
      const ok = await confirm({
        title: `${unpriced} line${unpriced === 1 ? " has" : "s have"} no price`,
        description: "The quoted total will only include priced lines. Continue?",
        confirmLabel: "Mark quoted",
      });
      if (!ok) return;
    }
    setBusy("quoted");
    try {
      const fresh = await djangoAdmin.rfq.markQuoted(q.id, {
        items: q.items.map((it) => {
          const d = drafts[it.id] ?? { price: "", note: "" };
          const row: {
            id: string;
            quoted_unit_price: string | null;
            admin_notes?: string;
            product?: string | null;
          } = {
            id: it.id,
            quoted_unit_price: d.price === "" ? null : toMoneyString(toNumber(d.price)!),
          };
          if (d.note !== (it.admin_notes ?? "")) row.admin_notes = d.note;
          if (d.link !== undefined) row.product = d.link;
          return row;
        }),
        quoted_total: override ? toMoneyString(toNumber(override)!) : undefined,
        valid_until: validUntil || undefined,
        admin_notes: adminNotes,
      });
      adopt(fresh);
      notifyQuotesChanged();
      toast.success(
        `${q.reference} quoted`,
        `${formatMoney(fresh.quoted_total, fresh.currency)} · valid until ${formatDay(fresh.valid_until)}`,
      );
    } catch (e) {
      toast.error("Couldn't save the quote", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function saveNotes() {
    setBusy("notes");
    try {
      const fresh = await djangoAdmin.rfq.update(q.id, { admin_notes: adminNotes });
      setQuote(fresh);
      setAdminNotes(fresh.admin_notes);
      toast.success("Internal notes saved");
    } catch (e) {
      toast.error("Couldn't save notes", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function downloadPdf() {
    setBusy("pdf");
    try {
      const { blob, filename } = await djangoAdmin.rfq.pdf(q.id);
      saveBlob(blob, filename ?? `quotation-${q.reference}.pdf`);
    } catch (e) {
      toast.error("Couldn't generate the PDF", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function downloadAttachment(attId: string, name: string) {
    try {
      const { blob, filename } = await djangoAdmin.rfq.attachment(q.id, attId);
      saveBlob(blob, filename ?? name);
    } catch (e) {
      toast.error("Download failed", (e as Error).message);
    }
  }

  const canStartReview = q.status === "new" && allowed.has("in_review");
  const canAccept = allowed.has("accepted");
  const canReject = allowed.has("rejected");
  const canCancel = allowed.has("cancelled");
  const canReopen = ["rejected", "cancelled", "expired", "accepted"].includes(q.status) && allowed.has("in_review");
  const canSend = q.status === "quoted" || q.status === "accepted";
  const canConvert = CONVERTIBLE.includes(q.status) && !q.order;

  return (
    <div className="pb-24 lg:pb-0">
      <BackLink />

      {/* Header */}
      <header className="mt-3 pb-5 mb-6 border-b border-[var(--jmn-line)] flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold mb-1">Quote request</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="part-no text-2xl md:text-3xl text-navy" data-testid="quote-reference">
              {q.reference}
            </h1>
            <QuoteStatusPill status={q.status} className="text-[11px]" />
          </div>
          <p className="mt-1 text-[13px] text-ink/60">
            Received {formatDateTime(q.created_at)} · {q.items_count} line{q.items_count === 1 ? "" : "s"}
            {q.attachments_count ? ` · ${q.attachments_count} file${q.attachments_count === 1 ? "" : "s"}` : ""}
            {q.locale ? ` · ${q.locale === "bn" ? "Bangla" : "English"} site` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Quote actions">
          {canStartReview && (
            <button type="button" className={btn.secondary} disabled={!!busy} onClick={() => changeStatus("in_review", "Start review")}>
              <ClipboardCheck size={15} aria-hidden /> Start review
            </button>
          )}
          <button type="button" className={btn.secondary} disabled={busy === "pdf"} onClick={downloadPdf}>
            {busy === "pdf" ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} aria-hidden />}
            {q.status === "new" || q.status === "in_review" ? "Draft PDF" : "Quote PDF"}
          </button>
          {canSend && (
            <button type="button" className={btn.secondary} disabled={!!busy} onClick={() => { setSendResult(null); setSendOpen(true); }}>
              <Send size={15} aria-hidden /> Send quote
            </button>
          )}
          {canAccept && (
            <button type="button" className={btn.secondary} disabled={!!busy} onClick={() => changeStatus("accepted", "Mark accepted", { title: `Mark ${q.reference} as accepted?`, description: "Use this when the customer confirms the quotation." })}>
              <ThumbsUp size={15} aria-hidden /> Accepted
            </button>
          )}
          {canConvert && (
            <button type="button" className={btn.primary} disabled={!!busy} onClick={() => setConvertOpen(true)} data-testid="convert-open">
              <ShoppingCart size={15} aria-hidden /> Convert to order
            </button>
          )}
          {q.order && (
            <Link href={`/admin/orders?order=${encodeURIComponent(q.order_number ?? "")}`} className={btn.primary}>
              <ShoppingCart size={15} aria-hidden /> Order {q.order_number}
            </Link>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Main column ───────────────────────────────────────────── */}
        <div className="space-y-6 min-w-0">
          <section aria-labelledby="lines-h" className="bg-white border border-[var(--jmn-line)]">
            <SectionHead id="lines-h" title="Line items" hint={editable ? "Enter a unit price per line. Internal list prices are shown for reference only — customers never see them." : undefined} />
            {q.items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink/60">
                No lines — the customer sent {q.attachments_count ? "an attachment" : "notes"} only. Use the quoted total below.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]" data-testid="quote-lines">
                  <thead>
                    <tr className="text-left text-[10px] tracking-[0.14em] uppercase text-ink/60 bg-re-steel-50 border-b border-[var(--jmn-line)]">
                      <th scope="col" className="px-3 py-2 font-semibold w-8">#</th>
                      <th scope="col" className="px-3 py-2 font-semibold">Part / description</th>
                      <th scope="col" className="px-3 py-2 font-semibold text-right">Qty</th>
                      <th scope="col" className="px-3 py-2 font-semibold text-right">List price</th>
                      <th scope="col" className="px-3 py-2 font-semibold text-right w-40">Quoted unit</th>
                      <th scope="col" className="px-3 py-2 font-semibold text-right">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.items.map((it, i) => (
                      <LineRow
                        key={it.id}
                        index={i}
                        item={it}
                        draft={drafts[it.id] ?? { price: "", note: "" }}
                        currency={currency}
                        editable={editable}
                        invalid={computed.invalid.includes(it.id)}
                        linking={linking === it.id}
                        onLinkStart={() => setLinking(it.id)}
                        onLinkCancel={() => setLinking(null)}
                        onChange={(patch) => setLine(it.id, patch)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals / quote terms */}
            <div className="border-t border-[var(--jmn-line)] p-4 grid gap-4 sm:grid-cols-3 items-end bg-re-steel-50">
              <div>
                <p className={field.label}>Sum of priced lines</p>
                <p className="tabular text-lg text-navy" data-testid="lines-sum">
                  {formatMoney(computed.sum, currency)}
                </p>
                <p className="text-[12px] text-ink/60 tabular">
                  {computed.priced}/{q.items.length} lines priced
                </p>
              </div>
              <label className="block">
                <span className={field.label}>Quoted total {editable && "(optional override)"}</span>
                {editable ? (
                  <input
                    inputMode="decimal"
                    value={totalOverride}
                    onChange={(e) => setTotalOverride(e.target.value)}
                    placeholder={q.quoted_total ?? toMoneyString(computed.sum)}
                    className={field.input + " tabular text-right"}
                    data-testid="quoted-total"
                  />
                ) : (
                  <span className="block tabular text-lg text-navy">{formatMoney(q.quoted_total, currency)}</span>
                )}
              </label>
              <label className="block">
                <span className={field.label}>Valid until</span>
                {editable ? (
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className={field.input + " tabular"}
                    data-testid="valid-until"
                  />
                ) : (
                  <span className="block tabular text-lg text-navy">{formatDay(q.valid_until)}</span>
                )}
              </label>
              {editable && (
                <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[12px] text-ink/60">
                    Blank “valid until” uses the default validity from Settings → Quotations.
                    {q.quoted_at && ` Last quoted ${formatDateTime(q.quoted_at)}.`}
                  </p>
                  <button
                    type="button"
                    className={btn.primary}
                    disabled={busy === "quoted"}
                    onClick={markQuoted}
                    data-testid="mark-quoted"
                  >
                    {busy === "quoted" ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} aria-hidden />}
                    {q.status === "quoted" ? "Update quote" : "Mark quoted"}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Customer notes + attachments */}
          <section aria-labelledby="req-h" className="bg-white border border-[var(--jmn-line)]">
            <SectionHead id="req-h" title="Customer message & files" />
            <div className="p-4 space-y-4">
              {q.notes ? (
                <p className="text-sm text-navy whitespace-pre-wrap" lang={q.locale === "bn" ? "bn" : undefined}>
                  {q.notes}
                </p>
              ) : (
                <p className="text-sm text-ink/60">No message.</p>
              )}
              {q.attachments.length > 0 && (
                <Attachments quoteId={q.id} attachments={q.attachments} onDownload={downloadAttachment} />
              )}
            </div>
          </section>

          {/* Internal notes */}
          <section aria-labelledby="notes-h" className="bg-white border border-[var(--jmn-line)]">
            <SectionHead id="notes-h" title="Internal notes" hint="Staff only — never shown to the customer or printed on the quotation." />
            <div className="p-4">
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                aria-label="Internal notes"
                className={field.textarea}
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className={btn.secondary}
                  disabled={busy === "notes" || adminNotes === (q.admin_notes ?? "")}
                  onClick={saveNotes}
                >
                  {busy === "notes" && <Loader2 size={14} className="animate-spin" />}
                  Save notes
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* ── Side column ───────────────────────────────────────────── */}
        <aside className="space-y-6 min-w-0">
          <section aria-labelledby="cust-h" className="bg-white border border-[var(--jmn-line)]">
            <SectionHead id="cust-h" title="Customer" />
            <dl className="p-4 grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <Row k="Company" v={q.company_name} />
              <Row k="Contact" v={q.contact_name} />
              <dt className="text-ink/60">Phone</dt>
              <dd className="min-w-0">
                <a href={telLink(q.phone)} className="part-no text-re-blue-text hover:underline break-all">
                  {q.phone}
                </a>
              </dd>
              <dt className="text-ink/60">Email</dt>
              <dd className="min-w-0 break-all">
                {q.email ? (
                  <a href={`mailto:${q.email}`} className="text-re-blue-text hover:underline">{q.email}</a>
                ) : (
                  <span className="text-ink/55">—</span>
                )}
              </dd>
              <Row k="BIN (VAT)" v={q.bin_number} mono />
              <Row k="Delivery area" v={q.delivery_area} />
              <dt className="text-ink/60">Prefers</dt>
              <dd className="font-medium text-navy">
                {PREFERRED_CONTACT_LABEL[q.preferred_contact] ?? q.preferred_contact}
              </dd>
            </dl>
            <div className="px-4 pb-4 grid grid-cols-2 gap-2">
              <a href={telLink(q.phone)} className={btn.secondary + " h-11"}>
                <Phone size={15} aria-hidden /> Call
              </a>
              {wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" className={btn.whatsapp + " h-11"}>
                  <MessageCircle size={15} aria-hidden /> WhatsApp
                </a>
              ) : (
                <span />
              )}
              {q.email && (
                <a href={`mailto:${q.email}?subject=${encodeURIComponent(`Your quote request ${q.reference}`)}`} className={btn.secondary + " h-11 col-span-2"}>
                  <Mail size={15} aria-hidden /> Email
                </a>
              )}
            </div>
            <CustomerHistory quote={q} />
          </section>

          <section aria-labelledby="time-h" className="bg-white border border-[var(--jmn-line)]">
            <SectionHead id="time-h" title="Timeline" />
            <Timeline quote={q} />
          </section>

          {(canReject || canCancel || canReopen) && (
            <section aria-labelledby="more-h" className="bg-white border border-[var(--jmn-line)]">
              <SectionHead id="more-h" title="Close or reopen" />
              <div className="p-4 flex flex-wrap gap-2">
                {canReopen && (
                  <button type="button" className={btn.secondary} disabled={!!busy} onClick={() => changeStatus("in_review", "Reopen")}>
                    <RotateCcw size={15} aria-hidden /> Reopen for review
                  </button>
                )}
                {canReject && (
                  <button type="button" className={btn.danger} disabled={!!busy} onClick={() => changeStatus("rejected", "Mark rejected", { title: `Mark ${q.reference} as rejected?`, description: "Use when the customer declined or we can't supply. You can reopen it later.", danger: true })}>
                    <ThumbsDown size={15} aria-hidden /> Rejected
                  </button>
                )}
                {canCancel && (
                  <button type="button" className={btn.danger} disabled={!!busy} onClick={() => changeStatus("cancelled", "Cancel quote", { title: `Cancel ${q.reference}?`, description: "Cancelled quotes drop out of the open queue. You can reopen it later.", danger: true })}>
                    <Ban size={15} aria-hidden /> Cancel
                  </button>
                )}
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* Sticky mobile action bar for the main action */}
      {editable && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-10 bg-white border-t border-[var(--jmn-line)] p-3 flex gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-ink/60">Total</p>
            <p className="tabular text-navy truncate">
              {formatMoney(totalOverride ? totalOverride : computed.sum, currency)}
            </p>
          </div>
          <button type="button" className={btn.primary + " h-11"} disabled={busy === "quoted" || !dirty && q.status === "quoted"} onClick={markQuoted}>
            <Check size={15} aria-hidden /> {q.status === "quoted" ? "Update quote" : "Mark quoted"}
          </button>
        </div>
      )}

      <SendQuoteDialog
        open={sendOpen}
        quote={q}
        result={sendResult}
        onClose={() => setSendOpen(false)}
        onSent={(r) => {
          setSendResult(r);
          setQuote((cur) => (cur ? { ...cur, sent_at: r.sent_at, sent_count: r.sent_count } : cur));
        }}
      />
      <ConvertDialog
        open={convertOpen}
        quote={q}
        onClose={() => setConvertOpen(false)}
        onConverted={(fresh) => {
          adopt(fresh);
          notifyQuotesChanged();
        }}
        onNeedLinking={(itemId) => {
          setConvertOpen(false);
          setLinking(itemId);
        }}
      />
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function BackLink() {
  return (
    <Link href="/admin/rfq" className="inline-flex items-center gap-1.5 text-[13px] text-re-blue-text hover:underline">
      <ArrowLeft size={14} aria-hidden /> All quotes
    </Link>
  );
}

function SectionHead({ id, title, hint }: { id: string; title: string; hint?: string }) {
  return (
    <div className="px-4 pt-3 pb-2.5 border-b border-[var(--jmn-line)] re-rule">
      <h2 id={id} className="text-[15px] text-navy">
        {title}
      </h2>
      {hint && <p className="mt-0.5 text-[12px] text-ink/60">{hint}</p>}
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-ink/60">{k}</dt>
      <dd className={cn("min-w-0 break-words text-navy", mono && "part-no")}>
        {v || <span className="text-ink/55">—</span>}
      </dd>
    </>
  );
}

function LineRow({
  index,
  item,
  draft,
  currency,
  editable,
  invalid,
  linking,
  onLinkStart,
  onLinkCancel,
  onChange,
}: {
  index: number;
  item: QuoteItemShape;
  draft: LineDraft;
  currency: string;
  editable: boolean;
  invalid: boolean;
  linking: boolean;
  onLinkStart: () => void;
  onLinkCancel: () => void;
  onChange: (patch: Partial<LineDraft>) => void;
}) {
  const unit = toNumber(draft.price);
  const lineTotal = unit !== null && unit >= 0 ? unit * item.quantity : null;
  const partNo = item.part_number_text || item.product_part_number || "";
  const linkedSlug = draft.link === undefined ? item.product_slug : draft.link;
  const linkedName = draft.link === undefined ? item.product_name : draft.linkLabel;
  const listPrice = draft.link === undefined ? item.product_price : null;

  return (
    <tr className="border-b border-[var(--jmn-line)] last:border-0 align-top">
      <td className="px-3 py-3 tabular text-ink/60">{index + 1}</td>
      <td className="px-3 py-3 min-w-[240px]">
        {partNo && <span className="block part-no text-[13px] text-navy font-medium">{partNo}</span>}
        {item.description && <span className="block text-[13px] text-navy">{item.description}</span>}
        {item.machine_model_text && (
          <span className="block text-[12px] text-ink/60">Machine: {item.machine_model_text}</span>
        )}
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
          {linkedSlug ? (
            <>
              <Link href={`/admin/products/${linkedSlug}/edit`} className="inline-flex items-center gap-1 text-re-blue-text hover:underline">
                <Link2 size={12} aria-hidden /> {linkedName || linkedSlug}
              </Link>
              {editable && (
                <button type="button" onClick={() => onChange({ link: null, linkLabel: undefined })} className="inline-flex items-center gap-1 text-ink/60 hover:text-navy">
                  <Unlink size={12} aria-hidden /> Unlink
                </button>
              )}
            </>
          ) : (
            <>
              <span className="text-[#8A5200]">Not linked to a catalogue part</span>
              {editable && !linking && (
                <button type="button" onClick={onLinkStart} className="inline-flex items-center gap-1 text-re-blue-text hover:underline">
                  <Link2 size={12} aria-hidden /> Link part
                </button>
              )}
            </>
          )}
          {draft.link !== undefined && <span className="text-[11px] text-ink/60">(saved with the quote)</span>}
        </span>
        {linking && (
          <ProductLinker
            initialQuery={partNo || item.description}
            onCancel={onLinkCancel}
            onPick={(h) => {
              onChange({ link: h.slug, linkLabel: h.name });
              onLinkCancel();
            }}
          />
        )}
        {editable ? (
          <input
            value={draft.note}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder="Line note (e.g. compatible alternative, 3 days lead time)"
            aria-label={`Note for line ${index + 1}`}
            className="mt-2 w-full h-8 px-2 text-[12px] border border-re-steel-200 focus:border-re-blue outline-none"
          />
        ) : (
          item.admin_notes && <span className="mt-1 block text-[12px] text-ink/60">Note: {item.admin_notes}</span>
        )}
      </td>
      <td className="px-3 py-3 text-right tabular whitespace-nowrap">{item.quantity}</td>
      <td className="px-3 py-3 text-right whitespace-nowrap">
        {listPrice ? (
          <>
            <span className="tabular text-ink/65">{formatMoney(listPrice, currency)}</span>
            {editable && draft.price !== toNumber(listPrice)?.toFixed(2) && (
              <button
                type="button"
                onClick={() => onChange({ price: toNumber(listPrice)!.toFixed(2) })}
                className="block ml-auto text-[11px] text-re-blue-text hover:underline"
                aria-label={`Use list price for line ${index + 1}`}
              >
                Use
              </button>
            )}
          </>
        ) : (
          <span className="text-ink/55">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        {editable ? (
          <>
            <input
              inputMode="decimal"
              value={draft.price}
              onChange={(e) => onChange({ price: e.target.value.replace(/[^\d.]/g, "") })}
              placeholder="0.00"
              aria-label={`Quoted unit price for line ${index + 1}`}
              aria-invalid={invalid || undefined}
              data-testid="line-price"
              className={cn(
                field.input,
                "h-9 tabular text-right",
                invalid && "border-rose-600",
              )}
            />
            {invalid && <span className={field.error}>Invalid</span>}
          </>
        ) : (
          <span className="tabular">{formatMoney(item.quoted_unit_price, currency)}</span>
        )}
      </td>
      <td className="px-3 py-3 text-right tabular whitespace-nowrap text-navy">
        {lineTotal !== null ? formatMoney(lineTotal, currency) : <span className="text-ink/55">—</span>}
      </td>
    </tr>
  );
}

function Attachments({
  quoteId,
  attachments,
  onDownload,
}: {
  quoteId: string;
  attachments: QuoteShape["attachments"];
  onDownload: (id: string, name: string) => void;
}) {
  const [previews, setPreviews] = useState<Record<string, string>>({});

  // Private files: fetch images with the admin JWT → object URLs.
  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    for (const a of attachments) {
      if (!a.content_type.startsWith("image/") || a.size > 8 * 1024 * 1024) continue;
      djangoAdmin.rfq
        .attachment(quoteId, a.id)
        .then(({ blob }) => {
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          setPreviews((p) => ({ ...p, [a.id]: url }));
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [quoteId, attachments]);

  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-label="Attachments">
      {attachments.map((a) => {
        const isImage = a.content_type.startsWith("image/");
        return (
          <li key={a.id} className="border border-[var(--jmn-line)] flex flex-col">
            {isImage && (
              <div className="aspect-[4/3] bg-re-steel-50 grid place-items-center overflow-hidden border-b border-[var(--jmn-line)]">
                {previews[a.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- blob: URL of a private file
                  <img src={previews[a.id]} alt={a.original_name} className="h-full w-full object-contain" />
                ) : (
                  <FileImage size={22} className="text-ink/30" aria-hidden />
                )}
              </div>
            )}
            <div className="p-2.5 flex items-center gap-2">
              {!isImage && <FileText size={18} className="text-ink/55 shrink-0" aria-hidden />}
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] text-navy truncate" title={a.original_name}>
                  {a.original_name || "attachment"}
                </span>
                <span className="block text-[11px] text-ink/60 tabular">
                  {formatBytes(a.size)} · {a.content_type.split("/")[1] ?? a.content_type}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onDownload(a.id, a.original_name)}
                className="h-9 px-2 inline-flex items-center gap-1 text-[12px] text-re-blue-text hover:underline"
                aria-label={`Download ${a.original_name}`}
              >
                <Download size={14} aria-hidden /> Download
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CustomerHistory({ quote }: { quote: QuoteShape }) {
  const [others, setOthers] = useState<QuoteShape[] | null>(null);
  const byCustomer = !!quote.customer;

  useEffect(() => {
    let cancelled = false;
    djangoAdmin.rfq
      .list(byCustomer ? { customer: quote.customer! } : { search: quote.phone })
      .then((r) => !cancelled && setOthers(r.results.filter((x) => x.id !== quote.id)))
      .catch(() => !cancelled && setOthers([]));
    return () => {
      cancelled = true;
    };
  }, [quote.id, quote.customer, quote.phone, byCustomer]);

  const c = quote.customer_summary;
  return (
    <div className="border-t border-[var(--jmn-line)] px-4 py-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink/65 mb-2">
        {byCustomer ? "Linked customer" : "History for this phone"}
      </p>
      {c && (
        <p className="text-[13px] text-navy mb-2">
          {c.name || c.email}
          {c.company_name && <span className="text-ink/60"> · {c.company_name}</span>}
          <Link href={`/admin/customers?search=${encodeURIComponent(c.email || c.phone)}`} className="ml-2 inline-flex items-center gap-1 text-re-blue-text hover:underline">
            Profile <ExternalLink size={11} aria-hidden />
          </Link>
        </p>
      )}
      {others === null ? (
        <p className="text-[12px] text-ink/60">Loading…</p>
      ) : others.length === 0 ? (
        <p className="text-[12px] text-ink/60">No other quote requests.</p>
      ) : (
        <ul className="space-y-1">
          {others.slice(0, 6).map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2 text-[12px]">
              <Link href={`/admin/rfq/${o.id}`} className="part-no text-re-blue-text hover:underline">
                {o.reference}
              </Link>
              <span className="text-ink/60 tabular">{formatDay(o.created_at)}</span>
              <QuoteStatusPill status={o.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Timeline({ quote: q }: { quote: QuoteShape }) {
  const events: { at: string; label: string; detail?: string }[] = [
    {
      at: q.created_at,
      label: "Request received",
      detail: `${q.items_count} line(s), ${q.attachments_count} file(s) via ${q.locale === "bn" ? "Bangla" : "English"} site`,
    },
  ];
  if (q.quoted_at)
    events.push({ at: q.quoted_at, label: "Quoted", detail: `${formatMoney(q.quoted_total, q.currency)}${q.valid_until ? ` · valid until ${formatDay(q.valid_until)}` : ""}` });
  if (q.sent_at)
    events.push({ at: q.sent_at, label: "Quotation sent", detail: q.sent_count > 1 ? `${q.sent_count} times` : undefined });
  if (q.converted_at)
    events.push({ at: q.converted_at, label: "Converted to order", detail: q.order_number ?? undefined });
  if (["accepted", "rejected", "cancelled", "expired", "in_review"].includes(q.status))
    events.push({ at: q.updated_at, label: `Now ${QUOTE_STATUS_LABEL[q.status].toLowerCase()}` });
  events.sort((a, b) => a.at.localeCompare(b.at));

  return (
    <ol className="p-4 space-y-3">
      {events.map((e, i) => (
        <li key={i} className="grid grid-cols-[12px_minmax(0,1fr)] gap-3">
          <span className={cn("mt-1.5 h-2.5 w-2.5", i === events.length - 1 ? "bg-re-red" : "bg-re-steel-300")} aria-hidden />
          <span>
            <span className="block text-[13px] text-navy font-medium">{e.label}</span>
            {e.detail && <span className="block text-[12px] text-ink/60">{e.detail}</span>}
            <span className="block text-[11px] text-ink/60 tabular">{formatDateTime(e.at)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function SendQuoteDialog({
  open,
  quote,
  result,
  onClose,
  onSent,
}: {
  open: boolean;
  quote: QuoteShape;
  result: QuoteSendResponse | null;
  onClose: () => void;
  onSent: (r: QuoteSendResponse) => void;
}) {
  const toast = useToast();
  const [email, setEmail] = useState(quote.email);
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(!!quote.email);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const r = await djangoAdmin.rfq.sendQuote(quote.id, {
        email: sendEmail ? email.trim() : undefined,
        message: message.trim() || undefined,
        send_email: sendEmail && !!email.trim(),
      });
      onSent(r);
      if (r.emailed) toast.success(`Quotation emailed to ${r.email_to}`);
      else if (r.email_error) toast.error("Email failed", r.email_error);
      else toast.info("Marked as sent", "Share it on WhatsApp below.");
    } catch (e) {
      toast.error("Couldn't send", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title={`Send quotation ${quote.reference}`}
      description={`${formatMoney(quote.quoted_total, quote.currency)} · valid until ${formatDay(quote.valid_until)}`}
      footer={
        result ? (
          <button type="button" className={btn.secondary} onClick={onClose}>Done</button>
        ) : (
          <>
            <button type="button" className={btn.ghost} onClick={onClose}>Cancel</button>
            <button type="button" className={btn.primary} onClick={submit} disabled={busy || (sendEmail && !email.trim())} data-testid="send-quote-submit">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} aria-hidden />}
              {sendEmail ? "Send email" : "Mark sent & get WhatsApp link"}
            </button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-4" data-testid="send-result">
          <p className="text-sm text-navy">
            {result.emailed
              ? <>Emailed the PDF to <strong>{result.email_to}</strong>.</>
              : result.email_error
                ? <span className="text-rose-700">Email failed: {result.email_error}</span>
                : "No email sent."}{" "}
            Sent {result.sent_count} time{result.sent_count === 1 ? "" : "s"}.
          </p>
          {result.whatsapp_url ? (
            <a href={result.whatsapp_url} target="_blank" rel="noopener noreferrer" className={btn.whatsapp + " w-full h-11"}>
              <MessageCircle size={16} aria-hidden /> Open WhatsApp with the quote summary
            </a>
          ) : (
            <p className="text-[13px] text-ink/60">No WhatsApp link — the phone number couldn&apos;t be parsed.</p>
          )}
          <p className="text-[12px] text-ink/60">
            Tip: download the quote PDF and attach it in the WhatsApp chat.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-navy">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="h-4 w-4 accent-[#DD141D]" />
            Email the PDF
          </label>
          {sendEmail && (
            <label className="block">
              <span className={field.label}>To</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field.input} placeholder="buyer@factory.com" />
            </label>
          )}
          <label className="block">
            <span className={field.label}>Message (optional)</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className={field.textarea} placeholder="Thank you for your enquiry. Please find attached our quotation…" />
          </label>
          <p className={field.hint}>
            After sending you&apos;ll get a WhatsApp link with the quote summary for {quote.phone}.
          </p>
        </div>
      )}
    </AdminDialog>
  );
}

const PAYMENT_METHODS: [string, string][] = [
  ["bank_transfer", "Bank transfer"],
  ["cod", "Cash on delivery"],
  ["card", "Card"],
];

function ConvertDialog({
  open,
  quote,
  onClose,
  onConverted,
  onNeedLinking,
}: {
  open: boolean;
  quote: QuoteShape;
  onClose: () => void;
  onConverted: (q: QuoteShape) => void;
  onNeedLinking: (itemId: string) => void;
}) {
  const toast = useToast();
  const [opts, setOpts] = useState<QuoteConvertInput>({
    payment_method: "bank_transfer",
    payment_status: "pending",
    allow_no_stock: false,
    skip_unlinked: false,
  });
  const [shipping, setShipping] = useState("");
  const [tax, setTax] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ code?: string; detail: string; items?: Array<{ id: string; part_number_text: string; description: string; quantity: number }>; order_number?: string } | null>(null);
  const [done, setDone] = useState<{ number: string } | null>(null);

  const unlinked = quote.items.filter((it) => !it.product);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const r = await djangoAdmin.rfq.convertToOrder(quote.id, {
        ...opts,
        shipping: shipping ? toMoneyString(toNumber(shipping) ?? 0) : undefined,
        tax: tax ? toMoneyString(toNumber(tax) ?? 0) : undefined,
      });
      setDone({ number: r.order.order_number });
      onConverted(r.quote);
      toast.success(`Order ${r.order.order_number} created from ${quote.reference}`);
    } catch (e) {
      if (e instanceof DjangoApiError) {
        setErr({
          code: e.code,
          detail: (e.body.detail as string) || e.message,
          items: e.body.items as never,
          order_number: (e.body.order_number as string) || undefined,
        });
      } else {
        setErr({ detail: (e as Error).message });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      wide
      title={`Convert ${quote.reference} to an order`}
      description={`Creates a staff order at the quoted prices (${formatMoney(quote.quoted_total, quote.currency)}) and reserves stock.`}
      footer={
        done ? (
          <>
            <button type="button" className={btn.ghost} onClick={onClose}>Close</button>
            <Link href={`/admin/orders?order=${encodeURIComponent(done.number)}`} className={btn.primary}>
              Open order {done.number}
            </Link>
          </>
        ) : (
          <>
            <button type="button" className={btn.ghost} onClick={onClose}>Cancel</button>
            <button type="button" className={btn.primary} onClick={submit} disabled={busy} data-testid="convert-submit">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <ShoppingCart size={15} aria-hidden />}
              Create order
            </button>
          </>
        )
      }
    >
      {done ? (
        <p className="text-sm text-navy" data-testid="convert-done">
          Order <strong className="part-no">{done.number}</strong> was created. The quote is now marked converted.
        </p>
      ) : (
        <div className="space-y-4">
          {err && (
            <div role="alert" className="border border-rose-300 bg-rose-50 p-3 text-[13px] text-rose-800 space-y-2">
              <p>{err.detail}</p>
              {err.code === "unlinked_items" && err.items && (
                <>
                  <ul className="list-disc pl-5">
                    {err.items.map((it) => (
                      <li key={it.id}>
                        <span className="part-no">{it.part_number_text || "—"}</span> {it.description} × {it.quantity}{" "}
                        <button type="button" className="underline" onClick={() => onNeedLinking(it.id)}>Link a part</button>
                      </li>
                    ))}
                  </ul>
                  <p>Or tick “Skip unlinked lines” below.</p>
                </>
              )}
              {err.code === "stock" && <p>Tick “Allow without stock” to create the order anyway (back-order).</p>}
              {err.code === "already_converted" && err.order_number && (
                <Link className="underline" href={`/admin/orders?order=${encodeURIComponent(err.order_number)}`}>Open order {err.order_number}</Link>
              )}
            </div>
          )}
          {unlinked.length > 0 && !err && (
            <p className="border border-[#E9C77A] bg-[#FFF4DC] p-3 text-[13px] text-[#6B4000]">
              {unlinked.length} line{unlinked.length === 1 ? " is" : "s are"} not linked to a catalogue part. Link them first, or skip them.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={field.label}>Payment method</span>
              <select className={field.input} value={opts.payment_method} onChange={(e) => setOpts({ ...opts, payment_method: e.target.value })}>
                {PAYMENT_METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={field.label}>Payment status</span>
              <select className={field.input} value={opts.payment_status} onChange={(e) => setOpts({ ...opts, payment_status: e.target.value as "pending" | "paid" })}>
                <option value="pending">Pending</option>
                <option value="paid">Paid (commits stock now)</option>
              </select>
            </label>
            <label className="block">
              <span className={field.label}>Freight / delivery ({quote.currency})</span>
              <input inputMode="decimal" className={field.input + " tabular"} value={shipping} onChange={(e) => setShipping(e.target.value)} placeholder="0.00" />
            </label>
            <label className="block">
              <span className={field.label}>VAT / tax ({quote.currency})</span>
              <input inputMode="decimal" className={field.input + " tabular"} value={tax} onChange={(e) => setTax(e.target.value)} placeholder="0.00" />
            </label>
          </div>
          <label className="block">
            <span className={field.label}>Internal note on the order</span>
            <input className={field.input} value={opts.internal_notes ?? ""} onChange={(e) => setOpts({ ...opts, internal_notes: e.target.value })} />
          </label>
          <div className="flex flex-col gap-2 text-sm text-navy">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-[#DD141D]" checked={!!opts.skip_unlinked} onChange={(e) => setOpts({ ...opts, skip_unlinked: e.target.checked })} />
              Skip unlinked lines
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-[#DD141D]" checked={!!opts.allow_no_stock} onChange={(e) => setOpts({ ...opts, allow_no_stock: e.target.checked })} />
              Allow without stock (back-order)
            </label>
          </div>
        </div>
      )}
    </AdminDialog>
  );
}
