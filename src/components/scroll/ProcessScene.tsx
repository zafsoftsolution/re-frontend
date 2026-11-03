import { cn } from "@/lib/utils";
import { ScrollStage } from "./ScrollStage";

export interface ProcessStep {
  title: string;
  body: string;
  /** Short spec-sheet caption, e.g. "Output · formal quote". */
  spec: string;
}

/**
 * A numbered process drawn as one vertical rule through square nodes, like
 * a routing sheet. Static (no JS / reduced motion): full rule, `active` step
 * in red. With motion the rule draws as you scroll (scroll/motion/ProcessMotion).
 */
export function ProcessScene({ steps, active = 0, className }: { steps: ProcessStep[]; active?: number; className?: string }) {
  return (
    <ScrollStage scene="process" className={className}>
      <ol data-steps className="relative">
        <span aria-hidden data-line className="absolute top-2 bottom-8 left-[1.1875rem] w-0.5 bg-re-ink" />
        {steps.map((s, i) => (
          <li
            key={s.title}
            data-step
            data-active={i === active ? "true" : undefined}
            className="group/s relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-5 pb-10 last:pb-0 sm:gap-x-7"
          >
            <span
              aria-hidden
              className={cn(
                "re-mono relative grid size-10 place-items-center border border-re-ink bg-re-paper text-[0.9375rem] font-semibold text-re-ink",
                "transition-colors duration-150 group-data-[active=true]/s:border-re-red group-data-[active=true]/s:bg-re-red group-data-[active=true]/s:text-white",
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 pt-1.5">
              <p className="re-label">{s.spec}</p>
              <h3 className="mt-1 text-[1.25rem] text-re-ink sm:text-[1.5rem]">{s.title}</h3>
              <p className="mt-2 max-w-xl text-re-steel-600">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </ScrollStage>
  );
}
