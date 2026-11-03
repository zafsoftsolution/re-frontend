import type { NextRequest } from "next/server";
import { productRepo } from "@/server/db";
import { AuthError, requireAdmin } from "@/server/auth";
import { adminProductUpdateSchema, zodErrorToFields } from "@/server/validators";
import { Errors, errJson, okJson } from "@/server/http";

async function guard(req: NextRequest) {
  try {
    await requireAdmin(req);
    return null;
  } catch (e) {
    if (e instanceof AuthError) return errJson(e.code, e.message, { status: e.status });
    return Errors.INTERNAL();
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const product = productRepo.findById(id);
  if (!product) return Errors.NOT_FOUND("Product");
  return okJson(product);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = adminProductUpdateSchema.safeParse(body);
  if (!parsed.success) return Errors.VALIDATION(zodErrorToFields(parsed.error));

  const updated = productRepo.update(id, parsed.data as Parameters<typeof productRepo.update>[1]);
  if (!updated) return Errors.NOT_FOUND("Product");
  return okJson(updated);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await guard(req);
  if (unauthorized) return unauthorized;
  const { id } = await ctx.params;
  const ok = productRepo.remove(id);
  if (!ok) return Errors.NOT_FOUND("Product");
  return okJson({ deleted: true });
}
