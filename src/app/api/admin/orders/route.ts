import type { NextRequest } from "next/server";
import { orderRepo } from "@/server/db";
import { AuthError, requireAdmin } from "@/server/auth";
import { errJson, okJson, Errors } from "@/server/http";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof AuthError) return errJson(e.code, e.message, { status: e.status });
    return Errors.INTERNAL();
  }
  return okJson(orderRepo.findAll());
}
