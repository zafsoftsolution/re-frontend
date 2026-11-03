import type { NextRequest } from "next/server";
import { collectionRepo, productRepo } from "@/server/db";
import { Errors, okJson } from "@/server/http";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const collection = collectionRepo.findBySlug(slug);
  if (!collection) return Errors.NOT_FOUND("Collection");

  const products = collection.productIds
    .map((id) => productRepo.findById(id))
    .filter(Boolean);

  return okJson({ collection, products });
}
