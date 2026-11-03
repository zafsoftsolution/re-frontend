import type { NextRequest } from "next/server";
import { db, userRepo } from "@/server/db";
import { AuthError, requireAdmin } from "@/server/auth";
import { Errors, errJson, okJson } from "@/server/http";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof AuthError) return errJson(e.code, e.message, { status: e.status });
    return Errors.INTERNAL();
  }
  const users = db.users.map((u) => userRepo.publicShape(u));
  return okJson(users);
}
