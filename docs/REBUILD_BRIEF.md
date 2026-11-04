# Rakib Enterprise — public site rebuild brief

Single source of truth for everyone working on the rebuild. Read it fully before
touching code. Branch: `rebuild` in both repos. **Never push to `main`** (main
auto-deploys to production).

## Business

Rakib Enterprise (Bangladesh, rakibenterprise-bd.com) sells **industrial
garment / sewing machine spare parts** — needles, hooks & loopers, feed dogs,
presser feet, bobbin cases, servo motors, control boxes, knives — for Juki,
Brother, Pegasus, Jack, Siruba, Yamato, Kansai Special, etc. NOT clothes.

Buyers:
- **Factory maintenance manager, line down** — has a part number or the old part.
  Needs: part-number search → stock → WhatsApp/call. Speed > price.
- **Procurement officer** — list of 20–200 lines. Needs: RFQ with Excel/photo
  upload, formal quote, VAT invoice (BIN), bank transfer.
- **Mechanic / workshop / reseller** — knows the machine, not the number.
  Needs: brand → model → part type browse, genuine vs compatible, COD/bKash,
  quantity price breaks.

Mostly mobile, mid-range Android, 4G. WhatsApp is the primary channel.

## Sales model — QUOTE-FIRST (enterprise RFQ), prices hidden by default

Prices are internal (used by the admin POS/billing). The public site is a
**quote-request catalogue**:
- Default: **no prices anywhere** on the site, in JSON-LD, or in any public
  API response. The primary CTA is **"Add to quote"** → a persistent
  **Quote list** (header + mobile bar show its count) → **Request quote**
  (`/rfq`, line items prefilled from the list, plus company/contact/BIN/files).
  WhatsApp "ask about this part" is the secondary CTA.
- Switchable later without code changes:
  - SiteSettings `sales_mode`: `quote_only` (default) | `mixed`.
  - Product `sales_mode`: `inherit` (default) | `quote_only` | `direct`.
  - A product is **direct** (price shown + Add to cart + checkout) only when
    the effective mode is `direct`. The backend omits `price`, `compare_at_price`
    and price tiers for non-direct products and rejects them in cart/checkout.
- UI must handle both per product: `price: null` → "Price on request" +
  Add to quote; `price` present → price + Add to cart (+ Add to quote for bulk).
- Cart/checkout pages exist but are hidden from nav while no product is direct
  (bootstrap tells the frontend `direct_orders_enabled`).
- Structured data: Product without `offers` for quote-only items (no fake
  prices); Offer with price only for direct items.

## Design system — "Spec Sheet" (industrial catalogue) + local voice

Derived from the logo (black R with red bar, red E, blue swoosh). Think Juki
parts book × McMaster-Carr, with Dhaka trade-house directness (Bangla
headlines, phone/WhatsApp always visible).

Colour tokens (CSS variables, Tailwind v4 `@theme`, prefix `re-`):
| token | value | use |
|---|---|---|
| ink | #231F20 | text, R of logo |
| paper | #FFFFFF | page |
| steel-50 | #F5F6F7 | section bg |
| steel-200 | #E4E6E8 | rules/borders |
| steel-600 | #5B6168 | secondary text (6:1) |
| steel-400 | #9AA0A6 | disabled / decorative only (2.6:1) |
| steel-500 | #80868C | form-control borders (≥3:1 on white and steel-50) |
| red | #ED1C24 | bars, dots, large fills/text — never behind small white text (4.38:1) |
| red-dark | #C4161D | filled red with white text: primary CTA, count bubbles (6.0:1); hover red-deep #A81219 |
| red-text | #C8102E | red body/small text (AA) |
| blue | #0077C0 | links, info, focus ring |
| stock-in | #1E7A3C | in stock |
| stock-low | #9A5B00 on #FFF4DC | low stock (5.0:1) |
| stock-out | steel-600 | out of stock |
| whatsapp | #0F7A40 | WhatsApp buttons only (5.4:1 with white; hover #0B6B37) |

Rules:
- 0–2px radius. 1px hairline rules. No soft drop shadows (only menus/sheets).
- A thin red rule tops section headers like a document header.
- Tables are first-class. Part numbers always visible, in mono, with copy button.
- The swoosh curve appears once per page at most (footer / hero underline).
- Stock state = colour + icon + text, never colour alone.
- Motion 120–180ms ease-out, functional only (copy tick, sheet open, filter
  chips). `prefers-reduced-motion` respected. Scroll storytelling ONLY on Home
  and About (see scroll-site-generator skill), never on catalogue pages.

