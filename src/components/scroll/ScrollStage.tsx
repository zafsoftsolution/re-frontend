"use client";

import { useRef, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

/**
 * Wraps a fully server-rendered, readable scene (the static / reduced-motion
 * / no-JS version) and, only when the visitor allows motion, lazy-loads the
 * GSAP island that animates it. The island renders nothing; it animates the
 * markup inside `scope` with transforms and opacity only.
 *
 * GSAP lives in the islands' async chunks (see ./gsap.ts), so pages that
 * don't mount a ScrollStage never download it, and the content never waits
 * for it.
 */
export type SceneName = "exploded" | "process" | "rule";

type MotionProps = { scope: RefObject<HTMLDivElement | null> };

const MOTION: Record<SceneName, React.ComponentType<MotionProps>> = {
  exploded: dynamic(() => import("./motion/ExplodedMotion"), { ssr: false }),
  process: dynamic(() => import("./motion/ProcessMotion"), { ssr: false }),
  rule: dynamic(() => import("./motion/RuleMotion"), { ssr: false }),
};

const QUERY = "(prefers-reduced-motion: no-preference)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function ScrollStage({
  scene,
  children,
  className,
  id,
}: {
  scene: SceneName;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const scope = useRef<HTMLDivElement>(null);
  const motionOk = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
  const Motion = MOTION[scene];
  return (
    <div ref={scope} id={id} data-scene={scene} className={cn(className)}>
      {children}
      {motionOk && <Motion scope={scope} />}
    </div>
  );
}
