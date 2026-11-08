import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getComparePages, getComparePage } from "@/lib/seo-pages";
import { site } from "@/lib/site";
import { DocBody } from "@/components/DocBody";
import { seoDescription, seoTitle } from "@/lib/seo";

export function generateStaticParams() {
  return getComparePages().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getComparePage(slug);
  if (!page) return { title: "Not found" };
  return {
    title: seoTitle(page.title),
    description: seoDescription(page.description),
    keywords: [
      `agentty vs ${page.competitor}`,
      `${page.competitor} alternative`,
      "agent harness",
      "terminal coding agent",
      "claude code alternative",
      "open source coding agent",
    ],
    alternates: { canonical: page.href },
    openGraph: {
      title: page.title,
      description: page.description,
      type: "article",
      url: `${site.url}${page.href}/`,
      siteName: "agentty",
      images: [`${site.url}/opengraph-image`],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [`${site.url}/twitter-image`],
    },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getComparePage(slug);
  if (!page) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.description,
    dateModified: page.updated,
    author: { "@type": "Organization", name: "agentty" },
    mainEntityOfPage: `${site.url}${page.href}/`,
    about: [
      { "@type": "SoftwareApplication", name: "agentty", applicationCategory: "DeveloperApplication" },
      { "@type": "SoftwareApplication", name: page.competitor, applicationCategory: "DeveloperApplication" },
    ],
  };

  return (
    <div className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="kicker">agentty vs {page.competitor}</p>
      <h1>{page.title}</h1>
      {page.verdict && (
        <p className="lead">
          <strong>Short answer:</strong> {page.verdict}
        </p>
      )}
      <DocBody html={page.html} />

      <div className="cta">
        <p>Ready to try it? One line, no Node or Python.</p>
        <code>{site.installOneLiner}</code>
        <div className="cta-links">
          <Link href="/docs/installation/">Get started</Link>
          <a href={site.github}>GitHub</a>
        </div>
      </div>

      <RelatedCompares slug={slug} />
    </div>
  );
}

function RelatedCompares({ slug }: { slug: string }) {
  const others = getComparePages().filter((p) => p.slug !== slug).slice(0, 6);
  if (others.length === 0) return null;
  return (
    <nav className="related" aria-label="More comparisons">
      <p className="kicker">More comparisons</p>
      <ul>
        {others.map((p) => (
          <li key={p.slug}>
            <Link href={p.href}>{p.title}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
