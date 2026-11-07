"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { runCells, styleRule, type Frame, type Run, type Screen } from "@/lib/replay";

/**
 * ReplayTerminal — plays a REAL recorded agentty session as plain DOM.
 *
 * The PTY bytes agentty wrote were parsed by xterm.js at build time and
 * resampled to 30fps row diffs (scripts/build-demo-screen.mjs). Here:
 *   - the opening frame arrives as server-rendered HTML (ReplayDemo), so the
 *     box is painted with zero JS and never shifts
 *   - the grid is a fixed cols × rows box sized purely in CSS (container query
 *     units), every row `contain`ed so a change re-lays out one row only
 *   - updates reconcile in place: each row keeps a pool of spans + text nodes
 *     and only the class / text / width that actually changed is written
 *   - one requestAnimationFrame clock picks frames by elapsed time (a slow
 *     frame drops, the timeline never stalls); several due frames coalesce
 *     into one write per row
 *   - styles are classes in a single constructed stylesheet, not inline css
 *   - paused off-screen / in background tabs; reduced-motion gets the last frame
 *   - it's real text: selectable and copyable
 */

const HOLD_MS = 4500;          // linger on the finished session before looping

type Cell = { el: HTMLSpanElement; text: Text; s: number; t: string; w: number };

export function ReplayTerminal({
  cols, rows, fg, bg, children,
}: { cols: number; rows: number; fg?: string; bg?: string; children?: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current, grid = gridRef.current;
    if (!box || !grid) return;

    let data: Screen | null = null;
    let rowEls: HTMLDivElement[] = [];
    let cells: Map<number, Cell>[] = [];
    const dirty = new Map<number, Run[]>();
    let disposed = false, loading = false, onScreen = false, started = false;
    let raf = 0, i = 0, t0 = 0, pausedAt = 0, holdUntil = 0;
    let due: number[] = [];
    let sheet: CSSStyleSheet | null = null, styleEl: HTMLStyleElement | null = null;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── in-place row reconciliation ───────────────────────────────────────
    // Every span is absolutely placed at its start column and keyed by it, so
    // an element NEVER moves: a run that starts elsewhere is a new element.
    // Only text/class/width change in place — zero layout shift, and no
    // inline-flow layout at all.
    const paint = (y: number, runs: Run[]) => {
      const row = rowEls[y], pool = cells[y], live = new Set<number>();
      let col = 0;
      for (const r of runs) {
        const w = runCells(r);
        let c = pool.get(col);
        if (!c) {
          const el = document.createElement("span");
          const text = document.createTextNode("");
          el.append(text);
          el.style.left = col + "ch";
          row.append(el);
          c = { el, text, s: -1, t: "", w: -1 };
          pool.set(col, c);
        }
        if (c.s !== r[0]) { c.el.className = "s" + r[0]; c.s = r[0]; }
        if (c.t !== r[1]) { c.text.data = r[1]; c.t = r[1]; }
        if (c.w !== w) { c.el.style.width = w + "ch"; c.w = w; }
        live.add(col);
        col += w;
      }
      for (const [k, c] of pool) if (!live.has(k)) { c.el.remove(); pool.delete(k); }
    };
    const flush = () => { dirty.forEach((runs, y) => paint(y, runs)); dirty.clear(); };
    const apply = (f: Frame) => { for (const [y, runs] of f[1]) dirty.set(y, runs); };
    const openingScreen = () => {
      for (let y = 0; y < data!.rows; y++) dirty.set(y, []);
      apply(data!.frames[0]);
    };

    // ── clock ──────────────────────────────────────────────────────────────
    const loop = (now: number) => {
      raf = 0;
      if (disposed || !data || !onScreen || document.hidden) return;
      if (holdUntil) {
        if (now < holdUntil) { raf = requestAnimationFrame(loop); return; }
        holdUntil = 0; t0 = now; i = 1;
        openingScreen();
      }
      const tick = ((now - t0) * data.fps) / 1000;
      while (i < data.frames.length && due[i] <= tick) apply(data.frames[i++]);
      if (dirty.size) flush();
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
      const family = getComputedStyle(grid).fontFamily;
      const fonts = Promise.race([
        Promise.all(["400", "700"].map((w) => document.fonts.load(`${w} 13px ${family}`))),
        new Promise((r) => setTimeout(r, 1500)),
      ]).catch(() => {});
      const [mod] = await Promise.all([import("@/lib/demo-screen.json"), fonts]);
      if (disposed) return;
      data = (mod.default ?? mod) as unknown as Screen;
      let acc = 0;
      due = data.frames.map((f, n) => (n === 0 ? 0 : (acc += f[0])));

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

      // take over the server-rendered first frame with live, pooled rows:
      // built off-document, swapped in one go — identical pixels, no flash
      const frag = document.createDocumentFragment();
      rowEls = Array.from({ length: data.rows }, () => frag.appendChild(document.createElement("div")));
      cells = rowEls.map(() => new Map());
      if (reduce) { for (const f of data.frames) apply(f); }
      else { openingScreen(); i = 1; }
      flush();
      grid.replaceChildren(frag);
      if (reduce) return;

      // start the clock once the main thread is idle (after hydration)
      const go = () => { if (disposed) return; started = true; t0 = performance.now(); resume(); };
      const ric = (window as Window & {
        requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      }).requestIdleCallback;
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

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if (sheet) document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== sheet);
      styleEl?.remove();
    };
  }, []);

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
