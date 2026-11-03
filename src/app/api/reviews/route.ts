import type { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { productRepo, reviewRepo, userRepo } from "@/server/db";
import { getSession } from "@/server/auth";
import { reviewSchema, zodErrorToFields } from "@/server/validators";
import { Errors, okJson } from "@/server/http";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return Errors.UNAUTHORIZED();

  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return Errors.VALIDATION(zodErrorToFields(parsed.error));

  const { productId, rating, title, comment, fit } = parsed.data;
  const product = productRepo.findById(productId);
  if (!product) return Errors.NOT_FOUND("Product");

  const user = userRepo.findById(session.sub);
  const review = reviewRepo.insert({
    id: `rev_${nanoid(10)}`,
    productId,
    userId: session.sub,
    userName: user?.name ?? "Customer",
    rating,
    title,
    comment,
    date: new Date().toISOString(),
    verified: !!user,
    helpful: 0,
    fit,
  });

  // Recompute aggregate
  const all = reviewRepo.findByProduct(productId);
  const avg =
    all.reduce((s, r) => s + r.rating, 0) / Math.max(1, all.length);
  productRepo.update(productId, {
    rating: Math.round(avg * 10) / 10,
    reviewCount: all.length,
  });

  return okJson(review, undefined, { status: 201 });
}
