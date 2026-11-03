import type { NextRequest } from "next/server";
import { lookbookRepo, productRepo } from "@/server/db";
import { Errors, okJson } from "@/server/http";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const lookbook = lookbookRepo.findBySlug(slug);
  if (!lookbook) return Errors.NOT_FOUND("Lookbook");

  const products = lookbook.productIds
    .map((id) => productRepo.findById(id))
    .filter(Boolean);

  return okJson({ lookbook, products });
}
