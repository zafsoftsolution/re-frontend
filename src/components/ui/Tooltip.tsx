"use client";

import type { ReactNode } from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";

/**
 * Hover/focus hint for icon-only controls on desktop. Never put essential
 * information only in a tooltip (touch users won't see it).
 */
export function Tooltip({ content, children }: { content: ReactNode; children: React.ReactElement }) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner sideOffset={6} className="z-50">
          <BaseTooltip.Popup className="rounded-re bg-re-ink px-2 py-1 text-[0.8125rem] text-white transition-opacity duration-120 data-ending-style:opacity-0 data-starting-style:opacity-0">
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

export const TooltipProvider = BaseTooltip.Provider;
