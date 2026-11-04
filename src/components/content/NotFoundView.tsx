import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button-styles";

/** Localized "not in the catalogue" body (used by not-found.tsx and the catch-all page). */
export function NotFoundView() {
  const t = useTranslations("notFound");
  return (
    <div className="re-shell py-16 md:py-24" data-testid="not-found">
      <p className="re-mono text-[4.5rem] leading-none font-semibold text-re-red md:text-[7rem]">{t("code")}</p>
      <h1 className="mt-6 max-w-[22ch] text-[2rem] md:text-[2.75rem]">{t("title")}</h1>
      <p className="mt-4 max-w-xl text-re-steel-600">{t("body")}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/search" className={buttonClass({ variant: "primary" })}>
          {t("search")}
        </Link>
        <Link href="/" className={buttonClass({ variant: "secondary" })}>
          {t("home")}
        </Link>
      </div>
    </div>
  );
}
