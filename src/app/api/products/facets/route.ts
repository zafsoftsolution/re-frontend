import { productService } from "@/server/services/productService";
import { okJson } from "@/server/http";

export async function GET() {
  return okJson(productService.facets());
}
