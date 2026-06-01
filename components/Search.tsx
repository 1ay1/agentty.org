"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { docsNav, topNav } from "@/lib/site";

type Item = { title: string; href: string; section: string };

const index: Item[] = [
  ...topNav.map((n) => ({ ...n, section: "Pages" })),
  ...docsNav.flatMap((s) => s.items.map((i) => ({ ...i, section: s.title }))),
  { title: "Acknowledgements", href: "/acknowledgements", section: "Pages" },
  { title: "License", href: "/license", section: "Pages" },
  { title: "Security", href: "/security", section: "Pages" },
  { title: "Contributing", href: "/contributing", section: "Pages" },
];

export function Search() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    if (!q.trim()) return index.slice(0, 8);
    const t = q.toLowerCase();
    return index.filter((i) => i.title.toLowerCase().includes(t)).slice(0, 10);
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
    else { setQ(""); setSel(0); }
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button className="search-trigger" onClick={() => setOpen(true)} aria-label="Search docs">
        <span className="search-ico">⌕</span>
        <span className="search-label">Search</span>
        <kbd className="search-kbd">⌘K</kbd>
      </button>

      {open && (
        <div className="search-overlay" onClick={() => setOpen(false)}>
          <div className="search-modal" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              className="search-input"
              placeholder="Search documentation…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setSel(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
                if (e.key === "Enter" && results[sel]) go(results[sel].href);
              }}
            />
            <div className="search-results">
              {results.length === 0 && <div className="search-empty">No results for “{q}”</div>}
              {results.map((r, i) => (
                <button
                  key={r.href}
                  className={`search-result ${i === sel ? "sel" : ""}`}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => go(r.href)}
                >
                  <span className="search-result-title">{r.title}</span>
                  <span className="search-result-section">{r.section}</span>
                </button>
              ))}
            </div>
            <div className="search-foot">
              <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
              <span><kbd>↵</kbd> open</span>
              <span><kbd>esc</kbd> close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
