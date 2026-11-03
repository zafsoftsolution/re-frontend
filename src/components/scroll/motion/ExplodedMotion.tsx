"use client";

import type { RefObject } from "react";
import { ASSEMBLY, FIGURE_PARTS } from "@/components/home/HookAssemblyFigure";
import { MOTION_QUERIES, ScrollTrigger, gsap, refreshWhenSettled, useGSAP } from "../gsap";

const HOLD = 0.6; // timeline units the assembled machine / finished sheet stay put
const STEP = 0.9; // one part separating
const MOVE = 1.1;

/**
 * Motion for home's exploded hook assembly. Desktop: the CSS-reserved track
 * (data-track, 280vh) scrubs a timeline while the stage sticks — assembled
 * machine first, then each part slides out along its axis, its numbered
 * callout arrives, and red marks the part that is moving (bubble + list
 * row + step readout). Phones: one short reveal when the drawing enters.
 * Reduced motion: never mounted (see ScrollStage) → static exploded sheet.
 */
export default function ExplodedMotion({ scope }: { scope: RefObject<HTMLDivElement | null> }) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const q = gsap.utils.selector(root);
      const track = root.querySelector<HTMLElement>("[data-track]");
      const svg = root.querySelector("svg");
      if (!track || !svg) return;

      const part = (k: string) => q(`[data-part="${k}"], [data-callout="${k}"]`);
      const callout = (k: string) => q(`[data-callout="${k}"]`);
      const readout = root.querySelector<HTMLElement>("[data-step-readout]");
      let current = -1;
      const setActive = (i: number) => {
        if (i === current) return;
        current = i;
        FIGURE_PARTS.forEach((k, j) => {
          for (const el of q(`[data-callout="${k}"], [data-row="${k}"]`)) {
            if (j === i) el.setAttribute("data-active", "true");
            else el.removeAttribute("data-active");
          }
        });
        if (readout) readout.textContent = String(i + 1).padStart(2, "0");
      };

      const assemble = () => {
        for (const k of FIGURE_PARTS) gsap.set(part(k), { x: ASSEMBLY[k].x, y: ASSEMBLY[k].y });
        gsap.set(q("[data-callout]"), { autoAlpha: 0 });
      };

      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, (ctx) => {
        const { desktop } = ctx.conditions as { desktop: boolean; mobile: boolean };
        assemble();
        const movers = q("[data-part], [data-callout]");

        if (desktop) {
          const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
          FIGURE_PARTS.forEach((k, i) => {
            const at = HOLD + i * STEP;
            tl.to(part(k), { x: 0, y: 0, duration: MOVE }, at);
            tl.to(callout(k), { autoAlpha: 1, duration: 0.35, ease: "none" }, at + MOVE * 0.55);
          });
          tl.to({}, { duration: HOLD }); // finished sheet holds before the stage releases
          const total = tl.duration();

          ScrollTrigger.create({
            trigger: track,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.5,
            animation: tl,
            onToggle: (self) => gsap.set(movers, { willChange: self.isActive ? "transform" : "auto" }),
            onUpdate: (self) => {
              const t = self.progress * total;
              setActive(Math.max(0, Math.min(FIGURE_PARTS.length - 1, Math.floor((t - HOLD) / STEP))));
            },
          });
        } else {
          setActive(0);
          gsap
            .timeline({
              defaults: { ease: "power2.out" },
              scrollTrigger: { trigger: svg, start: "top 75%", toggleActions: "play none none reverse" },
            })
            .to(q("[data-part]"), { x: 0, y: 0, duration: 0.7, stagger: 0.08 }, 0)
            .to(q("[data-callout]"), { x: 0, y: 0, duration: 0.7, stagger: 0.08 }, 0)
            .to(q("[data-callout]"), { autoAlpha: 1, duration: 0.25, stagger: 0.08, ease: "none" }, 0.45);
        }

        return () => setActive(0);
      });

      const stop = refreshWhenSettled();
      return () => {
        stop();
        mm.revert();
      };
    },
    { scope },
  );
  return null;
}
