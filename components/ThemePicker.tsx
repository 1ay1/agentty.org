"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { activeScheme, applyScheme, currentScheme, isLight, parseThemes, type Scheme } from "@/lib/scheme";
import { track } from "@/lib/analytics";

// agentty's theme browser, on the site: every scheme agentty ships, filtered
// as you type, previewed live as the arrow keys move the selection (the page
// behind is the preview; hovering only highlights), Enter or a click keeps it,
// Esc puts back what you had. Opened with `t`, from the palette, or the nav's
// theme button.
//
// Built to stay instant with 617 rows on a slow phone:
//   - only the rows in view are in the DOM (fixed-height rows, windowed by
//     the list's scrollTop): ~12 elements, not 617
//   - keeping the selection in view is arithmetic on scrollTop, never
//     scrollIntoView (which forced a layout of the whole page: 360 ms a press)
//   - holding an arrow previews at most once per frame, and the selection
//     moves immediately while the page catches up
//   - the theme list is parsed once per visit and filtered with lowercase
//     names and brightness worked out up front
type Row = { name: string; lower: string; light: boolean; scheme: Scheme | null; base?: "dark" | "light"; label?: string };

const ROW = 40;          // px; must match .theme-picker .cmdk-item in site.css
const OVERSCAN = 4;

let cache: Promise<Row[]> | null = null;
export const loadThemes = () =>
  (cache ??= fetch("/themes.json")
    .then((r) => r.json())
    .then(parseThemes)
    .then((list) => list.map((s) => ({ name: s.name, lower: s.name.toLowerCase(), light: isLight(s), scheme: s })))
    .catch(() => { cache = null; return []; }));

const BASE: Row[] = [
  { name: "agentty dark", lower: "agentty dark", light: false, label: "the site's own (Flexoki)", scheme: null, base: "dark" },
  { name: "agentty light", lower: "agentty light", light: true, label: "the site's own (Flexoki)", scheme: null, base: "light" },
];

const Item = memo(function Item({ r, i, sel, current, onPick }: { r: Row; i: number; sel: boolean; current: boolean; onPick: (i: number, touch: boolean) => void }) {
  const s = r.scheme;
  return (
    <button
      id={`theme-${i}`}
      className={`cmdk-item${sel ? " sel" : ""}`}
      role="option"
      aria-selected={sel}
      style={{ transform: `translateY(${i * ROW}px)` }}
      // the page changes theme only on the arrow keys (or a tap): the pointer
      // passing over the list just highlights a row
      onPointerDown={(e) => ((e.currentTarget as HTMLElement).dataset.touch = e.pointerType !== "mouse" ? "1" : "")}
      onClick={(e) => onPick(i, (e.currentTarget as HTMLElement).dataset.touch === "1")}
    >
      <span className="cmdk-title">
        {r.name}{r.label && <span className="cmdk-parent"> · {r.label}</span>}
        {current && <span className="theme-current" aria-label="current"> ✓</span>}
      </span>
      {sel && <span className="theme-keep" aria-hidden="true">tap to keep</span>}
      <span className="theme-swatch" aria-hidden="true" style={s ? { background: s.background, borderColor: s.border } : undefined} data-base={r.base}>
        {s && [s.accent, s.info, s.secondary, s.warning, s.primary].map((c, j) => <i key={j} style={{ background: c }} />)}
      </span>
    </button>
  );
});

