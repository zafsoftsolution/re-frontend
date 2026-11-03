"use client";

import type { RefObject } from "react";
import { MOTION_QUERIES, gsap, useGSAP } from "../gsap";

/**
 * A spec-sheet rule ([data-rule]) that draws across once when it enters
 * (scaleX, transform only). Used under Home's quoting steps. Reduced
 * motion: never mounted → the rule is simply there.
 */
export default function RuleMotion({ scope }: { scope: RefObject<HTMLDivElement | null> }) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const rules = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-rule]"));
      if (rules.length === 0) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, () => {
        gsap.set(rules, { scaleX: 0, transformOrigin: "0% 50%" });
        gsap.to(rules, {
          scaleX: 1,
          duration: 0.9,
          ease: "power2.out",
          stagger: 0.15,
          scrollTrigger: { trigger: root, start: "top 80%", toggleActions: "play none none reverse" },
        });
      });
      return () => mm.revert();
    },
    { scope },
  );
  return null;
}
