// screen.mjs — the live demo's terminal runs HERE, not in the browser.
//
// Like mosh: the server keeps the terminal state (xterm-headless parses
// agentty's byte stream) and sends the browser only what changed on screen,
// as rows of styled text, at most once per frame. The browser never parses a
// VT sequence and never loads a terminal emulator; it places a few spans,
// the same way the recorded demo is played. A frame where agentty redraws the
// whole screen but only the spinner moved costs one row on the wire.
//
// Wire format (JSON text frames):
//   {t:"f", w,h            full size (first frame and after a resize)
//          s:[[id,fg,bg,flags]...]   styles first seen in this frame
//          r:[[y,[[col,cells,text,style]...]]...]  changed rows only
//          c:[x,y,visible]}          cursor, when it moved
//   fg/bg: null = default, number = palette index, "#rrggbb" = truecolor
//   flags: 1 bold 2 italic 4 underline 8 strike 16 dim 32 inverse 64 invisible
import xtermHeadless from "@xterm/headless";

const { Terminal } = xtermHeadless;

// codepoints the browser's terminal font (scripts/gen-term-font.py) draws one
// cell wide; anything else is sent as its own positioned 1-cell segment so a
// fallback font can't push the rest of the row off the grid
const COVERED = [[0x20, 0x7e], [0xa0, 0xff], [0x2010, 0x2027], [0x2030, 0x205e], [0x2190, 0x28ff], [0xe0a0, 0xe0d4]];
const covered = (cp) => COVERED.some(([a, b]) => cp >= a && cp <= b);

export class Screen {
  constructor(cols, rows, send, { fps = 30 } = {}) {
    this.term = new Terminal({ cols, rows, allowProposedApi: true, scrollback: 0 });
    this.send = send;
    this.gap = Math.max(8, Math.round(1000 / fps));
    this.last = [];               // per row: the JSON of what the browser has
    this.styles = new Map();      // style key → id
    this.cursor = "";
    this.full = true;
    this.timer = null;
    this.lastFrame = 0;
    this.cell = this.term.buffer.active.getNullCell();
  }

  write(data) {
    this.term.write(data, () => this.schedule());
  }

  resize(cols, rows) {
    this.term.resize(cols, rows);
    this.full = true;
    this.schedule();
  }

  // frames are paced: the first change after a quiet spell goes out at once
  // (typing feels instant), a stream of changes goes out every `gap` ms
  schedule() {
    if (this.timer) return;
    const wait = Math.max(0, this.gap - (Date.now() - this.lastFrame));
    this.timer = setTimeout(() => { this.timer = null; this.frame(); }, wait);
  }

  style(c) {
    const pal = (isRGB, isPal, v) => (isRGB ? "#" + v.toString(16).padStart(6, "0") : isPal ? v : null);
    const bold = c.isBold() ? 1 : 0;
    let fg = pal(c.isFgRGB(), c.isFgPalette(), c.getFgColor());
    if (bold && typeof fg === "number" && fg < 8) fg += 8;          // bold = bright, as xterm draws it
    const bg = pal(c.isBgRGB(), c.isBgPalette(), c.getBgColor());
    const flags = bold | (c.isItalic() ? 2 : 0) | (c.isUnderline() ? 4 : 0) | (c.isStrikethrough() ? 8 : 0) |
      (c.isDim() ? 16 : 0) | (c.isInverse() ? 32 : 0) | (c.isInvisible() ? 64 : 0);
    if (fg === null && bg === null && flags === 0) return 0;
    const key = `${fg}|${bg}|${flags}`;
    let id = this.styles.get(key);
    if (id === undefined) {
      id = this.styles.size + 1;
      this.styles.set(key, id);
      this.fresh.push([id, fg, bg, flags]);
    }
    return id;
  }

  row(y) {
    const buf = this.term.buffer.active;
    const line = buf.getLine(buf.viewportY + y);
    const segs = [];
    if (!line) return segs;
    const cell = this.cell, cols = this.term.cols;
    let cur = null;                                   // the open text segment
    for (let x = 0; x < cols; x++) {
      line.getCell(x, cell);
      const w = cell.getWidth();
      if (w === 0) continue;                          // right half of a wide glyph
      const ch = cell.getChars() || " ";
      const s = this.style(cell);
      const cp = ch.codePointAt(0);
      if (w === 1 && ch.length <= 2 && covered(cp)) {
        if (cur && cur[3] === s && cur[0] + cur[1] === x) { cur[1]++; cur[2] += ch; }
        else { cur = [x, 1, ch, s]; segs.push(cur); }
      } else {
        segs.push([x, w, ch, s]);                     // wide or uncovered: placed alone
        cur = null;
      }
    }
    // unstyled blank runs draw nothing: trim their trailing spaces, drop the empty ones
    const out = [];
    for (const g of segs) {
      if (g[3] === 0 && g[1] === [...g[2]].length) {
        const lead = g[2].length - g[2].trimStart().length;
        const txt = g[2].trim();
        if (!txt) continue;
        out.push([g[0] + lead, [...txt].length, txt, 0]);
      } else out.push(g);
    }
    return out;
  }

  frame() {
    this.lastFrame = Date.now();
    const t = this.term, out = { t: "f" };
    this.fresh = [];
    if (this.full) { out.w = t.cols; out.h = t.rows; this.last = []; }
    const rows = [];
    for (let y = 0; y < t.rows; y++) {
      const segs = this.row(y);
      const k = JSON.stringify(segs);
      if (k !== this.last[y]) { this.last[y] = k; rows.push([y, segs]); }
    }
    if (this.fresh.length) out.s = this.fresh;
    if (rows.length) out.r = rows;
    const buf = t.buffer.active;
    const hidden = !!t._core?.coreService?.isCursorHidden;
    const c = `${buf.cursorX},${buf.cursorY},${hidden ? 0 : 1}`;
    if (c !== this.cursor || this.full) { this.cursor = c; out.c = [buf.cursorX, buf.cursorY, hidden ? 0 : 1]; }
    this.full = false;
    if (out.r || out.c || out.w || out.s) this.send(JSON.stringify(out));
  }

  // input the browser can't express as plain keys: pasted text and the wheel,
  // which only mean something given the terminal's current modes
  paste(text) {
    const m = this.term.modes;
    return m.bracketedPasteMode ? `\x1b[200~${text}\x1b[201~` : text;
  }
  wheel(dy, x, y) {
    if (this.term.modes.mouseTrackingMode === "none") return dy < 0 ? "\x1b[A" : "\x1b[B";
    const b = dy < 0 ? 64 : 65;
    return `\x1b[<${b};${x + 1};${y + 1}M`;
  }

  dispose() { clearTimeout(this.timer); this.term.dispose(); }
}