export function ThemePicker({ onClose }: { onClose: () => void }) {
  const [all, setAll] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [top, setTop] = useState(0);
  const [height, setHeight] = useState(480);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const before = useRef<{ css: string; theme: string; scheme: string | null } | null>(null);
  const kept = useRef(false);

  useEffect(() => {
    const d = document.documentElement;
    before.current = { css: d.style.cssText, theme: d.getAttribute("data-theme") || "dark", scheme: currentScheme() };
    void loadThemes().then(setAll);
    // on a touch screen, don't throw the keyboard up over the preview
    if (!matchMedia("(hover: none)").matches) input.current?.focus();
    return () => {
      cancelAnimationFrame(previewRaf.current);
      if (kept.current || !before.current) return;
      d.style.cssText = before.current.css;              // Esc / click away: undo the preview
      d.classList.toggle("has-scheme", !!before.current.css);
      d.setAttribute("data-theme", before.current.theme);
      window.__agenttyScheme = undefined;                // back to what's stored
      window.dispatchEvent(new CustomEvent("agentty:scheme-change", { detail: activeScheme() }));
    };
  }, []);

  // the scheme in force when the picker opened (✓ in the list)
  const current = before.current?.scheme ?? (before.current?.theme === "light" ? "agentty light" : "agentty dark");

  const rows = useMemo<Row[]>(() => {
    // words match the name; "dark" and "light" also match how bright a scheme
    // is, so "light nord" finds the light Nords whatever they're called
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [...BASE, ...all];
    const hit = (r: Row) => words.every((w) => r.lower.includes(w) || (w === "light" && r.light) || (w === "dark" && !r.light));
    return [...BASE.filter(hit), ...all.filter(hit)];
  }, [q, all]);

  // start on the scheme in use
  useEffect(() => {
    if (!all.length || q) return;
    const cur = before.current?.scheme;
    const i = cur ? rows.findIndex((r) => r.name === cur) : before.current?.theme === "light" ? 1 : 0;
    setSel(Math.max(0, i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);
  useEffect(() => setSel(0), [q]);

  // the visible window of rows
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    setHeight(el.clientHeight);
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // keep the selection in view: plain scrollTop arithmetic, no layout of the page
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const y = sel * ROW;
    if (y < el.scrollTop) el.scrollTop = y;
    else if (y + ROW > el.scrollTop + el.clientHeight) el.scrollTop = y + ROW - el.clientHeight;
  }, [sel]);

  // preview the selection, at most once per frame (holding an arrow key
  // moves the highlight every repeat; the page repaints as fast as it can)
  const previewRaf = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(previewRaf.current);
    const r = rows[sel];
    if (!r) return;
    previewRaf.current = requestAnimationFrame(() => applyScheme(r.scheme, r.base, false));
  }, [sel, rows]);

  const keep = (r: Row | undefined) => {
    if (!r) return;
    cancelAnimationFrame(previewRaf.current);
    kept.current = true;
    applyScheme(r.scheme, r.base, true);
    track("theme-pick", { scheme: r.name });
    onClose();
  };
  const rowsRef = useRef(rows); rowsRef.current = rows;
  const selRef = useRef(sel); selRef.current = sel;
  const onPick = useMemo(() => (i: number, touch: boolean) => {
    if (touch && i !== selRef.current) setSel(i); else keep(rowsRef.current[i]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const first = Math.max(0, Math.floor(top / ROW) - OVERSCAN);
  const last = Math.min(rows.length, Math.ceil((top + height) / ROW) + OVERSCAN);
  const move = (d: number) => setSel((s) => Math.min(rows.length - 1, Math.max(0, s + d)));

  return (
    <div className="cmdk-overlay theme-overlay" onClick={onClose}>
      <div className="cmdk theme-picker" role="dialog" aria-modal="true" aria-label="Theme" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk-inputrow">
          <span className="cmdk-prompt" aria-hidden="true">theme</span>
          <input
            ref={input}
            className="cmdk-input"
            aria-label="Filter themes"
            placeholder={all.length ? `filter ${all.length} schemes` : "loading…"}
            value={q}
            role="combobox"
            aria-expanded="true"
            aria-controls="theme-results"
            aria-activedescendant={rows[sel] ? `theme-${sel}` : undefined}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) { e.preventDefault(); move(1); }
              else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) { e.preventDefault(); move(-1); }
              else if (e.key === "PageDown") { e.preventDefault(); move(10); }
              else if (e.key === "PageUp") { e.preventDefault(); move(-10); }
              else if (e.key === "Home" && !q) { e.preventDefault(); setSel(0); }
              else if (e.key === "End" && !q) { e.preventDefault(); setSel(rows.length - 1); }
              else if (e.key === "Enter") { e.preventDefault(); keep(rows[sel]); }
              else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
            }}
          />
          <kbd className="cmdk-esc">esc</kbd>
        </div>
        <div className="cmdk-results theme-results" id="theme-results" ref={list} role="listbox" aria-label="Themes"
          onScroll={(e) => setTop((e.currentTarget as HTMLElement).scrollTop)}>
          {all.length > 0 && rows.length === 0 && <div className="cmdk-empty">no scheme matches</div>}
          <div className="theme-space" style={{ height: rows.length * ROW }}>
            {rows.slice(first, last).map((r, k) => {
              const i = first + k;
              return <Item key={r.name} r={r} i={i} sel={i === sel} current={r.name === current} onPick={onPick} />;
            })}
          </div>
        </div>
        <div className="cmdk-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> preview</span>
          <span><kbd>↵</kbd> keep</span>
          <span><kbd>esc</kbd> put back</span>
        </div>
      </div>
    </div>
  );
}
