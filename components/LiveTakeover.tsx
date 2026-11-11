"use client";

import { useEffect, useRef, useState } from "react";

// "Try it live" on the home page: the replay box becomes the REAL agentty
// binary, in a PTY on this server, pointed at a mock model (deploy/live/
// server.mjs). Opt-in (a tap), so nobody's page load starts a process.
//
// Fast: xterm (self-hosted, /vendor/xterm) is prefetched once the demo is on
// screen and preloaded on hover/touch, the WebSocket opens while it loads
// (bytes are buffered), and the terminal's size is worked out before xterm
// exists and sent with the connection, so agentty starts at the final size
// and never redraws for a resize.
// Sharp: the font is fitted so agentty gets at least MIN_COLS columns (on a
// phone that means a small font, like the replay's), rendered as real text
// (xterm's DOM renderer: the system's own font rasteriser, crisp at any pixel
// density), at line height 1 so box-drawing lines meet with no gaps.
// (xterm's WebGL renderer mis-scales its canvas on 2x/3x screens.)
declare global { interface Window { Terminal?: any; FitAddon?: any } }

const V = "/vendor/xterm/";
const SCRIPTS = [V + "xterm.js", V + "addon-fit.js"];
const MIN_COLS = 64;          // agentty lays out well from here; fewer columns and it wraps
const MAX_FONT = 13;
const LINE = 1;
const CELL_W = 0.6;           // JetBrains Mono's advance, in em

const hint = (rel: "prefetch" | "preload") => {
  for (const href of [...SCRIPTS, V + "xterm.css"]) {
    if (document.querySelector(`link[href="${href}"][rel="${rel}"]`)) continue;
    const l = Object.assign(document.createElement("link"), { rel, href });
    if (rel === "preload") l.as = href.endsWith(".css") ? "style" : "script";
    document.head.appendChild(l);
  }
};
const load = (src: string) =>
  new Promise<void>((ok, fail) => {
    const had = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (had) return had.dataset.ok ? ok() : (had.addEventListener("load", () => ok()), had.addEventListener("error", fail));
    const s = Object.assign(document.createElement("script"), { src, async: false });
    s.onload = () => { s.dataset.ok = "1"; ok(); };
    s.onerror = () => fail(new Error(src));
    document.head.appendChild(s);
  });
const loadAll = () => {
  if (!document.querySelector(`link[rel="stylesheet"][href="${V}xterm.css"]`))
    document.head.appendChild(Object.assign(document.createElement("link"), { rel: "stylesheet", href: V + "xterm.css" }));
  return Promise.all(SCRIPTS.map(load));       // async=false: they execute in order
};

const FLEXOKI = {
  dark: { background: "#100f0f", foreground: "#cecdc3", cursor: "#cecdc3", cursorAccent: "#100f0f", selectionBackground: "#403e3c",
    black: "#100f0f", red: "#d14d41", green: "#879a39", yellow: "#d0a215", blue: "#4385be", magenta: "#ce5d97", cyan: "#3aa99f", white: "#878580",
    brightBlack: "#575653", brightRed: "#af3029", brightGreen: "#66800b", brightYellow: "#ad8301", brightBlue: "#205ea6", brightMagenta: "#a02f6f", brightCyan: "#24837b", brightWhite: "#cecdc3" },
  light: { background: "#fffcf0", foreground: "#100f0f", cursor: "#100f0f", cursorAccent: "#fffcf0", selectionBackground: "#cecdc3",
    black: "#100f0f", red: "#af3029", green: "#66800b", yellow: "#ad8301", blue: "#205ea6", magenta: "#a02f6f", cyan: "#24837b", white: "#6f6e69",
    brightBlack: "#b7b5ac", brightRed: "#d14d41", brightGreen: "#879a39", brightYellow: "#d0a215", brightBlue: "#4385be", brightMagenta: "#ce5d97", brightCyan: "#3aa99f", brightWhite: "#100f0f" },
};

// the terminal's size from the box alone (no xterm yet): a font that gives
// at least MIN_COLS, capped at MAX_FONT, snapped to half pixels
function fit(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const fontSize = Math.max(6, Math.min(MAX_FONT, Math.floor((w / (MIN_COLS * CELL_W)) * 2) / 2));
  return {
    fontSize,
    cols: Math.max(20, Math.floor(w / (fontSize * CELL_W))),
    rows: Math.max(8, Math.floor(h / Math.ceil(fontSize * LINE))),
  };
}

