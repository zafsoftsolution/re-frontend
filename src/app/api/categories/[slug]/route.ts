import type { NextRequest } from "next/server";
import { categoryRepo } from "@/server/db";
import { productService } from "@/server/services/productService";
import { Errors, okJson } from "@/server/http";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const cat = categoryRepo.findBySlug(slug);
  if (!cat) return Errors.NOT_FOUND("Category");
  const products = productService.search({ category: slug, page: 1, pageSize: 100, sort: "featured" });
  return okJson({ category: cat, products });
}
