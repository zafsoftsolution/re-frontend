import Link from "next/link";

interface PlaceholderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  phase?: string;
  action?: { label: string; href: string };
}

export default function Placeholder({
  eyebrow,
  title,
  description,
  phase,
  action,
}: PlaceholderProps) {
  return (
    <section className="shell min-h-[70vh] py-32 grid place-items-center">
      <div className="max-w-2xl text-center">
        {eyebrow && (
          <p className="text-[11px] tracking-[0.35em] uppercase text-gold mb-6">{eyebrow}</p>
        )}
        <h1 className="font-display text-5xl md:text-7xl tracking-tight text-navy leading-[0.95]">
          {title}
        </h1>
        {description && (
          <p className="mt-6 text-ink/60 leading-relaxed max-w-md mx-auto">{description}</p>
        )}
        {phase && (
          <p className="mt-8 text-xs tracking-[0.3em] uppercase text-ink/40">
            Phase {phase}
          </p>
        )}
        <div className="mt-10">
          <Link href={action?.href ?? "/"} className="btn-primary">
            {action?.label ?? "Return home"}
          </Link>
        </div>
      </div>
    </section>
  );
}