Typography (next/font/google, subset latin + bengali, display swap):
- Display/body Latin: **Archivo** (variable, use width axis: condensed 600–800
  for headings).
- Mono: **IBM Plex Mono** — part numbers, model codes, spec values, prices.
- Bangla: **Anek Bangla** (headings) + **Hind Siliguri** (body). Bangla body
  17–18px, line-height 1.7–1.8; headings ≥1.3. Never letter-space or uppercase
  Bangla. Part numbers/prices stay Latin digits in mono even in bn UI.

Anti-AI-slop (hard bans): purple/indigo gradients, glassmorphism, blobs,
centered hero + 3 icon cards, emoji icons, "Elevate/Unlock/Seamless" copy,
Inter/Roboto/Space Grotesk, bento grids, fake stat counters, stock people
photos, fade-up-on-scroll everywhere, default shadcn look.

Also apply the official frontend-design skill:
`C:\Users\USER\.claude\plugins\marketplaces\claude-plugins-official\plugins\frontend-design\skills\frontend-design\SKILL.md`
(within the "industrial/utilitarian, refined" direction above).

Mobile: sticky bottom bar **Search · Brands · RFQ (count) · WhatsApp**.
Header: logo, search, EN/বাং toggle, phone. Tap targets ≥44px. Focus ring 2px blue + 2px offset. WCAG 2.2 AA.

## Information architecture (all under `[locale]`, en default at `/`, bn at `/bn`)

| route | page |
|---|---|
| `/` | Home: search hero + machine-brand tiles + "find by machine" brand→model + category grid + recently restocked table + trust row |
| `/machines` | all machine brands |
| `/machines/[brand]` | brand: models grouped by machine type, parts count |
| `/machines/[brand]/[model]` | model: compatible parts table grouped by category ★SEO |
| `/machines/[brand]/[model]/[category]` | model × part type (only if ≥3 parts) ★SEO |
| `/parts/[slug]` | part detail ★SEO |
| `/categories`, `/categories/[slug]` | category listing with filters |
| `/brands`, `/brands/[slug]` | parts brands (Genuine/OEM vs compatible) |
| `/search?q=` | search, exact part-number match pinned, noindex |
| `/rfq` | quote request / quick order (no login) |
| `/cart`, `/checkout`, `/checkout/success` | COD + guest checkout |
| `/account/**`, `/login` | customer |
| `/about`, `/contact`, `/delivery`, `/guides/**` | trust + local SEO + knowledge |
| `/policies/[slug]` | shipping, returns, payment, privacy, terms |

Admin lives at `/admin/**` and is **outside** locale routing — must keep working
unchanged.

## Data

Django API: `https://api.rakibenterprise-bd.com` (prod), `INTERNAL_DJANGO_BACKEND`
(`http://backend:9086`) server-side in Docker. Public storefront endpoints at
`/api/site/*`, orders/settings at `/api/inventory/*`, customer auth `/api/auth/*`.
Server Components fetch inside `'use cache'` functions with `cacheTag`s; send
`Accept-Language` from the route locale so Bangla is server-rendered.

## Stack (verified Nov 2026)

Next.js 16.4.5 (App Router, Turbopack, `cacheComponents`), React 19.3.1,
Tailwind 4.3.4, next-intl 4.14.9 (`src/proxy.ts`), Base UI 1.9 primitives
(restyled), motion 14.9 (sparingly), react-hook-form 7.91 + zod 4.6, Vitest 5.1,
Playwright 1.64. TypeScript stays 5.9. Next 16: `proxy.ts` not middleware,
async params/cookies/headers, `revalidateTag(tag, profile)`, built-in
`app/sitemap.ts` + `generateSitemaps` (not next-sitemap). Read
`node_modules/next/dist/docs/` before using any Next API (see AGENTS.md).

## SEO

Product/Offer JSON-LD (`mpn` = OEM part number, BDT), Organization +
LocalBusiness(Store), BreadcrumbList, ItemList, WebSite SearchAction.
hreflang en/bn/x-default + canonical on every page. Split sitemaps with images.
Search & facet URLs noindex. robots.ts allows AI crawlers. llms.txt.
Budgets: LCP < 2.0s mobile, INP < 200ms, CLS < 0.1, ≤150KB JS gzip on product
pages.
