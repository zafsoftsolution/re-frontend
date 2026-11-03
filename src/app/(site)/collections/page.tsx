import type { Metadata } from "next";
import CollectionsIndex from "@/components/collections/CollectionsIndex";
import { storefront } from "@/lib/storefront";

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Chapters of the house — every collection currently in rotation at Rakib Enterprise.",
};

export default async function CollectionsPage() {
  const collections = await storefront.collections.list().catch(() => []);
  return <CollectionsIndex collections={collections} />;
}
