"use client";

import { useEffect, useRef } from "react";

/**
 * ReplayTerminal — plays a REAL recorded agentty session, rendered entirely
 * client-side on a <canvas>.
 *
 * The PTY bytes agentty wrote (demo/session.json, scripts/record-demo.mjs) were
 * parsed by xterm.js at build time and resampled onto an exact 30fps grid of
 * row diffs (scripts/build-demo-screen.mjs). Here:
 *   - one requestAnimationFrame clock drives playback; frames are chosen by
 *     elapsed time, so a slow frame drops instead of stalling the timeline
 *   - only changed rows are repainted; there is no DOM/layout work per frame
 *   - box-drawing (─│╭╮├…) and block glyphs (▀▄█▁…░) are drawn as pixel-snapped
 *     rects/lines, so rails and the logo tile seamlessly at any size/DPR
 *   - playback starts only after the mono font is loaded and the page is idle,
 *     so the first second doesn't fight hydration or a font swap
 *   - paused off-screen / in background tabs; reduced-motion gets the final frame
 */

type Run = [number, string] | [number, string, number];
type Style = [string | null, string | null, number];
type Frame = [number, [number, Run[]][]];
type Screen = { fps: number; cols: number; rows: number; styles: Style[]; frames: Frame[] };

const FG = "#d8d8d8";
const BG = "#0a0a0a";
const HOLD_MS = 4500;          // linger on the finished session before looping

// ── box drawing: [up, right, down, left] weight (1 light, 2 heavy) ──────────
const LINES: Record<number, [number, number, number, number]> = {
  0x2500: [0, 1, 0, 1], 0x2501: [0, 2, 0, 2], 0x2502: [1, 0, 1, 0], 0x2503: [2, 0, 2, 0],
  0x250c: [0, 1, 1, 0], 0x250f: [0, 2, 2, 0], 0x2510: [0, 0, 1, 1], 0x2513: [0, 0, 2, 2],
  0x2514: [1, 1, 0, 0], 0x2517: [2, 2, 0, 0], 0x2518: [1, 0, 0, 1], 0x251b: [2, 0, 0, 2],
  0x251c: [1, 1, 1, 0], 0x2523: [2, 2, 2, 0], 0x2524: [1, 0, 1, 1], 0x252b: [2, 0, 2, 2],
  0x252c: [0, 1, 1, 1], 0x2533: [0, 2, 2, 2], 0x2534: [1, 1, 0, 1], 0x253b: [2, 2, 0, 2],
  0x253c: [1, 1, 1, 1], 0x254b: [2, 2, 2, 2],
  0x2574: [0, 0, 0, 1], 0x2575: [1, 0, 0, 0], 0x2576: [0, 1, 0, 0], 0x2577: [0, 0, 1, 0],
  0x2578: [0, 0, 0, 2], 0x2579: [2, 0, 0, 0], 0x257a: [0, 2, 0, 0], 0x257b: [0, 0, 2, 0],
};
const ROUND: Record<number, [number, number]> = {   // corner: [dx, dy] of the arms
  0x256d: [1, 1], 0x256e: [-1, 1], 0x256f: [-1, -1], 0x2570: [1, -1],
};
const DASH: Record<number, [boolean, number, number]> = {   // [horizontal, dashes, weight]
  0x2504: [true, 3, 1], 0x2505: [true, 3, 2], 0x2508: [true, 4, 1], 0x2509: [true, 4, 2],
  0x254c: [true, 2, 1], 0x254d: [true, 2, 2],
  0x2506: [false, 3, 1], 0x2507: [false, 3, 2], 0x250a: [false, 4, 1], 0x250b: [false, 4, 2],
  0x254e: [false, 2, 1], 0x254f: [false, 2, 2],
};
// quadrant blocks ▖▗▘▙▚▛▜▝▞▟ as bitmask TL=1 TR=2 BL=4 BR=8
const QUAD: Record<number, number> = {
  0x2596: 4, 0x2597: 8, 0x2598: 1, 0x2599: 13, 0x259a: 9,
  0x259b: 7, 0x259c: 11, 0x259d: 2, 0x259e: 6, 0x259f: 14,
};
const isDrawn = (cp: number) =>
  cp in LINES || cp in ROUND || cp in DASH || cp in QUAD || (cp >= 0x2580 && cp <= 0x2595);

