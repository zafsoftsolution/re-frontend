import { testimonialRepo } from "@/server/db";
import { okJson } from "@/server/http";

export async function GET() {
  return okJson(testimonialRepo.findAll());
}
