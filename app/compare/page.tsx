import type { Metadata } from "next";
import Link from "next/link";
import { getComparePages } from "@/lib/seo-pages";

export const metadata: Metadata = {
  title: { absolute: "agentty vs other coding agents — comparisons" },
  description:
    "Honest, side-by-side comparisons of agentty against Claude Code, Aider, and other terminal AI coding agents — speed, providers, sandboxing, and when to pick each.",
  alternates: { canonical: "/compare" },
};

export default function CompareIndex() {
  const pages = getComparePages();
  return (
    <div className="page">
      <p className="kicker">Comparisons</p>
      <h1>agentty vs other coding agents</h1>
      <p className="lead">
        Honest, side-by-side comparisons — including when to choose the other tool.
      </p>
      <ul className="index-list">
        {pages.map((p) => (
          <li key={p.slug}>
            <Link href={p.href}>
              <span className="il-title">{p.title}</span>
              {p.verdict && <span className="il-sub">{p.verdict}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
