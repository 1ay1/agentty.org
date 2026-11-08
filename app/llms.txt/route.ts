import { docsNav, site } from "@/lib/site";
import { getAllDocs } from "@/lib/docs";

export const dynamic = "force-static";

// llms.txt (https://llmstxt.org): a map of the docs for language models, each
// entry pointing at the page's raw markdown.
export function GET() {
  const docs = new Map(getAllDocs().map((d) => [d.href, d]));
  let out = `# ${site.name}\n\n> A fast coding agent for your terminal, written in C++26: one small static binary, any model.\n\n`;
  for (const sec of docsNav) {
    out += `## ${sec.title}\n\n`;
    for (const it of sec.items) {
      const d = docs.get(it.href.replace(/\/$/, ""));
      const md = `${site.url}/md/${d?.slug || "index"}.md`;
      out += `- [${it.title}](${md})${d?.description ? `: ${d.description}` : ""}\n`;
    }
    out += "\n";
  }
  return new Response(out, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
