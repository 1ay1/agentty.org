"use client";

import { useEffect, useState } from "react";
import { CanvasGrid } from "@/lib/replay-canvas";

// "Try it live" on the home page: the replay box becomes the REAL agentty
// binary, in a PTY on this server, pointed at a mock model (deploy/live/
// server.mjs). Opt-in (a tap), so nobody's page load starts a process.
//
// The terminal runs on the SERVER (deploy/live/screen.mjs, xterm-headless),
// like mosh: the browser receives only the rows that changed, as styled text,
// and places them, exactly the way the recorded demo is played. No terminal
// emulator is downloaded, no VT byte is parsed on the phone, and a frame
// where only agentty's spinner moved is one row of a few spans.
//   - rows are absolutely positioned spans in our one terminal font
//     (scripts/gen-term-font.py: every glyph agentty draws, one cell wide)
//   - changes land once per animation frame, newest row wins
//   - the cursor is one element moved with a transform (compositor only)
//   - keys go up as bytes; paste and wheel go up as intents the server
//     turns into the right bytes for the terminal's current modes

const V = "/vendor/xterm/";
const TERM_FONT = '"agentty term"';
const FONT_FILES = [V + "agentty-term-400.woff2", V + "agentty-term-700.woff2"];
const loadFont = () =>
  Promise.race([
    Promise.all(["400", "700"].map((w) => document.fonts?.load(`${w} 12px ${TERM_FONT}`, "─█⠋✦"))).catch(() => {}),
    new Promise((r) => setTimeout(r, 2500)),           // never hang the demo on a font
  ]);
const MIN_COLS = 64;          // agentty's welcome screen (wordmark, tips box) fits from 64 columns
const MAX_FONT = 13;

const hint = () => {
  for (const href of FONT_FILES) {
    if (document.querySelector(`link[href="${href}"]`)) continue;
    document.head.appendChild(Object.assign(document.createElement("link"), { rel: "preload", as: "font", href, crossOrigin: "anonymous" }));
  }
};

// Flexoki, agentty's palette, as the 16 ANSI colours; 16–255 is the standard cube
const ANSI = {
  dark: ["#100f0f", "#d14d41", "#879a39", "#d0a215", "#4385be", "#ce5d97", "#3aa99f", "#878580",
    "#575653", "#af3029", "#66800b", "#ad8301", "#205ea6", "#a02f6f", "#24837b", "#cecdc3"],
  light: ["#100f0f", "#af3029", "#66800b", "#ad8301", "#205ea6", "#a02f6f", "#24837b", "#6f6e69",
    "#b7b5ac", "#d14d41", "#879a39", "#d0a215", "#4385be", "#ce5d97", "#3aa99f", "#100f0f"],
};
const DEF = { dark: { fg: "#cecdc3", bg: "#100f0f" }, light: { fg: "#100f0f", bg: "#fffcf0" } };
const h2 = (n: number) => n.toString(16).padStart(2, "0");
function pal(i: number, t: "dark" | "light") {
  if (i < 16) return ANSI[t][i];
  if (i < 232) { const v = [0, 95, 135, 175, 215, 255], j = i - 16; return "#" + h2(v[(j / 36) | 0]) + h2(v[((j / 6) | 0) % 6]) + h2(v[j % 6]); }
  const g = 8 + (i - 232) * 10; return "#" + h2(g) + h2(g) + h2(g);
}

type Seg = [number, number, string, number];
type StyleDef = [number, string | number | null, string | number | null, number];

