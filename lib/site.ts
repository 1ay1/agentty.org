export const site = {
  name: "agentty",
  tagline: "Blazing-fast Claude in your terminal.",
  description:
    "A native C++26 terminal coding agent. An 8.8 MB static binary with sub-millisecond cold start, sandboxed by default, and one-command SSH air-gap. A drop-in alternative to claude-code with no Node, Python, or Electron.",
  url: "https://agentty.org",
  github: "https://github.com/1ay1/agentty",
  releases: "https://github.com/1ay1/agentty/releases",
  releasesLatest: "https://github.com/1ay1/agentty/releases/latest",
  issues: "https://github.com/1ay1/agentty/issues",
  license: "MIT",
  maya: "https://github.com/1ay1/maya",
  installOneLiner:
    "curl -fsSL https://raw.githubusercontent.com/1ay1/agentty/master/install.sh | sh",
} as const;

export type NavItem = { title: string; href: string };
export type NavSection = { title: string; items: NavItem[] };

export const docsNav: NavSection[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Installation", href: "/docs/installation" },
      { title: "Quick Start", href: "/docs/quick-start" },
      { title: "Authentication", href: "/docs/authentication" },
    ],
  },
  {
    title: "User Manual",
    items: [
      { title: "The Interface", href: "/docs/interface" },
      { title: "Keybindings", href: "/docs/keybindings" },
      { title: "Permission Profiles", href: "/docs/profiles" },
      { title: "Threads & Persistence", href: "/docs/threads" },
      { title: "Configuration", href: "/docs/configuration" },
      { title: "CLI Reference", href: "/docs/cli" },
    ],
  },
  {
    title: "Tools",
    items: [
      { title: "Tool Overview", href: "/docs/tools" },
      { title: "Sandboxing", href: "/docs/sandboxing" },
      { title: "Workspace Boundary", href: "/docs/workspace" },
    ],
  },
  {
    title: "Advanced",
    items: [
      { title: "SSH Air-gap", href: "/docs/airgap" },
      { title: "Corporate Proxies", href: "/docs/proxies" },
      { title: "Building from Source", href: "/docs/building" },
      { title: "Architecture", href: "/docs/architecture" },
    ],
  },
  {
    title: "Help",
    items: [
      { title: "Troubleshooting", href: "/docs/troubleshooting" },
      { title: "FAQ", href: "/docs/faq" },
    ],
  },
];

export const topNav: NavItem[] = [
  { title: "Docs", href: "/docs" },
  { title: "Install", href: "/docs/installation" },
  { title: "Manual", href: "/docs/interface" },
  { title: "Roadmap", href: "/roadmap" },
  { title: "Changelog", href: "/changelog" },
  { title: "Community", href: "/community" },
];
