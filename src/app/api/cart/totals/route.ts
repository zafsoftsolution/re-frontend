import type { NextRequest } from "next/server";
import { productRepo } from "@/server/db";
import { orderService } from "@/server/services/orderService";
import { Errors, okJson } from "@/server/http";
import type { CartItem } from "@/types";

/** Compute cart totals — used by cart drawer / checkout for authoritative numbers. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    items?: Array<{ productId: string; size: string; color: string; quantity: number }>;
    couponCode?: string;
  } | null;

  if (!body?.items) return Errors.VALIDATION({ items: ["Required"] });

  const items: CartItem[] = [];
  for (const raw of body.items) {
    const product = productRepo.findById(raw.productId);
    if (!product) continue;
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

  const totals = orderService.computeTotals(items, body.couponCode);
  return okJson(totals);
}