// keys → the bytes a terminal sends (xterm's defaults, normal cursor mode)
const KEYS: Record<string, string> = {
  Enter: "\r", Backspace: "\x7f", Tab: "\t", Escape: "\x1b", Delete: "\x1b[3~",
  ArrowUp: "\x1b[A", ArrowDown: "\x1b[B", ArrowRight: "\x1b[C", ArrowLeft: "\x1b[D",
  Home: "\x1b[H", End: "\x1b[F", PageUp: "\x1b[5~", PageDown: "\x1b[6~", Insert: "\x1b[2~",
};
function keyBytes(e: KeyboardEvent): string | null {
  if (e.isComposing) return null;
  if (e.key === "Tab" && e.shiftKey) return "\x1b[Z";
  if (KEYS[e.key]) {
    const b = KEYS[e.key];
    // modified arrows: CSI 1;mod X (Alt+←/→ cycles threads in agentty)
    const mod = 1 + (e.shiftKey ? 1 : 0) + (e.altKey ? 2 : 0) + (e.ctrlKey ? 4 : 0);
    if (mod > 1 && /^\x1b\[[ABCDHF]$/.test(b)) return `\x1b[1;${mod}${b.slice(-1)}`;
    return e.altKey ? "\x1b" + b : b;
  }
  if (e.ctrlKey && !e.metaKey && e.key.length === 1) {
    const k = e.key.toLowerCase();
    if (k >= "a" && k <= "z") return String.fromCharCode(k.charCodeAt(0) - 96);
    const map: Record<string, string> = { "[": "\x1b", "\\": "\x1c", "]": "\x1d", "^": "\x1e", _: "\x1f", "/": "\x1f", " ": "\x00", "@": "\x00" };
    if (map[k]) return map[k];
  }
  if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.length === 1) return "\x1b" + e.key;
  return null;                                         // printable: arrives via `input`
}

