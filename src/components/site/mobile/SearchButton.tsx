"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { SearchSheetProps } from "./SearchSheet";

// The sheet (Base UI dialog + its UI) is fetched on first intent, not with the page.
const loadSheet = () => import("./SearchSheet").then((m) => m.SearchSheet);
const SearchSheet = dynamic(loadSheet, { ssr: false });

/**
 * Header search button on phones. A real link to /search (works without JS);
 * with JS it opens the full-screen search sheet instead.
 */
export function SearchButton({ className, ...data }: Omit<SearchSheetProps, "open" | "onOpenChange"> & { className?: string }) {
  const t = useTranslations("site.search");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  return (
    <>
      <Link
        href="/search"
        aria-label={t("open")}
        aria-haspopup="dialog"
        aria-expanded={open}
        prefetch={false}
        onPointerDown={() => void loadSheet()}
        onFocus={() => void loadSheet()}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          setMounted(true);
          setOpen(true);
        }}
        className={cn("grid size-11 place-items-center text-re-ink active:bg-re-steel-100", className)}
      >
        <Search aria-hidden className="size-[1.375rem]" strokeWidth={1.75} />
      </Link>
      {mounted && <SearchSheet open={open} onOpenChange={setOpen} {...data} />}
    </>
  );
}