export function LiveTakeover() {
  const [on, setOn] = useState(false);
  const [state, setState] = useState<"" | "connecting" | "live" | "ended">("");
  const [note, setNote] = useState("");
  const btn = useRef<HTMLButtonElement>(null);

  // prefetch xterm (low priority) once the demo is on screen and the page is idle
  useEffect(() => {
    const fig = document.querySelector(".home-demo");
    if (!fig) return;
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const idle = (window as any).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 1200));
      idle(() => hint("prefetch"));
    });
    io.observe(fig);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const replay = document.querySelector<HTMLElement>(".home-demo .replay");
    if (!on || !replay) return;
    let disposed = false, term: any, fitter: any, ws: WebSocket | null = null, ro: ResizeObserver | null = null;
    const el = document.createElement("div");
    el.className = "live-inline";
    replay.dataset.liveOn = "";                  // the box takes its live size first
    replay.appendChild(el);
    setState("connecting");
    const end = (msg: string) => { if (!disposed) { setState("ended"); setNote(msg); } };

    const size = fit(el);
    const pending: (string | Uint8Array)[] = [];
    const scripts = loadAll();
    const font = document.fonts?.ready ?? Promise.resolve();

    // connect now, in parallel with xterm loading; buffer until the terminal exists
    ws = new WebSocket(`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/live/ws?cols=${size.cols}&rows=${size.rows}`);
    ws.binaryType = "arraybuffer";
    const timer = window.setTimeout(() => { if (ws?.readyState !== WebSocket.OPEN) { ws?.close(); end("the live demo isn't reachable right now"); } }, 8000);
    ws.onopen = () => window.clearTimeout(timer);
    ws.onmessage = (m) => {
      if (typeof m.data === "string" && m.data.startsWith("{\"t\":")) {
        try { const j = JSON.parse(m.data); if (j.t === "err" || j.t === "end") return end(j.m || "session ended"); } catch {}
      }
      const d = typeof m.data === "string" ? m.data : new Uint8Array(m.data);
      if (term) term.write(d); else pending.push(d);
    };
    ws.onclose = () => end("session ended");
    ws.onerror = () => end("the live demo isn't reachable right now");

    (async () => {
      try { await Promise.all([scripts, font]); } catch { return end("couldn't load the terminal"); }
      if (disposed) return;
      const light = document.documentElement.getAttribute("data-theme") === "light";
      term = new window.Terminal!({
        cols: size.cols, rows: size.rows,
        fontFamily: getComputedStyle(document.body).fontFamily, fontSize: size.fontSize, lineHeight: LINE,
        cursorBlink: true, allowProposedApi: true, scrollback: 1000,
        theme: light ? FLEXOKI.light : FLEXOKI.dark,
      });
      fitter = new window.FitAddon!.FitAddon();
      term.loadAddon(fitter);
      term.open(el);
      for (const d of pending.splice(0)) term.write(d);
      setState("live");
      if (!matchMedia("(hover: none)").matches) term.focus();
      const resize = () => {
        try { fitter.fit(); } catch {}
        if (ws?.readyState === WebSocket.OPEN) ws.send("\x00json:" + JSON.stringify({ t: "resize", cols: term.cols, rows: term.rows }));
      };
      let last = `${term.cols}x${term.rows}`;
      ro = new ResizeObserver(() => {
        const dims = fitter.proposeDimensions?.();
        const k = dims ? `${dims.cols}x${dims.rows}` : "";
        if (k && k !== last) { last = k; resize(); }
      });
      ro.observe(el);
      term.onData((d: string) => { if (ws?.readyState === WebSocket.OPEN) ws.send(d); });
      // tapping the terminal on a phone brings up the keyboard
      el.addEventListener("click", () => term.focus());
    })();

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      ro?.disconnect();
      try { ws?.close(); } catch {}
      try { term?.dispose(); } catch {}
      el.remove();
      delete replay.dataset.liveOn;
    };
  }, [on]);

  const stop = () => { setOn(false); setState(""); setNote(""); };

  if (!on)
    return (
      <button
        ref={btn}
        type="button"
        className="live-try"
        onPointerEnter={() => hint("preload")}
        onPointerDown={() => { hint("preload"); void loadAll().catch(() => {}); }}
        onFocus={() => hint("preload")}
        onClick={() => setOn(true)}
      >
        try it live <span aria-hidden="true">›</span>
      </button>
    );
  return (
    <span className="live-try-state">
      <span className={`live-dot ${state}`} aria-hidden="true" />
      {state === "connecting" ? "starting agentty…" : state === "live" ? "live · real binary, mock model" : note}
      <button type="button" className="live-try" onClick={stop}>{state === "ended" ? "back to the replay" : "stop"}</button>
    </span>
  );
}
