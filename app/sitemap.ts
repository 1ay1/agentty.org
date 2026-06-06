import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { docsNav } from "@/lib/site";
import { getAllPosts } from "@/lib/blog";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "/",
    "/blog",
    "/contributing",
    "/security",
    "/code-of-conduct",
    "/license",
    "/community",
    "/acknowledgements",
  ];
  const docRoutes = docsNav.flatMap((s) => s.items.map((i) => i.href));
  const blogRoutes = getAllPosts().map((p) => `/blog/${p.slug}`);
  const all = [...staticRoutes, ...docRoutes, ...blogRoutes];
  return all.map((path) => ({
    url: `${site.url}${path === "/" ? "" : path}/`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
