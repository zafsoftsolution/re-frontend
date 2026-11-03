import type { NextRequest } from "next/server";
import { userRepo } from "@/server/db";
import { signToken, verifyPassword } from "@/server/auth";
import { clientKey, rateLimit } from "@/server/rateLimit";
import { loginSchema, zodErrorToFields } from "@/server/validators";
import { Errors, okJson } from "@/server/http";

export async function POST(req: NextRequest) {
  const limit = rateLimit(clientKey(req, "login"), { limit: 10, windowMs: 60_000 });
  if (!limit.ok) return Errors.RATE_LIMITED();

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return Errors.VALIDATION(zodErrorToFields(parsed.error));

  const { email, password } = parsed.data;
  const user = userRepo.findByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return Errors.UNAUTHORIZED("Invalid email or password");
  }

  const token = await signToken({ sub: user.id, email: user.email, role: "customer" });
  return okJson({ user: userRepo.publicShape(user), token });
}
