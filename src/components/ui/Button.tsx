import type { ComponentProps } from "react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./button-styles";

export { buttonClass };
export type { ButtonSize, ButtonVariant };

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass({ variant, size }, className)} {...props} />;
}

type AnchorProps = ComponentProps<"a"> & { variant?: ButtonVariant; size?: ButtonSize };

/** External / protocol links styled as buttons (tel:, wa.me, mailto:). */
export function ButtonAnchor({ variant, size, className, ...props }: AnchorProps) {
  return <a className={buttonClass({ variant, size }, className)} {...props} />;
}
