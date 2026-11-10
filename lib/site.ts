export const site = {
  name: "agentty",
  tagline: "An agent harness for your terminal.",
  description:
    "A native C++26 agent harness for your terminal: the coding agent around any model. A single static binary with millisecond cold start, sandboxed by default, one-command SSH air-gap, and runs inside Zed over ACP. Sign in with a subscription you already have — Claude Pro/Max, ChatGPT, GitHub Copilot, or Kimi (no API key) — or point it at DeepSeek, Google Gemini, xAI Grok, Mistral, OpenAI, Groq, OpenRouter, Together, Cerebras, Fireworks, or a local Ollama model. A drop-in alternative to claude-code with no Node, Python, or Electron.",
  url: "https://agentty.org",
  github: "https://github.com/agentty-org/agentty",
  siteRepo: "https://github.com/1ay1/agentty.org",
  releases: "https://github.com/agentty-org/agentty/releases",
  releasesLatest: "https://github.com/agentty-org/agentty/releases/latest",
  issues: "https://github.com/agentty-org/agentty/issues",
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
import { docsNav as rawDocsNav } from "./docs-nav.generated";
import { slash } from "./url";
// canonical (trailing-slash) hrefs everywhere the nav is rendered
export const docsNav: NavSection[] = rawDocsNav.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i, href: slash(i.href) })) }));

export const topNav: NavItem[] = [
  { title: "Docs", href: "/docs/" },
  { title: "Install", href: "/docs/installation/" },
  { title: "Manual", href: "/docs/interface/" },
  { title: "Blog", href: "/blog/" },
  { title: "Community", href: "/community/" },
];
