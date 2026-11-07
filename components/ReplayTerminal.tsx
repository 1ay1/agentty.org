"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ReplayTerminal — plays back a REAL agentty session: the exact PTY bytes the
 * binary wrote while fixing a failing test (recorded by scripts/record-demo.mjs),
 * fed into xterm.js with their original timing, on a loop.
 *
 * Nothing here re-draws agentty — every glyph, colour and layout comes from the
 * binary's own output. xterm is loaded from the CDN only once the player
 * scrolls into view, and playback pauses while it's off-screen.
 */

declare global {
  interface Window { Terminal?: any }
}

const XTERM_JS = "https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.js";
const XTERM_CSS = "https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.css";
const SESSION = "/demo/session.json";
const HOLD_MS = 4500; // linger on the finished session before looping

type Recording = { cols: number; rows: number; frames: [number, string][] };

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      if (window.Terminal) return resolve();
    }
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("load failed: " + src));
    document.head.appendChild(s);
  });
}
function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet"; l.href = href;
  document.head.appendChild(l);
}

// JetBrains Mono's advance width is 0.6em; size the font so `cols` cells fit.
function fontSizeFor(width: number, cols: number) {
  return Math.max(4.5, Math.min(13, Math.floor((width / (cols * 0.6)) * 4) / 4));
}

export function ReplayTerminal() {
  const boxRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "ready" | "failed">("idle");

  useEffect(() => {
    const box = boxRef.current, host = hostRef.current;
    if (!box || !host) return;

    let disposed = false, started = false, visible = false;
    let term: any = null, rec: Recording | null = null;
    let i = 0, timer: number | undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const schedule = () => {
      if (disposed || !visible || !rec || !term) return;
      if (i >= rec.frames.length) {
        timer = window.setTimeout(() => { term.reset(); i = 0; schedule(); }, HOLD_MS);
        return;
      }
      timer = window.setTimeout(() => {
        // write every frame that is due together, then wait for the next gap
        let buf = rec!.frames[i++][1];
        while (i < rec!.frames.length && rec!.frames[i][0] < 16) buf += rec!.frames[i++][1];
        term.write(buf, schedule);
      }, rec.frames[i][0]);
    };

    const start = async () => {
      started = true;
      try {
        loadCss(XTERM_CSS);
        const [r] = await Promise.all([
          fetch(SESSION).then((x) => { if (!x.ok) throw new Error("session " + x.status); return x.json(); }),
          loadScript(XTERM_JS),
          document.fonts?.ready,
        ]);
        if (disposed || !window.Terminal) return;
        rec = r as Recording;
        const mono = getComputedStyle(document.body).getPropertyValue("--font-mono").trim();
        term = new window.Terminal({
          cols: rec.cols, rows: rec.rows,
          fontFamily: `${mono ? mono + ", " : ""}"JetBrains Mono", ui-monospace, monospace`,
          fontSize: fontSizeFor(box.clientWidth - 24, rec.cols),
          lineHeight: 1,
          cursorBlink: false,
          disableStdin: true,
          scrollback: 0,
          theme: { background: "#0a0a0a", foreground: "#d8d8d8", cursor: "#0a0a0a" },
        });
        term.open(host);
        setState("ready");
        if (reduce) {                      // no motion: show the finished session
          term.write(rec.frames.map((f) => f[1]).join(""));
          return;
        }
        schedule();
      } catch {
        if (!disposed) setState("failed");
      }
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !started) start();
      else if (visible) schedule();
      else window.clearTimeout(timer);
    }, { rootMargin: "200px" });
    io.observe(box);

    const ro = new ResizeObserver(() => {
      if (term && rec) term.options.fontSize = fontSizeFor(box.clientWidth - 24, rec.cols);
    });
    ro.observe(box);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      io.disconnect(); ro.disconnect();
      try { term?.dispose(); } catch {}
    };
  }, []);

  return (
    <div className="replay" ref={boxRef}>
      <div className="replay-bar">$ agentty — ~/app</div>
      <div className={`replay-screen${state === "ready" ? " is-ready" : ""}`}>
        <div ref={hostRef} aria-hidden="true" />
        {state !== "ready" && (
          <div className="replay-placeholder">
            {state === "failed" ? "demo unavailable — try the live terminal at dev.agentty.org" : "loading session…"}
          </div>
        )}
      </div>
      <p className="sr-only">
        Recorded agentty session: it runs a failing Python test, searches for TokenCache,
        reads auth/handler.py, edits resolve() to use the cache, and re-runs the tests, which pass.
      </p>
    </div>
  );
}
