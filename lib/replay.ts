// Shared by the build-time static frame (components/ReplayDemo.tsx) and the
// client player (components/ReplayTerminal.tsx). Data comes from
// scripts/build-demo-screen.mjs → lib/demo-screen.json, already segmented:
// the browser does no text splitting at all, it only places segments.

import glyphs from "@/lib/demo-glyphs.json";

// [startCol, cells, text, classIndex] — positioned absolutely at startCol
export type Seg = [number, number, string, number];
export type Frame = [number, [number, Seg[]][]];             // [delay ticks, [row, segs][]]
export type Style = [string | null, string | null, number];   // fg, bg, flags
export type Screen = {
  fps: number; cols: number; rows: number; lines?: number;   // rows = viewport, lines = with scrollback
  fg?: string; bg?: string;
  styles: Style[];
  classes: [number, string][];                               // classIndex → [style, drawn glyph hex | ""]
  frames: Frame[];
};

export const className = ([s, g]: [number, string]) => (g ? `s${s} g g${g}` : `s${s}`);

// one CSS rule per recorded style; flags: 1 bold, 2 italic, 4 underline, 8 strike
export function styleRule(i: number, [fg, bg, f]: Style): string {
  let d = "";
  if (fg) d += `color:${fg};`;
  if (bg) d += `background:${bg};`;
  if (f & 1) d += "font-weight:700;";
  if (f & 2) d += "font-style:italic;";
  const deco = `${f & 4 ? "underline " : ""}${f & 8 ? "line-through" : ""}`.trim();
  if (deco) d += `text-decoration:${deco};`;
  return d ? `.replay-grid .s${i}{${d}}` : "";
}

// ── glyphs drawn by CSS ────────────────────────────────────────────────────
// Box drawing / block elements are not left to fonts (the site's mono font is
// a latin subset and fallback advances drift a long border off the grid).
// Each is solid boxes in currentColor on ::before / ::after — plain rects,
// the cheapest thing to paint, pixel-exact at any zoom. The real character
// stays in the DOM (transparent), so copy/paste still yields the text.
const T = "var(--t)";
const mid = (t: string) => `calc(50% - ${t} / 2)`;

function glyphRules(): string {
  let css =
    ".replay-grid .g{-webkit-text-fill-color:transparent}" +
    ".replay-grid .g::before,.replay-grid .g::after{position:absolute;pointer-events:none}";
  const box = (hex: string, pseudo: "before" | "after", d: string) =>
    `.replay-grid .g${hex}::${pseudo}{content:'';background:currentColor;${d}}`;

  for (const [hex, [u, r, d, l]] of Object.entries(glyphs.arms)) {
    const tv = Math.max(u, d) === 2 ? `calc(${T} * 2)` : T;
    const th = Math.max(l, r) === 2 ? `calc(${T} * 2)` : T;
    if (u || d) css += box(hex, "before", `left:${mid(tv)};width:${tv};top:${u ? 0 : mid(th)};bottom:${d ? 0 : mid(th)}`);
    if (l || r) css += box(hex, "after", `top:${mid(th)};height:${th};left:${l ? 0 : mid(tv)};right:${r ? 0 : mid(tv)}`);
  }
  for (const [hex, [v, h]] of Object.entries(glyphs.round)) {
    const ov = v === "left" ? "right" : "left", oh = h === "top" ? "bottom" : "top";
    css += `.replay-grid .g${hex}::before{content:'';${v}:${mid(T)};${h}:${mid(T)};${ov}:0;${oh}:0;` +
      `border-${v}:${T} solid;border-${h}:${T} solid;border-${h}-${v}-radius:.5em}`;
  }
  for (const [hex, [t, r, b, l]] of Object.entries(glyphs.blocks))
    css += box(hex, "before", `top:${t}%;right:${r}%;bottom:${b}%;left:${l}%`);
  for (const [hex, a] of Object.entries(glyphs.shade))
    css += box(hex, "before", `inset:0;opacity:${a}`);
  for (const [hex, n] of Object.entries(glyphs.dash))
    css += `.replay-grid .g${hex}::before{content:'';left:0;right:0;top:${mid(T)};height:${T};` +
      `background:repeating-linear-gradient(90deg,currentColor 0 ${60 / n}%,transparent 0 ${100 / n}%) 0 0/var(--cw) 100%}`;
  return css;
}
export const GLYPH_CSS = glyphRules();
