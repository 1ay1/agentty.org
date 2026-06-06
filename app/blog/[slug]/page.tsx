import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPost, formatDate } from "@/lib/blog";
import { site } from "@/lib/site";

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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.date,
    author: { "@type": "Organization", name: post.author },
    description: post.excerpt,
    url: `${site.url}/blog/${slug}/`,
  };

  return (
    <article className="block blog-post">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="wrap" style={{ maxWidth: 760 }}>
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
          <Link href="/blog" className="blog-back">
            ← All posts
          </Link>
          <a className="btn btn-ghost" href={site.github} target="_blank" rel="noopener noreferrer" data-magnetic>
            Star on GitHub →
          </a>
        </footer>
      </div>
    </article>
  );
}
