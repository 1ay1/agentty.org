"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { site } from "@/lib/site";

// Search over every docs page and its sections, blog posts, guides and the
// site's pages. The index (/search.json, built statically) is fetched once,
// the first time the palette opens.
type Item = { title: string; href: string; group: string; parent?: string; external?: boolean };
type Row = [string, string, string, string?];

const STATIC: Item[] = [
  { title: "Home", href: "/", group: "Pages" },
  { title: "Changelog", href: "/changelog", group: "Pages" },
  { title: "Blog", href: "/blog", group: "Pages" },
  { title: "Guides", href: "/guides", group: "Pages" },
  { title: "Community", href: "/community", group: "Pages" },
  { title: "Contributing", href: "/contributing", group: "Pages" },
  { title: "Security", href: "/security", group: "Pages" },
  { title: "License", href: "/license", group: "Pages" },
  { title: "GitHub repository", href: site.github, group: "Links", external: true },
  { title: "Latest release", href: site.releasesLatest, group: "Links", external: true },
  { title: "Discord", href: site.discord, group: "Links", external: true },
];
const SUGGESTED = ["/docs/quick-start", "/docs/installation", "/docs/providers", "/docs/keybindings", "/docs/sandboxing", "/docs/cli"];

let indexPromise: Promise<Item[]> | null = null;
const loadIndex = () =>
  (indexPromise ??= fetch("/search.json")
    .then((r) => (r.ok ? r.json() : []))
    .then((rows: Row[]) => [...rows.map(([title, href, group, parent]) => ({ title, href, group, parent })), ...STATIC])
    .catch(() => STATIC));

// Rank a title against the query: every query word must appear; whole-word and
// word-prefix hits score highest, then substring, then in-order subsequence.
function score(words: string[], item: Item): number {
  const t = item.title.toLowerCase();
  const hay = item.parent ? `${t} ${item.parent.toLowerCase()}` : t;
  let total = 0;
  for (const w of words) {
    let s = 0;
    if (new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(t)) s = t.startsWith(w) ? 120 : 90;
    else if (t.includes(w)) s = 50;
    else if (hay.includes(w)) s = 25;
    else {
      let i = 0;
      for (const ch of t) if (ch === w[i]) i++;
      if (i < w.length || w.length < 3) return 0;
      s = 8;
    }
    total += s;
  }
  if (!item.parent) total += 15;                  // pages before their sections
  return total - t.length / 40;                   // shorter titles break ties
}

export function CommandPalette({ startOpen = false }: { startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [index, setIndex] = useState<Item[]>(STATIC);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) loadIndex().then(setIndex);
  }, [open]);

  const results = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) {
      const byHref = new Map(index.map((i) => [i.href, i]));
      return SUGGESTED.map((h) => byHref.get(h)).filter((x): x is Item => !!x);
    }
    return index
      .map((it) => ({ it, sc: score(words, it) }))
      .filter((r) => r.sc > 0)
      .sort((a, b) => b.sc - a.sc)
      .slice(0, 12)
      .map((r) => r.it);
  }, [q, index]);

  useEffect(() => {
    const typing = (el: EventTarget | null) =>
      el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !typing(e.target)) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("agentty:open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("agentty:open-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      const y = window.scrollY;
      document.documentElement.style.overflow = "hidden";
      return () => { document.documentElement.style.overflow = ""; window.scrollTo(0, y); };
    }
    setQ("");
    setSel(0);
  }, [open]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    resultsRef.current?.querySelector<HTMLElement>(".cmdk-item.sel")?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const go = (it: Item) => {
    setOpen(false);
    if (it.external) window.open(it.href, "_blank", "noopener,noreferrer");
    else router.push(it.href);
  };

  if (!open) return null;

  return (
    <div className="cmdk-overlay" onClick={() => setOpen(false)}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Search" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk-inputrow">
          <span className="cmdk-prompt" aria-hidden="true">/</span>
          <input
            ref={inputRef}
            className="cmdk-input"
            aria-label="Search the docs"
            placeholder="search docs, sections, posts…"
            value={q}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-results"
            aria-activedescendant={results[sel] ? `cmdk-${sel}` : undefined}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
                e.preventDefault();
                setSel((s) => Math.min(s + 1, results.length - 1));
              } else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
                e.preventDefault();
                setSel((s) => Math.max(s - 1, 0));
              } else if (e.key === "Enter" && results[sel]) go(results[sel]);
            }}
          />
          <kbd className="cmdk-esc">esc</kbd>
        </div>

        <div className="cmdk-results" id="cmdk-results" ref={resultsRef} role="listbox" aria-label="Results">
          {!q.trim() && <div className="cmdk-heading">Suggested</div>}
          {results.length === 0 && <div className="cmdk-empty">No results for “{q}”</div>}
          {results.map((r, i) => (
            <button
              key={r.href + r.title}
              id={`cmdk-${i}`}
              className={`cmdk-item ${i === sel ? "sel" : ""}`}
              role="option"
              aria-selected={i === sel}
              onMouseMove={() => setSel(i)}
              onClick={() => go(r)}
            >
              <span className="cmdk-title">
                {r.parent && <span className="cmdk-parent">{r.parent} › </span>}
                {r.title}
                {r.external && " ↗"}
              </span>
              <span className="cmdk-section">{r.group}</span>
            </button>
          ))}
        </div>

        <div className="cmdk-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>/</kbd> or <kbd>⌘K</kbd> search</span>
        </div>
      </div>
    </div>
  );
}
