import { getAllPosts, getPost, formatDate } from "@/lib/blog";
import { OG_SIZE, ogCard } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export const alt = "agentty blog post";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  return ogCard({
    section: "blog",
    title: post?.title ?? "agentty",
    meta: post ? `${formatDate(post.date)} · ${post.readingMinutes} min read` : undefined,
  });
}
