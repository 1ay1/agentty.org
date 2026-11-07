#!/usr/bin/env node
// build-demo-screen.mjs — pre-render a recorded agentty PTY session into
// screen diffs, so the browser needs NO terminal emulator.
//
// The raw bytes (demo/session.json, from record-demo.mjs) are fed through the
// real xterm.js parser (@xterm/headless) here, at build time. After each ~30fps
// batch we snapshot the cell grid and keep only the rows that changed, as
// style runs. The site ships that (lib/demo-screen.json) and a ~2 KB player
// (components/ReplayTerminal.tsx) that swaps row contents on a timer.
//
//   node scripts/build-demo-screen.mjs [in.json] [out.json]
//
// Output: { cols, rows, styles: [css...], frames: [[delay_ms, [[row, runs]...]]...] }
//   runs = [[styleIdx, text] | [styleIdx, text, cellWidth]...]   (width only when
//   it differs from text.length, i.e. wide/astral glyphs)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import xtermHeadless from "@xterm/headless";
const { Terminal } = xtermHeadless;

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const IN = process.argv[2] || path.join(ROOT, "demo/session.json");
const OUT = process.argv[3] || path.join(ROOT, "lib/demo-screen.json");
const FRAME_MS = 33;           // coalesce output into ≤30 screen updates/second
const FG = "#d8d8d8", BG = "#0a0a0a";

// xterm.js's default 16-colour theme + the standard 256-colour cube/ramp, so
// the result matches what xterm itself would paint.
const ANSI = ["#2e3436", "#cc0000", "#4e9a06", "#c4a000", "#3465a4", "#75507b", "#06989a", "#d3d7cf",
              "#555753", "#ef2929", "#8ae234", "#fce94f", "#729fcf", "#ad7fa8", "#34e2e2", "#eeeeec"];
const hex = (n) => n.toString(16).padStart(2, "0");
function palette(i) {
  if (i < 16) return ANSI[i];
  if (i < 232) {
    const v = [0, 95, 135, 175, 215, 255], j = i - 16;
    return "#" + hex(v[Math.floor(j / 36)]) + hex(v[Math.floor(j / 6) % 6]) + hex(v[j % 6]);
  }
  const g = 8 + (i - 232) * 10;
  return "#" + hex(g) + hex(g) + hex(g);
}
const rgb = (n) => "#" + n.toString(16).padStart(6, "0");
function withAlpha(c, a) {
  const n = parseInt(c.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

function cellCss(c) {
  const bold = !!c.isBold();
  let fg = null, bg = null;
  if (c.isFgRGB()) fg = rgb(c.getFgColor());
  else if (c.isFgPalette()) {
    let i = c.getFgColor();
    if (bold && i < 8) i += 8;        // xterm: drawBoldTextInBrightColors
    fg = palette(i);
  }
  if (c.isBgRGB()) bg = rgb(c.getBgColor());
  else if (c.isBgPalette()) bg = palette(c.getBgColor());
  if (c.isInverse()) { const f = fg; fg = bg || BG; bg = f || FG; }
  if (c.isInvisible()) fg = bg || BG;
  if (c.isDim()) fg = withAlpha(fg || FG, 0.5);
  const css = [];
  if (fg) css.push(`color:${fg}`);
  if (bg) css.push(`background:${bg}`);
  if (bold) css.push("font-weight:700");
  if (c.isItalic()) css.push("font-style:italic");
  const deco = [c.isUnderline() && "underline", c.isStrikethrough() && "line-through"].filter(Boolean);
  if (deco.length) css.push(`text-decoration:${deco.join(" ")}`);
  return css.join(";");
}

const rec = JSON.parse(fs.readFileSync(IN, "utf8"));
const term = new Terminal({ cols: rec.cols, rows: rec.rows, allowProposedApi: true, scrollback: 0 });
const write = (s) => new Promise((r) => term.write(s, r));

const styles = [""], styleIdx = new Map([["", 0]]);
const style = (css) => {
  if (!styleIdx.has(css)) { styleIdx.set(css, styles.length); styles.push(css); }
  return styleIdx.get(css);
};

function snapshotRow(y) {
  const line = term.buffer.active.getLine(y);
  const cell = term.buffer.active.getNullCell();
  const runs = [];
  let lastNonBlank = -1;
  for (let x = 0; x < rec.cols; x++) {
    line.getCell(x, cell);
    const w = cell.getWidth();
    if (w === 0) continue;                    // right half of a wide glyph
    const ch = cell.getChars() || " ";
    const s = style(cellCss(cell));
    const r = runs[runs.length - 1];
    if (r && r[0] === s) { r[1] += ch; r[2] += w; } else runs.push([s, ch, w]);
    if (ch !== " " || s !== 0) lastNonBlank = runs.length - 1;
  }
  const out = runs.slice(0, lastNonBlank + 1);
  // trim trailing default-style spaces of the final run
  const last = out[out.length - 1];
  if (last && last[0] === 0) {
    const t = last[1].replace(/ +$/, "");
    last[2] -= last[1].length - t.length; last[1] = t;
  }
  return out.map(([s, t, w]) => (w === t.length ? [s, t] : [s, t, w]));
}

let prev = Array.from({ length: rec.rows }, () => "[]");
const frames = [];
let pending = "", delay = 0, carried = 0;

async function flush() {
  if (!pending) return;
  await write(pending);
  pending = "";
  const changed = [];
  for (let y = 0; y < rec.rows; y++) {
    const runs = snapshotRow(y);
    const key = JSON.stringify(runs);
    if (key !== prev[y]) { changed.push([y, runs]); prev[y] = key; }
  }
  if (changed.length) { frames.push([delay + carried, changed]); carried = 0; }
  else carried += delay;          // nothing visible changed: fold its time forward
}

// A batch is shown at the time of its FIRST frame; the small gaps inside it
// are added to the delay before the next batch, so total duration is exact.
let inner = 0;
for (const [d, s] of rec.frames) {
  if (d >= FRAME_MS && pending) { await flush(); delay = inner + d; inner = 0; }
  else if (!pending) delay += d;
  else inner += d;
  pending += s;
}
await flush();

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ cols: rec.cols, rows: rec.rows, styles, frames }));
const total = frames.reduce((a, f) => a + f[0], 0);
console.log(`frames ${rec.frames.length} -> ${frames.length}, styles ${styles.length}, ${total} ms, ${fs.statSync(OUT).size} bytes -> ${path.relative(ROOT, OUT)}`);