export function LiveTakeover() {
  const [on, setOn] = useState(false);
  const [state, setState] = useState<"" | "connecting" | "live" | "ended">("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const replay = document.querySelector<HTMLElement>(".home-demo .replay");
    if (!on || !replay) return;
    let disposed = false, ws: WebSocket | null = null, timer = 0, frame = 0;
    const theme: "dark" | "light" = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";

    // ── the box: the SAME grid and renderer as the recorded demo ──────────
    // a .replay-screen (same padding, same container query) holding a
    // .replay-grid (cell width = box width / cols, rows two cells tall) that
    // CanvasGrid paints: one font, one geometry, one glyph drawer for both.
    const el = document.createElement("div");
    el.className = "replay-screen live-inline";
    const grid = document.createElement("div");
    grid.className = "replay-grid lv";
    const cursor = document.createElement("div");
    cursor.className = "lv-cursor";
    const input = document.createElement("textarea");
    input.className = "lv-input";
    input.setAttribute("aria-label", "Type to agentty");
    input.autocapitalize = "off"; input.autocomplete = "off"; input.spellcheck = false;
    input.setAttribute("autocorrect", "off");
    el.append(grid, input);
    // the replay underneath is invisible now: out of rendering entirely
    const under = replay.querySelector<HTMLElement>(".replay-screen:not(.live-inline)");
    const demoGrid = replay.querySelector<HTMLElement>(".replay-grid[data-live]") ?? replay.querySelector<HTMLElement>(".replay-grid");
    const demoCs = demoGrid ? getComputedStyle(demoGrid) : null;
    if (under) { under.style.height = `${under.offsetHeight}px`; under.style.contentVisibility = "hidden"; }
    replay.dataset.liveOn = "";
    replay.appendChild(el);
    const toView = () => {
      if (!matchMedia("(max-width: 720px)").matches) return;
      const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 52;
      window.scrollTo({ top: replay.getBoundingClientRect().top + scrollY - nav - 8, behavior: "instant" as ScrollBehavior });
    };
    requestAnimationFrame(toView);
    setState("connecting");
    const end = (msg: string) => { if (!disposed) { setState("ended"); setNote(msg); } };

    // the demo's own colours (its recording's terminal fg/bg)
    const FG = demoCs?.color || DEF[theme].fg, BG = demoCs?.backgroundColor && demoCs.backgroundColor !== "rgba(0, 0, 0, 0)" ? demoCs.backgroundColor : DEF[theme].bg;
    grid.style.color = FG; grid.style.background = BG;
    const color = (v: string | number | null) => (v === null ? null : typeof v === "number" ? pal(v, theme) : v);
    let canvas: CanvasGrid | null = null;
    const pendingStyles: StyleDef[] = [];
    const addStyle = (d: StyleDef) => {
      if (!canvas) { pendingStyles.push(d); return; }
      const [id, f, b, fl] = d;
      let fg = color(f), bg = color(b);
      if (fl & 32) { const t = fg; fg = bg ?? BG; bg = t ?? FG; }
      if (fl & 64) fg = bg ?? BG;
      if (fl & 16) fg = `color-mix(in srgb, ${fg ?? FG} 50%, transparent)`;
      canvas.define(id, fg, bg, fl & 15);
    };

    // ── rows: hand them to the canvas, which paints only what changed ─────
    let rowEls: HTMLDivElement[] = [];
    const sizeGrid = (w: number, h: number) => {
      grid.style.setProperty("--cols", String(w));
      grid.style.setProperty("--rows", String(h));
      rowEls.forEach((r) => r.remove());
      rowEls = Array.from({ length: h }, () => { const d = document.createElement("div"); grid.appendChild(d); return d; });
      grid.appendChild(cursor);
      if (!canvas) {
        canvas = new CanvasGrid(grid, w, h, (y) => y * rowH());
        canvas.live(FG, BG);
        pendingStyles.splice(0).forEach(addStyle);
      } else canvas.setRows(h);
    };
    const rowH = () => rowEls[0]?.getBoundingClientRect().height || 16;
    let pendingCursor: number[] | null = null;
    const apply = () => {
      frame = 0;
      if (pendingCursor) {
        const [x, y, vis] = pendingCursor;
        cursor.style.transform = `translate(calc(${x} * var(--cw)), calc(${y} * var(--rh)))`;
        cursor.hidden = !vis;
        pendingCursor = null;
      }
    };
    const onFrame = (f: { w?: number; h?: number; s?: StyleDef[]; r?: [number, Seg[]][]; c?: number[] }) => {
      if (f.w && f.h) sizeGrid(f.w, f.h);
      if (f.s) f.s.forEach(addStyle);
      if (f.r && canvas) for (const [y, segs] of f.r) canvas.set(y, segs);
      if (f.c) { pendingCursor = f.c; if (!frame) frame = requestAnimationFrame(apply); }
    };

    // ── size: cols from the box, like the demo's grid ─────────────────────
    const send = (d: string) => { if (ws?.readyState === WebSocket.OPEN) ws.send(d); };
    const ctl = (o: object) => send("\x00json:" + JSON.stringify(o));
    let cols = 80, rows = 24, cw = 7, rh = 14;
    const measure = () => {
      const cs = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      // a cell no wider than the demo's at MAX_FONT, and at least MIN_COLS of them
      const want = Math.min(MAX_FONT * 0.6, w / MIN_COLS);
      cols = Math.max(20, Math.floor(w / want));
      cw = w / cols; rh = cw * 2;                     // the demo's geometry: rows are two cells tall
      if (matchMedia("(max-width: 720px)").matches) {
        // a phone: a terminal-shaped box like the demo's, as tall as its rows,
        // not the whole screen with agentty's screen stuck at the top of it
        rows = 36;
        replay.style.height = `${Math.ceil(rows * rh + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + 2)}px`;
      } else rows = Math.max(8, Math.floor(h / rh));
    };

    (async () => {
      await loadFont();
      if (disposed) return;
      measure();
      const fps = matchMedia("(max-width: 720px)").matches ? 30 : 60;
      ws = new WebSocket(`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/live/ws?render=rows&cols=${cols}&rows=${rows}&fps=${fps}`);
      timer = window.setTimeout(() => { if (ws?.readyState !== WebSocket.OPEN) { ws?.close(); end("the live demo isn't reachable right now"); } }, 8000);
      ws.onopen = () => { window.clearTimeout(timer); setState("live"); requestAnimationFrame(toView); if (!matchMedia("(hover: none)").matches) input.focus({ preventScroll: true }); };
      ws.onmessage = (m) => {
        let j: any;
        try { j = JSON.parse(m.data); } catch { return; }
        if (j.t === "f") onFrame(j);
        else if (j.t === "err" || j.t === "end") end(j.m || "session ended");
      };
      ws.onclose = () => end("session ended");
      ws.onerror = () => end("the live demo isn't reachable right now");
    })();

    // ── input ─────────────────────────────────────────────────────────────
    const onKey = (e: KeyboardEvent) => {
      const b = keyBytes(e);
      if (b === null) return;
      e.preventDefault();
      send(b);
    };
    const onInput = () => {
      if ((input as any).isComposing) return;
      if (input.value) { send(input.value.replace(/\n/g, "\r")); input.value = ""; }
    };
    const onCompEnd = () => onInput();
    const onPaste = (e: ClipboardEvent) => {
      const t = e.clipboardData?.getData("text");
      if (!t) return;
      e.preventDefault();
      ctl({ t: "paste", d: t.replace(/\r?\n/g, "\r") });
    };
    let wheelAcc = 0;
    const cellOf = (cx: number, cy: number) => {
      const r = grid.getBoundingClientRect();
      return { x: Math.max(0, Math.floor((cx - r.left) / cw)), y: Math.max(0, Math.floor((cy - r.top) / rh)) };
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelAcc += e.deltaMode === 1 ? e.deltaY * rh : e.deltaY;
      const step = rh * 2;
      const { x, y } = cellOf(e.clientX, e.clientY);
      while (Math.abs(wheelAcc) >= step) { ctl({ t: "wheel", dy: Math.sign(wheelAcc), x, y }); wheelAcc -= Math.sign(wheelAcc) * step; }
    };
    // touch: a vertical swipe scrolls agentty; a tap brings up the keyboard
    let touchY = 0, moved = false;
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; moved = false; };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY, d = touchY - y, step = rh * 2;
      if (Math.abs(d) < step) return;
      moved = true; e.preventDefault();
      const c = cellOf(e.touches[0].clientX, y);
      ctl({ t: "wheel", dy: Math.sign(d), x: c.x, y: c.y });
      touchY = y;
    };
    const onTouchEnd = () => { if (!moved) input.focus({ preventScroll: true }); };
    input.addEventListener("keydown", onKey);
    input.addEventListener("input", onInput);
    input.addEventListener("compositionend", onCompEnd);
    input.addEventListener("paste", onPaste);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("mousedown", (e) => { e.preventDefault(); input.focus({ preventScroll: true }); });

    // the box changing size (rotation, desktop resize): new size to agentty
    let lastSize = "";
    const ro = new ResizeObserver(() => {
      if (!ws) return;
      measure();
      const k = `${cols}x${rows}`;
      if (k !== lastSize) { lastSize = k; ctl({ t: "resize", cols, rows }); }
    });
    ro.observe(el);
    (window as any).__agenttyLive = { grid, get cols() { return cols; }, get rows() { return rows; }, get cell() { return [cw, rh]; }, canvas: () => canvas };

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      ro.disconnect();
      try { ws?.close(); } catch {}
      canvas?.destroy();
      el.remove();
      if (under) { under.style.height = ""; under.style.contentVisibility = ""; }
      replay.style.height = "";
      delete replay.dataset.liveOn;
    };
  }, [on]);

  const stop = () => { setOn(false); setState(""); setNote(""); };

  if (!on)
    return (
      <button type="button" className="live-try" onPointerEnter={hint} onPointerDown={() => { hint(); void loadFont(); }} onFocus={hint} onClick={() => setOn(true)}>
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
