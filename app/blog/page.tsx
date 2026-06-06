import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, formatDate } from "@/lib/blog";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog",
  description: `Release notes, deep dives, and design notes from the ${site.name} project — the native C++26 claude-code alternative.`,
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const posts = getAllPosts();
  return (
    <section className="block blog-index">
      <div className="wrap" style={{ maxWidth: 820 }}>
        <p className="eyebrow">Blog</p>
        <h1 className="section-title" style={{ marginBottom: 10 }}>
          From the {site.name} project.
        </h1>
        <p className="section-sub" style={{ marginBottom: 36 }}>
          Release notes, performance deep dives, and design notes — written the same way the
          code is: no fluff.
        </p>

        {posts.length === 0 ? (
          <p className="blog-empty">No posts yet. Check back soon.</p>
        ) : (
          <div className="blog-list">
            {posts.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="blog-card" data-reveal>
                <div className="blog-card-meta">
                  <time dateTime={p.date}>{formatDate(p.date)}</time>
                  <span className="dot">·</span>
                  <span>{p.readingMinutes} min read</span>
                </div>
                <h2 className="blog-card-title">{p.title}</h2>
                <p className="blog-card-excerpt">{p.excerpt}</p>
                {p.tags.length > 0 && (
                  <div className="blog-tags">
                    {p.tags.map((t) => (
                      <span key={t} className="blog-tag">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <span className="blog-card-more">Read post →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
