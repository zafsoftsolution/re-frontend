import { cacheLife } from "next/cache";

/**
 * Current year for the footer copyright. Cache Components forbids reading the
 * clock during prerender outside a cache scope, so it lives in one.
 */
export async function getCurrentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
