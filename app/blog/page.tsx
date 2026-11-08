import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, formatDate } from "@/lib/blog";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog",
  description: `Release notes, performance deep dives, and design notes from the ${site.name} project — the native C++26 claude-code alternative.`,
  keywords: [
    "agentty blog",
    "terminal coding agent",
    "claude code alternative",
    "c++ coding agent",
    "AI agent architecture",
  ],
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": `${site.url}/blog/feed.xml` },
  },
  openGraph: {
    type: "website",
    title: "agentty blog",
    description: `Release notes, performance deep dives, and design notes from the ${site.name} project.`,
    url: `${site.url}/blog/`,
    siteName: "agentty",
  },
};

export default function BlogIndex() {
  const posts = getAllPosts();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": `${site.url}/blog/#blog`,
        name: "agentty blog",
        description: `Release notes, performance deep dives, and design notes from the ${site.name} project.`,
        url: `${site.url}/blog/`,
        inLanguage: "en",
        publisher: { "@type": "Organization", name: "agentty", url: site.url },
      },
      {
        "@type": "ItemList",
        itemListElement: posts.map((p, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: `${site.url}/blog/${p.slug}/`,
          name: p.title,
        })),
      },
    ],
  };

  return (
    <div className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="kicker">Blog</p>
      <h1>Notes from building {site.name}.</h1>
      <p className="lead">Release notes, performance deep dives, and design notes.</p>
      {posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        <ol className="post-list">
          {posts.map((p) => (
            <li key={p.slug}>
              <time dateTime={p.date}>{p.date}</time>
              <Link href={`/blog/${p.slug}`}>
                <span className="pl-title">{p.title}</span>
                <span className="pl-sub">{p.excerpt}</span>
                <span className="pl-meta">{p.readingMinutes} min read{p.tags.length ? ` · ${p.tags.slice(0, 3).join(", ")}` : ""}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
