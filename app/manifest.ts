import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "agentty — the agent harness for your terminal",
    short_name: "agentty",
    description:
      "A native C++26 agent harness for your terminal. One static binary, any model, sandboxed by default.",
    start_url: "/",
    display: "browser",
    background_color: "#0b0810",
    theme_color: "#0b0810",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
