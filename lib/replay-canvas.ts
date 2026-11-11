// replay-canvas.ts: draws the recorded demo the way a terminal does.
//
// The DOM player kept one absolutely-positioned span per segment and drew box
// and block glyphs with CSS pseudo-elements; each frame meant restyling and
// repainting those spans, ~40% of a phone's main thread while it played.
// Here the screen is a MODEL (the latest segments of every row) and ONE canvas,
// stuck to the top of the scroll container, paints only the rows in view:
//   - a frame updates the model and asks for one paint on the next vsync,
//     no matter how many rows changed or how many frames were due
//   - a paint touches only the visible rows (32), never the 300 of scrollback
//   - box lines, corners, dashes, blocks and shades are drawn as geometry,
//     snapped to device pixels, so they meet exactly at any zoom
//   - text is drawn once per run, with letter spacing forcing every glyph to
//     exactly one cell (per character where that isn't supported)
// The empty row divs stay as the scroll content, so scrolling, the scrollbar
// and "follow the bottom" are the browser's own, unchanged.
import glyphs from "@/lib/demo-glyphs.json";
import type { Screen, Seg } from "@/lib/replay";

type Arms = [number, number, number, number];
const ARMS = glyphs.arms as unknown as Record<string, Arms>;
const ROUND = glyphs.round as unknown as Record<string, [string, string]>;
const BLOCKS = glyphs.blocks as unknown as Record<string, [number, number, number, number]>;
const SHADE = glyphs.shade as unknown as Record<string, number>;
const DASH = glyphs.dash as unknown as Record<string, number>;
const DRAWN = new Set([...Object.keys(ARMS), ...Object.keys(ROUND), ...Object.keys(BLOCKS), ...Object.keys(SHADE), ...Object.keys(DASH)]);

export class CanvasGrid {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lines: (Seg[] | undefined)[] = [];
  private styles: { fg: string; bg: string | null; font: string; deco: number }[] = [];
  private glyph: string[] = [];
  private cw = 0; private rh = 0; private dpr = 1; private w = 0; private h = 0;
  private fontSize = 0; private family = "";
  private queued = 0;
  private dirty = new Set<number>();     // rows changed since the last paint
  private full = true;                    // next paint redraws everything (scroll, resize, theme)
  private lastScroll = -1;
  private spacing: boolean;
  private ro: ResizeObserver;

