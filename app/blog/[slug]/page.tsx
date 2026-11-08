import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPost, getAdjacent, formatDate } from "@/lib/blog";
import { site } from "@/lib/site";
import { DocBody } from "@/components/DocBody";
import { TableOfContents } from "@/components/TableOfContents";
import { seoDescription, seoTitle } from "@/lib/seo";

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
  const url = `${site.url}/blog/${slug}/`;
  return {
    title: seoTitle(post.title),
    description: seoDescription(post.excerpt),
    keywords: [...post.tags, "agentty", "terminal coding agent", "claude code alternative"],
    authors: [{ name: post.author, url: site.github }],
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.date,
      authors: [post.author],
      section: post.tags[0] ?? "Engineering",
      tags: post.tags,
      url,
      siteName: "agentty",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      creator: "@agentty",
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
  const { next, prev } = getAdjacent(slug);
  const postUrl = `${site.url}/blog/${slug}/`;
  const ogImage = `${postUrl}opengraph-image`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${postUrl}#post`,
        headline: post.title,
        name: post.title,
        description: post.excerpt,
        datePublished: post.date,
        dateModified: post.date,
        wordCount: post.wordCount,
        keywords: post.tags.join(", "),
        articleSection: post.tags[0] ?? "Engineering",
        inLanguage: "en",
        image: [ogImage],
        url: postUrl,
        mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
        author: { "@type": "Person", name: post.author, url: site.github },
        publisher: {
          "@type": "Organization",
          name: "agentty",
          url: site.url,
          logo: { "@type": "ImageObject", url: `${site.url}/favicon.svg` },
        },
        isAccessibleForFree: true,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${site.url}/blog/` },
          { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
        ],
      },
      ...(post.faq.length > 0
        ? [
            {
              "@type": "FAQPage",
              "@id": `${postUrl}#faq`,
              mainEntity: post.faq.map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: { "@type": "Answer", text: f.answer },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <div className="post-shell">
      <article className="post">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <Link href="/blog">Blog</Link>
        </nav>
        <header className="post-head">
          <h1>{post.title}</h1>
          <p className="post-meta">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span>{post.readingMinutes} min read</span>
            <span>{post.author}</span>
          </p>
          <p className="lead">{post.excerpt}</p>
          {post.tags.length > 0 && (
            <p className="post-tags">{post.tags.map((t) => <span key={t}>{t}</span>)}</p>
          )}
        </header>
        <DocBody html={post.html} />
        <nav className="docnav" aria-label="More posts">
          {prev ? (
            <Link href={`/blog/${prev.slug}`}>
              <span className="dir">← Newer</span>
              {prev.title}
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/blog/${next.slug}`} className="next">
              <span className="dir">Older →</span>
              {next.title}
            </Link>
          ) : (
            <Link href="/blog" className="next">
              <span className="dir">Blog</span>
              All posts
            </Link>
          )}
        </nav>
      </article>
      <TableOfContents />
    </div>
  );
}
