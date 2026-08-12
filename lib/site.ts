export const site = {
  name: "agentty",
  tagline: "A blazing-fast coding agent in your terminal.",
  description:
    "A native C++26 terminal coding agent. A single static binary with millisecond cold start, sandboxed by default, one-command SSH air-gap, and runs inside Zed over ACP. Signs in with Claude Pro/Max, or points at OpenAI, Groq, OpenRouter, Together, Cerebras, or a local Ollama model. A drop-in alternative to claude-code with no Node, Python, or Electron.",
  url: "https://agentty.org",
  github: "https://github.com/1ay1/agentty",
  releases: "https://github.com/1ay1/agentty/releases",
  releasesLatest: "https://github.com/1ay1/agentty/releases/latest",
  issues: "https://github.com/1ay1/agentty/issues",
  discord: "https://discord.gg/qhb9AZ8f3c",
  license: "MIT",
  maya: "https://github.com/1ay1/maya",
  installOneLiner:
    "curl -fsSL https://agentty.org/install.sh | sh",
  installOneLinerWindows:
    "irm https://agentty.org/install.ps1 | iex",
} as const;

export type NavItem = { title: string; href: string };
export type NavSection = { title: string; items: NavItem[] };

// docsNav is DERIVED from the docs markdown frontmatter (nav_section / nav_order)
// and written to lib/docs-nav.generated.ts by scripts/sync-docs.mjs at build
// time. Client components (DocsSidebar) import it from here. Editing a doc's
// frontmatter is the only way to change the sidebar — there is no hand-kept list.
export { docsNav } from "./docs-nav.generated";

export const topNav: NavItem[] = [
  { title: "Docs", href: "/docs" },
  { title: "Install", href: "/docs/installation" },
  { title: "Manual", href: "/docs/interface" },
  { title: "Blog", href: "/blog" },
  { title: "Community", href: "/community" },
];
