import { docsNav, site } from "@/lib/site";
import { getAllDocs } from "@/lib/docs";
import { slash } from "@/lib/url";

export const dynamic = "force-static";

// llms-full.txt: every docs page as Markdown in one file, in reading order —
// what AI assistants and answer engines ingest to answer questions about agentty.
export function GET() {
  const docs = new Map(getAllDocs().map((d) => [slash(d.href), d]));
  let out = `# ${site.name} documentation\n\n> ${site.url}/docs/ — every page below, in order. Each page also lives at ${site.url}/md/<page>.md\n\n`;
  for (const sec of docsNav) for (const it of sec.items) {
    const d = docs.get(it.href);
    if (d) out += `\n---\n\nSource: ${site.url}${slash(d.href)}\n\n${d.source}\n`;
  }
  return new Response(out, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
