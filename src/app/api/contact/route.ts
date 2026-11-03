import type { NextRequest } from "next/server";
import { contactRepo } from "@/server/db";
import { clientKey, rateLimit } from "@/server/rateLimit";
import { contactSchema, zodErrorToFields } from "@/server/validators";
import { Errors, okJson } from "@/server/http";

export async function POST(req: NextRequest) {
  const limit = rateLimit(clientKey(req, "contact"), { limit: 5, windowMs: 60_000 });
  if (!limit.ok) return Errors.RATE_LIMITED();

  const body = await req.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return Errors.VALIDATION(zodErrorToFields(parsed.error));

  const entry = contactRepo.submit(parsed.data);
  return okJson({ submitted: true, id: entry.id });
}
