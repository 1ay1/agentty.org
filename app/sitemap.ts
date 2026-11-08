import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { docsNav } from "@/lib/site";
import { getAllPosts } from "@/lib/blog";
import { getComparePages, getAlternativePages, getGuidePages } from "@/lib/seo-pages";
import { getAllDocs } from "@/lib/docs";
import { slash } from "@/lib/url";
import docDates from "@/lib/docs-dates.generated.json";

// <lastmod> is only ever a REAL date (a doc's last commit, a post's date, a
// page's `updated`). Pages with no known date omit it — a lastmod that says
// "today" on every deploy teaches search engines to ignore the field.
const dates = docDates as Record<string, string>;

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "/",
    "/blog",
    "/changelog",
    "/contributing",
    "/security",
    "/code-of-conduct",
    "/license",
    "/community",
    "/acknowledgements",
  ];
  const docRoutes = docsNav.flatMap((s) => s.items.map((i) => i.href));
  const posts = getAllPosts();

  const newest = new Date(
    Math.max(...Object.values(dates).map((d) => +new Date(d)), ...posts.map((p) => +new Date(`${p.date}T00:00:00Z`))),
  );

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${site.url}${path === "/" ? "" : path}/`,
    ...(path === "/" ? { lastModified: newest } : {}),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : path === "/blog" ? 0.9 : 0.7,
  }));

  const docByHref = new Map(getAllDocs().map((d) => [slash(d.href), d]));
  const docEntries: MetadataRoute.Sitemap = docRoutes.map((path) => {
    const d = docByHref.get(slash(path));
    const when = d && dates[d.file];
    return {
      url: `${site.url}${slash(path)}`,
      ...(when ? { lastModified: new Date(when) } : {}),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    };
  });

  const blogEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${site.url}/blog/${p.slug}/`,
    lastModified: new Date(`${p.date}T00:00:00Z`),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  // SEO landing pages (compare / alternatives / guides) — high intent, so
  // they get strong priority. Auto-included as soon as a markdown file lands.
  const seoPages = [...getComparePages(), ...getAlternativePages(), ...getGuidePages()];
  const seoEntries: MetadataRoute.Sitemap = seoPages.map((p) => ({
    url: `${site.url}${p.href}/`,
    lastModified: new Date(`${p.updated}T00:00:00Z`),
    changeFrequency: "monthly",
    priority: 0.85,
  }));

  // index/hub pages for the SEO clusters
  const hubEntries: MetadataRoute.Sitemap = ["/compare", "/alternatives", "/guides"].map(
    (path) => ({
      url: `${site.url}${path}/`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }),
  );

  return [...staticEntries, ...docEntries, ...blogEntries, ...seoEntries, ...hubEntries];
}
