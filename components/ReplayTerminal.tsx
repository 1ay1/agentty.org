"use client";

import { useEffect, useRef } from "react";

/**
 * ReplayTerminal — plays a REAL recorded agentty session with no terminal
 * emulator in the browser.
 *
 * The PTY bytes agentty wrote (demo/session.json, scripts/record-demo.mjs) were
 * run through xterm.js's parser at BUILD time (scripts/build-demo-screen.mjs)
 * and reduced to per-frame row diffs. Here we only swap the changed rows' text,
 * on a single timer chain. Cost model:
 *   - zero JS/data until the box nears the viewport; the data is a hashed,
 *     immutable-cached chunk (~7 KB gz)
 *   - no layout shift: the box height is fixed in CSS from cols × rows
 *   - no font/resize JS: font-size is a CSS container-query expression
 *   - paused when off-screen or the tab is hidden; reduced-motion users get
 *     the finished screen, painted once
 */

type Run = [number, string] | [number, string, number];
type Frame = [number, [number, Run[]][]];
type Screen = { cols: number; rows: number; styles: string[]; frames: Frame[] };

const HOLD_MS = 4500; // linger on the finished session before looping

export function ReplayTerminal() {
  const boxRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current, pre = screenRef.current;
    if (!box || !pre) return;

    let data: Screen | null = null, rowEls: HTMLElement[] = [];
    let i = 0, timer = 0, loading = false, disposed = false;
    let onScreen = false;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const paintRow = (el: HTMLElement, runs: Run[]) => {
      const frag = document.createDocumentFragment();
      for (const [s, text, w] of runs) {
        // ASCII tiles exactly in the mono font. Only runs with other glyphs
        // (box drawing, ✓, braille spinner — often fallback fonts) are pinned
        // to their cell count, so the grid can never drift.
        const pin = w !== undefined || /[^\x20-\x7e]/.test(text);
        if (s === 0 && !pin) { frag.append(text); continue; }
        const span = document.createElement("span");
        span.className = pin ? "s" + s + " w" : "s" + s;
        if (pin) span.style.width = (w ?? text.length) + "ch";
        span.textContent = text;
        frag.append(span);
      }
      el.replaceChildren(frag);
    };

    const apply = (f: Frame) => { for (const [y, runs] of f[1]) paintRow(rowEls[y], runs); };

    const tick = () => {
      if (disposed || !data || !onScreen || document.hidden) return;
      if (i >= data.frames.length) {
        timer = window.setTimeout(() => {
          for (const el of rowEls) el.replaceChildren();
          i = 0;
          tick();
        }, HOLD_MS);
        return;
      }
      timer = window.setTimeout(() => { apply(data!.frames[i++]); tick(); }, data.frames[i][0]);
    };
    const pause = () => window.clearTimeout(timer);
    const resume = () => { pause(); tick(); };

    const load = async () => {
      loading = true;
      const mod = await import("@/lib/demo-screen.json");
      if (disposed) return;
      data = (mod.default ?? mod) as unknown as Screen;

      // one stylesheet for the recording's styles (classes, not per-span css)
      const sheet = document.createElement("style");
      sheet.textContent = data.styles.map((css, n) => `.replay-screen .s${n}{${css}}`).join("");
      document.head.append(sheet);

      pre.style.setProperty("--cols", String(data.cols));
      pre.style.setProperty("--rows", String(data.rows));
      rowEls = Array.from({ length: data.rows }, () => {
        const d = document.createElement("div");
        pre.append(d);
        return d;
      });

      if (reduce) {                       // finished screen, painted once
        const last = new Map<number, Run[]>();
        for (const f of data.frames) for (const [y, runs] of f[1]) last.set(y, runs);
        last.forEach((runs, y) => paintRow(rowEls[y], runs));
        return;
      }
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
      pause();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className="replay" ref={boxRef}>
      <div className="replay-bar">$ agentty — ~/app</div>
      <div className="replay-screen">
        <div className="replay-grid" ref={screenRef} aria-hidden="true" />
      </div>
      <p className="sr-only">
        Recorded agentty session: it runs a failing Python test, searches for TokenCache,
        reads auth/handler.py, edits resolve() to use the cache, and re-runs the tests, which pass.
      </p>
    </div>
  );
}
