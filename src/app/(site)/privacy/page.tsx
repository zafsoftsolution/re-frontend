import { siteConfig } from "@/config/site";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="shell max-w-4xl py-24 md:py-32">
      <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-4">Legal</p>
      <h1 className="font-display text-5xl md:text-6xl text-navy tracking-tight mb-3">
        Privacy Policy
      </h1>
      <p className="text-ink/60 mb-12">
        Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="prose prose-neutral max-w-none space-y-8 text-ink/80 leading-relaxed">
        <section>
          <h2 className="font-display text-2xl text-navy mb-3">1. What we collect</h2>
          <p>
            {siteConfig.name} collects the minimum information required to fulfill your order, maintain
            your account, and improve our service. This includes your name, email, shipping and billing
            addresses, and order history.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-navy mb-3">2. How we use it</h2>
          <p>
            To process and ship orders, issue refunds, respond to inquiries, and — with your consent —
            send occasional updates about new collections. We never sell your personal data.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-navy mb-3">3. Cookies</h2>
          <p>
            We use essential cookies for cart persistence and authenticated sessions. Analytics cookies
            are optional and can be disabled in your browser.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-navy mb-3">4. Your rights</h2>
          <p>
            You may request a copy of your data or have it deleted at any time — write to{" "}
            <a href={`mailto:${siteConfig.email}`} className="underline text-navy">{siteConfig.email}</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
