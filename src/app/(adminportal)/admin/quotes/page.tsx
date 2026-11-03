import { redirect } from "next/navigation";

/** Alias — the quotes inbox lives at /admin/rfq (notification links use it). */
export default function QuotesAlias() {
  redirect("/admin/rfq");
}
