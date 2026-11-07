// record-demo.mjs — drive the REAL agentty binary through a genuine coding task
// against a scripted OpenAI-compatible mock model (posing as local Ollama on
// :11434), and capture the PTY byte stream with timing. The home page's
// ReplayTerminal plays the result back in xterm.js.
//
//   node scripts/record-demo.mjs [out.json]      (needs bwrap + python3)
//   AGENTTY_BIN=/path/to/agentty overrides the binary.
//
// Output: { cols, rows, frames: [[delay_ms, utf8_text], ...] }
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { spawn: ptySpawn } = createRequire(path.join(ROOT, "deploy/live/package.json"))("node-pty");

const OUT = process.argv[2] || path.join(ROOT, "public/demo/session.json");
const AGENTTY_BIN = process.env.AGENTTY_BIN || path.join(os.homedir(), ".local/bin/agentty");
const MODEL = "qwen3-coder:30b";
const COLS = 96, ROWS = 32;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── a tiny, real Python project for agentty to work on ──────────────────────────
const SCRATCH = fs.mkdtempSync(path.join(os.tmpdir(), "agentty-demo-"));
const HOME = path.join(SCRATCH, "home");
const work = path.join(HOME, "app");
fs.mkdirSync(work, { recursive: true });
const W = (p, s) => { fs.mkdirSync(path.dirname(path.join(work, p)), { recursive: true }); fs.writeFileSync(path.join(work, p), s); };
W("auth/__init__.py", "");
W("auth/token_cache.py", `"""In-memory token cache. O(1) lookups; entries never expire."""


class TokenCache:
    def __init__(self):
        self._tokens = {}

    def lookup(self, user_id):
        return self._tokens.get(user_id)

    def store(self, user_id, token):
        self._tokens[user_id] = token
`);
W("auth/handler.py", `from net.remote import fetch_remote


def resolve(user_id):
    """Return the auth token for user_id."""
    return fetch_remote(user_id)
`);
W("net/__init__.py", "");
W("net/remote.py", `CALLS = 0


def fetch_remote(user_id):
    """Pretend network round-trip."""
    global CALLS
    CALLS += 1
    return f"tok-{user_id}"
`);
W("tests/__init__.py", "");
W("tests/test_handler.py", `import unittest

from auth.handler import resolve
from net import remote


class ResolveTest(unittest.TestCase):
    def test_returns_token(self):
        self.assertEqual(resolve(7), "tok-7")

    def test_repeat_lookups_hit_network_once(self):
        before = remote.CALLS
        for _ in range(3):
            resolve(42)
        self.assertEqual(remote.CALLS - before, 1)
`);

// ── the scripted model ──────────────────────────────────────────────────────
// Each step: optional prose, then either a tool call or the final answer.
// Steps advance by the number of tool results already in the conversation.
const STEPS = [
  { say: "First, the failing test.",
    tool: ["shell", { command: "python3 -m unittest -q", display_description: "Run the tests" }] },
  { say: "Repeat lookups each make a network call. Let me find the cache.",
    tool: ["grep", { pattern: "TokenCache" }] },
  { tool: ["read", { path: "auth/handler.py" }] },
  { say: "`resolve` never consults the cache. I'll check it first and only fall back to `fetch_remote` on a miss.",
    tool: ["edit", { path: "auth/handler.py", display_description: "Resolve through TokenCache", edits: [
      { old_text: `from net.remote import fetch_remote\n`, new_text: `from auth.token_cache import TokenCache\nfrom net.remote import fetch_remote\n\n_cache = TokenCache()\n` },
      { old_text: `    return fetch_remote(user_id)\n`,
        new_text: `    token = _cache.lookup(user_id)\n    if token is None:\n        token = fetch_remote(user_id)\n        _cache.store(user_id, token)\n    return token\n` },
    ] }] },
  { tool: ["shell", { command: "python3 -m unittest -q", display_description: "Re-run the tests" }] },
  { final: "Fixed. `resolve()` now checks `TokenCache` first and only calls `fetch_remote` on a miss, storing the result.\n\n- **auth/handler.py** — module-level cache, cache-first lookup\n- Both tests pass: three lookups of the same user now make **one** network call." },
];

function chunk(delta, finish = null) {
  return { id: "c", object: "chat.completion.chunk", created: 0, model: MODEL,
           choices: [{ index: 0, delta, finish_reason: finish }] };
}
const send = (res, o) => res.write(`data: ${JSON.stringify(o)}\n\n`);

// stream text in small word-ish pieces at a natural pace
async function streamText(res, text, pace = 28) {
  const parts = text.match(/\S+\s*|\s+/g) || [];
  for (const p of parts) { send(res, chunk({ content: p })); await sleep(pace + Math.random() * 30); }
}

