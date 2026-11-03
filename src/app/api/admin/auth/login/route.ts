import type { NextRequest } from "next/server";
import { adminRepo } from "@/server/db";
import { signToken, verifyPassword } from "@/server/auth";
import { clientKey, rateLimit } from "@/server/rateLimit";
import { adminLoginSchema, zodErrorToFields } from "@/server/validators";
import { Errors, okJson } from "@/server/http";

export async function POST(req: NextRequest) {
  const limit = rateLimit(clientKey(req, "admin-login"), { limit: 8, windowMs: 60_000 });
  if (!limit.ok) return Errors.RATE_LIMITED();

  const body = await req.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) return Errors.VALIDATION(zodErrorToFields(parsed.error));

  const admin = adminRepo.findByEmail(parsed.data.email);
  if (!admin || !(await verifyPassword(parsed.data.password, admin.passwordHash))) {
    return Errors.UNAUTHORIZED("Invalid credentials");
  }

  const token = await signToken({
    sub: admin.id,
    email: admin.email,
    role: "admin",
    adminRole: admin.role,
  });
  return okJson({ admin: adminRepo.publicShape(admin), token });
}
