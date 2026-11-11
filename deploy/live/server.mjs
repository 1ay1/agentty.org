// server.mjs — the live agentty backend.
//
// 1. Boots a mock Ollama server on a random localhost port.
// 2. Exposes a WebSocket. On connect it spawns the REAL agentty binary in a
//    PTY, in a throwaway sandbox workdir, pointed at the mock model via
//    AGENTTY_OLLAMA_HOST. PTY output → browser; browser keystrokes → PTY.
//
// The browser renders the stream with xterm.js, so visitors drive the actual
// agentty TUI — real composer, real streaming, real tool timeline — against a
// free mock model. No cloud, no key, no repo access.

import { Screen } from "./screen.mjs";
import { WebSocketServer } from "ws";
import { spawn as ptySpawn } from "node-pty";
import { createMockOllama } from "./mock-ollama.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";

const PORT = Number(process.env.LIVE_PORT || 8790);
const AGENTTY_BIN = process.env.AGENTTY_BIN || "agentty";
const MAX_SESSIONS = Number(process.env.LIVE_MAX_SESSIONS || 12);
const MAX_PER_IP = Number(process.env.LIVE_MAX_PER_IP || 2);
const SESSION_MS = Number(process.env.LIVE_SESSION_MS || 10 * 60 * 1000); // 10 min
const IDLE_MS = Number(process.env.LIVE_IDLE_MS || 3 * 60 * 1000);        // 3 min

// ---- 1. mock Ollama on an ephemeral localhost port -----------------------
const mock = createMockOllama();
await new Promise((r) => mock.listen(0, "127.0.0.1", r));
const mockPort = mock.address().port;
const OLLAMA_HOST = `localhost:${mockPort}`;
console.log(`[live] mock ollama on ${OLLAMA_HOST}`);
// …and on a unix socket, which is the only thing the sandboxed sessions can
// reach (bridge.mjs forwards their loopback :11434 to it).
const SOCK_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "agentty-live-mock-"));
const MOCK_SOCK = path.join(SOCK_DIR, "mock.sock");
const mockUnix = createMockOllama();
await new Promise((r) => mockUnix.listen(MOCK_SOCK, r));
const BRIDGE = new URL("./bridge.mjs", import.meta.url).pathname;

// ---- 2. WebSocket + tiny health HTTP -------------------------------------
const httpServer = http.createServer((req, res) => {
  if (req.url === "/live/health" || req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ ok: true, sessions: sessions.size, mockPort }));
  }
  res.writeHead(426, { "content-type": "text/plain" });
  res.end("WebSocket only");
});

// Every session runs inside bubblewrap: the whole filesystem read-only, /home
// and /tmp replaced by empty tmpfs (so nothing of the host user's — keys,
// credentials, other sessions — is visible), its own pid/ipc/uts namespaces,
// and only its throwaway workdir writable. agentty can run commands (Ctrl+G
// runs a reply's code block; MCP servers and hooks are config), so the
// process is treated as hostile. LIVE_SANDBOX=0 turns this off for local dev.
const BWRAP = process.env.LIVE_SANDBOX === "0" ? null : ["/usr/bin/bwrap", "/bin/bwrap"].find((p) => fs.existsSync(p)) ?? null;
if (!BWRAP && process.env.LIVE_SANDBOX !== "0") {
  console.error("[live] bubblewrap not found; refusing to start without a sandbox (LIVE_SANDBOX=0 to override)");
  process.exit(1);
}
const BIN_REAL = fs.realpathSync(AGENTTY_BIN.includes("/") ? AGENTTY_BIN : path.join("/usr/bin", AGENTTY_BIN));
const NODE = process.execPath;
function sandboxed(work, args) {
  if (!BWRAP) return { file: BIN_REAL, args, ollama: OLLAMA_HOST, cwd: work, home: work };
  return { file: BWRAP, cwd: "/", home: "/home/demo", ollama: "127.0.0.1:11434", args: [
    "--ro-bind", "/", "/",
    "--tmpfs", "/home", "--tmpfs", "/tmp", "--tmpfs", "/root", "--tmpfs", "/opt",
    "--dev", "/dev", "--proc", "/proc",
    "--ro-bind", BIN_REAL, "/opt/agentty/agentty",
    "--ro-bind", BRIDGE, "/opt/agentty/bridge.mjs",
    "--ro-bind", MOCK_SOCK, "/opt/agentty/mock.sock",
    "--bind", work, "/home/demo",
    "--chdir", "/home/demo",
    "--setenv", "HOME", "/home/demo",
    "--unshare-net", "--unshare-pid", "--unshare-ipc", "--unshare-uts", "--unshare-cgroup-try",
    "--die-with-parent",
    "--", NODE, "/opt/agentty/bridge.mjs", "/opt/agentty/mock.sock", "/opt/agentty/agentty", ...args,
  ] };
}

