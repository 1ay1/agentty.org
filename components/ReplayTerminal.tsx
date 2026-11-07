"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { className, styleRule, type Frame, type Screen, type Seg } from "@/lib/replay";

/**
 * ReplayTerminal — plays a REAL recorded agentty session as plain DOM.
 *
 * Everything expensive happened at build time (scripts/build-demo-screen.mjs):
 * the PTY bytes were parsed by xterm.js, resampled to 30fps, cleaned of
 * one-frame layout spikes, and cut into positioned segments. The browser:
 *   - paints the opening frame from server HTML (zero JS, zero layout shift)
 *     and ADOPTS those nodes — nothing is rebuilt on hydration
 *   - runs one requestAnimationFrame clock; frames are picked by elapsed
 *     time (a slow frame drops, the timeline never stalls) and every due
 *     frame coalesces into one write per row
 *   - writes only what changed: each segment is a span pinned at its column
 *     (absolute, never moves), keyed by column; only text / class / width
 *     are touched. Every row is `contain: strict`, the grid is its own
 *     compositor layer, so a change re-lays-out and repaints one row only
 *   - does no allocation in the steady state, no string splitting, no
 *     measuring, no reads from layout — writes only, so no forced reflows
 *   - pauses off-screen / in background tabs; reduced-motion: last frame
 */

const HOLD_MS = 4500;          // linger on the finished session before looping

type Cell = { el: HTMLSpanElement; text: Text; c: number; t: string; w: number; gen: number };

export function ReplayTerminal({
  cols, rows, fg, bg, children,
}: { cols: number; rows: number; fg?: string; bg?: string; children?: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current, grid = gridRef.current;
    if (!box || !grid) return;

    let data: Screen | null = null;
    let classNames: string[] = [];
    let rowEls: HTMLElement[] = [];
    let cells: Map<number, Cell>[] = [];
    let pending: (Seg[] | null)[] = [];      // latest segs per row this tick (no Map churn)
    let pendingRows: number[] = [];
    let gen = 0;
    let disposed = false, loading = false, onScreen = false, started = false;
    let raf = 0, i = 0, t0 = 0, pausedAt = 0, holdUntil = 0;
    let due: Float64Array = new Float64Array(0);
    let sheet: CSSStyleSheet | null = null, styleEl: HTMLStyleElement | null = null;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── write one row: reconcile segments into its pooled spans ────────────
    const paint = (y: number, segs: Seg[]) => {
      const row = rowEls[y], pool = cells[y], g = ++gen;
      for (let k = 0; k < segs.length; k++) {
        const [col, w, txt, ci] = segs[k];
        let c = pool.get(col);
        if (!c) {
          const el = document.createElement("span");
          const text = document.createTextNode("");
          el.append(text);
          el.style.left = col + "ch";
          row.append(el);
          c = { el, text, c: -1, t: "", w: -1, gen: 0 };
          pool.set(col, c);
        }
        if (c.c !== ci) { c.el.className = classNames[ci]; c.c = ci; }
        if (c.t !== txt) { c.text.data = txt; c.t = txt; }
        if (c.w !== w) { c.el.style.width = w + "ch"; c.w = w; }
        c.gen = g;
      }
      if (pool.size > segs.length) pool.forEach((c, k) => { if (c.gen !== g) { c.el.remove(); pool.delete(k); } });
    };
    const queue = (f: Frame) => {
      for (const [y, segs] of f[1]) { if (!pending[y]) pendingRows.push(y); pending[y] = segs; }
    };
    const flush = () => {
      for (const y of pendingRows) { paint(y, pending[y]!); pending[y] = null; }
      pendingRows.length = 0;
    };
    const restart = () => {
      for (let y = 0; y < rows; y++) { if (!pending[y]) pendingRows.push(y); pending[y] = []; }
      queue(data!.frames[0]);
    };

    // ── clock ──────────────────────────────────────────────────────────────
    const loop = (now: number) => {
      raf = 0;
      if (disposed || !data || !onScreen || document.hidden) return;
      if (holdUntil) {
        if (now < holdUntil) { raf = requestAnimationFrame(loop); return; }
        holdUntil = 0; t0 = now; i = 1;
        restart();
      }
      const tick = ((now - t0) * data.fps) / 1000;
      while (i < data.frames.length && due[i] <= tick) queue(data.frames[i++]);
      if (pendingRows.length) flush();
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
      if (pausedAt) {                      // shift the clock: continue, don't jump
        const gap = performance.now() - pausedAt;
        t0 += gap;
        if (holdUntil) holdUntil += gap;
        pausedAt = 0;
      }
      raf = requestAnimationFrame(loop);
    };

    const load = async () => {
      loading = true;
      const mod = await import("@/lib/demo-screen.json");
      if (disposed) return;
      data = (mod.default ?? mod) as unknown as Screen;
      due = new Float64Array(data.frames.length);
      for (let n = 1, acc = 0; n < data.frames.length; n++) due[n] = acc += data.frames[n][0];
      classNames = data.classes.map(className);

      // every recorded style as a class, in one stylesheet
      const css = data.styles.map((s, n) => styleRule(n, s)).join("");
      if ("adoptedStyleSheets" in document && "replaceSync" in CSSStyleSheet.prototype) {
        sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      } else {
        styleEl = document.createElement("style");
        styleEl.textContent = css;
        document.head.append(styleEl);
      }

      // adopt the server-rendered rows and spans as the live pool
      rowEls = Array.from(grid.children) as HTMLElement[];
      pending = new Array(rows).fill(null);
      cells = rowEls.map((row, y) => {
        const pool = new Map<number, Cell>();
        const first = data!.frames[0][1].find((r) => r[0] === y)?.[1] ?? [];
        const byCol = new Map(first.map((s) => [s[0], s]));
        for (const el of Array.from(row.children) as HTMLSpanElement[]) {
          const col = Number(el.dataset.c), s = byCol.get(col);
          const text = el.firstChild as Text | null;
          if (!s || !text) { el.remove(); continue; }
          pool.set(col, { el, text, c: s[3], t: s[2], w: s[1], gen: 0 });
        }
        return pool;
      });

      if (reduce) {                        // final screen, painted once
        for (const f of data.frames) queue(f);
        flush();
        return;
      }
      i = 1;
      started = true;
      t0 = performance.now();              // opening frame is already on screen
      resume();
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

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if (sheet) document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== sheet);
      styleEl?.remove();
    };
  }, [rows]);

  const vars = { "--cols": cols, "--rows": rows, color: fg, background: bg } as CSSProperties;

  return (
    <div className="replay" ref={boxRef}>
      <div className="replay-bar">$ agentty — ~/app</div>
      <div className="replay-screen">
        <div className="replay-grid" ref={gridRef} style={vars} aria-hidden="true">
          {children}
        </div>
      </div>
      <p className="sr-only">
        Recorded agentty session: it plans the work, runs the failing tests, maps the project with
        parallel list, grep and find-definition calls, reads and outlines the code, edits resolve()
        to use the token cache, writes a regression test, re-runs the tests (all pass), reviews the
        diff and git status, and saves a memory.
      </p>
    </div>
  );
}
