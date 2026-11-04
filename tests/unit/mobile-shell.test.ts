import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  BAR_BOTTOM_ZONE,
  BAR_SCROLL_DELTA,
  BAR_TOP_ZONE,
  TAB_HREFS,
  activeTab,
  nextBarState,
  tabAriaCurrent,
  type BarScrollState,
} from "@/components/site/mobile/tabs";
import { RECENT_MAX, parseRecent, pushRecent, removeRecent } from "@/components/site/mobile/recent-searches";
import { FooterAccordion } from "@/components/site/mobile/FooterAccordion";

describe("mobile tab bar — active tab", () => {
  it.each([
    ["/", "home"],
    ["/categories", "parts"],
    ["/categories/needles", "parts"],
    ["/parts/db-1-needle", "parts"],
    ["/brands/organ", "parts"],
    ["/search?q=B1830", "parts"],
    ["/machines", "parts"],
    ["/machines/juki/ddl-8700", "parts"],
    ["/rfq", "quote"],
    ["/rfq/sent", "quote"],
    ["/cart", "quote"],
    ["/checkout/success", "quote"],
  ] as const)("%s → %s", (path, tab) => {
    expect(activeTab(path)).toBe(tab);
  });

  it("content pages have no active tab", () => {
    for (const p of ["/about", "/contact", "/guides/x", "/policies/returns", "/delivery"]) expect(activeTab(p)).toBeNull();
  });

  it("aria-current is 'page' on the tab's own page, 'true' inside its section, absent elsewhere", () => {
    expect(tabAriaCurrent("home", "/")).toBe("page");
    expect(tabAriaCurrent("parts", "/categories")).toBe("page");
    expect(tabAriaCurrent("parts", "/categories/")).toBe("page");
    expect(tabAriaCurrent("parts", "/parts/x")).toBe("true");
    expect(tabAriaCurrent("quote", "/rfq")).toBe("page");
    expect(tabAriaCurrent("home", "/categories")).toBeUndefined();
    expect(tabAriaCurrent("devices", "/about")).toBeUndefined();
  });

  it("exactly one tab is current on a tabbed page", () => {
    const keys = Object.keys(TAB_HREFS) as (keyof typeof TAB_HREFS)[];
    for (const p of ["/", "/categories/a", "/machines/juki", "/rfq"]) {
      expect(keys.filter((k) => tabAriaCurrent(k, p)).length).toBe(1);
    }
  });
});

describe("mobile tab bar — hide on scroll", () => {
  const max = 5000;
  const run = (ys: number[], start: BarScrollState = { hidden: false, anchor: 0 }) =>
    ys.reduce((s, y) => nextBarState(s, y, max), start);

  it("stays visible near the top", () => {
    expect(run([20, 60, BAR_TOP_ZONE]).hidden).toBe(false);
  });
  it("hides after scrolling down past the threshold, ignoring small jitter", () => {
    const base = BAR_TOP_ZONE + 100;
    const at = { hidden: false, anchor: base };
    expect(run([base + BAR_SCROLL_DELTA - 1], at).hidden).toBe(false);
    expect(run([base + BAR_SCROLL_DELTA], at).hidden).toBe(true);
    // slow scrolling still accumulates from the anchor
    expect(run([base + 5, base + 10, base + 15, base + 20, base + 25], at).hidden).toBe(true);
  });
  it("shows again after scrolling up past the threshold", () => {
    const hidden = run([300, 600]);
    expect(hidden.hidden).toBe(true);
    expect(nextBarState(hidden, 600 - BAR_SCROLL_DELTA + 1, max).hidden).toBe(true);
    expect(nextBarState(hidden, 600 - BAR_SCROLL_DELTA, max).hidden).toBe(false);
    // continued downward scrolling moves the anchor, so a small bounce does not reveal it
    const deeper = nextBarState(hidden, 900, max);
    expect(nextBarState(deeper, 890, max).hidden).toBe(true);
  });
  it("shows at the end of the page so the footer is never covered", () => {
    expect(nextBarState({ hidden: true, anchor: 4000 }, max - BAR_BOTTOM_ZONE, max).hidden).toBe(false);
  });
});

describe("search sheet — recent searches", () => {
  it("puts the newest first, de-duplicates case-insensitively and trims", () => {
    let list: string[] = [];
    list = pushRecent(list, "b1830-227-000");
    list = pushRecent(list, "  servo   motor ");
    list = pushRecent(list, "B1830-227-000");
    expect(list).toEqual(["B1830-227-000", "servo motor"]);
  });
  it("ignores empty queries and caps the list", () => {
    let list: string[] = [];
    for (let i = 0; i < RECENT_MAX + 3; i++) list = pushRecent(list, `q${i}`);
    list = pushRecent(list, "   ");
    expect(list).toHaveLength(RECENT_MAX);
    expect(list[0]).toBe(`q${RECENT_MAX + 2}`);
  });
  it("removes a query regardless of case", () => {
    expect(removeRecent(["DFB-1404", "hook"], "dfb-1404")).toEqual(["hook"]);
  });
  it("parses stored values defensively", () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent("not json")).toEqual([]);
    expect(parseRecent('{"a":1}')).toEqual([]);
    expect(parseRecent('["a", 3, "", "A", "b"]')).toEqual(["a", "b"]);
    expect(parseRecent(JSON.stringify(Array.from({ length: 20 }, (_, i) => `x${i}`)))).toHaveLength(RECENT_MAX);
  });
});

describe("phone footer accordion", () => {
  const html = renderToStaticMarkup(
    createElement(FooterAccordion, {
      id: "ft-policies",
      title: "Policies",
      links: [
        { href: "/policies/returns", label: "Returns" },
        { href: "/policies/privacy", label: "Privacy" },
      ],
      renderLink: (link, className) => createElement("a", { href: link.href, className }, link.label),
    }),
  );

  it("is a native details/summary disclosure, closed by default", () => {
    expect(html).toMatch(/^<details name="re-footer"/);
    expect(html).not.toMatch(/<details[^>]*\sopen/);
    expect(html).toContain('<summary id="ft-policies-summary"');
  });
  it("labels its link list with the summary and hides the chevron from AT", () => {
    expect(html).toContain('<nav aria-labelledby="ft-policies-summary"');
    expect(html).toMatch(/<svg aria-hidden="true"/);
    expect(html).toContain('href="/policies/returns"');
  });
  it("gives every link a 44px target", () => {
    expect(html.match(/min-h-11/g)).toHaveLength(2);
  });
});
