import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NEXT_DIST_DIR lets a dev server live beside the autodeploy's build
  // (which wipes .next) without either clobbering the other.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  compiler: {
    // strip console.* from the production bundle
    removeConsole: { exclude: ["error", "warn"] },
  },
  experimental: {
    // inline the critical CSS for first paint, lazy-load the rest
    optimizeCss: true,
  },
};

export default nextConfig;
