import type { Metadata } from "next";
import Link from "next/link";
import { getGuidePages } from "@/lib/seo-pages";

export const metadata: Metadata = {
  title: "agentty guides — run AI coding agents locally, with Ollama, Claude & more",
  description:
    "Practical guides for agentty: run a coding agent locally with Ollama, use Claude from the terminal, integrate providers, and more.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndex() {
  const pages = getGuidePages();
  return (
    <div className="page">
      <p className="kicker">Guides</p>
      <h1>agentty guides</h1>
      <p className="lead">
        Practical, copy-pasteable walkthroughs for getting the most out of agentty.
      </p>
      <ul className="index-list">
        {pages.map((p) => (
          <li key={p.slug}>
            <Link href={p.href}>
              <span className="il-title">{p.title}</span>
              {p.description && <span className="il-sub">{p.description}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
