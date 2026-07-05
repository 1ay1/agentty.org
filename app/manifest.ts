import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "agentty — a blazing-fast coding agent in your terminal",
    short_name: "agentty",
    description:
      "A native C++26 terminal coding agent. One static binary, sandboxed by default.",
    start_url: "/",
    display: "browser",
    background_color: "#0a0c10",
    theme_color: "#0a0c10",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
