"use client";

/**
 * Phone input with built-in country selector.
 *
 * Wraps `react-phone-number-input` and:
 *   - Defaults the country to Bangladesh (BD) — the buyer's primary market.
 *   - Renders flag + dial-code dropdown alongside a national-format input.
 *   - Stores values in E.164 (+8801712345678) so the backend gets a single
 *     canonical format regardless of how the user typed it.
 *   - Inherits the brand's bottom-border input style used in the checkout
 *     form. Library default styling is overridden in `globals.css`.
 *
 * Usage:
 *   <PhoneField value={phone} onChange={setPhone} required />
 *
 * Validity helper:
 *   import { isValidPhoneNumber } from "react-phone-number-input";
 *   isValidPhoneNumber(phone);     // true if E.164 + valid for the country
 */

import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  /** ISO 3166-1 alpha-2. Defaults to "BD". */
  defaultCountry?: string;
  className?: string;
  ariaLabel?: string;
}

export default function PhoneField({
  value,
  onChange,
  placeholder,
  required,
  defaultCountry = "BD",
  className,
  ariaLabel,
}: Props) {
  return (
    <PhoneInput
      international
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      defaultCountry={defaultCountry as any}
      value={value || undefined}
      onChange={(v) => onChange(v ?? "")}
      placeholder={placeholder ?? "1712 345 678"}
      countryCallingCodeEditable={false}
      aria-label={ariaLabel ?? "Phone number"}
      // The library renders a <select> + <input>; we wrap it so we can
      // attach a class for the override in globals.css.
      className={`jmn-phone-field${required ? " jmn-phone-required" : ""}${className ? " " + className : ""}`}
    />
  );
}
