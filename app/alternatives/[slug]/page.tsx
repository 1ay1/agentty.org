import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAlternativePages, getAlternativePage } from "@/lib/seo-pages";
import { site } from "@/lib/site";
import { DocBody } from "@/components/DocBody";
import { seoDescription, seoTitle } from "@/lib/seo";

export function generateStaticParams() {
  return getAlternativePages().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getAlternativePage(slug);
  if (!page) return { title: "Not found" };
  return {
    title: seoTitle(page.title),
    description: seoDescription(page.description),
    keywords: [
      `${page.competitor} alternative`,
      `open source ${page.competitor} alternative`,
      `free ${page.competitor} alternative`,
      "agent harness",
      "terminal coding agent",
      "AI coding agent",
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

export default async function AlternativePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getAlternativePage(slug);
  if (!page) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.description,
    dateModified: page.updated,
    author: { "@type": "Organization", name: "agentty" },
    mainEntityOfPage: `${site.url}${page.href}/`,
  };

  return (
    <div className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="kicker">{page.competitor} alternative</p>
      <h1>{page.title}</h1>
      {page.verdict && (
        <p className="lead">
          <strong>In short:</strong> {page.verdict}
        </p>
      )}
      <DocBody html={page.html} />

      <div className="cta">
        <p>Install in one line — a single static binary, no Node or Python.</p>
        <code>{site.installOneLiner}</code>
        <div className="cta-links">
          <Link href="/docs/installation/">Get started</Link>
          <a href={site.github}>GitHub</a>
        </div>
      </div>
    </div>
  );
}
