import { getAllDocs } from "@/lib/docs";
import { docsNav } from "@/lib/site";
import { getAllPosts } from "@/lib/blog";
import { getAllSeoPages } from "@/lib/seo-pages";

export const dynamic = "force-static";

// The command palette's search index: every docs page and its h2/h3 sections,
// plus blog posts and guides. Fetched once, on first open. [title, href, group, parentTitle?]
export function GET() {
  const section = new Map(docsNav.flatMap((s) => s.items.map((i) => [i.href.replace(/\/$/, ""), s.title] as const)));
  const rows: [string, string, string, string?][] = [];
  for (const d of getAllDocs()) {
    const group = section.get(d.href) ?? "Docs";
    rows.push([d.title, d.href, group]);
    for (const h of d.headings) rows.push([h.text, `${d.href}#${h.id}`, group, d.title]);
  }
  for (const p of getAllPosts()) rows.push([p.title, `/blog/${p.slug}`, "Blog"]);
  for (const p of getAllSeoPages()) rows.push([p.title, p.href, p.kind === "guide" ? "Guides" : "Compare"]);
  return Response.json(rows);
}
