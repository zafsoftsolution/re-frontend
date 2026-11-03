import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ScrollStage } from "@/components/scroll/ScrollStage";
import { HookAssemblyFigure, type FigurePart } from "./HookAssemblyFigure";

export interface FigureItem {
  key: FigurePart;
  name: string;
  note: string;
  /** Category page, or a search when the category doesn't exist yet. */
  href: string | { pathname: "/search"; query: { q: string } };
  meta: string;
}

/**
 * Home § 02 — "From the machine to the part". Server-rendered and complete
 * on its own (exploded drawing + numbered parts list = reduced motion /
 * no JS). On desktop the track reserves the scroll length in CSS and the
 * stage sticks, so the scrubbed timeline never shifts layout (CLS 0); on
 * phones it's a normal section with a short one-off reveal.
 */
export function PartsBookScene({
  items,
  labels,
}: {
  items: FigureItem[];
  labels: {
    index: string;
    title: string;
    lead: string;
    figTitle: string;
    figSub: string;
    figAria: string;
    scale: string;
    step: string;
    listLabel: string;
  };
}) {
  const total = String(items.length).padStart(2, "0");
  return (
    <section aria-labelledby="home-partsbook" className="mt-16 border-y border-re-ink bg-re-paper">
      <ScrollStage scene="exploded">
        <div data-track className="motion-safe:lg:h-[280vh]">
          <div
            data-stage
            className="re-shell grid gap-8 py-12 motion-safe:lg:sticky motion-safe:lg:top-0 lg:h-svh lg:max-h-[60rem] lg:min-h-[40rem] lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-8"
          >
            {/* Copy + parts list */}
            <div className="lg:col-span-5">
              <header className="relative border-t border-re-steel-200 pt-5">
                <span aria-hidden className="absolute -top-px left-0 h-[3px] w-12 bg-re-red" />
                <span className="re-label mb-1.5 block">§ {labels.index}</span>
                <h2 id="home-partsbook" className="text-[1.875rem] text-re-ink sm:text-[2.375rem] lg:text-[2.75rem] lg:leading-[1]">
                  {labels.title}
                </h2>
                <p className="mt-3 max-w-md text-re-steel-600">{labels.lead}</p>
              </header>

              <ol aria-label={labels.listLabel} className="mt-6 border-t border-re-ink">
                {items.map((it, i) => (
                  <li
                    key={it.key}
                    data-row={it.key}
                    data-active={i === 0 ? "true" : undefined}
                    className="group/r border-b border-re-steel-200"
                  >
                    <Link
                      href={it.href}
                      className="grid min-h-14 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5 transition-colors duration-150 hover:bg-re-steel-50"
                    >
                      <span
                        aria-hidden
                        className="re-mono grid size-8 place-items-center border border-re-ink text-[0.875rem] font-semibold text-re-ink transition-colors duration-150 group-data-[active=true]/r:border-re-red group-data-[active=true]/r:bg-re-red group-data-[active=true]/r:text-white"
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold leading-snug text-re-ink">{it.name}</span>
                        <span className="mt-0.5 block text-[0.8125rem] leading-snug text-re-steel-600 lg:line-clamp-2">
                          {it.note}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 text-[0.8125rem] text-re-blue">
                        <span className="re-mono whitespace-nowrap">{it.meta}</span>
                        <ArrowRight aria-hidden className="size-4 transition-transform duration-150 group-hover/r:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>

            {/* Drawing sheet */}
            <figure className="lg:col-span-7 lg:flex lg:h-full lg:flex-col lg:justify-center">
              <div className="relative border border-re-ink bg-re-paper re-grid-paper lg:flex lg:min-h-0 lg:flex-1 lg:items-center lg:justify-center">
                {/* registration marks */}
                <span aria-hidden className="absolute top-2 left-2 size-3 border-t border-l border-re-ink" />
                <span aria-hidden className="absolute top-2 right-2 size-3 border-t border-r border-re-ink" />
                <span aria-hidden className="absolute bottom-2 left-2 size-3 border-b border-l border-re-ink" />
                <span aria-hidden className="absolute right-2 bottom-2 size-3 border-r border-b border-re-ink" />
                <div className="mx-auto w-full max-w-[36rem] p-5 sm:p-8 lg:h-full lg:max-h-[38rem] lg:w-auto lg:aspect-square lg:p-6">
                  <HookAssemblyFigure label={labels.figAria} />
                </div>
              </div>
              {/* title block */}
              <figcaption className="grid grid-cols-[auto_minmax(0,1fr)_auto] border-x border-b border-re-ink text-[0.8125rem] sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
                <span className="re-mono border-r border-re-ink px-3 py-2 font-semibold">FIG. 01</span>
                <span className="min-w-0 px-3 py-2">
                  <span className="block font-semibold leading-tight text-re-ink">{labels.figTitle}</span>
                  <span className="block truncate text-[0.75rem] text-re-steel-600">{labels.figSub}</span>
                </span>
                <span className="re-mono hidden border-l border-re-ink px-3 py-2 text-re-steel-600 sm:block">
                  {labels.scale}
                </span>
                <span className="re-mono border-l border-re-ink px-3 py-2 tabular-nums">
                  <span className="sr-only">{labels.step} </span>
                  <span data-step-readout className="font-semibold text-re-red-text">
                    01
                  </span>
                  <span className="text-re-steel-600"> / {total}</span>
                </span>
              </figcaption>
            </figure>
          </div>
        </div>
      </ScrollStage>
    </section>
  );
}