const wss = new WebSocketServer({ server: httpServer, path: "/live/ws" });
const sessions = new Set();

// One sandboxed agentty, whoever asked for it (a browser over WebSocket, or
// someone over SSH). `io` is the transport: send(bytes) and close(reason).
// Returns the session ({ write, resize, end }) or a string saying why not.
export function startSession(ip, cols, rows, io) {
  const mine = [...sessions].filter((s) => s.ip === ip).length;
  if (sessions.size >= MAX_SESSIONS || mine >= MAX_PER_IP) return "Live demo is at capacity — try again in a minute.";

  // throwaway sandbox workdir so agentty's filesystem tools have somewhere
  // harmless to point at.
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "agentty-live-"));
  seedWorkspace(work);

  const run = sandboxed(work, ["--provider", "ollama", "-m", "agentty-demo:latest"]);
  // a clean environment: nothing of the service's own (keys, tokens, paths)
  const env = {
    PATH: "/usr/local/bin:/usr/bin:/bin",
    LANG: process.env.LANG || "C.UTF-8",
    HOME: run.home,                     // isolate creds/threads to the workdir
    AGENTTY_OLLAMA_HOST: run.ollama,    // point the real binary at the mock
    TERM: "xterm-256color",
    COLORTERM: "truecolor",
    AGENTTY_PROFILE: "ask",
  };

  let pty;
  try {
    pty = ptySpawn(run.file, run.args, {
      name: "xterm-256color",
      cols: Math.max(20, cols | 0 || 100),
      rows: Math.max(6, rows | 0 || 30),
      cwd: run.cwd,
      env,
    });
  } catch (e) {
    cleanupDir(work);
    return "Could not start agentty: " + e.message;
  }

  const sess = { pty, work, ip, lastActivity: Date.now() };
  sessions.add(sess);
  console.log(`[live] session up (${sessions.size} active, ${io.kind}) → ${work}`);

  // one message per ~frame, not one per write(): a streamed reply is many
  // tiny writes, and each message costs the browser a parse + a paint
  let out = "", flushT = null;
  const flush = () => { flushT = null; if (out) { io.send(out); out = ""; } };
  pty.onData((d) => {
    sess.lastActivity = Date.now();
    out += d;
    if (out.length > 64 * 1024) flush();
    else if (!flushT) flushT = setTimeout(flush, 12);
  });

  pty.onExit(() => end("agentty exited"));

  const hardTimer = setTimeout(() => end("session time limit reached"), SESSION_MS);
  const idleTimer = setInterval(() => {
    if (Date.now() - sess.lastActivity > IDLE_MS) end("idle timeout");
  }, 15000);

  function end(reason) {
    if (!sessions.has(sess)) return;
    sessions.delete(sess);
    clearTimeout(hardTimer);
    clearInterval(idleTimer);
    try { pty.kill(); } catch {}
    try { io.close(reason); } catch {}
    cleanupDir(work);
    console.log(`[live] session down (${sessions.size} active): ${reason}`);
  }

  return {
    write: (s) => { sess.lastActivity = Date.now(); pty.write(s); },
    resize: (c, r) => { try { pty.resize(Math.max(20, c | 0), Math.max(6, r | 0)); } catch {} },
    end,
  };
}

