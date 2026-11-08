import { getAllDocs, getDoc } from "@/lib/docs";

export const dynamic = "force-static";

// Raw markdown for every docs page at /md/<slug>.md — for "Copy page" and for
// LLMs/agents reading the docs. The index page is /md/index.md.
export function generateStaticParams() {
  return getAllDocs().map((d) => ({ slug: [`${d.slug || "index"}.md`] }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const name = slug.join("/").replace(/\.md$/, "");
  const doc = getDoc(name === "index" ? "" : name);
  if (!doc) return new Response("not found", { status: 404 });
  return new Response(doc.source, { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
