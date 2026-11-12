"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { PREFIX, className, styleRule, type DemoTheme, type Frame, type Screen, type Seg } from "@/lib/replay";
import { CanvasGrid } from "@/lib/replay-canvas";
import { makeRecolor } from "@/lib/recolor";
import { activeScheme, SLOTS } from "@/lib/scheme";
import base from "@/lib/demo-base-slots.generated.json";

// the recording was made in agentty's Flexoki; with another scheme in force,
// every recorded colour is rebuilt from that scheme's slots (lib/recolor.ts)
const baseSlots = base as { slots: string[]; dark: string[]; light: string[] };
function schemeMap(t: DemoTheme): ((c: string) => string) | null {
  const s = activeScheme();
  if (!s) return null;
  const from = SLOTS.map((k) => "#" + (baseSlots[t][baseSlots.slots.indexOf(k)] ?? "000000"));
  return makeRecolor(from, SLOTS.map((k) => s[k] ?? s.text));
}

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
 *   - behaves like a terminal: output scrolls up into scrollback (rows are
 *     appended as the session grows), the view follows the bottom unless the
 *     reader scrolls up, and there's a real scrollbar
 *   - plays once, then stays on the finished session (a "replay" button
 *     appears); pauses off-screen / in background tabs; reduced-motion: the
 *     finished session, painted once
 *   - follows the site theme: the session was recorded in agentty's Flexoki
 *     Dark and Flexoki Light themes (frame for frame the same run); switching
 *     the site theme swaps recordings and repaints at the same moment
 */

