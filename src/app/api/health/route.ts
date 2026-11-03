import { okJson } from "@/server/http";

export async function GET() {
  return okJson({
    status: "ok",
    service: "Rakib Enterprise API",
    version: "0.1.0",
    time: new Date().toISOString(),
  });
}
