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
// Sharp: the font is fitted so agentty gets at least MIN_COLS columns, using
// the font's MEASURED cell width, drawn by the GPU (WebGL) with box and block
// glyphs as pixel-snapped geometry; the DOM renderer when WebGL isn't there.
// Efficient like a real terminal: bytes go in once per frame, only changed
// rows are redrawn, nothing is drawn off screen or in a hidden tab.
declare global { interface Window { Terminal?: any; FitAddon?: any; WebglAddon?: any } }

const V = "/vendor/xterm/";
const SCRIPTS = [V + "xterm.js", V + "addon-fit.js", V + "addon-webgl.js"];

// WebGL renderer, with the DOM renderer as the fallback: if the context can't
// be made, or the GPU drops it later (phones do, under memory pressure), the
// addon is disposed and xterm carries on drawing rows as HTML
function gpuRenderer(term: any): boolean {
  if (new URLSearchParams(location.search).get("r") === "dom" || !window.WebglAddon) return false;
  try {
    const probe = document.createElement("canvas").getContext("webgl2");
    if (!probe) return false;
    probe.getExtension("WEBGL_lose_context")?.loseContext();   // free it: only asked if WebGL2 exists
    const gl = new window.WebglAddon.WebglAddon();
    gl.onContextLoss(() => { try { gl.dispose(); } catch {} });
    term.loadAddon(gl);
    return true;
  } catch {
    return false;
  }
}
// the terminal's own font (scripts/gen-term-font.py): every glyph agentty
// draws, one cell wide. Without it 31 of agentty's 35 symbols came from
// whatever system font had them, each its own width: broken lines, slow paints
const TERM_FONT = '"agentty term"';
const FONT_FILES = [V + "agentty-term-400.woff2", V + "agentty-term-700.woff2"];
const loadFont = () =>
  Promise.race([
    Promise.all(["400", "700"].map((w) => document.fonts?.load(`${w} 12px ${TERM_FONT}`, "─█⠋✦"))).catch(() => {}),
    new Promise((r) => setTimeout(r, 2500)),           // never hang the demo on a font
  ]);
const MIN_COLS = 54;          // ~10.5px on a phone; agentty lays its screen out at this width
const MAX_FONT = 13;
const LINE = 1;

