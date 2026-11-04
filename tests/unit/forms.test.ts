import { describe, expect, it } from "vitest";
import { formatBdPhone, isBdPhone, normalizeBdPhone } from "@/lib/forms/phone";
import {
  checkFiles,
  checkoutRequestSchema,
  checkoutSchema,
  contactSchema,
  fieldErrors,
  rfqContactSchema,
  rfqItemSchema,
} from "@/lib/forms/schemas";
import {
  clientIp,
  djangoRfqBody,
  drfErrors,
  filesFromForm,
  forwardHeaders,
  RFQ_REFERENCE,
  rfqContactFromForm,
  rfqItemsFromForm,
  sameOrigin,
  sitePath,
} from "@/lib/forms/forward";
import { guestCheckoutBody, splitName } from "@/lib/forms/checkout";

const headers = (h: Record<string, string>) => new Headers(h);

describe("BD phone", () => {
  it.each([
    ["01711-123456", "01711123456"],
    ["01711 123 456", "01711123456"],
    ["+880 1711-123456", "01711123456"],
    ["8801711123456", "01711123456"],
    ["008801711123456", "01711123456"],
    ["1711123456", "01711123456"],
    ["০১৭১১১২৩৪৫৬", "01711123456"],
    ["(02) 9123456", "029123456"],
    ["02-55012345", "0255012345"],
  ])("normalises %s", (input, out) => {
    expect(normalizeBdPhone(input)).toBe(out);
  });

  it.each(["", "12345", "01211123456", "0171112345", "017111234567", "+44 7700 900123", "01711-12345a", "call me"])("rejects %s", (input) => {
    expect(isBdPhone(input)).toBe(false);
  });

  it("formats mobiles for display", () => {
    expect(formatBdPhone("01711123456")).toBe("01711-123456");
    expect(formatBdPhone("029123456")).toBe("029123456");
  });
});

describe("RFQ schemas", () => {
  it("accepts a phone-only contact and normalises the phone", () => {
    const r = rfqContactSchema.parse({ phone: "+880 1811 000111" });
    expect(r.phone).toBe("01811000111");
    expect(r.preferredContact).toBe("whatsapp");
    expect(r.email).toBe("");
  });

  it("returns error codes, not prose", () => {
    const r = rfqContactSchema.safeParse({ phone: "123", email: "nope", binNumber: "12" });
    expect(r.success).toBe(false);
    const errs = fieldErrors(r.error!);
    expect(errs.phone).toBe("phone_invalid");
    expect(errs.email).toBe("email_invalid");
    expect(errs.binNumber).toBe("bin_invalid");
  });

  it("requires a phone", () => {
    expect(fieldErrors(rfqContactSchema.safeParse({ phone: "  " }).error!).phone).toBe("phone_required");
  });

  it("needs an email when the buyer wants an email reply", () => {
    const r = rfqContactSchema.safeParse({ phone: "01711123456", preferredContact: "email" });
    expect(fieldErrors(r.error!).email).toBe("email_required_for_contact");
  });

  it("validates BIN length (9–13 digits, Bangla digits ok)", () => {
    expect(rfqContactSchema.safeParse({ phone: "01711123456", binNumber: "000123456-0101" }).success).toBe(true);
    expect(rfqContactSchema.safeParse({ phone: "01711123456", binNumber: "০০০১২৩৪৫৬" }).success).toBe(true);
    expect(rfqContactSchema.safeParse({ phone: "01711123456", binNumber: "12345678" }).success).toBe(false);
  });

  it("items need a product, part number or description", () => {
    expect(rfqItemSchema.safeParse({ quantity: 2 }).success).toBe(false);
    expect(rfqItemSchema.parse({ partNumber: "B1109-552-H00", quantity: "3" })).toMatchObject({ partNumber: "B1109-552-H00", quantity: 3, productSlug: "" });
    expect(rfqItemSchema.safeParse({ description: "feed dog", quantity: 0 }).success).toBe(false);
  });

  it("checks attachments like the backend", () => {
    const mb = 1024 * 1024;
    expect(checkFiles([{ name: "list.xlsx", size: mb }, { name: "photo.JPG", size: 2 * mb }])).toEqual([]);
    expect(checkFiles([{ name: "virus.exe", size: 10 }])).toEqual([{ name: "virus.exe", code: "file_type" }]);
    expect(checkFiles([{ name: "big.pdf", size: 11 * mb }])).toEqual([{ name: "big.pdf", code: "file_size" }]);
    expect(checkFiles([{ name: "empty.csv", size: 0 }])).toEqual([{ name: "empty.csv", code: "file_empty" }]);
    expect(checkFiles(Array.from({ length: 6 }, (_, i) => ({ name: `${i}.png`, size: 10 })))[0]).toEqual({ name: "", code: "file_count" });
  });
});

