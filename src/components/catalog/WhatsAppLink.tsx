import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { whatsappHref } from "@/lib/format";
import { buttonClass, type ButtonSize, type ButtonVariant } from "@/components/ui/button-styles";
import { WhatsAppIcon } from "@/components/icons/brand";

/**
 * WhatsApp CTA with a prefilled message. When the site has no WhatsApp
 * number configured it links to /contact instead (never a dead wa.me link).
 */
export function WhatsAppLink({
  number,
  text,
  children,
  variant = "whatsapp",
  size = "md",
  className,
}: {
  number: string;
  text: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const href = whatsappHref(number, text);
  const cls = buttonClass({ variant, size }, className);
  const body = (
    <>
      <WhatsAppIcon />
      {children}
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener" className={cls}>
      {body}
    </a>
  ) : (
    <Link href="/contact" className={cls}>
      {body}
    </Link>
  );
}
