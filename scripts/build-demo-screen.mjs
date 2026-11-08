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
const term = new Terminal({ cols: rec.cols, rows: rec.rows, allowProposedApi: true, scrollback: 100000 });
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

// ── rows → positioned segments (the browser only places these) ──────────
// [startCol, cells, text, classIndex]. ASCII tiles exactly in the mono font,
// so it stays one text segment. Every other symbol gets its own 1-cell
// segment (fallback fonts can't drift the grid); CSS-drawn glyphs of one
// kind merge into a single span. Blank, unstyled space is omitted entirely.
const GLYPHS = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/demo-glyphs.json"), "utf8"));
const DRAWN = new Set([...Object.keys(GLYPHS.arms), ...Object.keys(GLYPHS.round), ...Object.keys(GLYPHS.blocks),
  ...Object.keys(GLYPHS.shade), ...Object.keys(GLYPHS.dash)]);
const TILE = new Set(GLYPHS.tile);
const classes = [], classIdx = new Map();
const cls = (s, g) => {
  const k = s + ":" + g;
  if (!classIdx.has(k)) { classIdx.set(k, classes.length); classes.push([s, g]); }
  return classIdx.get(k);
};
function segRow(runs) {
  const out = [];
  let col = 0;
  for (const r of runs) {
    const st = styles[r[0]], blankOk = !st[1] && !(st[2] & 12);
    if (r.length === 3) {
      const hex = r[1].codePointAt(0).toString(16);
      out.push([col, r[2], r[1], cls(r[0], DRAWN.has(hex) ? hex : "")]);
      col += r[2];
      continue;
    }
    let txt = "", at = col;
    const flush = () => { if (txt && !(blankOk && !txt.trim())) out.push([at, txt.length, txt, cls(r[0], "")]); txt = ""; };
    for (const ch of r[1]) {
      const cp = ch.codePointAt(0);
      if (cp >= 0x20 && cp <= 0x7e) { if (!txt) at = col; txt += ch; col++; continue; }
      flush();
      const hex = cp.toString(16), drawn = DRAWN.has(hex), c = cls(r[0], drawn ? hex : "");
      const last = out[out.length - 1];
      if (drawn && TILE.has(hex) && last && last[3] === c && last[0] + last[1] === col) { last[1]++; last[2] += ch; }
      else out.push([col, 1, ch, c]);
      col++;
    }
    flush();
  }
  return out;
}

// Resample onto a fixed 30fps clock and snapshot the VIEWPORT at every tick,
// addressed by absolute buffer line (scrollback included). agentty renders
// inline, so as the session grows its output scrolls up into scrollback just
// like a real terminal — the replay keeps every line and gets a scrollbar.
// Lines are numbered from the top of the screen at the first tick, so boot
// output that scrolled away before the replay starts is dropped. Output
// before `startMs` folds into the first snapshot.
const snaps = [];   // [tick, base, keys[], runs[]]  — rows base..base+rows-1
const events = [];
{ let t = 0; for (const [d, s] of rec.frames) { t += d; events.push([t, s]); } }
const end = events.length ? events[events.length - 1][0] : 0;
let e = 0, base0 = -1;
const tick0 = Math.ceil((rec.startMs || 0) / FRAME_MS);
for (let tick = tick0; tick * FRAME_MS <= end + FRAME_MS; tick++) {
  let buf = "";
  while (e < events.length && events[e][0] <= tick * FRAME_MS) buf += events[e++][1];
  if (!buf && snaps.length) continue;
  if (buf) await write(buf);
  const by = term.buffer.active.baseY;
  if (base0 < 0) base0 = by;
  const runs = Array.from({ length: rec.rows }, (_, i) => segRow(snapshotRow(by + i)));
  const keys = runs.map((r) => JSON.stringify(r));
  const last = snaps[snaps.length - 1], base = by - base0;
  if (last && last[1] === base && keys.every((k, i) => k === last[2][i])) continue;
  snaps.push([tick, base, keys, runs]);
}

// Drop one-tick layout spikes. agentty sometimes redraws its live region a
// couple of rows shorter for a single frame and regrows it on the next one. A
// real 60Hz terminal shows that for ~16ms; held for a full 33ms replay frame
// it reads as the composer jumping. A spike = a frame far from BOTH
// neighbours while the neighbours are close to each other, all within two
// ticks and without scrolling — genuine layout changes are never touched.
const dist = (a, b) => a[2].reduce((n, k, i) => n + (k !== b[2][i]), 0);
let dropped = 0;
for (let k = 1; k + 1 < snaps.length; k++) {
  const [a, b, c] = [snaps[k - 1], snaps[k], snaps[k + 1]];
  if (c[0] - b[0] > 2 || a[1] !== b[1] || b[1] !== c[1]) continue;
  const ab = dist(a, b), bc = dist(b, c), ac = dist(a, c);
  if (ab >= 4 && bc >= 4 && ac <= Math.min(ab, bc) - 3) { snaps.splice(k, 1); k--; dropped++; }
}

// Emit line diffs (absolute line numbers) between consecutive kept snapshots;
// each frame's delay is a whole number of ticks — an even 30fps grid.
const frames = [], cur = new Map();
let lines = rec.rows;
for (let k = 0; k < snaps.length; k++) {
  const [tick, base, keys, runs] = snaps[k], prev = snaps[k - 1];
  const changed = [];
  for (let i = 0; i < rec.rows; i++) {
    const y = base + i;
    if (cur.get(y) !== keys[i]) { cur.set(y, keys[i]); changed.push([y, runs[i]]); }
  }
  lines = Math.max(lines, base + rec.rows);
  frames.push([prev ? tick - prev[0] : 0, changed]);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ fps: FPS, cols: rec.cols, rows: rec.rows, lines, fg: FG, bg: BG, styles, classes, frames }));
const total = Math.round(frames.reduce((a, f) => a + f[0], 0) * FRAME_MS);
console.log(`frames ${rec.frames.length} -> ${frames.length} @${FPS}fps (${dropped} layout spikes dropped), ${lines} lines, styles ${styles.length}, ${total} ms, ${fs.statSync(OUT).size} bytes -> ${path.relative(ROOT, OUT)}`);