describe("checkout + contact schemas", () => {
  const ok = { name: "Rahim Uddin", phone: "01711123456", division: "dhaka", district: "Gazipur", area: "Konabari", street: "Plot 12, ABC Knit Ltd" };
  it("accepts a minimal BD address", () => {
    const v = checkoutSchema.parse(ok);
    expect(v.paymentMethod).toBe("cod");
    expect(v.postcode).toBe("");
  });
  it("rejects bad division / postcode", () => {
    const e = fieldErrors(checkoutSchema.safeParse({ ...ok, division: "london", postcode: "12" }).error!);
    expect(e.division).toBe("division_required");
    expect(e.postcode).toBe("postcode_invalid");
  });
  it("caps checkout quantity at the backend's 99", () => {
    expect(checkoutRequestSchema.safeParse({ values: ok, items: [{ productSlug: "x", qty: 100 }] }).success).toBe(false);
    expect(checkoutRequestSchema.safeParse({ values: ok, items: [] }).success).toBe(false);
    expect(checkoutRequestSchema.parse({ values: ok, items: [{ productSlug: "x", qty: "2" }] }).locale).toBe("en");
  });
  it("contact needs name, phone, email and a real message", () => {
    const e = fieldErrors(contactSchema.safeParse({ name: "A", phone: "1", email: "", message: "hi" }).error!);
    expect(e).toMatchObject({ name: "name_required", phone: "phone_invalid", email: "email_required", message: "message_short" });
    expect(contactSchema.safeParse({ name: "Karim", phone: "01911222333", email: "k@example.com", message: "Need 20 DBx1 #14 needles" }).success).toBe(true);
  });
});

