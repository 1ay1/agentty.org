"use client";

import { useEffect, useRef, useState } from "react";

// "Try it live" on the home page: the replay box becomes the REAL agentty
// binary, in a PTY on this server, pointed at a mock model (deploy/live/
// server.mjs). Opt-in (a click), so nobody's page load starts a process.
// xterm.js is self-hosted (/vendor/xterm) and loads on that click; the
// terminal takes the replay's exact box and agentty's own Flexoki colours.
// If the backend is busy or down, it says so and the replay comes back.
declare global { interface Window { Terminal?: any; FitAddon?: any } }

const load = (src: string) =>
  new Promise<void>((ok, fail) => {
    if (document.querySelector(`script[src="${src}"]`)) return ok();
    const s = Object.assign(document.createElement("script"), { src, async: true, onload: () => ok(), onerror: () => fail(new Error(src)) });
    document.head.appendChild(s);
  });

const FLEXOKI = {
  dark: { background: "#100f0f", foreground: "#cecdc3", cursor: "#cecdc3", selectionBackground: "#403e3c",
    black: "#100f0f", red: "#d14d41", green: "#879a39", yellow: "#d0a215", blue: "#4385be", magenta: "#ce5d97", cyan: "#3aa99f", white: "#878580",
    brightBlack: "#575653", brightRed: "#af3029", brightGreen: "#66800b", brightYellow: "#ad8301", brightBlue: "#205ea6", brightMagenta: "#a02f6f", brightCyan: "#24837b", brightWhite: "#cecdc3" },
  light: { background: "#fffcf0", foreground: "#100f0f", cursor: "#100f0f", selectionBackground: "#cecdc3",
    black: "#100f0f", red: "#af3029", green: "#66800b", yellow: "#ad8301", blue: "#205ea6", magenta: "#a02f6f", cyan: "#24837b", white: "#6f6e69",
    brightBlack: "#b7b5ac", brightRed: "#d14d41", brightGreen: "#879a39", brightYellow: "#d0a215", brightBlue: "#4385be", brightMagenta: "#ce5d97", brightCyan: "#3aa99f", brightWhite: "#100f0f" },
};

export function LiveTakeover() {
  const [on, setOn] = useState(false);
  const [state, setState] = useState<"" | "connecting" | "live" | "ended">("");
  const [note, setNote] = useState("");
  const host = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const replay = document.querySelector<HTMLElement>(".home-demo .replay");
    if (!on || !replay) return;
    let disposed = false, term: any, fit: any, ws: WebSocket | null = null, ro: ResizeObserver | null = null;
    const el = document.createElement("div");
    el.className = "live-inline";
    replay.appendChild(el);
    replay.dataset.liveOn = "";
    host.current = el;
    setState("connecting");

    const end = (msg: string) => {
      if (disposed) return;
      setState("ended");
      setNote(msg);
    };

    (async () => {
      try {
        if (!document.querySelector('link[href="/vendor/xterm/xterm.css"]'))
          document.head.appendChild(Object.assign(document.createElement("link"), { rel: "stylesheet", href: "/vendor/xterm/xterm.css" }));
        await load("/vendor/xterm/xterm.js");
        await load("/vendor/xterm/addon-fit.js");
      } catch { return end("couldn't load the terminal"); }
      if (disposed) return;
      const light = document.documentElement.getAttribute("data-theme") === "light";
      const size = parseFloat(getComputedStyle(replay.querySelector(".replay-grid") ?? replay).fontSize) || 13;
      term = new window.Terminal!({
        fontFamily: getComputedStyle(document.body).fontFamily, fontSize: Math.max(11, Math.min(15, size)), lineHeight: 1.15,
        cursorBlink: true, allowProposedApi: true, scrollback: 2000, theme: light ? FLEXOKI.light : FLEXOKI.dark,
      });
      fit = new window.FitAddon!.FitAddon();
      term.loadAddon(fit);
      term.open(el);
      fit.fit();
      term.focus();

      ws = new WebSocket(`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/live/ws`);
      ws.binaryType = "arraybuffer";
      const resize = () => {
        try { fit.fit(); } catch {}
        if (ws?.readyState === WebSocket.OPEN) ws.send("\x00json:" + JSON.stringify({ t: "resize", cols: term.cols, rows: term.rows }));
      };
      const timer = window.setTimeout(() => { if (ws?.readyState !== WebSocket.OPEN) { ws?.close(); end("the live demo isn't reachable right now"); } }, 6000);
      ws.onopen = () => { window.clearTimeout(timer); setState("live"); resize(); };
      ws.onmessage = (m) => {
        if (typeof m.data === "string" && m.data.startsWith("{\"t\":")) {
          try { const j = JSON.parse(m.data); if (j.t === "err" || j.t === "end") return end(j.m || "session ended"); } catch {}
        }
        term.write(typeof m.data === "string" ? m.data : new Uint8Array(m.data));
      };
      ws.onclose = () => end("session ended");
      ws.onerror = () => end("the live demo isn't reachable right now");
      term.onData((d: string) => { if (ws?.readyState === WebSocket.OPEN) ws.send(d); });
      ro = new ResizeObserver(resize);
      ro.observe(el);
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      try { ws?.close(); } catch {}
      try { term?.dispose(); } catch {}
      el.remove();
      delete replay.dataset.liveOn;
      host.current = null;
    };
  }, [on]);

  const stop = () => { setOn(false); setState(""); setNote(""); };

  if (!on)
    return (
      <button type="button" className="live-try" onClick={() => setOn(true)}>
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