  constructor(private grid: HTMLElement, private cols: number, public rows: number, private rowTop: (y: number) => number) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "replay-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    grid.prepend(this.canvas);
    this.ctx = this.canvas.getContext("2d", { alpha: false })!;
    this.spacing = "letterSpacing" in this.ctx;
    this.ro = new ResizeObserver(() => { this.measure(); this.full = true; this.paint(); });
    this.ro.observe(grid);
    this.measure();
  }

  /** a recording's styles: class index → [fg, bg, font, decoration] */
  use(scr: Screen, fg: string, bg: string) {
    this.bg = bg;
    this.styles = scr.classes.map(([s]) => {
      const [f, b, flags] = scr.styles[s] ?? [null, null, 0];
      return { fg: f ?? fg, bg: b, font: `${flags & 2 ? "italic " : ""}${flags & 1 ? "700" : "400"}`, deco: flags & 12 };
    });
    this.glyph = scr.classes.map(([, g]) => g);
    this.lines = [];
    this.full = true;
  }
  private bg = "#100f0f";
  private fgDefault = "#cecdc3";

  /** a live session: no recording, styles arrive as they are first used */
  live(fg: string, bg: string) {
    this.fgDefault = fg; this.bg = bg;
    this.styles = [{ fg, bg: null, font: "400", deco: 0 }];
    this.glyph = [""];
    this.lines = []; this.full = true; this.request();
  }
  define(ci: number, fg: string | null, bg: string | null, flags: number) {
    this.styles[ci] = { fg: fg ?? this.fgDefault, bg, font: `${flags & 2 ? "italic " : ""}${flags & 1 ? "700" : "400"}`, deco: flags & 12 };
    this.glyph[ci] = "";
  }
  /** a new size (rows changed): redraw everything at the next frame */
  setRows(rows: number) { this.rows = rows; this.lines.length = Math.min(this.lines.length, rows); this.measure(); this.full = true; this.request(); }

  set(y: number, segs: Seg[]) { this.lines[y] = segs; this.dirty.add(y); this.request(); }
  reset() { this.lines = []; this.full = true; }
  invalidate() { this.full = true; this.request(); }
  request() { if (!this.queued) this.queued = requestAnimationFrame(() => { this.queued = 0; this.paint(); }); }
  destroy() { cancelAnimationFrame(this.queued); this.ro.disconnect(); this.canvas.remove(); this.grid.style.removeProperty("--canvas-h"); }

  private measure() {
    const g = getComputedStyle(this.grid);
    // 2x is already sharper than the eye at phone distance; 3x is 2.25x the pixels to upload
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.grid.clientWidth;
    this.cw = parseFloat(g.getPropertyValue("--cw")) || this.w / this.cols;
    // --cw is a calc() of container units: resolve it the reliable way
    const probe = this.grid.querySelector<HTMLElement>(":scope > div");
    this.rh = probe?.getBoundingClientRect().height || parseFloat(g.lineHeight) || 16;
    this.fontSize = parseFloat(g.fontSize);
    this.cw = this.fontSize * 0.6;
    this.family = g.fontFamily;
    this.h = this.rows * this.rh;
    const c = this.canvas;
    c.style.width = `${this.w}px`;
    c.style.height = `${this.h}px`;
    // no margin on the canvas: two adjoining negative margins COLLAPSE (the
    // more negative wins) and would swallow the first row's --skip offset.
    // The first row's own margin takes the canvas height off instead.
    c.style.marginBottom = "0";
    this.grid.style.setProperty("--canvas-h", `${this.h}px`);
    c.width = Math.round(this.w * this.dpr);
    c.height = Math.round(this.h * this.dpr);
  }

  /** draw what changed: the dirty rows in view, or every visible row after a
   *  scroll/resize/theme change. Off-screen rows are never drawn. */
  paint() {
    const { ctx, dpr, cw, rh } = this;
    if (!this.w) return;
    const scroll = this.grid.scrollTop;
    if (scroll !== this.lastScroll) { this.full = true; this.lastScroll = scroll; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textBaseline = "middle";
    const draw = (y: number) => {
      const top = this.rowTop(y) - scroll;
      if (top <= -rh || top >= this.h) return;
      ctx.save();
      const t = this.px(Math.max(0, top)), b = this.px(Math.min(this.h, top + rh));
      ctx.beginPath(); ctx.rect(0, t, this.w, b - t); ctx.clip();
      ctx.fillStyle = this.bg; ctx.fillRect(0, t, this.w, b - t);
      const segs = this.lines[y];
      if (segs) this.row(segs, top);
      ctx.restore();
    };
    if (this.full) {
      this.full = false;
      ctx.fillStyle = this.bg;
      ctx.fillRect(0, 0, this.w, this.h);
      const n = this.lines.length;
      for (let y = 0; y < n; y++) {
        const top = this.rowTop(y) - scroll;
        if (top <= -rh) continue;
        if (top >= this.h) break;
        const segs = this.lines[y];
        if (segs) this.row(segs, top);
      }
    } else {
      this.dirty.forEach(draw);
    }
    this.dirty.clear();
  }

  private row(segs: Seg[], top: number) {
    const { ctx, cw, rh } = this;
    for (const [col, w, txt, ci] of segs) {
      const st = this.styles[ci];
      if (!st) continue;
      const x = col * cw;
      if (st.bg) { ctx.fillStyle = st.bg; ctx.fillRect(this.px(x), this.px(top), this.px(x + w * cw) - this.px(x), this.px(top + rh) - this.px(top)); }
      const g = this.glyph[ci];
      ctx.fillStyle = st.fg;
      if (g) { this.drawGlyphs(g, x, top, w); continue; }
      if (!txt.trim()) continue;
      ctx.font = `${st.font} ${this.fontSize}px ${this.family}`;
      const chars = [...txt];
      const step = (w * cw) / chars.length;
      const mid = top + rh / 2;
      // runs of plain ASCII go in one fillText (letter spacing holds them to
      // the grid); box/block characters inside a run are drawn as geometry,
      // exactly like the recording's pre-split ones; anything else per cell
      let run = "", runAt = 0;
      const flushRun = () => {
        if (!run.trim()) { run = ""; return; }
        if (this.spacing && run.length > 1) {
          (ctx as any).letterSpacing = `${step - this.advance(ctx)}px`;
          ctx.fillText(run, x + runAt * step, mid);
          (ctx as any).letterSpacing = "0px";
        } else for (let k = 0; k < run.length; k++) if (run[k] !== " ") ctx.fillText(run[k], x + (runAt + k) * step, mid);
        run = "";
      };
      for (let k = 0; k < chars.length; k++) {
        const c = chars[k], cp = c.codePointAt(0)!;
        if (cp >= 0x20 && cp <= 0x7e) { if (!run) runAt = k; run += c; continue; }
        flushRun();
        const hex = cp.toString(16);
        if (DRAWN.has(hex)) this.drawGlyphs(hex, x + k * step, top, 1);
        else ctx.fillText(c, x + k * step, mid);
      }
      flushRun();
      if (st.deco) {
        const t = Math.max(1, Math.round(this.fontSize * 0.075 * this.dpr)) / this.dpr;
        if (st.deco & 4) ctx.fillRect(x, top + rh * 0.85, w * cw, t);
        if (st.deco & 8) ctx.fillRect(x, top + rh * 0.5, w * cw, t);
      }
    }
  }
  private adv = new Map<string, number>();
  private advance(ctx: CanvasRenderingContext2D) {
    let a = this.adv.get(ctx.font);
    if (a === undefined) { a = ctx.measureText("M").width; this.adv.set(ctx.font, a); }
    return a;
  }

  // device-pixel snapping: edges land on whole device pixels, so adjacent
  // cells' lines meet with no seam and no blur
  private px(v: number) { return Math.round(v * this.dpr) / this.dpr; }

  private drawGlyphs(hex: string, x0: number, top: number, cells: number) {
    const { ctx, cw, rh } = this;
    const t1 = Math.max(1, Math.round(this.fontSize * 0.075 * this.dpr)) / this.dpr;
    for (let k = 0; k < cells; k++) {
      const x = x0 + k * cw;
      const L = this.px(x), R = this.px(x + cw), T = this.px(top), B = this.px(top + rh);
      const arms = ARMS[hex];
      if (arms) {
        const [u, r, d, l] = arms;
        const tv = Math.max(u, d) === 2 ? t1 * 2 : t1, th = Math.max(l, r) === 2 ? t1 * 2 : t1;
        const cx = this.px((L + R) / 2 - tv / 2), cy = this.px((T + B) / 2 - th / 2);
        if (u || d) ctx.fillRect(cx, u ? T : cy, tv, (d ? B : cy + th) - (u ? T : cy));
        if (l || r) ctx.fillRect(l ? L : cx, cy, (r ? R : cx + tv) - (l ? L : cx), th);
        continue;
      }
      const blk = BLOCKS[hex];
      if (blk) {
        const [bt, br, bb, bl] = blk;
        const x1 = this.px(L + (R - L) * bl / 100), x2 = this.px(R - (R - L) * br / 100);
        const y1 = this.px(T + (B - T) * bt / 100), y2 = this.px(B - (B - T) * bb / 100);
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        continue;
      }
      const shade = SHADE[hex];
      if (shade !== undefined) { ctx.globalAlpha = shade; ctx.fillRect(L, T, R - L, B - T); ctx.globalAlpha = 1; continue; }
      const dash = DASH[hex];
      if (dash) {
        const cy = this.px((T + B) / 2 - t1 / 2), seg = (R - L) / dash;
        for (let s = 0; s < dash; s++) ctx.fillRect(this.px(L + s * seg), cy, seg * 0.6, t1);
        continue;
      }
      const round = ROUND[hex];
      if (round) {
        // a quarter circle from the cell's middle to the two sides it joins
        const [v, hz] = round;
        const cx = (L + R) / 2, cy = (T + B) / 2;
        const ex = v === "left" ? R : L;          // the horizontal arm goes away from the named side
        const ey = hz === "top" ? B : T;
        const rad = Math.min(cw, rh) / 2;
        ctx.save();
        ctx.strokeStyle = ctx.fillStyle as string;
        ctx.lineWidth = t1;
        ctx.beginPath();
        ctx.moveTo(ex, cy);
        ctx.arcTo(cx, cy, cx, ey, rad);
        ctx.lineTo(cx, ey);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}
