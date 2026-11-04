/**
 * Minimal XML well-formedness check for sitemap output (no XML parser in the
 * dependency tree): balanced tags, quoted attributes, only the five
 * predefined entities / numeric references, a single root.
 * Returns the problems found (empty = well-formed).
 */
export function xmlProblems(xml: string): string[] {
  const problems: string[] = [];
  const body = xml.replace(/^<\?xml[^?]*\?>\s*/, "");
  const stack: string[] = [];
  let roots = 0;
  const tag = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>|<|&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/gi;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(body))) {
    if (m[0] === "<") {
      problems.push(`stray "<" at ${m.index}`);
      continue;
    }
    if (m[0].startsWith("&")) {
      problems.push(`unescaped "&" at ${m.index}: ${body.slice(m.index, m.index + 20)}`);
      continue;
    }
    const [, close, name, , selfClose] = m;
    if (close) {
      const open = stack.pop();
      if (open !== name) problems.push(`</${name}> closes <${open}>`);
    } else if (!selfClose) {
      if (stack.length === 0) roots++;
      stack.push(name);
    } else if (stack.length === 0) roots++;
  }
  if (stack.length) problems.push(`unclosed: ${stack.join(" > ")}`);
  if (roots !== 1) problems.push(`${roots} root elements`);
  return problems;
}

/** Text content of every <tag>…</tag>. */
export function xmlValues(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, "g"))].map((m) => m[1]);
}
