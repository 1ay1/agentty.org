"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemePicker } from "./ThemePicker";   // in the bundle: a lazy chunk cost ~300 ms on first open

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


// the page's sections, in order: the h2/h3 headings of the reading column
const sections = () =>
  [...document.querySelectorAll<HTMLElement>(":is(.doc-body, .post-body, .page) :is(h2, h3)[id]")];
const nav = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 52;
function jumpSection(dir: 1 | -1) {
  const hs = sections();
  if (!hs.length) return;
  const y = nav() + 8;
  const tops = hs.map((h) => h.getBoundingClientRect().top - y);
  const i = dir > 0 ? tops.findIndex((t) => t > 2) : tops.map((t, j) => [t, j]).filter(([t]) => t < -2).pop()?.[1] ?? -1;
  if (i < 0) { if (dir < 0) window.scrollTo(0, 0); return; }
  hs[i].scrollIntoView({ block: "start" });
  history.replaceState(null, "", `#${hs[i].id}`);
}

export const flash = (msg: string) => window.dispatchEvent(new CustomEvent("agentty:flash", { detail: msg }));

export function Shortcuts() {
  const [open, setOpen] = useState(false);
  const [themes, setThemes] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const openThemes = () => { setOpen(false); setThemes(true); };
    const openKeys = () => setOpen((o) => !o);
    window.addEventListener("agentty:open-theme", openThemes);
    window.addEventListener("agentty:open-keys", openKeys);
    let pendingG = 0;
    const follow = (rel: "prev" | "next") => {
      const a = document.querySelector<HTMLAnchorElement>(`a[rel~="${rel}"]`);
      if (a) router.push(a.getAttribute("href")!);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      if (document.querySelector(".cmdk-overlay, .theme-overlay")) return;
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
        "}": () => jumpSection(1),
        "{": () => jumpSection(-1),
        t: () => openThemes(),
        y: () => {
          // the page's markdown, the same text "copy page" copies
          const md = document.querySelector<HTMLAnchorElement>(".page-actions a[href$='.md']")?.getAttribute("href");
          const text = md
            ? fetch(md).then((r) => (r.ok ? r.text() : Promise.reject()))
            : Promise.resolve(location.href);
          text.then((t) => navigator.clipboard.writeText(t))
            .then(() => flash(md ? "copied the page as markdown" : "copied the link"), () => flash("copy failed"));
        },
        Y: () => {
          const h = location.hash ? location.href : location.origin + location.pathname;
          navigator.clipboard.writeText(h).then(() => flash("copied the link"), () => flash("copy failed"));
        },
      };
      if (moves[k]) { e.preventDefault(); moves[k](); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("agentty:open-theme", openThemes); window.removeEventListener("agentty:open-keys", openKeys); };
  }, [router]);

  if (themes) return <ThemePicker onClose={() => setThemes(false)} />;
  if (!open) return null;
  const rows: [string, string][] = [
    ["/", "search"],
    ["j  k", "down, up"],
    ["d  u", "half a page"],
    ["g g  G", "top, bottom"],
    ["{  }", "previous, next section"],
    ["[  ]", "previous, next page"],
    ["y", "copy the page as markdown"],
    ["Y", "copy the link"],
    ["t", "theme: agentty's 615 schemes"],
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
