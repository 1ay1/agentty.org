// record-demo.mjs — drive the REAL agentty binary through a genuine coding task
// against a scripted OpenAI-compatible mock model (posing as local Ollama on
// :11434), and capture the PTY byte stream with timing (demo/session.json),
// then pre-render it to lib/demo-screen.json (scripts/build-demo-screen.mjs),
// which the home page's ReplayTerminal plays.
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

const OUT = process.argv[2] || path.join(ROOT, "demo/session.json");
// The binary: AGENTTY_BIN, else the LATEST GitHub release (so the demo always
// shows the current UI), downloaded once into the temp dir.
async function latestRelease() {
  const api = await fetch("https://api.github.com/repos/agentty-org/agentty/releases/latest");
  if (!api.ok) throw new Error(`GitHub API ${api.status}`);
  const rel = await api.json();
  const asset = rel.assets.find((a) => a.name === "agentty-linux-x86_64");
  if (!asset) throw new Error(`no linux-x86_64 asset in ${rel.tag_name}`);
  const dest = path.join(os.tmpdir(), `agentty-${rel.tag_name}`);
  if (!fs.existsSync(dest)) {
    const bin = await fetch(asset.browser_download_url);
    if (!bin.ok) throw new Error(`download ${bin.status}`);
    fs.writeFileSync(dest, Buffer.from(await bin.arrayBuffer()), { mode: 0o755 });
  }
  console.log(`using agentty ${rel.tag_name} from GitHub releases`);
  return dest;
}
const AGENTTY_BIN = process.env.AGENTTY_BIN || await latestRelease();
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
W(".gitignore", "__pycache__/\n");
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

// a real git repo, so git_diff / git_commit have history to work against
const { execFileSync: git0 } = await import("node:child_process");
const git = (...a) => git0("git", ["-C", work, ...a], { stdio: "ignore" });
git("init", "-q", "-b", "main");
git("config", "user.name", "dev");
git("config", "user.email", "dev@example.com");
git("add", "-A");
git("commit", "-q", "-m", "initial import");

// agentty's own settings (what the Appearance → Scheme picker writes): the
// demo renders in the Flexoki Dark theme.
const THEME = process.env.DEMO_THEME || "Flexoki Dark";
// the terminal's own default colours for that scheme: agentty asks for them
// (OSC 10/11) and the replay paints its background/foreground with them
const TERM_COLORS = { fg: "#cecdc3", bg: "#100f0f" };
fs.mkdirSync(path.join(HOME, ".agentty"), { recursive: true });
fs.writeFileSync(path.join(HOME, ".agentty/settings.json"), JSON.stringify({ ui: { theme: THEME } }, null, 2));

// ── the scripted model ──────────────────────────────────────────────────────────────────────
// One step per model turn (counted by assistant messages since the prompt):
// optional prose, then a batch of tool calls (several = a parallel batch,
// which agentty runs concurrently) or the final answer.
const TODOS = (done) => ({ display_description: "Plan", todos: [
  "Reproduce the failing test", "Find the token cache", "Make resolve() cache-first",
  "Add a regression test", "Review the change",
].map((content, i) => ({ content, status: i < done ? "completed" : i === done ? "in_progress" : "pending" })) });

const TEST_CACHE = `import unittest

from auth.token_cache import TokenCache


class TokenCacheTest(unittest.TestCase):
    def test_store_then_lookup(self):
        cache = TokenCache()
        cache.store(1, "tok-1")
        self.assertEqual(cache.lookup(1), "tok-1")

    def test_miss_returns_none(self):
        self.assertIsNone(TokenCache().lookup(99))
`;

const STEPS = [
  { say: "I'll plan this, then reproduce the failure.",
    tools: [["todo", TODOS(0)]] },
  { tools: [["test", { command: "python3 -m unittest" }]] },
  { say: "Three lookups, three network calls. Mapping the project:",
    tools: [
      ["list_dir", { recursive: true, display_description: "Project layout" }],
      ["grep", { pattern: "TokenCache" }],
      ["find_definition", { symbol: "resolve" }],
    ] },
  { tools: [
      ["read", { path: "auth/handler.py" }],
      ["outline", { path: "auth/token_cache.py" }],
    ] },
  { say: "`resolve` never consults the cache. I'll check it first and only fall back to `fetch_remote` on a miss.",
    tools: [["edit", { path: "auth/handler.py", display_description: "Resolve through TokenCache", edits: [
      { old_text: `from net.remote import fetch_remote\n`, new_text: `from auth.token_cache import TokenCache\nfrom net.remote import fetch_remote\n\n_cache = TokenCache()\n` },
      { old_text: `    return fetch_remote(user_id)\n`,
        new_text: `    token = _cache.lookup(user_id)\n    if token is None:\n        token = fetch_remote(user_id)\n        _cache.store(user_id, token)\n    return token\n` },
    ] }]] },
  { say: "And a regression test for the cache itself.",
    tools: [["write", { file_path: "tests/test_cache.py", content: TEST_CACHE, display_description: "Add TokenCache tests" }]] },
  { tools: [
      ["test", { command: "python3 -m unittest" }],
      ["git_diff", { display_description: "Review the change" }],
    ] },
  { say: "All green. Checking what changed, and noting the invariant for next time.",
    tools: [
      ["git_status", { display_description: "Working tree" }],
      ["todo", TODOS(5)],
      ["remember", { text: "auth: resolve() must stay cache-first via auth/token_cache.TokenCache", tags: ["auth"] }],
    ] },
  { final: "Fixed — ready to commit.\n\n- **auth/handler.py** — `resolve()` checks `TokenCache` first, calls `fetch_remote` only on a miss\n- **tests/test_cache.py** — new regression tests for the cache\n- 4/4 tests pass; three lookups of one user now make **one** network call" },
];

