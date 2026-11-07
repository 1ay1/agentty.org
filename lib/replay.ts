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

// ── glyphs drawn by CSS ────────────────────────────────────────────────────
// Box drawing and block elements are NOT left to fonts: the site's mono font
// is a latin subset, and any fallback's advance drifts a long border off the
// grid. Instead each is a ::before painted with gradients/borders in
// currentColor — exact, seamless, any zoom. The character stays in the DOM
// (transparent fill), so copy/paste still yields the real text.
const L = "linear-gradient(currentColor,currentColor)";
const T = "var(--t)";
const half = `calc(50% + ${T} / 2)`;
// [up, right, down, left]
const ARMS: Record<number, [number, number, number, number]> = {
  0x2500: [0, 1, 0, 1], 0x2502: [1, 0, 1, 0], 0x250c: [0, 1, 1, 0], 0x2510: [0, 0, 1, 1],
  0x2514: [1, 1, 0, 0], 0x2518: [1, 0, 0, 1], 0x251c: [1, 1, 1, 0], 0x2524: [1, 0, 1, 1],
  0x252c: [0, 1, 1, 1], 0x2534: [1, 1, 0, 1], 0x253c: [1, 1, 1, 1],
  0x2574: [0, 0, 0, 1], 0x2575: [1, 0, 0, 0], 0x2576: [0, 1, 0, 0], 0x2577: [0, 0, 1, 0],
};
// rounded corners ╭╮╰╯: [vertical edge, horizontal edge]
const ROUND: Record<number, ["left" | "right", "top" | "bottom"]> = {
  0x256d: ["left", "top"], 0x256e: ["right", "top"], 0x2570: ["left", "bottom"], 0x256f: ["right", "bottom"],
};
const BLOCK: Record<number, string> = {
  0x2580: `${L} top/100% 50%`, 0x2584: `${L} bottom/100% 50%`, 0x2588: `${L}`,
  0x258c: `${L} left/50% 100%`, 0x2590: `${L} right/50% 100%`,
  0x2594: `${L} top/100% 12.5%`, 0x2595: `${L} right/12.5% 100%`,
};
for (let n = 1; n <= 7; n++) BLOCK[0x2580 + n] = `${L} bottom/100% ${n * 12.5}%`;   // ▁..▇
for (let n = 1; n <= 7; n++) BLOCK[0x2590 - n] = `${L} left/${n * 12.5}% 100%`;     // ▏..▉
const SHADE: Record<number, number> = { 0x2591: 25, 0x2592: 50, 0x2593: 75 };

// glyphs that tile horizontally: a run of them is one span spanning N cells
const TILE = new Set([0x2500, 0x2501, 0x2504, 0x2505, 0x2508, ...Object.keys(BLOCK).map(Number), 0x2591, 0x2592, 0x2593]);

function glyphCss(cp: number): string | null {
  const sel = `.replay-grid .g${cp.toString(16)}::before`;
  if (cp in BLOCK) return `${sel}{background:${BLOCK[cp]} no-repeat}`;
  if (cp in SHADE) return `${sel}{background:color-mix(in srgb,currentColor ${SHADE[cp]}%,transparent)}`;
  if (cp in ARMS) {
    const [u, r, d, l] = ARMS[cp], bg: string[] = [];
    if (u) bg.push(`${L} center top/${T} ${half}`);
    if (d) bg.push(`${L} center bottom/${T} ${half}`);
    if (l) bg.push(`${L} left center/${half} ${T}`);
    if (r) bg.push(`${L} right center/${half} ${T}`);
    return `${sel}{background:${bg.map((b) => b + " no-repeat").join(",")}}`;
  }
  if (cp === 0x2501) return `${sel}{background:${L} center/100% calc(${T} * 2) no-repeat}`;
  if (cp === 0x2503) return `${sel}{background:${L} center/calc(${T} * 2) 100% no-repeat}`;
  if (cp === 0x2504 || cp === 0x2508) {
    const n = cp === 0x2504 ? 3 : 4;
    return `${sel}{background:repeating-linear-gradient(90deg,currentColor 0 calc(1ch / ${n} * .6),transparent 0 calc(1ch / ${n})) center/100% ${T} no-repeat}`;
  }
  if (cp in ROUND) {
    const [v, h] = ROUND[cp], ov = v === "left" ? "right" : "left", oh = h === "top" ? "bottom" : "top";
    const off = `calc(50% - ${T} / 2)`;
    return `${sel}{inset:auto;${v}:${off};${h}:${off};${ov}:0;${oh}:0;` +
      `border-${v}:${T} solid;border-${h}:${T} solid;border-${h}-${v}-radius:.5em}`;
  }
  return null;
}

const DRAWN = new Set<number>();
export const GLYPH_CSS = (() => {
  const cps = [...Object.keys(ARMS), ...Object.keys(ROUND), ...Object.keys(BLOCK), ...Object.keys(SHADE)]
    .map(Number).concat([0x2501, 0x2503, 0x2504, 0x2508]);
  let css = ".replay-grid .g{-webkit-text-fill-color:transparent}" +
    ".replay-grid .g::before{content:'';position:absolute;inset:0;pointer-events:none}";
  for (const cp of cps) { const r = glyphCss(cp); if (r) { css += r; DRAWN.add(cp); } }
  return css;
})();

// ── run → positioned segments ──────────────────────────────────────────────
// [startCol, cells, text, drawnCodepoint (0 = font text), style]
export type Seg = [number, number, string, number, number];

// ASCII tiles exactly in the mono font, so it stays one text node. Every other
// symbol gets its own 1-cell span (no drift possible); drawn glyphs of the
// same kind merge into one span. Plain blank space with no background is
// skipped entirely — the row is already that colour.
export function segments(runs: Run[], styles: Style[]): Seg[] {
  const out: Seg[] = [];
  let col = 0;
  for (const r of runs) {
    const st = styles[r[0]], blankOk = !st[1] && !(st[2] & 12);
    if (r.length === 3) {                                   // one wide glyph
      const cp = r[1].codePointAt(0)!;
      out.push([col, r[2], r[1], DRAWN.has(cp) ? cp : 0, r[0]]);
      col += r[2];
      continue;
    }
    let txt = "", at = col;
    const flush = () => {
      if (txt && !(blankOk && !txt.trim())) out.push([at, txt.length, txt, 0, r[0]]);
      txt = "";
    };
    for (const ch of r[1]) {
      const cp = ch.codePointAt(0)!;
      if (cp >= 0x20 && cp <= 0x7e) { if (!txt) at = col; txt += ch; col++; continue; }
      flush();
      const last = out[out.length - 1];
      if (DRAWN.has(cp) && TILE.has(cp) && last && last[3] === cp && last[4] === r[0] && last[0] + last[1] === col) {
        last[1]++; last[2] += ch;
      } else {
        out.push([col, 1, ch, DRAWN.has(cp) ? cp : 0, r[0]]);
      }
      col++;
    }
    flush();
  }
  return out;
}

export const segClass = (s: Seg) => (s[3] ? `s${s[4]} g g${s[3].toString(16)}` : `s${s[4]}`);
