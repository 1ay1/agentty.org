import { getDoc, getAllDocs } from "@/lib/docs";
import { ogCard } from "@/lib/og";

export const dynamic = "force-static";

// /og/docs/<slug>.png — one social card per docs page, built statically.
// (Next can't host an opengraph-image inside the docs' optional catch-all.)
export function generateStaticParams() {
  return getAllDocs().map((d) => ({ slug: `${d.slug || "index"}.png` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const name = (await params).slug.replace(/\.png$/, "");
  const doc = getDoc(name === "index" ? "" : name);
  return ogCard({ section: "docs", title: doc?.title ?? "Documentation", meta: doc?.description });
}
