import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { docsNav } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "/",
    "/roadmap",
    "/changelog",
    "/contributing",
    "/security",
    "/code-of-conduct",
    "/license",
    "/community",
    "/acknowledgements",
  ];
  const docRoutes = docsNav.flatMap((s) => s.items.map((i) => i.href));
  const all = [...staticRoutes, ...docRoutes];
  return all.map((path) => ({
    url: `${site.url}${path === "/" ? "" : path}/`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
