import type { Metadata } from "next";
import { storefront } from "@/lib/storefront";
import FAQAccordion from "@/components/site/FAQAccordion";
import type { FAQ } from "@/types";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about shipping, returns, sizing, and the house.",
};

export default async function FAQPage() {
  const faqs = await storefront.faqs.list().catch(() => [] as FAQ[]);

  const groups = new Map<string, FAQ[]>();
  for (const f of faqs) {
    const list = groups.get(f.category) ?? [];
    list.push(f);
    groups.set(f.category, list);
  }
  const ordered = Array.from(groups.entries()).map(([cat, items]) => ({
    category: cat,
    items: items.sort((a, b) => (a.order ?? 99) - (b.order ?? 99)),
  }));

  return (
    <>
      <header className="shell pt-36 md:pt-44 pb-12 md:pb-16">
        <p className="text-[11px] tracking-[0.35em] uppercase text-gold mb-6">
          /Help · {String(faqs.length).padStart(2, "0")} answers
        </p>
        <h1 className="font-display text-[clamp(2.75rem,9vw,8rem)] leading-[0.9] tracking-tight text-navy">
          Frequently <span className="italic">asked</span>.
        </h1>
        <p className="mt-6 max-w-xl text-ink/65 leading-relaxed">
          Common questions about sizing, shipping, returns, alterations and more.
        </p>
      </header>

      {ordered.length === 0 ? (
        <div className="shell py-24 text-center text-ink/55">
          No FAQs published yet.
        </div>
      ) : (
        <section className="shell pb-24 md:pb-32">
          <div className="grid lg:grid-cols-[260px_1fr] gap-10 lg:gap-16">
            <aside className="hidden lg:block">
              <nav className="sticky top-28 space-y-2">
                {ordered.map((g) => (
                  <a
                    key={g.category}
                    href={`#${g.category.toLowerCase().replace(/\s+/g, "-")}`}
                    className="block text-[11px] tracking-[0.25em] uppercase text-ink/55 hover:text-navy transition-colors"
                  >
                    {g.category}
                  </a>
                ))}
              </nav>
            </aside>

            <div className="space-y-12">
              {ordered.map((g) => (
                <div key={g.category}>
                  <h2
                    id={g.category.toLowerCase().replace(/\s+/g, "-")}
                    className="font-display text-2xl md:text-3xl text-navy mb-6"
                  >
                    {g.category}
                  </h2>
                  <FAQAccordion items={g.items} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
