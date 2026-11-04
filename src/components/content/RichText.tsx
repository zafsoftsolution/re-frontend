import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { GuideBlock } from "@/content/guides";

const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

/** Inline **bold**, `code` (mono, Latin — part numbers) and [link](/path). */
export function Inline({ text }: { text: string }): ReactNode {
  return text.split(TOKEN).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code key={i} translate="no" className="re-mono rounded-re-sm bg-re-steel-100 px-1 py-px text-[0.9em] whitespace-nowrap">
          {part.slice(1, -1)}
        </code>
      );
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      return href.startsWith("/") ? (
        <Link key={i} href={href}>
          {label}
        </Link>
      ) : (
        <a key={i} href={href} target="_blank" rel="noopener">
          {label}
        </a>
      );
    }
    return part;
  });
}

/** Guide body blocks inside <Prose>. */
export function GuideBlocks({ blocks }: { blocks: readonly GuideBlock[] }) {
  return blocks.map((b, i) => {
    switch (b.t) {
      case "p":
        return (
          <p key={i}>
            <Inline text={b.text} />
          </p>
        );
      case "h2":
        return (
          <h2 key={i} id={b.id} className="scroll-mt-24">
            <Inline text={b.text} />
          </h2>
        );
      case "ul":
      case "ol": {
        const List = b.t;
        return (
          <List key={i}>
            {b.items.map((it, k) => (
              <li key={k}>
                <Inline text={it} />
              </li>
            ))}
          </List>
        );
      }
      case "table":
        return (
          <div key={i} className="mt-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[30rem] border-collapse text-[0.9375rem] leading-snug">
              <thead>
                <tr className="border-y border-re-ink text-left">
                  {b.head.map((h) => (
                    <th key={h} scope="col" className="py-2 pr-4 align-bottom font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-re-steel-200">
                {b.rows.map((r, k) => (
                  <tr key={k}>
                    {r.map((c, j) => (
                      <td key={j} className="py-2.5 pr-4 align-top">
                        <Inline text={c} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {b.caption && (
                <caption className="caption-bottom pt-2 text-left text-[0.8125rem] text-re-steel-600">
                  <Inline text={b.caption} />
                </caption>
              )}
            </table>
          </div>
        );
      case "note":
        return (
          <p key={i} className="!mt-8 border-l-[3px] border-re-blue bg-re-steel-50 px-4 py-3 text-[0.9375rem]">
            <Inline text={b.text} />
          </p>
        );
    }
  });
}
