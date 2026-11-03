import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";

const SECRET = new TextEncoder().encode(
  process.env.JMN_JWT_SECRET ?? "jmn-dev-secret-please-change-in-prod-0xA47"
);

export interface TokenPayload {
  sub: string;
  email: string;
  role: "customer" | "admin";
  adminRole?: string;
  iat?: number;
  exp?: number;
}

export async function signToken(payload: Omit<TokenPayload, "iat" | "exp">, ttl = "7d") {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("jmn-apparels")
    .setExpirationTime(ttl)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, { issuer: "jmn-apparels" });
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export function getBearer(req: NextRequest | Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim();
}

export async function getSession(req: NextRequest | Request) {
  const token = getBearer(req);
  if (!token) return null;
  return await verifyToken(token);
}

export async function requireAuth(req: NextRequest | Request) {
  const session = await getSession(req);
  if (!session) throw new AuthError("UNAUTHORIZED", "Authentication required", 401);
  return session;
}

export async function requireAdmin(req: NextRequest | Request) {
  const session = await requireAuth(req);
  if (session.role !== "admin")
    throw new AuthError("FORBIDDEN", "Admin access required", 403);
  return session;
}

export class AuthError extends Error {
  constructor(public code: string, public override message: string, public status: number) {
    super(message);
  }
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
