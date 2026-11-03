import type { NextRequest } from "next/server";
import { productRepo, reviewRepo } from "@/server/db";
import { productService } from "@/server/services/productService";
import { Errors, okJson } from "@/server/http";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const product = productRepo.findBySlug(slug);
  if (!product) return Errors.NOT_FOUND("Product");

  const reviews = reviewRepo.findByProduct(product.id);
  const related = productService.related(product.id, 4);

  return okJson({ product, reviews, related });
}
