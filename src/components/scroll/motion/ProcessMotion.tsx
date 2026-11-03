"use client";

import type { RefObject } from "react";
import { MOTION_QUERIES, gsap, refreshWhenSettled, useGSAP } from "../gsap";

/**
 * About's process line. Desktop: the rule draws down the steps as you
 * scroll (scaleY, scrubbed) and red moves to the step the line has reached.
 * Phones: the rule draws once when the list enters. Reduced motion: never
 * mounted → full rule, the server-chosen step stays red.
 */
export default function ProcessMotion({ scope }: { scope: RefObject<HTMLDivElement | null> }) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const q = gsap.utils.selector(root);
      const line = root.querySelector<HTMLElement>("[data-line]");
      const list = root.querySelector<HTMLElement>("[data-steps]");
      const steps = q("[data-step]");
      if (!line || !list || steps.length === 0) return;
      const initial = steps.findIndex((s) => s.hasAttribute("data-active"));

      const setActive = (i: number) =>
        steps.forEach((s, j) => (j === i ? s.setAttribute("data-active", "true") : s.removeAttribute("data-active")));

      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, (ctx) => {
        const { desktop } = ctx.conditions as { desktop: boolean; mobile: boolean };
        gsap.set(line, { scaleY: 0, transformOrigin: "50% 0%" });
        if (desktop) {
          setActive(0);
          gsap.to(line, {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: list,
              start: "top 65%",
              end: "bottom 65%",
              scrub: 0.4,
              onUpdate: (self) => {
                // The step whose node the drawn line has passed.
                const y = self.progress * list.offsetHeight;
                let idx = 0;
                steps.forEach((s, j) => {
                  if (s.offsetTop <= y + 4) idx = j;
                });
                setActive(idx);
              },
            },
          });
        } else {
          gsap.to(line, {
            scaleY: 1,
            duration: 0.9,
            ease: "power2.out",
            scrollTrigger: { trigger: list, start: "top 80%", toggleActions: "play none none reverse" },
          });
        }
        return () => setActive(initial);
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
