// Shared by the build-time static frame (components/ReplayDemo.tsx) and the
// client player (components/ReplayTerminal.tsx). Data comes from
// scripts/build-demo-screen.mjs → lib/demo-screen.json.

export type Run = [number, string] | [number, string, number];
export type Style = [string | null, string | null, number];   // fg, bg, flags
export type Frame = [number, [number, Run[]][]];             // [delay ticks, [row, runs][]]
export type Screen = {
  fps: number; cols: number; rows: number;
  fg?: string; bg?: string;
  styles: Style[]; frames: Frame[];
};

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

// terminal cells a run occupies
export const runCells = (r: Run) => (r.length === 3 ? r[2] : Array.from(r[1]).length);

// ASCII tiles exactly in the mono font; anything else (box drawing, ✓, braille,
// wide glyphs — often from fallback fonts) is pinned to its cell width so the
// grid can never drift.
export const pinned = (r: Run) => r.length === 3 || /[^\x20-\x7e]/.test(r[1]);
