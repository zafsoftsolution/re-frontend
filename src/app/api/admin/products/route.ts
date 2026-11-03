import type { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { productRepo } from "@/server/db";
import { requireAdmin, AuthError } from "@/server/auth";
import { adminProductCreateSchema, zodErrorToFields } from "@/server/validators";
import { Errors, errJson, okJson } from "@/server/http";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof AuthError) return errJson(e.code, e.message, { status: e.status });
    return Errors.INTERNAL();
  }
  return okJson(productRepo.findAll());
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof AuthError) return errJson(e.code, e.message, { status: e.status });
    return Errors.INTERNAL();
  }

  const body = await req.json().catch(() => null);
  const parsed = adminProductCreateSchema.safeParse(body);
  if (!parsed.success) return Errors.VALIDATION(zodErrorToFields(parsed.error));

  const now = new Date().toISOString();
  const product = productRepo.insert({
    id: `prd_${nanoid(10)}`,
    ...parsed.data,
    currency: "USD",
    rating: 0,
    reviewCount: 0,
    createdAt: now,
    updatedAt: now,
  } as Parameters<typeof productRepo.insert>[0]);

  return okJson(product, undefined, { status: 201 });
}
