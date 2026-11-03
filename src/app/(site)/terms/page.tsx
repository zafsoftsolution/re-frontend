import { siteConfig } from "@/config/site";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <main className="shell max-w-4xl py-24 md:py-32">
      <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-4">Legal</p>
      <h1 className="font-display text-5xl md:text-6xl text-navy tracking-tight mb-3">
        Terms of Service
      </h1>
      <p className="text-ink/60 mb-12">
        By shopping with {siteConfig.name}, you agree to these terms.
      </p>

      <div className="space-y-8 text-ink/80 leading-relaxed">
        <section>
          <h2 className="font-display text-2xl text-navy mb-3">1. Orders</h2>
          <p>
            Placing an order constitutes an offer; we accept once payment clears and goods are
            dispatched. We reserve the right to refuse or cancel orders.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-navy mb-3">2. Pricing & currency</h2>
          <p>
            Prices are shown in {siteConfig.currency.code} and exclude taxes unless stated.
            Shipping, duties, and taxes are calculated at checkout.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-navy mb-3">3. Returns</h2>
          <p>
            Returns are accepted within 30 days of delivery on unworn, tagged items. See our
            returns policy for details.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-navy mb-3">4. Intellectual property</h2>
          <p>
            All designs, trademarks and content on this site are property of {siteConfig.name}.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-navy mb-3">5. Contact</h2>
          <p>
            Questions? <a href={`mailto:${siteConfig.email}`} className="underline text-navy">{siteConfig.email}</a>
          </p>
        </section>
      </div>
    </main>
  );
}
