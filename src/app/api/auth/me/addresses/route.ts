import type { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { userRepo } from "@/server/db";
import { getSession } from "@/server/auth";
import { Errors, okJson } from "@/server/http";
import { addressInputSchema, zodErrorToFields } from "@/server/validators";
import type { Address } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== "customer") return Errors.UNAUTHORIZED();

  const body = await req.json().catch(() => null);
  if (!body) return Errors.VALIDATION({ _: ["Invalid JSON body"] });

  const parsed = addressInputSchema.safeParse(body);
  if (!parsed.success) return Errors.VALIDATION(zodErrorToFields(parsed.error));

  const user = userRepo.findById(session.sub);
  if (!user) return Errors.NOT_FOUND("User");

  const newAddr: Address = { ...parsed.data, id: `addr_${nanoid(8)}` };
  const isFirst = user.addresses.length === 0;
  const makeDefault = parsed.data.isDefault === true || isFirst;

  let addresses = user.addresses;
  if (makeDefault) addresses = addresses.map((a) => ({ ...a, isDefault: false }));
  newAddr.isDefault = makeDefault;
  addresses = [...addresses, newAddr];

  const updated = userRepo.update(user.id, {
    addresses,
    defaultAddressId: makeDefault ? newAddr.id : user.defaultAddressId,
  });
  if (!updated) return Errors.INTERNAL();
  return okJson(userRepo.publicShape(updated), undefined, { status: 201 });
}