type Opening = { rows: ReactNode; fg?: string; bg?: string };
const LOADERS: Record<DemoTheme, () => Promise<{ default: unknown }>> = {
  dark: () => import("@/lib/demo-screen.json"),
  light: () => import("@/lib/demo-screen-light.json"),
};
const siteTheme = (): DemoTheme => (document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

type Cell = { el: HTMLSpanElement; text: Text; c: number; t: string; w: number; gen: number };

export function ReplayTerminal({
  cols, rows, dark, light,
}: { cols: number; rows: number; dark: Opening; light: Opening }) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let grid = box.querySelector<HTMLDivElement>(`.replay-grid[data-for="${siteTheme()}"]`)!;

    let data: Screen | null = null;
    let theme: DemoTheme = siteTheme();
    const screens: Partial<Record<DemoTheme, Screen>> = {};
    const names: Partial<Record<DemoTheme, string[]>> = {};
    let switching = 0;
    let classNames: string[] = [];
    let rowEls: HTMLElement[] = [];
    let cells: Map<number, Cell>[] = [];
    let pending: (Seg[] | null)[] = [];      // latest segs per row this tick (no Map churn)
    let pendingRows: number[] = [];
    let gen = 0;
    let disposed = false, loading = false, onScreen = false, started = false;
    let raf = 0, sleeper = 0, i = 0, t0 = 0, pausedAt = 0, ended = false, follow = true;
    let due: Float64Array = new Float64Array(0);
    const blank: boolean[] = [];             // per row: no visible text
    const stale = new Map<number, Seg[]>();  // rows that changed while off screen
    let rh = 0;
    const rowH = () => rh || (rh = rowEls[0]?.getBoundingClientRect().height || 16);   // fractional: rounding drifts 300 rows apart
    const onResize = () => { rh = 0; };
    window.addEventListener("resize", onResize, { passive: true });
    // phones draw the recording at 15 fps: agentty's own spinners step at
    // ~11 fps, so nothing visible is lost, and half the frames is half the
    // style/layout/paint work on the device that can least afford it
    const minGap = matchMedia("(max-width: 720px)").matches ? 1000 / 15 : 0;
    let lastDraw = 0;
    let skipped = 0;
    const sheets: CSSStyleSheet[] = [], styleEls: HTMLStyleElement[] = [];
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── write one row: reconcile segments into its pooled spans ────────────
    let canvas: CanvasGrid | null = null;   // once loaded: one canvas draws the visible rows
    const paint = (y: number, segs: Seg[]) => {
      if (canvas) { canvas.set(y, segs); return; }
      const row = rowEls[y], pool = cells[y], g = ++gen;
      for (let k = 0; k < segs.length; k++) {
        const [col, w, txt, ci] = segs[k];
        let c = pool.get(col);
        if (!c) {
          const el = document.createElement("span");
          const text = document.createTextNode("");
          el.append(text);
          el.style.left = (col * 0.6).toFixed(1) + "em";   // one cell = 0.6em: font-size is --cw / .6
          row.append(el);
          c = { el, text, c: -1, t: "", w: -1, gen: 0 };
          pool.set(col, c);
        }
        if (c.c !== ci) { c.el.className = classNames[ci]; c.c = ci; }
        if (c.t !== txt) { c.text.data = txt; c.t = txt; }
        if (c.w !== w) { c.el.style.width = (w * 0.6).toFixed(1) + "em"; c.w = w; }
        c.gen = g;
      }
      if (pool.size > segs.length) pool.forEach((c, k) => { if (c.gen !== g) { c.el.remove(); pool.delete(k); } });
    };
    const addRows = (n: number) => {          // output scrolled: grow the buffer
      while (rowEls.length < n) {
        const d = document.createElement("div");
        grid.append(d);
        rowEls.push(d);
        cells.push(new Map());
      }
    };
    const queue = (f: Frame) => {
      for (const [y, segs] of f[1]) { if (!pending[y]) pendingRows.push(y); pending[y] = segs; }
    };
    const flush = () => {
      let max = 0;
      for (const y of pendingRows) if (y > max) max = y;
      const grew = max + 1 > rowEls.length;
      addRows(max + 1);
      // only rows on screen are drawn; a row that changed while scrolled out
      // of view keeps its latest segments and is drawn when it comes back
      // (the canvas keeps every row in its model and draws only the visible ones itself)
      const top = canvas ? -1 : follow ? rowEls.length - rows - 1 : Math.floor(grid.scrollTop / rowH()) - 1;
      const bottom = canvas ? Infinity : follow ? rowEls.length : top + rows + 3;
      for (const y of pendingRows) {
        const segs = pending[y]!; pending[y] = null;
        blank[y] = !segs.some((g) => g[2].trim());
        if (y >= top && y < bottom) { paint(y, segs); stale.delete(y); }
        else stale.set(y, segs);
      }
      pendingRows.length = 0;
      // agentty draws its conversation from where the cursor was, under the
      // cleared welcome screen, so the buffer starts with blank rows. While
      // everything fits on one screen they're the real terminal's top; once
      // the session scrolls, scrolling back up would only find that gap, so
      // it's skipped (never more than the rows that have scrolled away)
      // Only when the buffer GREW: most frames rewrite rows already on screen,
      // and touching the scroll position forces a full layout. Setting it to
      // a huge value clamps to the bottom without reading scrollHeight.
      if (!grew) return;
      let lead = 0;
      while (lead < rowEls.length && blank[lead] !== false) lead++;
      const skip = Math.max(0, Math.min(lead, rowEls.length - rows));
      if (skip !== skipped) { grid.style.setProperty("--skip", String(skip)); skipped = skip; canvas?.invalidate(); }
      if (follow) grid.scrollTop = 1e9;                 // stick to the bottom, like a terminal
    };
    const onScroll = () => {                  // reader scrolled up: stop following until back at the bottom
      follow = grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 4;
      if (canvas) { canvas.request(); return; }
      if (!stale.size) return;
      const top = Math.floor(grid.scrollTop / rowH()) - 1, bottom = top + rows + 3;
      stale.forEach((segs, y) => { if (y >= top && y < bottom) { paint(y, segs); stale.delete(y); } });
    };
    const replayBtn = box.querySelector<HTMLButtonElement>(".replay-again");
    const finish = () => { ended = true; if (replayBtn) replayBtn.hidden = false; };
    const replay = () => {
      if (!data) return;
      for (let y = rowEls.length - 1; y >= rows; y--) rowEls[y].remove();
      rowEls.length = rows; cells.length = rows;
      for (let y = 0; y < rows; y++) { cells[y].forEach((c) => c.el.remove()); cells[y].clear(); }
      pending = new Array(data.lines ?? rows).fill(null); pendingRows = [];
      queue(data.frames[0]); flush();
      grid.scrollTop = 0; follow = true;
      ended = false; i = 1; t0 = performance.now(); pausedAt = 0;
      if (replayBtn) replayBtn.hidden = true;
      resume();
    };
    replayBtn?.addEventListener("click", replay);

    // ── clock ──────────────────────────────────────────────────────────────
    const loop = (now: number) => {
      raf = 0;
      if (disposed || !data || !onScreen || document.hidden || ended) return;
      if (minGap && now - lastDraw < minGap - 4) { raf = requestAnimationFrame(loop); return; }
      lastDraw = now;
      const tick = ((now - t0) * data.fps) / 1000;
      while (i < data.frames.length && due[i] <= tick) queue(data.frames[i++]);
      if (pendingRows.length) flush();
      if (i >= data.frames.length) return finish();   // play once, stay on the result
      // sleep until the next recorded frame is due (agentty waiting on the
      // model is seconds of nothing), then wake on a vsync to draw it
      const wait = ((due[i] - tick) * 1000) / data.fps;
      if (wait > 24) { sleeper = window.setTimeout(() => { sleeper = 0; raf = requestAnimationFrame(loop); }, wait - 12); raf = -1; }
      else raf = requestAnimationFrame(loop);
    };
    const pause = () => {
      if (raf > 0) cancelAnimationFrame(raf);
      if (sleeper) { clearTimeout(sleeper); sleeper = 0; }
      raf = 0;
      if (started && !pausedAt) pausedAt = performance.now();
    };
    const resume = () => {
      if (!started || raf || ended || !onScreen || document.hidden) return;
      if (pausedAt) {                      // shift the clock: continue, don't jump
        const gap = performance.now() - pausedAt;
        t0 += gap;
        pausedAt = 0;
      }
      raf = requestAnimationFrame(loop);
    };

    // fetch one theme's recording and install its styles (once per theme)
    const fetchScreen = async (t: DemoTheme): Promise<Screen> => {
      if (screens[t]) return screens[t]!;
      const mod = await LOADERS[t]();
      const scr = ((mod as { default?: unknown }).default ?? mod) as Screen;
      const p = PREFIX[t];
      const css = scr.styles.map((st, n) => styleRule(n, st, p)).join("");
      if ("adoptedStyleSheets" in document && "replaceSync" in CSSStyleSheet.prototype) {
        const sh = new CSSStyleSheet();
        sh.replaceSync(css);
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sh];
        sheets.push(sh);
      } else {
        const el = document.createElement("style");
        el.textContent = css;
        document.head.append(el);
        styleEls.push(el);
      }
      names[t] = scr.classes.map((c) => className(c, p));
      return (screens[t] = scr);
    };
    const use = (t: DemoTheme) => {
      theme = t;
      data = screens[t]!;
      classNames = names[t]!;
      due = new Float64Array(data.frames.length);
      for (let n = 1, acc = 0; n < data.frames.length; n++) due[n] = acc += data.frames[n][0];
      box.dataset.theme = t;
      paintColours(true);
    };

    // the site theme changed: swap recordings and repaint the same moment
    const switchTo = async (t: DemoTheme) => {
      const token = ++switching;
      await fetchScreen(t);
      if (disposed || token !== switching || t === theme) return;
      // where we are, in recorded time (the two recordings can differ by a
      // few frames, so match by time, not by frame number)
      const at = ended ? Infinity : i > 0 ? due[i - 1] : -1;
      const top = grid.scrollTop;
      use(t);
      for (let y = rowEls.length - 1; y >= rows; y--) rowEls[y].remove();
      rowEls.length = rows; cells.length = rows;
      for (let y = 0; y < rows; y++) { cells[y].forEach((c) => c.el.remove()); cells[y].clear(); }
      pending = new Array(data!.lines ?? rows).fill(null); pendingRows = [];
      let n = 0;
      while (n < data!.frames.length && (n === 0 || due[n] <= at)) n++;
      for (let k = 0; k < n; k++) queue(data!.frames[k]);
      const keep = follow;
      flush();
      if (!keep) { grid.scrollTop = top; follow = false; }
      if (started && !ended) {                       // carry on from this frame
        i = n;
        const now = performance.now();
        t0 = now - (due[Math.max(0, n - 1)] * 1000) / data!.fps;
        if (pausedAt) pausedAt = now;
      }
    };

    const load = async () => {
      loading = true;
      await fetchScreen(theme);
      if (disposed) return;
      // the other theme's opening frame is no longer needed: this grid is
      // live, and on a theme switch it is repainted from the other recording
      box.querySelectorAll<HTMLDivElement>(".replay-grid").forEach((g) => { if (g !== grid) g.remove(); });
      grid.dataset.live = "";
      grid.addEventListener("scroll", onScroll, { passive: true });
      use(theme);

      // adopt the server-rendered rows and spans as the live pool
      rowEls = Array.from(grid.children) as HTMLElement[];
      for (const [y, segs] of data!.frames[0][1]) blank[y] = !segs.some((g) => g[2].trim());
      pending = new Array(data!.lines ?? rows).fill(null);
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

      // hand drawing over to the canvas: it takes the opening frame, and the
      // server-rendered spans go (the row divs stay, empty, as scroll content)
      try {
        canvas = new CanvasGrid(grid, cols, rows, (y) => (y - skipped) * rowH());
        paintColours(true);
        for (const [y, segs] of data!.frames[0][1]) canvas.set(y, segs);
        cells.forEach((pool) => { pool.forEach((c) => c.el.remove()); pool.clear(); });
        box.dataset.canvas = "";
      } catch { canvas = null; }

      if (reduce) {                        // the finished session, painted once
        for (const f of data!.frames) queue(f);
        flush();
        finish();
        if (siteTheme() !== theme) void switchTo(siteTheme());
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

    // colours: the recording's own, or rebuilt in the scheme in force. Before
    // the canvas exists that means the server-rendered opening frame's style
    // rules (rewritten from their originals each time); after, the canvas.
    const originals = new Map<CSSStyleRule, [string, string]>();
    const grids = [...box.querySelectorAll<HTMLElement>(".replay-grid")];
    const paintColours = (fresh = false) => {
      const map = schemeMap(theme);
      const m = map ?? ((c: string) => c);
      // once the canvas draws, the server-rendered spans are gone: their rules
      // don't matter, and rewriting ~800 of them was most of a recolour's cost
      if (!canvas) for (const sheet of [...document.styleSheets, ...document.adoptedStyleSheets]) {
        let rules: CSSRuleList;
        try { rules = sheet.cssRules; } catch { continue; }
        for (const r of rules) {
          if (!(r instanceof CSSStyleRule) || !r.selectorText.startsWith(".replay-grid .")) continue;
          if (!originals.has(r)) originals.set(r, [r.style.color, r.style.background]);
          const [c, b] = originals.get(r)!;
          if (c) r.style.color = map ? m(c) : c;
          if (b) r.style.background = map ? m(b) : b;
        }
      }
      for (const g of grids) {
        const o = g.dataset.for === "light" ? light : dark;
        g.style.color = o.fg ? m(o.fg) : "";
        g.style.background = o.bg ? m(o.bg) : "";
      }
      if (canvas && data) {
        const o = theme === "light" ? light : dark;
        const fg = o.fg ?? "#cecdc3", bg = o.bg ?? "#100f0f";
        if (fresh) canvas.use(data, fg, bg, map ?? undefined);
        else canvas.recolor(data, fg, bg, map ?? undefined);
      }
    };
    paintColours();
    const onScheme = () => paintColours();
    window.addEventListener("agentty:scheme-change", onScheme);

    // the site theme toggle: before the player loads, CSS already shows the
    // matching opening frame; after, swap recordings
    const mo = new MutationObserver(() => {
      const t = siteTheme();
      if (!data) { grid = box.querySelector<HTMLDivElement>(`.replay-grid[data-for="${t}"]`)!; theme = t; paintColours(); return; }
      void switchTo(t);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      disposed = true;
      if (raf > 0) cancelAnimationFrame(raf);
      if (sleeper) clearTimeout(sleeper);
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("agentty:scheme-change", onScheme);
      canvas?.destroy();
      window.removeEventListener("resize", onResize);
      grid.removeEventListener("scroll", onScroll);
      replayBtn?.removeEventListener("click", replay);
      document.removeEventListener("visibilitychange", onVis);
      if (sheets.length) document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => !sheets.includes(s));
      styleEls.forEach((el) => el.remove());
    };
  }, [rows]);

  const vars = (o: Opening) => ({ "--cols": cols, "--rows": rows, color: o.fg, background: o.bg }) as CSSProperties;

  return (
    <div className="replay" ref={boxRef}>
      <div className="replay-screen">
        <div className="replay-grid" data-for="dark" style={vars(dark)} aria-hidden="true" tabIndex={-1}>
          {dark.rows}
        </div>
        <div className="replay-grid" data-for="light" style={vars(light)} aria-hidden="true" tabIndex={-1}>
          {light.rows}
        </div>
        <button type="button" className="replay-again" hidden>replay ↻</button>
      </div>
      <p className="sr-only">
        Recorded agentty session: it reasons about the failing test, plans the work and maps the repo, runs the failing tests and
        reads the git history, searches the code by meaning, by text, by file pattern and by symbol,
        queries the config, reads, outlines and filters the source, sends a subagent to find every
        caller, edits resolve() to use the token cache, patches the cache and writes a regression
        test, re-runs the tests, compiles and checks the network calls (all pass), reviews the diff
        and git status, and saves a memory.
      </p>
    </div>
  );
}
