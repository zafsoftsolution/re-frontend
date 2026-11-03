import type { NextRequest } from "next/server";
import { productService } from "@/server/services/productService";
import { productQuerySchema, zodErrorToFields } from "@/server/validators";
import { Errors, okJson, paginate } from "@/server/http";

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = productQuerySchema.safeParse(params);
  if (!parsed.success) return Errors.VALIDATION(zodErrorToFields(parsed.error));

  const q = parsed.data;
  const filtered = productService.search(q);
  const { items, meta } = paginate(filtered, q.page, q.pageSize);
  return okJson(items, meta);
}
