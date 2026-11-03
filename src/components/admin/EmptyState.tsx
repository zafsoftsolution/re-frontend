import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="px-6 py-16 grid place-items-center text-center">
      <div className="h-12 w-12 grid place-items-center rounded-full border border-[var(--jmn-line)] text-ink/40 mb-4">
        {icon ?? <Inbox size={20} />}
      </div>
      <p className="font-display text-xl text-navy">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-ink/55 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
