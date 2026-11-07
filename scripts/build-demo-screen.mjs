#!/usr/bin/env node
// build-demo-screen.mjs — pre-render a recorded agentty PTY session into
// screen diffs, so the browser needs NO terminal emulator.
//
// The raw bytes (demo/session.json, from record-demo.mjs) are fed through the
// real xterm.js parser (@xterm/headless) here, at build time, resampled onto an
// exact 30fps clock. At each tick we snapshot the cell grid and keep only the
// rows that changed, as style runs. The site ships that (lib/demo-screen.json)
// and components/ReplayTerminal.tsx paints it on a <canvas>.
//
//   node scripts/build-demo-screen.mjs [in.json] [out.json]
//
// Output: { fps, cols, rows, styles: [[fg, bg, flags]...], frames: [[delay_ticks, [[row, runs]...]]...] }
//   flags: 1 bold, 2 italic, 4 underline, 8 strikethrough
//   runs = [[styleIdx, text] | [styleIdx, glyph, cells]...]  — in a 2-element run
//   every codepoint is one cell; a 3-element run is ONE glyph spanning `cells`
//   (wide CJK/emoji, or a cell holding a combining sequence)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import xtermHeadless from "@xterm/headless";
const { Terminal } = xtermHeadless;

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const IN = process.argv[2] || path.join(ROOT, "demo/session.json");
const OUT = process.argv[3] || path.join(ROOT, "lib/demo-screen.json");
const FPS = 30;
const FRAME_MS = 1000 / FPS;   // resample to an exact 30fps grid
let FG = "#d8d8d8", BG = "#0a0a0a";   // overridden by the recording's terminal theme

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

// [fg, bg, flags] for a cell; fg/bg null = terminal default
function cellStyle(c) {
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
  const flags = (bold ? 1 : 0) | (c.isItalic() ? 2 : 0) | (c.isUnderline() ? 4 : 0) | (c.isStrikethrough() ? 8 : 0);
  return [fg, bg, flags];
}

const rec = JSON.parse(fs.readFileSync(IN, "utf8"));
if (rec.theme) { FG = rec.theme.fg; BG = rec.theme.bg; }
const term = new Terminal({ cols: rec.cols, rows: rec.rows, allowProposedApi: true, scrollback: 0 });
const write = (s) => new Promise((r) => term.write(s, r));

const styles = [[null, null, 0]], styleIdx = new Map([[JSON.stringify(styles[0]), 0]]);
const style = (st) => {
  const k = JSON.stringify(st);
  if (!styleIdx.has(k)) { styleIdx.set(k, styles.length); styles.push(st); }
  return styleIdx.get(k);
};

function snapshotRow(y) {
  const line = term.buffer.active.getLine(y);
  const cell = term.buffer.active.getNullCell();
  const runs = [];
  let lastNonBlank = -1, open = false;   // open = last run accepts 1-cell codepoints
  for (let x = 0; x < rec.cols; x++) {
    line.getCell(x, cell);
    const w = cell.getWidth();
    if (w === 0) continue;                    // right half of a wide glyph
    const ch = cell.getChars() || " ";
    const s = style(cellStyle(cell));
    const single = w === 1 && [...ch].length === 1;
    const r = runs[runs.length - 1];
    if (single && open && r[0] === s) r[1] += ch;
    else if (single) { runs.push([s, ch]); open = true; }
    else { runs.push([s, ch, w]); open = false; }   // one glyph, w cells
    if (ch !== " " || s !== 0) lastNonBlank = runs.length - 1;
  }
  const out = runs.slice(0, lastNonBlank + 1);
  const last = out[out.length - 1];             // trim trailing default spaces
  if (last && last[0] === 0 && last.length === 2) last[1] = last[1].replace(/ +$/, "");
  return out;
}

// Resample onto a fixed 30fps clock: at every tick, feed the parser all bytes
// written up to that instant and take a full-screen snapshot. Output before
// `startMs` (agentty booting) folds into the first snapshot, so the replay
// opens on the settled screen.
const snaps = [];   // [tick, rowKeys[], rowRuns[]]
const events = [];
{ let t = 0; for (const [d, s] of rec.frames) { t += d; events.push([t, s]); } }
const end = events.length ? events[events.length - 1][0] : 0;
let e = 0;
const tick0 = Math.ceil((rec.startMs || 0) / FRAME_MS);
for (let tick = tick0; tick * FRAME_MS <= end + FRAME_MS; tick++) {
  let buf = "";
  while (e < events.length && events[e][0] <= tick * FRAME_MS) buf += events[e++][1];
  if (!buf && snaps.length) continue;
  if (buf) await write(buf);
  const runs = Array.from({ length: rec.rows }, (_, y) => snapshotRow(y));
  const keys = runs.map((r) => JSON.stringify(r));
  const last = snaps[snaps.length - 1];
  if (last && keys.every((k, y) => k === last[1][y])) continue;
  snaps.push([tick, keys, runs]);
}

// Drop one-tick layout spikes. agentty sometimes redraws its live region a
// couple of rows shorter for a single frame (an erase-below + redraw while
// the reveal line is swapped out) and regrows it on the very next frame. A
// real 60Hz terminal shows that for ~16ms; held for a full 33ms replay frame
// it reads as the composer jumping. A spike = a frame far from BOTH
// neighbours while the neighbours are close to each other, all within two
// ticks — so genuine layout changes (which persist) are never touched.
const dist = (a, b) => a[1].reduce((n, k, y) => n + (k !== b[1][y]), 0);
let dropped = 0;
for (let k = 1; k + 1 < snaps.length; k++) {
  const [a, b, c] = [snaps[k - 1], snaps[k], snaps[k + 1]];
  if (c[0] - b[0] > 2) continue;
  const ab = dist(a, b), bc = dist(b, c), ac = dist(a, c);
  if (ab >= 4 && bc >= 4 && ac <= Math.min(ab, bc) - 3) { snaps.splice(k, 1); k--; dropped++; }
}

// Emit row diffs between consecutive kept snapshots; each frame's delay is a
// whole number of ticks, so playback lands on an even 30fps grid.
const frames = [];
for (let k = 0; k < snaps.length; k++) {
  const [tick, keys, runs] = snaps[k], prev = snaps[k - 1];
  const changed = [];
  for (let y = 0; y < rec.rows; y++) if (!prev || keys[y] !== prev[1][y]) changed.push([y, runs[y]]);
  frames.push([prev ? tick - prev[0] : 0, changed]);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ fps: FPS, cols: rec.cols, rows: rec.rows, fg: FG, bg: BG, styles, frames }));
const total = Math.round(frames.reduce((a, f) => a + f[0], 0) * FRAME_MS);
console.log(`frames ${rec.frames.length} -> ${frames.length} @${FPS}fps (${dropped} layout spikes dropped), styles ${styles.length}, ${total} ms, ${fs.statSync(OUT).size} bytes -> ${path.relative(ROOT, OUT)}`);
