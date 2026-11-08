import type { Metadata } from "next";
import Link from "next/link";
import { getGuidePages } from "@/lib/seo-pages";

export const metadata: Metadata = {
  title: { absolute: "agentty guides — local models, Claude, providers" },
  description:
    "Practical guides for agentty, the agent harness for your terminal: run models locally with Ollama, use Claude from the terminal, set up providers.",
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
