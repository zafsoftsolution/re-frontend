import type { Metadata } from "next";
import ContactForm from "@/components/site/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach the Rakib Enterprise atelier — care, alterations, press.",
};

export default function ContactPage() {
  return (
    <>
      <header className="shell pt-36 md:pt-44 pb-12 md:pb-16">
        <p className="text-[11px] tracking-[0.35em] uppercase text-gold mb-6">
          /Care · The atelier
        </p>
        <h1 className="font-display text-[clamp(2.75rem,9vw,8rem)] leading-[0.9] tracking-tight text-navy">
          Talk to <span className="italic">the house</span>.
        </h1>
        <p className="mt-6 max-w-xl text-ink/65 leading-relaxed">
          Care notes, alteration enquiries, press requests, anything else — we
          read every message and reply within two working days.
        </p>
      </header>

      <section className="shell pb-24 md:pb-32 grid lg:grid-cols-[1.2fr_1fr] gap-12 md:gap-20">
        <ContactForm />

        <aside className="space-y-10">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-3">
              Atelier hours
            </p>
            <p className="text-sm text-ink/75 leading-relaxed">
              Monday–Friday · 10:00–18:00
              <br />
              Saturday · 11:00–17:00
              <br />
              Sunday · by appointment
            </p>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-3">
              Direct
            </p>
            <p className="text-sm text-ink/75 leading-relaxed">
              For wholesale, press, and partnerships, please mention the topic
              clearly in your subject line so we can route accordingly.
            </p>
          </div>
        </aside>
      </section>
    </>
  );
}
