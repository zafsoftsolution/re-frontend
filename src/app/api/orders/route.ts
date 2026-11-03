import type { NextRequest } from "next/server";
import { getSession } from "@/server/auth";
import { orderRepo, productRepo, userRepo } from "@/server/db";
import { orderService } from "@/server/services/orderService";
import { checkoutSchema, zodErrorToFields } from "@/server/validators";
import { Errors, okJson } from "@/server/http";
import type { CartItem } from "@/types";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return Errors.UNAUTHORIZED();
  return okJson(orderRepo.findByUser(session.sub));
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  const body = await req.json().catch(() => null);
  if (!body) return Errors.VALIDATION({ _: ["Invalid JSON body"] });

  const { items: rawItems, ...checkoutRaw } = body as {
    items: Array<{ productId: string; size: string; color: string; quantity: number }>;
  } & Record<string, unknown>;

  const parsedCheckout = checkoutSchema.safeParse(checkoutRaw);
  if (!parsedCheckout.success) return Errors.VALIDATION(zodErrorToFields(parsedCheckout.error));
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return Errors.VALIDATION({ items: ["Cart cannot be empty"] });
  }

  const items: CartItem[] = [];
  for (const raw of rawItems) {
    const product = productRepo.findById(raw.productId);
    if (!product) return Errors.VALIDATION({ items: [`Product ${raw.productId} not found`] });
    items.push({
      id: `${product.id}:${raw.size}:${raw.color}`,
      productId: product.id,
      product,
      quantity: raw.quantity,
      selectedSize: raw.size as CartItem["selectedSize"],
      selectedColor: raw.color,
      addedAt: new Date().toISOString(),
    });
  }

  // Guest checkout resolves to a synthetic guest id; authenticated users get theirs.
  const userId = session?.sub ?? "guest";

  const order = orderService.create({ userId, items, checkout: parsedCheckout.data });

  if (session) {
    const user = userRepo.findById(session.sub);
    if (user) userRepo.update(user.id, { orders: [...user.orders, order.id] });
  }

  return okJson(order, undefined, { status: 201 });
}
