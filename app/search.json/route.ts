import { getAllDocs } from "@/lib/docs";
import { docsNav } from "@/lib/site";
import { getAllPosts } from "@/lib/blog";
import { getAllSeoPages } from "@/lib/seo-pages";
import { slash } from "@/lib/url";

export const dynamic = "force-static";

// The command palette's search index: every docs page and its h2/h3 sections,
// plus blog posts and guides. Fetched once, on first open. [title, href, group, parentTitle?, description?]
export function GET() {
  const section = new Map(docsNav.flatMap((s) => s.items.map((i) => [i.href.replace(/\/$/, ""), s.title] as const)));
  const rows: [string, string, string, string?, string?][] = [];
  for (const d of getAllDocs()) {
    const group = section.get(d.href.replace(/\/$/, "")) ?? "Docs";
    rows.push([d.title, slash(d.href), group, undefined, d.description]);
    for (const h of d.headings) rows.push([h.text, slash(`${d.href}#${h.id}`), group, d.title]);
  }
  for (const p of getAllPosts()) rows.push([p.title, `/blog/${p.slug}/`, "Blog", undefined, p.excerpt]);
  for (const p of getAllSeoPages()) rows.push([p.title, slash(p.href), p.kind === "guide" ? "Guides" : "Compare", undefined, p.description]);
  rows.push(...referenceRows());
  return Response.json(rows);
}

// Every reference table row in the docs whose first cell is a key ([[Ctrl+K]]),
// a `name` (env var, flag, setting, /command) becomes its own result, so
// typing "^P" or "AGENTTY_DOCS_DIR" in the palette lands on the row's section
// with what it does as the description.
const KEY_ALIAS: [RegExp, string][] = [[/^Ctrl\+/i, "^"], [/^Alt\+/i, "M-"], [/^Shift\+/i, "S-"]];
function referenceRows() {
  const out: [string, string, string, string?, string?][] = [];
  const seen = new Set<string>();
  const plain = (s: string) =>
    s.replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*`]/g, "").replace(/\s+/g, " ").trim();
  for (const d of getAllDocs()) {
    let h = -1, fence = false;
    const lines = d.source.split("\n");
    for (const line of lines) {
      if (/^\s*(```|~~~)/.test(line)) { fence = !fence; continue; }
      if (fence) continue;
      if (/^#{2,3}\s/.test(line)) { h++; continue; }
      if (/^#{4,}\s/.test(line) || !line.startsWith("|") || /^\|\s*:?-{2,}/.test(line)) continue;
      const cells = line.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim());
      if (cells.length < 2) continue;
      const first = cells[0];
      const keys = [...first.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);
      const codes = [...first.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
      const names = keys.length ? keys : codes.length && plain(first).length <= codes.join(" ").length + 12 ? codes : [];
      if (!names.length) continue;
      const what = plain(cells.slice(1).join(" · "));
      if (!what || /^(key|action|variable|effect|flag|setting|command|meaning)$/i.test(what)) continue;
      const heading = d.headings.filter((x) => x.level === 2 || x.level === 3)[h];
      const href = slash(heading ? `${d.href}#${heading.id}` : d.href);
      const group = keys.length ? "Keys" : names[0].startsWith("/") ? "Commands" : /^[A-Z][A-Z0-9_]+/.test(names[0]) ? "Environment" : names[0].startsWith("-") ? "Flags" : "Reference";
      for (const n of names) {
        const alias = keys.length ? KEY_ALIAS.reduce((s, [re, r]) => s.replace(re, r), n) : "";
        const title = alias && alias !== n ? `${n}  ${alias}` : n;
        const k = title + href;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push([title, href, group, d.title, what.slice(0, 160)]);
      }
    }
  }
  return out;
}
