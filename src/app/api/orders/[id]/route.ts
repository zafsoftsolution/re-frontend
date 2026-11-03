import type { NextRequest } from "next/server";
import { orderRepo } from "@/server/db";
import { getSession } from "@/server/auth";
import { Errors, okJson } from "@/server/http";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  const { id } = await ctx.params;
  const order = orderRepo.findById(id);
  if (!order) return Errors.NOT_FOUND("Order");
  if (session?.role !== "admin" && order.userId !== session?.sub) {
    return Errors.FORBIDDEN();
  }
  return okJson(order);
}
