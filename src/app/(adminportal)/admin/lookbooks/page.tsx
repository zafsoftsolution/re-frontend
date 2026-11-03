import { redirect } from "next/navigation";

/**
 * Retired fashion-era screen (lookbooks). Rakib Enterprise sells machine spare
 * parts; the data is kept untouched in the database, but there is nothing to
 * manage here any more — send old bookmarks to the dashboard.
 */
export default function RetiredLookbooksPage() {
  redirect("/admin");
}
