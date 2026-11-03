import type { NextRequest } from "next/server";
import { userRepo } from "@/server/db";
import { getSession } from "@/server/auth";
import { Errors, okJson } from "@/server/http";
import { updateProfileSchema, zodErrorToFields } from "@/server/validators";
import type { User } from "@/types";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== "customer") return Errors.UNAUTHORIZED();
  const user = userRepo.findById(session.sub);
  if (!user) return Errors.NOT_FOUND("User");
  return okJson(userRepo.publicShape(user));
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== "customer") return Errors.UNAUTHORIZED();

  const body = await req.json().catch(() => null);
  if (!body) return Errors.VALIDATION({ _: ["Invalid JSON body"] });

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) return Errors.VALIDATION(zodErrorToFields(parsed.error));

  const user = userRepo.findById(session.sub);
  if (!user) return Errors.NOT_FOUND("User");

  const patch: Partial<User> = {};
  if (parsed.data.firstName !== undefined) patch.firstName = parsed.data.firstName;
  if (parsed.data.lastName !== undefined) patch.lastName = parsed.data.lastName;
  if (parsed.data.phone !== undefined) patch.phone = parsed.data.phone;
  if (parsed.data.dateOfBirth !== undefined) patch.dateOfBirth = parsed.data.dateOfBirth;
  if (parsed.data.marketingOptIn !== undefined) patch.marketingOptIn = parsed.data.marketingOptIn;
  if (patch.firstName !== undefined || patch.lastName !== undefined) {
    patch.name = `${patch.firstName ?? user.firstName} ${patch.lastName ?? user.lastName}`.trim();
  }

  const updated = userRepo.update(user.id, patch);
  if (!updated) return Errors.INTERNAL();
  return okJson(userRepo.publicShape(updated));
}
