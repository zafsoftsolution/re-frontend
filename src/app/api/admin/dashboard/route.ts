import type { NextRequest } from "next/server";
import { dashboardStats } from "@/data/adminStats";
import { getSession } from "@/server/auth";
import { Errors, okJson } from "@/server/http";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== "admin") return Errors.UNAUTHORIZED();
  return okJson(dashboardStats);
}
