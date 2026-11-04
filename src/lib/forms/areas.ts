/**
 * Delivery-area choices for the RFQ form: Bangladesh's garment clusters
 * first (where most maintenance teams are), then divisional cities, then
 * "other" (free text). The option value is the English name, stored as-is
 * on the quote so staff read the same thing in either UI language; labels
 * come from `rfq.areas.<key>` messages.
 */
export const DELIVERY_AREAS = [
  { key: "dhakaCity", value: "Dhaka city" },
  { key: "gazipur", value: "Gazipur" },
  { key: "tongi", value: "Tongi" },
  { key: "savarAshulia", value: "Savar / Ashulia" },
  { key: "narayanganj", value: "Narayanganj" },
  { key: "narsingdi", value: "Narsingdi" },
  { key: "chattogram", value: "Chattogram" },
  { key: "cumilla", value: "Cumilla" },
  { key: "mymensingh", value: "Mymensingh" },
] as const;

export type DeliveryAreaKey = (typeof DELIVERY_AREAS)[number]["key"];
