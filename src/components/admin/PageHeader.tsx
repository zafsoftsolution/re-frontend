import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function PageHeader({ eyebrow, title, description, actions }: Props) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-6 mb-8 border-b border-[var(--jmn-line)]">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl md:text-4xl text-navy tracking-tight leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-ink/55 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
