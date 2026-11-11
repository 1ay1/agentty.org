import type { Metadata } from "next";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { markdownToHtml } from "@/lib/markdown";
import { applyTokens } from "@/lib/docs-tokens";
import { site } from "@/lib/site";
import { DocBody } from "@/components/DocBody";

// The changelog is rendered straight from the agentty repo's CHANGELOG.md,
// synced into content/changelog.md on every deploy (scripts/sync-changelog.mjs).
// Zero hand-authoring — edit CHANGELOG.md in agentty-org/agentty and it appears here.

export const metadata: Metadata = {
  title: { absolute: "Changelog · agentty — every release, added, changed, fixed" },
  description:
    "Release history for agentty — every version's added, changed, and fixed, straight from the repo's CHANGELOG.md.",
  alternates: { canonical: "/changelog" },
  openGraph: {
    title: "agentty changelog",
    description: "Every agentty release: added, changed, fixed.",
    url: `${site.url}/changelog`,
    images: [`${site.url}/opengraph-image`],
  },
  twitter: {
    card: "summary_large_image",
    title: "agentty changelog",
    description: "Every agentty release: added, changed, fixed.",
    images: [`${site.url}/twitter-image`],
  },
};

function loadChangelog(): string {
  const path = join(process.cwd(), "content", "changelog.md");
  if (!existsSync(path)) return "";
  let md = readFileSync(path, "utf8");
  // Drop the top-level "# Changelog" heading + intro line; the page supplies its
  // own <h1>, so we render from the first version section down.
  md = md.replace(/^#\s+Changelog\s*\n/, "").replace(/^All notable changes[^\n]*\n/m, "");
  // drop an empty [Unreleased] section; headings read "v0.9.51 · 2026-11-08"
  md = md.replace(/^## \[Unreleased\]\s*\n(?=## )/m, "");
  md = md.replace(/^## \[([^\]]+)\]\s*-\s*(\d{4}-\d\d-\d\d)\s*$/gm, "## v$1 · $2");
  return md.trim();
}

// `git log --graph --oneline --decorate` for releases: the graph rail, the
// tag, the date, the first change's title, and how many entries each
// section has (+added ~changed !fixed), coloured the way git colours them.
type Entry = { version: string; date: string; id: string; title: string; added: number; changed: number; fixed: number };
const count = (sec: string, kind: string) => {
  const m = sec.match(new RegExp(`^### ${kind}\\s*\\n([\\s\\S]*?)(?=^### |(?![\\s\\S]))`, "m"));
  return m ? (m[1].match(/^[-*] /gm) ?? []).length : 0;
};
function logEntries(md: string): Entry[] {
  return md.split(/^(?=## v)/m).flatMap((sec) => {
    const h = sec.match(/^## v(\S+) · (\d{4}-\d\d-\d\d)/);
    if (!h) return [];
    const bullet = sec.match(/^[-*] (.+)$/m)?.[1] ?? "";
    const first = bullet.match(/^\*\*(.+?)\*\*/)?.[1] ?? bullet;
    const title = first.replace(/\*\*|`|\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[.:]$/, "");
    const id = `v${h[1]}-${h[2]}`.toLowerCase().replace(/[^\w\s-]/g, "");
    return [{ version: h[1], date: h[2], id, title, added: count(sec, "Added"), changed: count(sec, "Changed"), fixed: count(sec, "Fixed") }];
  });
}

export default function ChangelogPage() {
  const md = applyTokens(loadChangelog());
  const html = markdownToHtml(md);
  const log = logEntries(md);
  return (
    <div className="page changelog-page">
      <h1>Changelog</h1>
      <p className="lead">
        Every agentty release: added, changed, and fixed. Sourced live from{" "}
        <a href={`${site.github}/blob/master/CHANGELOG.md`} target="_blank" rel="noopener noreferrer">
          CHANGELOG.md
        </a>{" "}
        in the repo.
      </p>
      <ol className="gitlog" aria-label="Releases">
        {log.map((e, i) => (
          <li key={e.version}>
            <span className="gl-graph" aria-hidden="true">*</span>
            <a href={`#${e.id}`}>
              <span className="gl-deco">({i === 0 && <><span className="gl-head">HEAD</span>, </>}tag: </span>v{e.version}<span className="gl-deco">)</span>
            </a>
            <time dateTime={e.date}>{e.date}</time>
            <span className="gl-title">{e.title}</span>
            <span className="gl-stat" aria-label={`${e.added} added, ${e.changed} changed, ${e.fixed} fixed`}>
              {e.added > 0 && <span className="gl-add">+{e.added}</span>}
              {e.changed > 0 && <span className="gl-chg">~{e.changed}</span>}
              {e.fixed > 0 && <span className="gl-fix">!{e.fixed}</span>}
            </span>
          </li>
        ))}
      </ol>
      <DocBody html={html} />
    </div>
  );
}
