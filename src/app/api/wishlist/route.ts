import type { NextRequest } from "next/server";
import { getSession } from "@/server/auth";
import { productRepo, userRepo } from "@/server/db";
import { Errors, okJson } from "@/server/http";
import { z } from "zod";
import { zodErrorToFields } from "@/server/validators";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return Errors.UNAUTHORIZED();
  const user = userRepo.findById(session.sub);
  if (!user) return Errors.NOT_FOUND("User");
  const products = user.wishlist
    .map((id) => productRepo.findById(id))
    .filter(Boolean);
  return okJson(products);
}

const toggleSchema = z.object({
  productId: z.string(),
  action: z.enum(["add", "remove", "toggle"]).default("toggle"),
});

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return Errors.UNAUTHORIZED();
  const body = await req.json().catch(() => null);
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) return Errors.VALIDATION(zodErrorToFields(parsed.error));

  const user = userRepo.findById(session.sub);
  if (!user) return Errors.NOT_FOUND("User");
  const product = productRepo.findById(parsed.data.productId);
  if (!product) return Errors.NOT_FOUND("Product");

  const has = user.wishlist.includes(product.id);
  let next = user.wishlist;
  if (parsed.data.action === "add" || (parsed.data.action === "toggle" && !has)) {
    if (!has) next = [product.id, ...user.wishlist];
  } else if (parsed.data.action === "remove" || (parsed.data.action === "toggle" && has)) {
    next = user.wishlist.filter((id) => id !== product.id);
  }
  userRepo.update(user.id, { wishlist: next });
  return okJson({ wishlist: next });
}
