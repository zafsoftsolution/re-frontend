import type { NextRequest } from "next/server";
import { userRepo } from "@/server/db";
import { getSession } from "@/server/auth";
import { Errors, okJson } from "@/server/http";
import { updateAddressSchema, zodErrorToFields } from "@/server/validators";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session || session.role !== "customer") return Errors.UNAUTHORIZED();
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  if (!body) return Errors.VALIDATION({ _: ["Invalid JSON body"] });

  const parsed = updateAddressSchema.safeParse(body);
  if (!parsed.success) return Errors.VALIDATION(zodErrorToFields(parsed.error));

  const user = userRepo.findById(session.sub);
  if (!user) return Errors.NOT_FOUND("User");

  const idx = user.addresses.findIndex((a) => a.id === id);
  if (idx === -1) return Errors.NOT_FOUND("Address");

  let addresses = [...user.addresses];
  const makeDefault = parsed.data.isDefault === true;
  if (makeDefault) addresses = addresses.map((a) => ({ ...a, isDefault: false }));
  addresses[idx] = { ...addresses[idx], ...parsed.data, id };

  const updated = userRepo.update(user.id, {
    addresses,
    defaultAddressId: makeDefault ? id : user.defaultAddressId,
  });
  if (!updated) return Errors.INTERNAL();
  return okJson(userRepo.publicShape(updated));
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session || session.role !== "customer") return Errors.UNAUTHORIZED();
  const { id } = await ctx.params;

  const user = userRepo.findById(session.sub);
  if (!user) return Errors.NOT_FOUND("User");

  const addresses = user.addresses.filter((a) => a.id !== id);
  if (addresses.length === user.addresses.length) return Errors.NOT_FOUND("Address");

  let defaultAddressId = user.defaultAddressId;
  if (defaultAddressId === id) {
    if (addresses.length > 0) {
      addresses[0] = { ...addresses[0], isDefault: true };
      defaultAddressId = addresses[0].id;
    } else {
      defaultAddressId = undefined;
    }
  }

  const updated = userRepo.update(user.id, { addresses, defaultAddressId });
  if (!updated) return Errors.INTERNAL();
  return okJson(userRepo.publicShape(updated));
}
