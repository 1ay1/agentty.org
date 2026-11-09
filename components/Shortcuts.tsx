"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Keyboard shortcuts, the way a terminal program has them: `?` lists them,
// `less` keys move through a page, `g` then a letter jumps somewhere. `/` and
// Ctrl+K belong to the search palette and are only listed here.
const GOTO: Record<string, { href: string; label: string }> = {
  h: { href: "/", label: "home" },
  d: { href: "/docs/", label: "docs" },
  i: { href: "/docs/installation/", label: "install" },
  b: { href: "/blog/", label: "blog" },
  c: { href: "/changelog/", label: "changelog" },
  m: { href: "/benchmarks/", label: "benchmarks" },
};

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};

// one text row, the page's own rhythm unit
const row = () => parseFloat(getComputedStyle(document.body).fontSize) * 1.7;

export function Shortcuts() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let pendingG = 0;
    const follow = (rel: "prev" | "next") => {
      const a = document.querySelector<HTMLAnchorElement>(`a[rel~="${rel}"]`);
      if (a) router.push(a.getAttribute("href")!);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      if (document.querySelector(".cmdk-overlay")) return;
      const k = e.key;
      if (k === "Escape") { setOpen(false); return; }
      if (k === "?") { e.preventDefault(); setOpen((o) => !o); return; }
      if (pendingG && Date.now() - pendingG < 1200) {
        pendingG = 0;
        if (k === "g") { e.preventDefault(); window.scrollTo(0, 0); return; }
        if (GOTO[k]) { e.preventDefault(); setOpen(false); router.push(GOTO[k].href); return; }
      }
      if (k === "g") { pendingG = Date.now(); return; }
      pendingG = 0;
      const half = window.innerHeight / 2;
      const moves: Record<string, () => void> = {
        j: () => window.scrollBy(0, row() * 3),
        k: () => window.scrollBy(0, -row() * 3),
        d: () => window.scrollBy(0, half),
        u: () => window.scrollBy(0, -half),
        G: () => window.scrollTo(0, document.documentElement.scrollHeight),
        "]": () => follow("next"),
        "[": () => follow("prev"),
      };
      if (moves[k]) { e.preventDefault(); moves[k](); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  if (!open) return null;
  const rows: [string, string][] = [
    ["/", "search"],
    ["j  k", "down, up"],
    ["d  u", "half a page"],
    ["g g  G", "top, bottom"],
    ["[  ]", "previous, next page"],
    ...Object.entries(GOTO).map(([k, v]) => [`g ${k}`, v.label] as [string, string]),
    ["?", "this list"],
    ["esc", "close"],
  ];
  return (
    <div className="keys-overlay" onClick={() => setOpen(false)}>
      <div className="keys" role="dialog" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()}>
        <p className="keys-title">keyboard, like less</p>
        <dl>
          {rows.map(([k, v]) => (
            <Fragment key={k}>
              <dt><kbd>{k}</kbd></dt><dd>{v}</dd>
            </Fragment>
          ))}
        </dl>
      </div>
    </div>
  );
}
