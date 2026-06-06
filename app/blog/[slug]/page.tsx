import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPost, getAdjacent, formatDate } from "@/lib/blog";
import { site } from "@/lib/site";
import { BlogSidebar } from "@/components/BlogSidebar";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      url: `${site.url}/blog/${slug}/`,
    },
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const { next } = getAdjacent(slug);
  const postUrl = `${site.url}/blog/${slug}/`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.date,
    author: { "@type": "Organization", name: post.author },
    description: post.excerpt,
    url: postUrl,
  };

  return (
    <div className="blog-post-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="blog-post">
        <Link href="/blog" className="blog-back">
          ← All posts
        </Link>

        <header className="blog-post-head">
          <div className="blog-card-meta">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span className="dot">·</span>
            <span>{post.readingMinutes} min read</span>
            <span className="dot">·</span>
            <span>{post.author}</span>
          </div>
          <h1 className="blog-post-title">{post.title}</h1>
          <p className="blog-post-lede">{post.excerpt}</p>
          {post.tags.length > 0 && (
            <div className="blog-tags">
              {post.tags.map((t) => (
                <span key={t} className="blog-tag">
                  {t}
                </span>
              ))}
            </div>
          )}
        </header>

        <div className="blog-body" dangerouslySetInnerHTML={{ __html: post.html }} />

        <footer className="blog-post-foot">
          {next ? (
            <Link href={`/blog/${next.slug}`} className="blog-next">
              <span className="blog-next-dir">Next post →</span>
              <span className="blog-next-title">{next.title}</span>
            </Link>
          ) : (
            <Link href="/blog" className="blog-next">
              <span className="blog-next-dir">← Back</span>
              <span className="blog-next-title">All posts</span>
            </Link>
          )}
          <a className="btn btn-primary" href={site.installOneLiner ? "/docs/installation" : site.github}>
            Install agentty →
          </a>
        </footer>
      </article>

      <BlogSidebar title={post.title} url={postUrl} />
    </div>
  );
}