export function ReplayTerminal() {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const box = boxRef.current, canvas = canvasRef.current;
    if (!box || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let data: Screen | null = null;
    let grid: Run[][] = [];
    const dirty = new Set<number>();
    let disposed = false, loading = false, onScreen = false, started = false;
    let raf = 0, i = 0, t0 = 0, pausedAt = 0, holdUntil = 0;
    let due: number[] = [];               // cumulative tick at which frame i lands
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── metrics (recomputed on resize) ─────────────────────────────────────
    let family = "monospace", dpr = 1, cw = 8, ch = 10, fontPx = 13, base = 8, lw = 1, lwHeavy = 2;
    let advPerPx = 0.6;                   // font advance per px of font-size
    const fontFor = (flags: number) =>
      `${flags & 2 ? "italic " : ""}${flags & 1 ? 700 : 400} ${fontPx}px ${family}`;
    let curFont = "";
    const advCache = new Map<string, number>();
    const canSpace = "letterSpacing" in ctx;
    // set the font AND make its advance exactly one cell, so a whole run drawn
    // in one fillText lands every glyph on the grid (no drift between runs)
    const setFont = (f: string) => {
      if (f === curFont) return;
      ctx.font = f; curFont = f;
      let adv = advCache.get(f);
      if (adv === undefined) {
        if (canSpace) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
        adv = ctx.measureText("0000000000").width / 10;
        advCache.set(f, adv);
      }
      if (canSpace) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${cw - adv}px`;
    };
    const perGlyph = () => !canSpace;    // fallback: place each glyph itself
    const snap = (v: number) => Math.round(v * dpr) / dpr;

    const measure = () => {
      if (!data) return;
      dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
      cw = cssW / data.cols;
      ch = cssH / data.rows;
      fontPx = Math.min(cw / advPerPx, ch / 1.15);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.textBaseline = "alphabetic";
      curFont = "";
      advCache.clear();
      setFont(fontFor(0));
      const m = ctx.measureText("M");
      const asc = m.fontBoundingBoxAscent || fontPx * 0.8;
      const desc = m.fontBoundingBoxDescent || fontPx * 0.2;
      base = (ch - (asc + desc)) / 2 + asc;
      lw = Math.max(1, Math.round(fontPx / 13 * dpr)) / dpr;
      lwHeavy = Math.max(2, Math.round(fontPx / 6.5 * dpr)) / dpr;
      for (let y = 0; y < data.rows; y++) dirty.add(y);
    };

    // ── glyph primitives ───────────────────────────────────────────────────
    const drawSpecial = (cp: number, x0: number, x1: number, y0: number, y1: number, fg: string) => {
      ctx.fillStyle = fg;
      const w = x1 - x0, h = y1 - y0;
      if (cp >= 0x2580 && cp <= 0x2595) {                 // block elements
        if (cp === 0x2580) return void ctx.fillRect(x0, y0, w, snap(y0 + h / 2) - y0);
        if (cp <= 0x2588) {                               // ▁..█ lower eighths
          const top = snap(y1 - (h * (cp - 0x2580)) / 8);
          return void ctx.fillRect(x0, top, w, y1 - top);
        }
        if (cp <= 0x258f) {                               // ▉..▏ left eighths
          const right = snap(x0 + (w * (0x2590 - cp)) / 8);
          return void ctx.fillRect(x0, y0, right - x0, h);
        }
        if (cp === 0x2590) { const l = snap(x0 + w / 2); return void ctx.fillRect(l, y0, x1 - l, h); }
        if (cp <= 0x2593) {                               // ░▒▓ shades
          ctx.globalAlpha = (cp - 0x2590) * 0.25;
          ctx.fillRect(x0, y0, w, h);
          ctx.globalAlpha = 1;
          return;
        }
        if (cp === 0x2594) return void ctx.fillRect(x0, y0, w, snap(y0 + h / 8) - y0);
        const l = snap(x1 - w / 8); return void ctx.fillRect(l, y0, x1 - l, h);   // ▕
      }
      if (cp in QUAD) {
        const q = QUAD[cp], mx = snap(x0 + w / 2), my = snap(y0 + h / 2);
        if (q & 1) ctx.fillRect(x0, y0, mx - x0, my - y0);
        if (q & 2) ctx.fillRect(mx, y0, x1 - mx, my - y0);
        if (q & 4) ctx.fillRect(x0, my, mx - x0, y1 - my);
        if (q & 8) ctx.fillRect(mx, my, x1 - mx, y1 - my);
        return;
      }
      const cxL = (t: number) => snap(x0 + w / 2 - t / 2);   // left edge of a vertical stroke
      const cyT = (t: number) => snap(y0 + h / 2 - t / 2);   // top edge of a horizontal stroke
      if (cp in LINES) {
        const [u, r, d, l] = LINES[cp];
        const tv = Math.max(u, d) === 2 ? lwHeavy : lw, th = Math.max(l, r) === 2 ? lwHeavy : lw;
        const vx = cxL(tv), hy = cyT(th);
        if (u) ctx.fillRect(vx, y0, tv, hy + th - y0);
        if (d) ctx.fillRect(vx, hy, tv, y1 - hy);
        if (l) ctx.fillRect(x0, hy, vx + tv - x0, th);
        if (r) ctx.fillRect(vx, hy, x1 - vx, th);
        return;
      }
      if (cp in DASH) {
        const [horiz, n, wt] = DASH[cp], t = wt === 2 ? lwHeavy : lw;
        if (horiz) {
          const seg = w / n, hy = cyT(t);
          for (let k = 0; k < n; k++) { const a = snap(x0 + k * seg), b = snap(x0 + k * seg + seg * 0.6); ctx.fillRect(a, hy, b - a, t); }
        } else {
          const seg = h / n, vx = cxL(t);
          for (let k = 0; k < n; k++) { const a = snap(y0 + k * seg), b = snap(y0 + k * seg + seg * 0.6); ctx.fillRect(vx, a, t, b - a); }
        }
        return;
      }
      const [dx, dy] = ROUND[cp];                            // rounded corner
      const cx = cxL(lw) + lw / 2, cy = cyT(lw) + lw / 2;
      const ex = dx > 0 ? x1 : x0, ey = dy > 0 ? y1 : y0;
      ctx.strokeStyle = fg;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(ex, cy);
      ctx.arcTo(cx, cy, cx, ey, Math.min(w, h) / 2);
      ctx.lineTo(cx, ey);
      ctx.stroke();
    };

    // ── row painter ────────────────────────────────────────────────────────
    const paintRow = (y: number) => {
      if (!data) return;
      const y0 = snap(y * ch), y1 = snap((y + 1) * ch);
      const X = (c: number) => snap(c * cw);
      const W = canvas.width / dpr;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y0, W, y1 - y0);
      ctx.clip();
      ctx.fillStyle = BG;
      ctx.fillRect(0, y0, W, y1 - y0);
      let col = 0;
      for (const run of grid[y] || []) {
        const [fgc, bgc, flags] = data.styles[run[0]];
        const fg = fgc || FG;
        const one = run.length === 3;                   // single glyph spanning run[2] cells
        const cps = one ? [run[1]] : Array.from(run[1]);
        const span = one ? (run[2] as number) : cps.length;
        if (bgc) { ctx.fillStyle = bgc; ctx.fillRect(X(col), y0, X(col + span) - X(col), y1 - y0); }
        setFont(fontFor(flags));
        let ascii = "", asciiCol = col;
        const flush = () => {
          if (ascii.trim()) {
            ctx.fillStyle = fg;
            if (perGlyph()) for (let q = 0; q < ascii.length; q++) ctx.fillText(ascii[q], X(asciiCol + q), y0 + base);
            else ctx.fillText(ascii, X(asciiCol), y0 + base);
          }
          ascii = "";
        };
        for (let k = 0; k < cps.length; k++) {
          const g = cps[k];
          const c = one ? col : col + k;
          const cp = g.codePointAt(0)!;
          if (!one && cp < 0x7f) { if (!ascii) asciiCol = c; ascii += g; continue; }
          flush();
          if (isDrawn(cp)) drawSpecial(cp, X(c), X(c + 1), y0, y1, fg);
          else { ctx.fillStyle = fg; ctx.fillText(g, X(c), y0 + base); }
        }
        flush();
        if (flags & 12) {                                   // underline / strike
          ctx.fillStyle = fg;
          const x0 = X(col), x1 = X(col + span);
          if (flags & 4) ctx.fillRect(x0, snap(y1 - lw * 2), x1 - x0, lw);
          if (flags & 8) ctx.fillRect(x0, snap(y0 + (y1 - y0) / 2), x1 - x0, lw);
        }
        col += span;
      }
      ctx.restore();
      curFont = "";                       // restore() reset font + letterSpacing
    };

    const flushDirty = () => { for (const y of dirty) paintRow(y); dirty.clear(); };
    const apply = (f: Frame) => { for (const [y, runs] of f[1]) { grid[y] = runs; dirty.add(y); } };

    // ── clock ──────────────────────────────────────────────────────────────
    const loop = (now: number) => {
      raf = 0;
      if (disposed || !data || !onScreen || document.hidden) return;
      if (holdUntil) {
        if (now < holdUntil) { raf = requestAnimationFrame(loop); return; }
        holdUntil = 0; t0 = now;
        grid = [];
        apply(data.frames[0]);             // restart from the opening screen
        i = 1;
        for (let y = 0; y < data.rows; y++) dirty.add(y);
      }
      const tick = (now - t0) * data.fps / 1000;
      while (i < data.frames.length && due[i] <= tick) apply(data.frames[i++]);
      if (dirty.size) flushDirty();
      if (i >= data.frames.length) holdUntil = now + HOLD_MS;
      raf = requestAnimationFrame(loop);
    };
    const pause = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (started && !pausedAt) pausedAt = performance.now();
    };
    const resume = () => {
      if (!started || raf || !onScreen || document.hidden) return;
      if (pausedAt) {                      // shift the clock so playback continues, not jumps
        const gap = performance.now() - pausedAt;
        t0 += gap; if (holdUntil) holdUntil += gap;
        pausedAt = 0;
      }
      raf = requestAnimationFrame(loop);
    };

    const load = async () => {
      loading = true;
      const mod = await import("@/lib/demo-screen.json");
      if (disposed) return;
      data = (mod.default ?? mod) as unknown as Screen;
      let acc = 0;
      due = data.frames.map((f, n) => (n === 0 ? 0 : (acc += f[0])));

      // the exact font the page uses; wait for every face we draw with
      family = getComputedStyle(canvas).fontFamily || "monospace";
      await Promise.race([
        Promise.all(["400", "700", "italic 400"].map((w) => document.fonts.load(`${w} 13px ${family}`))),
        new Promise((r) => setTimeout(r, 1500)),
      ]).catch(() => {});
      if (disposed) return;
      ctx.font = `400 100px ${family}`;
      advPerPx = ctx.measureText("0").width / 100 || 0.6;
      measure();

      if (reduce) {                        // final screen, painted once
        for (const f of data.frames) apply(f);
        flushDirty();
        return;
      }
      apply(data.frames[0]);               // frame 0 is the full opening screen
      i = 1;
      flushDirty();
      // start the clock once the main thread is idle (after hydration etc.)
      const go = () => { if (disposed) return; started = true; t0 = performance.now(); resume(); };
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (ric) ric(go, { timeout: 600 }); else setTimeout(go, 200);
    };

    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen && !loading) load().catch(() => {});
      else if (onScreen) resume();
      else pause();
    }, { rootMargin: "300px" });
    io.observe(box);

    const onVis = () => (document.hidden ? pause() : resume());
    document.addEventListener("visibilitychange", onVis);

    let lastW = 0;
    const ro = new ResizeObserver(() => {
      const w = canvas.clientWidth;
      if (!data || w === lastW) return;
      lastW = w;
      measure();
      flushDirty();
    });
    ro.observe(canvas);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className="replay" ref={boxRef}>
      <div className="replay-bar">$ agentty — ~/app</div>
      <div className="replay-screen">
        <canvas ref={canvasRef} className="replay-canvas" aria-hidden="true" />
      </div>
      <p className="sr-only">
        Recorded agentty session: it runs a failing Python test, searches for TokenCache,
        reads auth/handler.py, edits resolve() to use the cache, and re-runs the tests, which pass.
      </p>
    </div>
  );
}
