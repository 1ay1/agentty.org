"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { activeScheme, applyScheme, currentScheme, isLight, parseThemes, type Scheme } from "@/lib/scheme";
import { track } from "@/lib/analytics";

// agentty's theme browser, on the site: every scheme agentty ships, filtered
// as you type, previewed live as the arrow keys move the selection (the page
// behind is the preview; hovering only highlights), Enter or a click keeps it,
// Esc puts back what you had. Opened with `t`,
// from the palette, or the nav's theme button.
type Row = { name: string; scheme: Scheme | null; base?: "dark" | "light"; label?: string };

let cache: Promise<Scheme[]> | null = null;
const load = () => (cache ??= fetch("/themes.json").then((r) => r.json()).then(parseThemes).catch(() => { cache = null; return []; }));

export function ThemePicker({ onClose }: { onClose: () => void }) {
  const [all, setAll] = useState<Scheme[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const before = useRef<{ css: string; theme: string; scheme: string | null } | null>(null);
  const kept = useRef(false);
  const touch = useRef(false);

  useEffect(() => {
    const d = document.documentElement;
    before.current = { css: d.style.cssText, theme: d.getAttribute("data-theme") || "dark", scheme: currentScheme() };
    load().then(setAll);
    // on a touch screen, don't throw the keyboard up over the preview
    if (!matchMedia("(hover: none)").matches) input.current?.focus();
    return () => {
      if (kept.current || !before.current) return;
      d.style.cssText = before.current.css;              // Esc / click away: undo the preview
      d.classList.toggle("has-scheme", !!before.current.css);
      d.setAttribute("data-theme", before.current.theme);
      window.__agenttyScheme = undefined;                // back to what's stored
      window.dispatchEvent(new CustomEvent("agentty:scheme-change", { detail: activeScheme() }));
    };
  }, []);

  // the scheme in force when the picker opened (✓ in the list)
  const current = useMemo(() => before.current?.scheme ?? (before.current?.theme === "light" ? "agentty light" : "agentty dark"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all]);

  const rows = useMemo<Row[]>(() => {
    const base: Row[] = [
      { name: "agentty dark", label: "the site's own (Flexoki)", scheme: null, base: "dark" },
      { name: "agentty light", label: "the site's own (Flexoki)", scheme: null, base: "light" },
    ];
    // words match the name; "dark" and "light" also match how bright a scheme
    // is, so "light nord" finds the light Nords whatever they're called
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const hit = (n: string, light: boolean) => words.every((w) =>
      n.toLowerCase().includes(w) || (w === "light" && light) || (w === "dark" && !light));
    return [
      ...base.filter((r) => hit(r.name, r.base === "light")),
      ...all.filter((s) => hit(s.name, isLight(s))).map((s) => ({ name: s.name, scheme: s })),
    ];
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
  useEffect(() => {
    const r = rows[sel];
    if (r) applyScheme(r.scheme, r.base, false);
    list.current?.querySelector<HTMLElement>(".cmdk-item.sel")?.scrollIntoView({ block: "nearest" });
  }, [sel, rows]);

  const keep = (r: Row | undefined) => {
    if (!r) return;
    kept.current = true;
    applyScheme(r.scheme, r.base, true);
    track("theme-pick", { scheme: r.name });
    onClose();
  };

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
              if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) { e.preventDefault(); setSel((s) => Math.min(s + 1, rows.length - 1)); }
              else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              else if (e.key === "PageDown") { e.preventDefault(); setSel((s) => Math.min(s + 10, rows.length - 1)); }
              else if (e.key === "PageUp") { e.preventDefault(); setSel((s) => Math.max(s - 10, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); keep(rows[sel]); }
              else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
            }}
          />
          <kbd className="cmdk-esc">esc</kbd>
        </div>
        <div className="cmdk-results" id="theme-results" ref={list} role="listbox" aria-label="Themes">
          {all.length > 0 && rows.length === 0 && <div className="cmdk-empty">no scheme matches</div>}
          {rows.map((r, i) => {
            const s = r.scheme;
            return (
              <button
                key={r.name}
                id={`theme-${i}`}
                className={`cmdk-item ${i === sel ? "sel" : ""}`}
                role="option"
                aria-selected={i === sel}
                // the page changes theme only on the arrow keys (or a tap):
                // the pointer passing over the list just highlights a row
                onPointerDown={(e) => (touch.current = e.pointerType !== "mouse")}
                onClick={() => (touch.current && i !== sel ? setSel(i) : keep(r))}
              >
                <span className="cmdk-title">
                  {r.name}{r.label && <span className="cmdk-parent"> · {r.label}</span>}
                  {r.name === current && <span className="theme-current" aria-label="current"> ✓</span>}
                </span>
                {i === sel && <span className="theme-keep" aria-hidden="true">tap to keep</span>}
                <span className="theme-swatch" aria-hidden="true" style={s ? { background: s.background, borderColor: s.border } : undefined} data-base={r.base}>
                  {s && [s.accent, s.info, s.secondary, s.warning, s.primary].map((c, j) => <i key={j} style={{ background: c }} />)}
                </span>
              </button>
            );
          })}
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