const hint = (rel: "prefetch" | "preload") => {
  for (const href of [...SCRIPTS, V + "xterm.css", ...FONT_FILES]) {
    if (document.querySelector(`link[href="${href}"][rel="${rel}"]`)) continue;
    const l = Object.assign(document.createElement("link"), { rel, href });
    if (rel === "preload") l.as = href.endsWith(".css") ? "style" : href.endsWith(".woff2") ? "font" : "script";
    if (href.endsWith(".woff2")) l.crossOrigin = "anonymous";
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

// the font's real advance and line height, in em, measured once it has
// loaded (at line height 1 xterm's row is ascent + descent, not the font size)
let advance = 0, tall = 0;
function cellEm(family: string) {
  if (advance) return advance;
  const c = document.createElement("canvas").getContext("2d")!;
  c.font = `100px ${family}`;
  const m = c.measureText("W".repeat(50));
  advance = m.width / 50 / 100 || 0.6;
  tall = (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent) / 100 || 1.3;
  return advance;
}

// the terminal's size from the box alone (no xterm yet): a font that gives
// at least MIN_COLS, capped at MAX_FONT, snapped to half pixels; one spare
// column of slack so rounding never pushes the last column off the edge
function fit(el: HTMLElement, family: string) {
  const cs = getComputedStyle(el);
  const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const em = cellEm(family);
  const fontSize = Math.max(6, Math.min(MAX_FONT, Math.floor((w / (MIN_COLS * em)) * 2) / 2));
  return {
    fontSize,
    cols: Math.max(20, Math.floor(w / (fontSize * em)) - 1),
    rows: Math.max(8, Math.floor(h / Math.ceil(fontSize * tall * LINE))),
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
    // xterm's fit reads its PARENT's box and ignores that parent's padding, so
    // the padding lives on el and the terminal in an unpadded child
    const host = document.createElement("div");
    host.className = "live-host";
    el.appendChild(host);
    // the replay under the terminal is invisible now: pin its height and take
    // it out of rendering entirely (content-visibility skips style, layout and
    // paint for its 300+ cells), instead of keeping a hidden grid alive
    const under = replay.querySelector<HTMLElement>(".replay-screen");
    if (under) { under.style.height = `${under.offsetHeight}px`; under.style.contentVisibility = "hidden"; }
    replay.dataset.liveOn = "";                  // the box takes its live size first
    replay.appendChild(el);
    // on a phone the box is now most of the screen: put all of it in view
    // (after layout, instantly: a smooth scroll gets cancelled by the caption
    // re-rendering under it)
    const toView = () => {
      if (!matchMedia("(max-width: 720px)").matches) return;
      const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 52;
      window.scrollTo({ top: replay.getBoundingClientRect().top + scrollY - nav - 8, behavior: "instant" as ScrollBehavior });
    };
    requestAnimationFrame(toView);
    setState("connecting");
    const end = (msg: string) => { if (!disposed) { setState("ended"); setNote(msg); } };

    const family = `${TERM_FONT}, ${getComputedStyle(document.body).fontFamily}`;
    // incoming bytes: never written straight into the terminal. They queue and
    // go in ONCE per animation frame, so a burst of 20 messages is one parse
    // and one paint, like a real terminal's frame clock. A hidden tab gets no
    // frames, so nothing is parsed or drawn until it is looked at again (then
    // it all goes in at once, and only the final screen is painted).
    let queue: (string | Uint8Array)[] = [];
    let frame = 0;
    const pump = () => {
      frame = 0;
      if (!term || !queue.length) return;
      const q = queue; queue = [];
      if (q.every((x) => typeof x === "string")) term.write((q as string[]).join(""));
      else for (const d of q) term.write(d);
    };
    const push = (d: string | Uint8Array) => { queue.push(d); if (term && !frame) frame = requestAnimationFrame(pump); };
    const scripts = loadAll();
    let size = { fontSize: 12, cols: 80, rows: 24 };
    let timer = 0;

    (async () => {
      // the font first (preloaded on touch, so usually instant): the size is
      // measured from it, and agentty starts at exactly that size
      await loadFont();
      if (disposed) return;
      size = fit(el, family);
      // connect while xterm finishes loading; bytes wait in `pending`
      ws = new WebSocket(`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/live/ws?cols=${size.cols}&rows=${size.rows}`);
      ws.binaryType = "arraybuffer";
      timer = window.setTimeout(() => { if (ws?.readyState !== WebSocket.OPEN) { ws?.close(); end("the live demo isn't reachable right now"); } }, 8000);
      ws.onopen = () => window.clearTimeout(timer);
      ws.onmessage = (m) => {
        if (typeof m.data === "string" && m.data.startsWith("{\"t\":")) {
          try { const j = JSON.parse(m.data); if (j.t === "err" || j.t === "end") return end(j.m || "session ended"); } catch {}
        }
        push(typeof m.data === "string" ? m.data : new Uint8Array(m.data));
      };
      ws.onclose = () => end("session ended");
      ws.onerror = () => end("the live demo isn't reachable right now");

      try { await scripts; } catch { return end("couldn't load the terminal"); }
      if (disposed) return;
      const light = document.documentElement.getAttribute("data-theme") === "light";
      term = new window.Terminal!({
        cols: size.cols, rows: size.rows,
        fontFamily: family, fontSize: size.fontSize, lineHeight: LINE,
        allowProposedApi: true,
        // agentty draws its own UI and redraws the whole conversation; a deep
        // scrollback is memory and reflow work for nothing
        scrollback: 200,
        // the cursor doesn't blink: a blink is a repaint twice a second forever
        cursorBlink: false, cursorStyle: "bar", cursorInactiveStyle: "none",
        smoothScrollDuration: 0, fastScrollModifier: "none",
        drawBoldTextInBrightColors: false, minimumContrastRatio: 1,
        // box drawing and block elements drawn by the renderer as geometry,
        // pixel-snapped: lines meet exactly at any size, no font involved
        customGlyphs: true,
        theme: light ? FLEXOKI.light : FLEXOKI.dark,
      });
      fitter = new window.FitAddon!.FitAddon();
      term.loadAddon(fitter);
      term.open(host);
      // draw with the GPU: one texture atlas of glyphs, every frame a single
      // draw call; only rows that changed are rebuilt. DOM rows if unavailable.
      const gpu = gpuRenderer(term);
      // xterm has now measured the real cell; if that disagrees with the
      // estimate, take its numbers before a single byte is drawn
      const real = fitter.proposeDimensions?.();
      if (real && (real.cols < term.cols || real.rows < term.rows)) {
        term.resize(Math.min(real.cols, term.cols), Math.min(real.rows, term.rows));
        if (ws?.readyState === WebSocket.OPEN) ws.send("\x00json:" + JSON.stringify({ t: "resize", cols: term.cols, rows: term.rows }));
        else ws?.addEventListener("open", () => ws?.send("\x00json:" + JSON.stringify({ t: "resize", cols: term.cols, rows: term.rows })), { once: true });
      }
      if (queue.length) frame = requestAnimationFrame(pump);
      (window as any).__agenttyLive = term;          // for poking at it from devtools
      el.dataset.renderer = gpu ? "webgl" : "dom";
      setState("live");
      requestAnimationFrame(toView);
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
      ro.observe(host);
      term.onData((d: string) => { if (ws?.readyState === WebSocket.OPEN) ws.send(d); });
      // tapping the terminal on a phone brings up the keyboard
      el.addEventListener("click", () => term.focus());
    })();

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      ro?.disconnect();
      try { ws?.close(); } catch {}
      try { term?.dispose(); } catch {}
      el.remove();
      if (under) { under.style.height = ""; under.style.contentVisibility = ""; }
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
        onPointerDown={() => { hint("preload"); void loadAll().catch(() => {}); void loadFont(); }}
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
