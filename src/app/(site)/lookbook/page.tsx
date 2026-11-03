import type { Metadata } from "next";
import LookbookIndex from "@/components/lookbook/LookbookIndex";
import { storefront } from "@/lib/storefront";

export const metadata: Metadata = {
  title: "Lookbook",
  description:
    "Editorial captures of every Rakib Enterprise collection — photography, styling, atmosphere.",
};

export default async function LookbookPage() {
  const lookbooks = await storefront.lookbooks.list().catch(() => []);
  return <LookbookIndex lookbooks={lookbooks} />;
}