let callSeq = 0;
let warmup = false;   // true during the unrecorded first session (see below)
async function respond(res, messages) {
  if (warmup) {        // a one-line answer, no tools — just enough to save a thread
    send(res, chunk({ role: "assistant", content: "Ready when you are." }));
    send(res, chunk({}, "stop"));
    send(res, { ...chunk({}), choices: [], usage: { prompt_tokens: 3900, completion_tokens: 5 } });
    res.write("data: [DONE]\n\n");
    return res.end();
  }
  const toolResults = messages.filter((m) => m.role === "tool").length;
  const step = STEPS[Math.min(toolResults, STEPS.length - 1)];
  await sleep(450); // time-to-first-token
  send(res, chunk({ role: "assistant", content: "" }));
  if (step.say) await streamText(res, step.say + "\n");
  if (step.final) {
    await streamText(res, step.final, 22);
    send(res, chunk({}, "stop"));
  } else {
    const [name, args] = step.tool;
    const id = `call_${++callSeq}`;
    const json = JSON.stringify(args);
    send(res, chunk({ tool_calls: [{ index: 0, id, type: "function", function: { name, arguments: "" } }] }));
    // stream arguments so the card fills in live
    for (let i = 0; i < json.length; i += 12) {
      send(res, chunk({ tool_calls: [{ index: 0, function: { arguments: json.slice(i, i + 12) } }] }));
      await sleep(14);
    }
    send(res, chunk({}, "tool_calls"));
  }
  send(res, { ...chunk({}), choices: [], usage: { prompt_tokens: 4200 + toolResults * 900, completion_tokens: 180 } });
  res.write("data: [DONE]\n\n");
  res.end();
}

const srv = http.createServer((req, res) => {
  const url = req.url || "/";
  if (url.startsWith("/api/")) {           // not native Ollama → agentty uses /v1
    res.writeHead(404); return res.end();
  }
  if (req.method === "GET" && url.includes("models")) {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ object: "list", data: [{ id: MODEL, object: "model" }] }));
  }
  if (req.method === "POST" && url.startsWith("/v1/chat/completions")) {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      const b = JSON.parse(body);
      res.writeHead(200, { "content-type": "text/event-stream" });
      if (!b.tools || !b.tools.length) {          // side request: thread title
        send(res, chunk({ role: "assistant", content: warmup ? "Getting started" : "Cache-first token resolve" }));
        send(res, chunk({}, "stop"));
        res.write("data: [DONE]\n\n");
        return res.end();
      }
      await respond(res, b.messages);
    });
    return;
  }
  res.writeHead(200, { "content-type": "application/json" });
  res.end("{}");
});
await new Promise((r) => srv.listen(11434, "::", r)); // dual-stack: localhost → ::1 or 127.0.0.1

// ── run the real binary in a PTY and record ─────────────────────────────────
const env = { ...process.env, HOME: "/home/dev", USER: "dev", TERM: "xterm-256color", COLORTERM: "truecolor", AGENTTY_PROFILE: "write" };
for (const k of ["NO_COLOR", "PAGER", "GIT_TERMINAL_PROMPT", "CI"]) delete env[k];
// present the project at a neutral /home/dev/app so no host paths leak into the recording
const spawnAgentty = () => ptySpawn("bwrap", [
  "--dev-bind", "/", "/",
  "--tmpfs", "/home",
  "--bind", HOME, "/home/dev",
  "--ro-bind", AGENTTY_BIN, "/home/dev/.local/bin/agentty",
  "--chdir", "/home/dev/app",
  "/home/dev/.local/bin/agentty", "--provider", "ollama", "-m", MODEL,
], {
  name: "xterm-256color", cols: COLS, rows: ROWS, cwd: work, env,
});

// Warm-up (NOT recorded): agentty shows its "New here? Try one of these"
// starters card only on a genuine first run (no saved threads). One short
// exchange saves a thread, so the recorded session opens like a returning user's.
warmup = true;
const warm = spawnAgentty();
warm.onData(() => {});
await sleep(1800);
warm.write("hi\r");
await sleep(4000);
warm.kill();
await sleep(800);
warmup = false;

const frames = [];
let last = Date.now();
const pty = spawnAgentty();
pty.onData((d) => { const now = Date.now(); frames.push([now - last, d]); last = now; });

await sleep(1800);
const prompt = "test_handler is failing — resolve() should use the token cache";
for (const ch of prompt) { pty.write(ch); await sleep(38 + Math.random() * 45); }
await sleep(500);
pty.write("\r");
await sleep(Number(process.env.RUN_MS || 22000));

pty.kill();
srv.close();

// merge sub-8ms bursts and cap idle gaps: smaller file, tighter pacing
const compact = [];
for (const [d, s] of frames) {
  const dd = Math.min(d, 1200);
  if (compact.length && dd < 8) compact[compact.length - 1][1] += s;
  else compact.push([dd, s]);
}
const all = frames.map((f) => f[1]).join("");
const leaks = all.includes(os.homedir()) || all.includes(SCRATCH);
if (!leaks) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ cols: COLS, rows: ROWS, frames: compact }));
}
console.log(`frames=${compact.length} bytes=${Buffer.byteLength(all)} host-path-leak=${leaks}${leaks ? " (NOT written)" : ""}`);
console.log("handler.py after:\n" + fs.readFileSync(path.join(work, "auth/handler.py"), "utf8"));
fs.rmSync(SCRATCH, { recursive: true, force: true });
if (leaks) process.exit(1);
