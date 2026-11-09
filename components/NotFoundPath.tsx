"use client";

import { useEffect, useState } from "react";

// The path you asked for, and — like a shell's "command not found" — the
// closest real page. The 404 page is static, so both are filled in after load
// from the site's search index.
type Entry = [string, string, ...unknown[]];

const lev = (a: string, b: string) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};

function closest(path: string, hrefs: string[]): string | null {
  const want = path.toLowerCase().replace(/\/+$/, "");
  const leaf = want.split("/").pop() ?? "";
  let best: { href: string; score: number } | null = null;
  for (const href of hrefs) {
    const h = href.replace(/\/+$/, "");
    const hl = h.split("/").pop() ?? "";
    // whole path, or the last segment alone (a page moved between sections)
    const score = Math.min(lev(want, h), lev(leaf, hl) + 2, hl.startsWith(leaf) && leaf.length >= 3 ? 1 : 99);
    if (!best || score < best.score) best = { href, score };
  }
  return best && best.score <= Math.max(3, Math.floor(leaf.length / 3)) ? best.href : null;
}

export function NotFoundPath({ suggest = false }: { suggest?: boolean }) {
  const [path, setPath] = useState("…");
  const [guess, setGuess] = useState<string | null>(null);
  useEffect(() => {
    const p = decodeURIComponent(location.pathname).replace(/\/$/, "") || "/";
    setPath(p);
    if (!suggest) return;
    fetch("/search.json")
      .then((r) => r.json())
      .then((idx: Entry[]) => setGuess(closest(p, [...new Set(idx.map((e) => e[1]).filter((h) => !h.includes("#")))])))
      .catch(() => {});
  }, [suggest]);
  if (suggest) {
    if (!guess) return null;
    return (
      <>
        {"\n"}
        <span className="notfound-guess">did you mean </span>
        <a href={guess}>{guess.replace(/\/$/, "")}</a>?
      </>
    );
  }
  return <span className="notfound-path">{path}</span>;
}
