import type { NextRequest } from "next/server";
import { newsletterRepo } from "@/server/db";
import { clientKey, rateLimit } from "@/server/rateLimit";
import { newsletterSchema, zodErrorToFields } from "@/server/validators";
import { Errors, okJson } from "@/server/http";

export async function POST(req: NextRequest) {
  const limit = rateLimit(clientKey(req, "newsletter"), { limit: 5, windowMs: 60_000 });
  if (!limit.ok) return Errors.RATE_LIMITED();

  const body = await req.json().catch(() => null);
  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) return Errors.VALIDATION(zodErrorToFields(parsed.error));

  newsletterRepo.subscribe(parsed.data.email, parsed.data.source);
  return okJson({ subscribed: true });
}
