---
name: scroll-site-generator
description: Turn a storyboard into scroll-driven scenes for a Next.js page — sticky/pinned scenes, parallax layers, scroll-linked transitions and product reveals — with GSAP ScrollTrigger, plus mobile and reduced-motion layouts. Use when building or changing scroll storytelling on the Rakib Enterprise Home or About page, or when asked for "scroll scene", "pinned section", "parallax", "scroll reveal" or "storyboard".
---

# Scroll site generator

Builds scroll storytelling that stays fast, accessible and on-brand. Read
`docs/REBUILD_BRIEF.md` first; its design rules win over anything here.

## Where it is allowed

Only the **Home** and **About** pages. Never on catalogue, machine, part,
search, RFQ, cart or checkout pages — those users are mid-task on a phone and
need the content immediately.

## Stack (verified Nov 2026)

- `gsap@3.15.0` + `@gsap/react@2.1.2` (`useGSAP` hook). GSAP and all its
  plugins, including ScrollTrigger, are free under the GSAP Standard License.
- Register once: `gsap.registerPlugin(ScrollTrigger, useGSAP)`.
- Scenes are **client components** (`"use client"`) mounted inside a server
  page. All text in a scene comes from props, so the content is server
  rendered, indexable and readable without JavaScript.
- No Lenis or other smooth-scroll hijacking. Native scroll only.

## Workflow

1. **Storyboard first.** Write the scenes as a table before any code:
   `# | goal (what the visitor should understand) | visual | scroll length (vh) | mobile version | reduced-motion version`.
   Keep it to 3–5 scenes. Every scene must carry a real message about the
   business (for example "worn hook → genuine replacement → machine back on
   the line"), not decoration.
2. **Static layout first.** Build each scene as a normal, fully readable
   section. That is the reduced-motion and no-JS version, and it must look
   finished on its own.
3. **Then layer the motion** with `useGSAP(() => {...}, { scope: ref })` so
   cleanup is automatic.
4. **Gate it behind `gsap.matchMedia()`:**
   ```ts
   const mm = gsap.matchMedia();
   mm.add(
     { desktop: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
       mobile: "(max-width: 1023px) and (prefers-reduced-motion: no-preference)" },
     (ctx) => {
       const { desktop } = ctx.conditions!;
       // desktop: pinned timeline; mobile: short, unpinned reveals only
     },
   );
   ```
   With reduced motion, neither branch runs and the static layout shows.
5. **Verify** with Playwright at 390px and 1440px, with and without
   `reducedMotion: 'reduce'`. Screenshot each scene and confirm there is no
   layout shift and no horizontal scroll.

## Patterns

- **Pinned scene (desktop only):**
  `ScrollTrigger.create({ trigger, pin: true, start: "top top", end: "+=150%", scrub: 0.5 })`.
  Drive a timeline with `scrub`. At most 2 pinned scenes per page.
- **Parallax layers:** animate `yPercent` on 2–3 layers at different rates,
  using `transform` only. Never animate `top`, `height` or `filter: blur`.
- **Product reveal (exploded part):** an SVG parts diagram whose `<g>`
  groups translate apart along their axes as you scroll, with numbered
  callouts fading in. This suits the brand best: it echoes the Juki
  parts-book diagram.
- **Counter or line draw:** `strokeDashoffset` on SVG paths for the swoosh or
  diagram lines. Use real numbers only, never fake stat counters.
- **Mobile:** no pinning. Use short `toggleActions: "play none none reverse"`
  reveals, or plain CSS scroll-driven animations
  (`animation-timeline: view()`) where they're supported, with a static
  fallback.

## Performance and accessibility rules

- Animate only `transform` and `opacity`. Set `will-change` only while a
  scene is active.
- Lazy-load GSAP: `await import("gsap")` inside the effect, or put the scene
  in a `next/dynamic` client island, so catalogue pages never ship it.
- The hero's LCP element (heading or image) must render without waiting for
  GSAP. Don't hide it initially.
- CLS stays 0: reserve each pinned scene's height in CSS (`min-height`), and
  set initial states with `gsap.set` in `useGSAP` before paint.
- Content is never hidden from keyboard or screen-reader users. Focus order
  follows the DOM, and pinned sections stay scrollable with the keyboard.
- Honour `prefers-reduced-motion` (see `matchMedia` above). Offer no autoplay
  motion you can't pause.
- Call `ScrollTrigger.refresh()` after images and fonts load
  (`document.fonts.ready`).

## Brand fit (Rakib Enterprise)

Hard-edged, technical, calm. Motion should feel like a precision mechanism:
linear or `power2.out`, short distances. No bouncy easing, no glow, no
particle effects, no blur, no rotating 3D gimmicks. Colours come from the
brief tokens: red marks the one moment that matters in each scene.
