"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { PREFIX, className, styleRule, type DemoTheme, type Frame, type Screen, type Seg } from "@/lib/replay";

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
    let raf = 0, i = 0, t0 = 0, pausedAt = 0, ended = false, follow = true;
    let due: Float64Array = new Float64Array(0);
    const blank: boolean[] = [];             // per row: no visible text
    let skipped = 0;
    const sheets: CSSStyleSheet[] = [], styleEls: HTMLStyleElement[] = [];
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
      addRows(max + 1);
      for (const y of pendingRows) {
        blank[y] = !pending[y]!.some((g) => g[2].trim());
        paint(y, pending[y]!); pending[y] = null;
      }
      pendingRows.length = 0;
      // agentty draws its conversation from where the cursor was, under the
      // cleared welcome screen, so the buffer starts with blank rows. While
      // everything fits on one screen they're the real terminal's top; once
      // the session scrolls, scrolling back up would only find that gap, so
      // it's skipped (never more than the rows that have scrolled away)
      let lead = 0;
      while (lead < rowEls.length && blank[lead] !== false) lead++;
      const skip = Math.max(0, Math.min(lead, rowEls.length - rows));
      if (skip !== skipped) { grid.style.setProperty("--skip", String(skip)); skipped = skip; }
      if (follow) grid.scrollTop = grid.scrollHeight;   // stick to the bottom, like a terminal
    };
    const onScroll = () => {                  // reader scrolled up: stop following until back at the bottom
      follow = grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 4;
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
      if (disposed || !data || !onScreen || document.hidden || ended || "liveOn" in box.dataset) { pause(); return; }
      const tick = ((now - t0) * data.fps) / 1000;
      while (i < data.frames.length && due[i] <= tick) queue(data.frames[i++]);
      if (pendingRows.length) flush();
      if (i >= data.frames.length) return finish();   // play once, stay on the result
      raf = requestAnimationFrame(loop);
    };
    const pause = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (started && !pausedAt) pausedAt = performance.now();
    };
    const resume = () => {
      if (!started || raf || ended || !onScreen || document.hidden || "liveOn" in box.dataset) return;
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
      const o = t === "light" ? light : dark;
      grid.style.color = o.fg ?? "";
      grid.style.background = o.bg ?? "";
      box.dataset.theme = t;
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
    // "try it live" covers the replay with the real terminal: stop the replay
    // clock while it is there (it was repainting rows nobody can see)
    const live = new MutationObserver(() => ("liveOn" in box.dataset ? pause() : resume()));
    live.observe(box, { attributes: true, attributeFilter: ["data-live-on"] });

    // the site theme toggle: before the player loads, CSS already shows the
    // matching opening frame; after, swap recordings
    const mo = new MutationObserver(() => {
      const t = siteTheme();
      if (!data) { grid = box.querySelector<HTMLDivElement>(`.replay-grid[data-for="${t}"]`)!; theme = t; return; }
      void switchTo(t);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      mo.disconnect();
      live.disconnect();
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