wss.on("connection", (ws, req) => {
  const ip = String(req.headers["x-real-ip"] || req.socket.remoteAddress || "");
  // the browser sends its terminal size up front (?cols=&rows=), so agentty
  // starts at that size and its first frame is final: no resize, no redraw
  const q = new URL(req.url || "/", "http://x").searchParams;
  const clamp = (v, lo, hi, d) => (Number.isFinite(+v) && +v > 0 ? Math.min(hi, Math.max(lo, +v | 0)) : d);
  const cols = clamp(q.get("cols"), 20, 300, 100), rows = clamp(q.get("rows"), 6, 120, 30);
  // render=rows: the terminal lives here (screen.mjs) and the browser gets
  // changed rows; otherwise raw bytes for a client-side emulator (/dev)
  const screen = q.get("render") === "rows"
    ? new Screen(cols, rows, (j) => { if (ws.readyState === ws.OPEN) ws.send(j); }, { fps: clamp(q.get("fps"), 10, 60, 30) })
    : null;
  const s = startSession(ip, cols, rows, {
    kind: "web",
    send: screen ? (d) => screen.write(d) : (d) => { if (ws.readyState === ws.OPEN) ws.send(d); },
    close: (reason) => {
      screen?.dispose();
      try { ws.send(JSON.stringify({ t: "end", m: reason })); } catch {}
      try { ws.close(); } catch {}
    },
  });
  if (typeof s === "string") {
    screen?.dispose();
    try { ws.send(JSON.stringify({ t: "err", m: s })); } catch {}
    ws.close();
    return;
  }
  ws.on("message", (raw) => {
    // control frames are JSON (resize, paste, wheel); everything else is keystrokes
    const str = raw.toString();
    if (str.startsWith("\x00json:")) {
      try {
        const msg = JSON.parse(str.slice(6));
        if (msg.t === "resize" && msg.cols && msg.rows) {
          const c = clamp(msg.cols, 20, 300, cols), r = clamp(msg.rows, 6, 120, rows);
          s.resize(c, r); screen?.resize(c, r);
        } else if (screen && msg.t === "paste" && typeof msg.d === "string") s.write(screen.paste(msg.d.slice(0, 20000)));
        else if (screen && msg.t === "wheel") s.write(screen.wheel(+msg.dy || 0, msg.x | 0, msg.y | 0));
      } catch {}
      return;
    }
    s.write(str);
  });
  ws.on("close", () => s.end("client disconnected"));
  ws.on("error", () => s.end("socket error"));
});

httpServer.listen(PORT, "127.0.0.1", () => {
  console.log(`[live] ws server on 127.0.0.1:${PORT} (path /live/ws)`);
});

// ---- 3. ssh agentty.org (optional) ---------------------------------------
if (process.env.LIVE_SSH_PORT) {
  const { startSsh } = await import("./ssh.mjs");
  startSsh({ port: Number(process.env.LIVE_SSH_PORT), startSession });
}

// ---- helpers -------------------------------------------------------------
function seedWorkspace(dir) {
  try {
    // agentty's own settings for the demo: its defaults (full motion), unless
    // LIVE_MOTION says otherwise (0 full, 1 reduced, 2 off). Output is
    // frame-batched and the replay pauses underneath, so full motion costs a
    // phone ~4 long tasks in 6 s (measured, 4x CPU throttle).
    const motion = Number(process.env.LIVE_MOTION ?? 0);
    fs.mkdirSync(path.join(dir, ".agentty"), { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(dir, ".agentty", "settings.json"), JSON.stringify({ ui: { motion } }) + "\n");
  } catch {}
  try {
    fs.writeFileSync(path.join(dir, "README.md"),
      "# demo workspace\n\nThis is a throwaway sandbox for the agentty live demo.\n" +
      "Nothing here is real — the model is a mock and the directory is deleted when you leave.\n");
    fs.writeFileSync(path.join(dir, "hello.py"),
      "def greet(name):\n    return f\"hello, {name}!\"\n\n\nprint(greet(\"agentty\"))\n");
  } catch {}
}

function cleanupDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

// graceful shutdown
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    for (const s of sessions) { try { s.pty.kill(); } catch {} cleanupDir(s.work); }
    cleanupDir(SOCK_DIR);
    process.exit(0);
  });
}
