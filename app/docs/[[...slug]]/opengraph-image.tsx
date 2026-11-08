import { getDoc, getDocSlugs } from "@/lib/docs";
import { OG_SIZE, ogCard } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "agentty documentation";

export function generateStaticParams() {
  return [{ slug: [] as string[] }, ...getDocSlugs().map((slug) => ({ slug: [slug] }))];
}

export default async function Image({ params }: { params: Promise<{ slug?: string[] }> }) {
  const doc = getDoc((await params).slug?.join("/") ?? "");
  return ogCard({ section: "docs", title: doc?.title ?? "Documentation", meta: doc?.description });
}
