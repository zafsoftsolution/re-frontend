/**
 * Part-number helpers. Buyers type part numbers every way imaginable:
 * "b1101-012-000", "B1101 012 000", "B1101.012.000", "১১০-৪৫০০০" (Bangla
 * digits from a Bangla keyboard), full-width characters pasted from PDFs.
 * `normalizePartNumber` reduces all of those to one comparable key.
 */

const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Bangla (U+09E6–U+09EF) → Latin digits. */
export function toLatinDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)));
}

/**
 * Comparable key: NFKC (folds full-width chars), Latin digits, upper-case,
 * separators (space - _ . / \ #) removed. Keeps letters and digits only.
 */
export function normalizePartNumber(input: string): string {
  return toLatinDigits(input.normalize("NFKC"))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Heuristic: does a search query look like a part number (vs. words like
 * "juki needle")? 3–40 chars of code characters, contains a digit, at most
 * three tokens, and every token is either numeric-ish or a short code.
 */
export function looksLikePartNumber(input: string): boolean {
  const q = toLatinDigits(input.normalize("NFKC")).trim();
  if (q.length < 3 || q.length > 40) return false;
  if (!/\d/.test(q)) return false;
  if (!/^[A-Za-z0-9][A-Za-z0-9\-_./# ]*$/.test(q)) return false;
  const tokens = q.split(/\s+/);
  if (tokens.length > 3) return false;
  return tokens.every((t) => /\d/.test(t) || t.length <= 3);
}