describe("route-handler forwarding helpers", () => {
  it("forwards only the single visitor IP NPM appended, never a client chain", () => {
    // Only the right-most hop (appended by Nginx Proxy Manager) is trusted.
    expect(clientIp(headers({ "x-forwarded-for": "1.2.3.4, 103.4.5.6" }))).toBe("103.4.5.6");
    expect(clientIp(headers({ "x-forwarded-for": "junk, 103.4.5.6" }))).toBe("103.4.5.6");
    expect(clientIp(headers({ "x-forwarded-for": "103.4.5.6, junk" }))).toBe("");
    expect(clientIp(headers({ "x-forwarded-for": "8.8.8.8", "x-real-ip": "103.4.5.6" }))).toBe("8.8.8.8");
    expect(clientIp(headers({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1");
    expect(clientIp(headers({ "x-forwarded-for": "<script>" }))).toBe("");
    expect(clientIp(headers({}))).toBe("");
  });

  it("never sends the internal secret, forwards IP + locale", () => {
    const h = forwardHeaders({ locale: "bn", ip: "103.4.5.6", userAgent: "UA", json: true });
    expect(h).toEqual({ Accept: "application/json", "Accept-Language": "bn", "Content-Type": "application/json", "X-Forwarded-For": "103.4.5.6", "User-Agent": "UA" });
    expect(Object.keys(forwardHeaders({ locale: "en" })).map((k) => k.toLowerCase())).not.toContain("x-internal-secret");
  });

  it("checks same-origin posts", () => {
    expect(sameOrigin(headers({ origin: "https://rakibenterprise-bd.com", host: "rakibenterprise-bd.com" }), "https://rakibenterprise-bd.com/api/rfq")).toBe(true);
    expect(sameOrigin(headers({ origin: "https://evil.example", host: "rakibenterprise-bd.com" }), "https://rakibenterprise-bd.com/api/rfq")).toBe(false);
    expect(sameOrigin(headers({ host: "x" }), "http://x/api/rfq")).toBe(true);
  });

  it("reads JS items JSON or the no-JS line fields", () => {
    const js = new FormData();
    js.append("items", JSON.stringify([{ productSlug: "hook-ddl", partNumber: "B1830", quantity: 4 }]));
    expect(rfqItemsFromForm(js)).toEqual([{ productSlug: "hook-ddl", partNumber: "B1830", quantity: 4 }]);

    const plain = new FormData();
    for (const [pn, desc, qty, model] of [["B1109-552-H00", "", "৩", "DDL-8700"], ["", "", "1", ""], ["", "feed dog", "", ""]]) {
      plain.append("line_pn", pn);
      plain.append("line_desc", desc);
      plain.append("line_qty", qty);
      plain.append("line_model", model);
    }
    expect(rfqItemsFromForm(plain)).toEqual([
      { partNumber: "B1109-552-H00", description: "", machineModel: "DDL-8700", quantity: 3 },
      { partNumber: "", description: "feed dog", machineModel: "", quantity: 1 },
    ]);
  });

  it("maps contact fields, incl. the 'other' delivery area", () => {
    const fd = new FormData();
    fd.append("phone", "01711123456");
    fd.append("delivery_area", "other");
    fd.append("delivery_area_other", "Bogura");
    fd.append("company_name", "ABC");
    expect(rfqContactFromForm(fd)).toMatchObject({ phone: "01711123456", deliveryArea: "Bogura", companyName: "ABC", preferredContact: "whatsapp" });
  });

  it("drops the empty file part a no-JS form sends", () => {
    const fd = new FormData();
    fd.append("attachments", new File([], ""));
    fd.append("attachments", new File(["a,b"], "list.csv", { type: "text/csv" }));
    expect(filesFromForm(fd).map((f) => f.name)).toEqual(["list.csv"]);
  });

  it("builds the Django multipart body", () => {
    const contact = rfqContactSchema.parse({ phone: "01711123456", companyName: "ABC Knit" });
    const file = new File(["x"], "photo.png", { type: "image/png" });
    const fd = djangoRfqBody(contact, [rfqItemSchema.parse({ productSlug: "hook-ddl", quantity: 2 })], [file], "bn");
    expect(fd.get("phone")).toBe("01711123456");
    expect(fd.get("company_name")).toBe("ABC Knit");
    expect(fd.get("locale")).toBe("bn");
    expect(fd.get("website")).toBe("");
    expect(JSON.parse(fd.get("items") as string)).toEqual([{ product: "hook-ddl", part_number: "", description: "", quantity: 2, machine_model: "" }]);
    expect((fd.get("attachments") as File).name).toBe("photo.png");
  });

  it("flattens DRF errors", () => {
    expect(drfErrors({ detail: "Nope", phone: ["Enter a valid phone number."], items: [{ product: ["x"] }] })).toEqual({
      detail: ["Nope"],
      phone: ["Enter a valid phone number."],
      items: ['{"product":["x"]}'],
    });
  });

  it("references and locale paths", () => {
    expect(RFQ_REFERENCE.test("RFQ-2026-000012")).toBe(true);
    expect(RFQ_REFERENCE.test("RFQ-2026-<b>")).toBe(false);
    expect(sitePath("bn", "/rfq/sent")).toBe("/bn/rfq/sent");
    expect(sitePath("en", "/rfq/sent")).toBe("/rfq/sent");
  });
});

describe("guest checkout body", () => {
  it("splits names for the backend's first/last name", () => {
    expect(splitName("Md. Rahim Uddin")).toEqual({ first: "Md. Rahim", last: "Uddin" });
    expect(splitName("Karim")).toEqual({ first: "Karim", last: "Karim" });
  });
  it("builds the DirectCheckoutSerializer shape", () => {
    const v = checkoutSchema.parse({ name: "Rahim Uddin", phone: "+8801711123456", division: "dhaka", district: "Gazipur", area: "Konabari", street: "Plot 12" });
    const body = guestCheckoutBody(v, [{ id: "0d3f64ac-d69e-4581-a973-1fc684c57f7b", qty: 2 }]);
    expect(body).toMatchObject({
      customer_phone: "01711123456",
      payment_method: "cod",
      currency: "BDT",
      items: [{ product: "0d3f64ac-d69e-4581-a973-1fc684c57f7b", quantity: 2 }],
      shipping_address: { first_name: "Rahim", last_name: "Uddin", line1: "Plot 12", line2: "Konabari", city: "Gazipur", state: "Dhaka", postcode: "0000", country: "BD" },
    });
  });
});
