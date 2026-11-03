import type { NextRequest } from "next/server";
import { couponRepo } from "@/server/db";
import { Errors, okJson } from "@/server/http";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code } = await ctx.params;
  const coupon = couponRepo.findByCode(code);
  if (!coupon || !coupon.active) return Errors.NOT_FOUND("Coupon");

  const now = new Date();
  if (new Date(coupon.validFrom) > now || new Date(coupon.validUntil) < now) {
    return Errors.NOT_FOUND("Coupon expired");
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return Errors.NOT_FOUND("Coupon usage limit reached");
  }

  return okJson(coupon);
}
