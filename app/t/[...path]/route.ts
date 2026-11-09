import { renderTerm, termPaths } from "@/lib/term-pages";

export const dynamic = "force-static";

// The terminal edition: /t/<path>.ansi for every page (index.ansi = home).
// nginx serves these to curl / wget / HTTPie instead of the HTML page.
export function generateStaticParams() {
  return termPaths().map((p) => ({ path: (p ? p.split("/") : []).concat("index.ansi") }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const p = path.slice(0, -1).join("/");
  const text = renderTerm(p);
  if (text === null) return new Response("not found\n", { status: 404 });
  return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
