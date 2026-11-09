import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { DocNav } from "@/components/DocNav";
import { DocBody } from "@/components/DocBody";
import { PageActions } from "@/components/PageActions";
import {
  getDoc,
  getDocSlugs,
  getAdjacentDocs,
  docSourcePath,
} from "@/lib/docs";
import { site } from "@/lib/site";
import { seoDescription, seoTitle } from "@/lib/seo";

// One dynamic route renders every /docs page from the Markdown synced out of the
// agentty repo (docs/website/*.md → content/docs/*.md). Adding a doc is adding a
// file; no page component to touch.

export function generateStaticParams() {
  // "" (index) + every non-index slug. The optional catch-all matches /docs too.
  return [{ slug: [] as string[] }, ...getDocSlugs().map((slug) => ({ slug: [slug] }))];
}

type Params = { slug?: string[] };

function slugOf(params: Params): string {
  return params.slug?.join("/") ?? "";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const doc = getDoc(slugOf(await params));
  if (!doc) return {};
  const canonical = doc.slug === "" ? "/docs" : `/docs/${doc.slug}`;
  return {
    title: seoTitle(doc.title, "docs"),
    description: seoDescription(doc.description),
    alternates: { canonical },
    openGraph: {
      type: "article", title: doc.title, description: seoDescription(doc.description), url: site.url + canonical,
      images: [{ url: `/og/docs/${doc.slug || "index"}.png`, width: 1200, height: 630, alt: doc.title }],
    },
    twitter: { card: "summary_large_image", title: doc.title, description: seoDescription(doc.description), images: [`/og/docs/${doc.slug || "index"}.png`] },
  };
}

export default async function DocsPage({ params }: { params: Promise<Params> }) {
  const slug = slugOf(await params);
  const doc = getDoc(slug);
  if (!doc) notFound();

  const { prev, next } = getAdjacentDocs(doc.href);

  const url = `${site.url}${doc.slug === "" ? "/docs/" : `/docs/${doc.slug}/`}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${url}#article`,
        headline: doc.title,
        description: doc.description,
        url,
        inLanguage: "en",
        isPartOf: { "@type": "WebSite", name: "agentty", url: site.url },
        about: { "@type": "SoftwareApplication", name: "agentty", applicationCategory: "DeveloperApplication" },
        publisher: { "@type": "Organization", name: "agentty", url: site.url },
        image: `${site.url}/og/docs/${doc.slug || "index"}.png`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
          { "@type": "ListItem", position: 2, name: "Docs", item: `${site.url}/docs/` },
          ...(doc.slug ? [{ "@type": "ListItem", position: 3, name: doc.title, item: url }] : []),
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="doc-head">
        <Breadcrumb title={doc.title} />
        <h1>{doc.title}</h1>
        {doc.description && <p className="lead">{doc.description}</p>}
        <PageActions md={`/md/${doc.slug || "index"}.md`} />
      </header>

      {doc.headings.filter((h) => h.level === 2).length > 2 && (
        <details className="toc-inline">
          <summary>on this page</summary>
          <ol>
            {doc.headings.filter((h) => h.level === 2).map((h) => (
              <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>
            ))}
          </ol>
        </details>
      )}

      <DocBody html={doc.html} />

      <DocNav prev={prev ? { title: prev.title, href: prev.href } : null}
              next={next ? { title: next.title, href: next.href } : null} />
      <EditThisPage path={docSourcePath(doc.slug)} repo="agentty" />
    </>
  );
}