function chunk(delta, finish = null) {
  return { id: "c", object: "chat.completion.chunk", created: 0, model: MODEL,
           choices: [{ index: 0, delta, finish_reason: finish }] };
}
const send = (res, o) => res.write(`data: ${JSON.stringify(o)}\n\n`);

// stream text in small word-ish pieces at a natural pace
// No artificial pacing: the mock answers instantly, so every delay in the
// recording is agentty's own (rendering, its typewriter reveal, real tools).
async function streamText(res, text) {
  const parts = text.match(/\S+\s*|\s+/g) || [];
  for (const p of parts) send(res, chunk({ content: p }));
}

let callSeq = 0;
let finished;                                   // resolves once the final answer has streamed
const done = new Promise((r) => (finished = r));
async function respond(res, messages) {
  const lastUser = messages.map((m) => m.role).lastIndexOf("user");
  const turn = messages.slice(lastUser + 1).filter((m) => m.role === "assistant").length;
  const step = STEPS[Math.min(turn, STEPS.length - 1)];
  const toolResults = messages.filter((m) => m.role === "tool").length;
  send(res, chunk({ role: "assistant", content: "" }));
  if (step.say) await streamText(res, step.say + "\n");
  if (step.final) {
    await streamText(res, step.final);
    send(res, chunk({}, "stop"));
    setTimeout(finished, 1500);
  } else {
    // a batch of calls, each with its own index; arguments stream in so the
    // cards fill live
    for (const [k, [name, args]] of step.tools.entries()) {
      const id = `call_${++callSeq}`;
      const json = JSON.stringify(args);
      send(res, chunk({ tool_calls: [{ index: k, id, type: "function", function: { name, arguments: "" } }] }));
      for (let i = 0; i < json.length; i += 24) {
        send(res, chunk({ tool_calls: [{ index: k, function: { arguments: json.slice(i, i + 24) } }] }));
      }
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
        send(res, chunk({ role: "assistant", content: "Cache-first token resolve" }));
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
const frames = [];
const t0 = Date.now();
let last = t0;
const env = { ...process.env, HOME: "/home/dev", USER: "dev", TERM: "xterm-256color", COLORTERM: "truecolor", AGENTTY_PROFILE: "write",
  // keep the real typewriter reveal; drop its decorative hex overlay, which
  // reads as noise once frozen into replay frames
  AGENTTY_REVEAL_DECORATE: "0" };
for (const k of ["NO_COLOR", "PAGER", "GIT_TERMINAL_PROMPT", "CI"]) delete env[k];
// present the project at a neutral /home/dev/app so no host paths leak into the recording
const pty = ptySpawn("bwrap", [
  "--dev-bind", "/", "/",
  "--tmpfs", "/home",
  "--bind", HOME, "/home/dev",
  "--ro-bind", AGENTTY_BIN, "/home/dev/.local/bin/agentty",
  "--chdir", "/home/dev/app",
  "/home/dev/.local/bin/agentty", "--provider", "ollama", "-m", MODEL,
], {
  name: "xterm-256color", cols: COLS, rows: ROWS, cwd: work, env,
});
const osc = (hex) => `rgb:${hex.slice(1, 3).repeat(2)}/${hex.slice(3, 5).repeat(2)}/${hex.slice(5, 7).repeat(2)}`;
const answerQueries = (p, d) => {
  // like a real terminal configured with the scheme: report default fg/bg
  if (d.includes("\x1b]10;?")) p.write(`\x1b]10;${osc(TERM_COLORS.fg)}\x1b\\`);
  if (d.includes("\x1b]11;?")) p.write(`\x1b]11;${osc(TERM_COLORS.bg)}\x1b\\`);
};
pty.onData((d) => { answerQueries(pty, d); const now = Date.now(); frames.push([now - last, d]); last = now; });

await sleep(900);
// replay opens on the settled welcome screen and goes straight into typing:
// no dead air before the first keystroke
const startMs = Math.max(0, Date.now() - t0 - 1000 / 30);
const prompt = "test_handler is failing — make resolve() use the token cache and add a test";
// one keystroke per 30fps tick: agentty redraws on every key, so a steady
// cadence gives the replay an even frame rate while typing
for (const ch of prompt) { pty.write(ch); await sleep(1000 / 30); }
await sleep(400);
pty.write("\r");
await Promise.race([done, sleep(Number(process.env.RUN_MS || 60000))]);

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
  fs.writeFileSync(OUT, JSON.stringify({ cols: COLS, rows: ROWS, startMs, theme: { name: THEME, ...TERM_COLORS }, frames: compact }));
}
console.log(`frames=${compact.length} bytes=${Buffer.byteLength(all)} host-path-leak=${leaks}${leaks ? " (NOT written)" : ""}`);
console.log("handler.py after:\n" + fs.readFileSync(path.join(work, "auth/handler.py"), "utf8"));
fs.rmSync(SCRATCH, { recursive: true, force: true });
if (leaks) process.exit(1);

// pre-render the bytes into the row diffs the site actually ships
const { execFileSync } = await import("node:child_process");
execFileSync(process.execPath, [path.join(ROOT, "scripts/build-demo-screen.mjs"), OUT], { stdio: "inherit" });
