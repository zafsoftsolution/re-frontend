"use client";

import type { ReactNode } from "react";
import { Menu as BaseMenu } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

const popupClass =
  "min-w-48 origin-[var(--transform-origin)] rounded-re border border-re-steel-200 bg-re-paper py-1 shadow-re-float outline-none " +
  "transition-[opacity,scale] duration-120 ease-re data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0";

export const menuItemClass =
  "flex min-h-11 cursor-default items-center gap-2 px-3 text-[0.9375rem] text-re-ink outline-none select-none " +
  "data-highlighted:bg-re-steel-100 data-disabled:opacity-50";

/** Dropdown menu (e.g. desktop nav overflow, sort). Restyled Base UI Menu. */
export function Menu({
  trigger,
  children,
  align = "start",
}: {
  trigger: React.ReactElement;
  children: ReactNode;
  align?: "start" | "center" | "end";
}) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner sideOffset={6} align={align} className="z-50 outline-none">
          <BaseMenu.Popup className={popupClass}>{children}</BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

export function MenuItem({ className, ...props }: React.ComponentProps<typeof BaseMenu.Item>) {
  return <BaseMenu.Item className={cn(menuItemClass, className as string)} {...props} />;
}

export function MenuLinkItem({ className, ...props }: React.ComponentProps<typeof BaseMenu.LinkItem>) {
  return <BaseMenu.LinkItem className={cn(menuItemClass, className as string)} {...props} />;
}

export const MenuSeparator = () => <BaseMenu.Separator className="my-1 h-px bg-re-steel-200" />;
