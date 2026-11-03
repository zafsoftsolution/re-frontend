import type { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { userRepo } from "@/server/db";
import { hashPassword, signToken } from "@/server/auth";
import { clientKey, rateLimit } from "@/server/rateLimit";
import { registerSchema, zodErrorToFields } from "@/server/validators";
import { Errors, okJson } from "@/server/http";

export async function POST(req: NextRequest) {
  const limit = rateLimit(clientKey(req, "register"), { limit: 5, windowMs: 60_000 });
  if (!limit.ok) return Errors.RATE_LIMITED();

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return Errors.VALIDATION(zodErrorToFields(parsed.error));

  const { email, password, firstName, lastName, marketingOptIn } = parsed.data;
  if (userRepo.findByEmail(email)) {
    return Errors.CONFLICT("An account with this email already exists");
  }

  const user = userRepo.insert({
    id: `usr_${nanoid(10)}`,
    email: email.toLowerCase(),
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    passwordHash: await hashPassword(password),
    addresses: [],
    orders: [],
    wishlist: [],
    loyaltyPoints: 0,
    loyaltyTier: "silver",
    createdAt: new Date().toISOString(),
    emailVerified: false,
    marketingOptIn: !!marketingOptIn,
  });

  const token = await signToken({ sub: user.id, email: user.email, role: "customer" });
  return okJson({ user: userRepo.publicShape(user), token }, undefined, { status: 201 });
}
