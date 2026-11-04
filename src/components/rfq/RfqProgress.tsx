"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RfqStep {
  /** Section element id (in-page anchor). */
  id: string;
  label: string;
  done: boolean;
}

/**
 * Phones/tablets: the RFQ as a 4-step wizard strip (Parts → Files →
 * Contact → Send) that sticks under the app bar. Each step is an in-page
 * link (works without JS); with JS the step whose section is on screen is
 * marked current and finished steps get a tick. The form itself stays one
 * long, forgiving page — nothing is hidden behind a "Next" button.
 */
export function RfqProgress({ steps, label }: { steps: RfqStep[]; label: string }) {
  const [current, setCurrent] = useState(steps[0]?.id);
  const ids = steps.map((s) => s.id).join(",");

  useEffect(() => {
    const els = ids
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    // The section crossing a line ~40% down the viewport is the current step.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(e.target.id);
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);

  return (
    <nav
      aria-label={label}
      className="sticky top-14 z-20 -mx-4 border-b border-re-ink bg-re-paper/95 px-4 backdrop-blur-[2px] md:top-0 md:-mx-6 md:px-6 lg:hidden"
    >
      <ol className="grid grid-cols-4">
        {steps.map((s, i) => {
          const active = s.id === current;
          return (
            <li key={s.id} className="min-w-0">
              <a
                href={`#${s.id}`}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "relative flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 text-[0.75rem] font-semibold",
                  active ? "text-re-ink" : "text-re-steel-600",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "re-mono grid size-6 place-items-center text-[0.75rem]",
                    s.done ? "bg-re-stock-in text-white" : active ? "bg-re-ink text-white" : "border border-re-steel-400",
                  )}
                >
                  {s.done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className="max-w-full truncate">{s.label}</span>
                {s.done && <span className="sr-only">✓</span>}
                {active && <span aria-hidden className="absolute inset-x-2 bottom-0 h-[3px] bg-re-red" />}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
