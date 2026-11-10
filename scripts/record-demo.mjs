// record-demo.mjs — drive the REAL agentty binary through a genuine coding task
// against a scripted OpenAI-compatible mock model (posing as local Ollama on
// :11434), and capture the PTY byte stream with timing (demo/session.json),
// then pre-render it to lib/demo-screen.json (scripts/build-demo-screen.mjs),
// which the home page's ReplayTerminal plays.
//
//   node scripts/record-demo.mjs [out.json]      (needs bwrap + python3)
//   DEMO_THEME="Flexoki Light" node scripts/record-demo.mjs
//     records the same session in agentty's light theme → demo/session-light.json
//     and lib/demo-screen-light.json (the site shows whichever matches its theme)
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

const LIGHT = /light/i.test(process.env.DEMO_THEME || "");
// DEMO_CLIP=<id>: record one short clip from scripts/demo-clips.mjs instead
// of the home page session (the docs show these on hover)
const CLIP_ID = process.env.DEMO_CLIP || "";
const CLIP = CLIP_ID ? (await import("./demo-clips.mjs")).CLIPS[CLIP_ID] : null;
if (CLIP_ID && !CLIP) throw new Error(`no clip "${CLIP_ID}" in scripts/demo-clips.mjs`);
const sfx = LIGHT ? "-light" : "";
const OUT = process.argv[2] || path.join(ROOT, CLIP ? `demo/clips/${CLIP_ID}${sfx}.json` : `demo/session${sfx}.json`);
const SCREEN = process.argv[3] || path.join(ROOT, CLIP ? `public/clips/${CLIP_ID}${sfx}.json` : `lib/demo-screen${sfx}.json`);
// The binary: AGENTTY_BIN, else the LATEST GitHub release (so the demo always
// shows the current UI), downloaded once into the temp dir.
async function latestRelease() {
  // the releases/latest page redirects to /tag/vX.Y.Z — no API, no rate limit
  const r = await fetch("https://github.com/agentty-org/agentty/releases/latest", { redirect: "manual" });
  const tag = (r.headers.get("location") || "").split("/tag/")[1];
  if (!tag) throw new Error(`can't resolve the latest release (HTTP ${r.status})`);
  const dest = path.join(os.tmpdir(), `agentty-${tag}`);
  if (!fs.existsSync(dest)) {
    const bin = await fetch(`https://github.com/agentty-org/agentty/releases/download/${tag}/agentty-linux-x86_64`);
    if (!bin.ok) throw new Error(`download ${bin.status}`);
    fs.writeFileSync(dest, Buffer.from(await bin.arrayBuffer()), { mode: 0o755 });
  }
  console.log(`using agentty ${tag} from GitHub releases`);
  return dest;
}
const AGENTTY_BIN = process.env.AGENTTY_BIN || await latestRelease();
const MODEL = "qwen3-coder:30b";
const COLS = CLIP?.cols ?? 96, ROWS = CLIP?.rows ?? 32;
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
W("config.json", JSON.stringify({ service: "auth", cache: { backend: "memory", ttl_seconds: 300 }, remote: { url: "https://tokens.internal", timeout_ms: 800 } }, null, 2) + "\n");
W("README.md", `# auth\n\nResolves a user's auth token. Tokens come from the remote token service\n(\`net.remote.fetch_remote\`); \`auth.token_cache.TokenCache\` keeps them in memory.\n\n    python3 -m unittest\n`);
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
// a short, believable history for git_log, landed before the working state
const history = [
  ["net: fetch_remote stub with a call counter", ["net"]],
  ["auth: TokenCache, an in-memory token store", ["auth/token_cache.py", "auth/__init__.py"]],
  ["auth: resolve() returns the user's token", ["auth/handler.py"]],
];
for (const [msg, paths] of history) { git("add", ...paths); git("commit", "-q", "-m", msg); }
git("add", "-A");
git("commit", "-q", "-m", "tests: resolve() hits the network once per user");

// agentty's own settings (what the Appearance → Scheme picker writes): the
// demo renders in the Flexoki Dark theme; everything else is agentty's default.
const THEME = process.env.DEMO_THEME || "Flexoki Dark";
// the terminal's own default colours for that scheme: agentty asks for them
// (OSC 10/11) and the replay paints its background/foreground with them
const TERM_COLORS = /light/i.test(THEME) ? { fg: "#100f0f", bg: "#fffcf0" } : { fg: "#cecdc3", bg: "#100f0f" };
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
        self.assertEqual(len(cache), 1)

    def test_miss_returns_none(self):
        self.assertIsNone(TokenCache().lookup(99))
`;

const PY_CHECK = "python3 -c \"from auth.handler import resolve; from net import remote; [resolve(7) for _ in range(3)]; print('network calls:', remote.CALLS)\"";
const SUBAGENT_PROMPT = "Find every call to fetch_remote in this repo and report it as file:line.";

const STEPS = [
  { say: "I'll plan this, map the repo, then reproduce the failure.",
    tools: [["todo", TODOS(0)], ["repo_map", { focus: "resolve token cache", display_description: "Map the repo" }]] },
  { tools: [
      ["test", { command: "python3 -m unittest" }],
      ["git_log", { count: 4, oneline: true, display_description: "Recent history" }],
    ] },
  { say: "Three lookups, three network calls. Where does caching live?",
    tools: [["search_code", { query: "where are auth tokens cached", k: 2 }], ["grep", { pattern: "class TokenCache" }]] },
  { tools: [["glob", { pattern: "auth/*.py" }], ["find_definition", { symbol: "resolve" }]] },
  { tools: [["read", { path: "auth/handler.py" }], ["outline", { path: "auth/token_cache.py" }]] },
  { tools: [
      ["read_filter", { path: "net/remote.py", pattern: "CALLS", context: 0 }],
      ["json_query", { path: "config.json", query: ".cache" }],
    ] },
  { say: "Before changing `resolve`, a subagent checks who else calls `fetch_remote`.",
    tools: [["task", { agent_type: "explorer", prompt: SUBAGENT_PROMPT, display_description: "Find fetch_remote callers" }]] },
  { say: "Only `resolve` does. Making it cache-first:",
    tools: [["edit", { path: "auth/handler.py", display_description: "Resolve through TokenCache", edits: [
      { old_text: `from net.remote import fetch_remote\n`, new_text: `from auth.token_cache import TokenCache\nfrom net.remote import fetch_remote\n\n_cache = TokenCache()\n` },
      { old_text: `    return fetch_remote(user_id)\n`,
        new_text: `    token = _cache.lookup(user_id)\n    if token is None:\n        token = fetch_remote(user_id)\n        _cache.store(user_id, token)\n    return token\n` },
    ] }]] },
  { say: "The cache gets a size, then a regression test.",
    tools: [["apply_patch", { path: "auth/token_cache.py", display_description: "TokenCache.__len__", patch:
      "@@ -11,2 +11,5 @@\n     def store(self, user_id, token):\n         self._tokens[user_id] = token\n+\n+    def __len__(self):\n+        return len(self._tokens)\n" }]] },
  { tools: [["write", { file_path: "tests/test_cache.py", content: TEST_CACHE, display_description: "Add TokenCache tests" }]] },
  { tools: [
      ["test", { command: "python3 -m unittest" }],
      ["diagnostics", { command: "python3 -m py_compile auth/handler.py auth/token_cache.py", display_description: "Compile check" }],
    ] },
  { tools: [["shell", { command: PY_CHECK, display_description: "Count network calls" }]] },
  { say: "All green, and one network call for three lookups. Reviewing:",
    tools: [["git_diff", { path: "auth/handler.py", display_description: "Review the change" }]] },
  { tools: [["git_status", { display_description: "Working tree" }], ["todo", TODOS(5)]] },
  { tools: [["remember", { text: "auth: resolve() must stay cache-first via auth/token_cache.TokenCache", tags: ["auth"] }]] },
  { final: "Fixed, ready to commit.\n\n- **auth/handler.py** — `resolve()` checks `TokenCache` first, calls `fetch_remote` only on a miss\n- **auth/token_cache.py** — `len(cache)`\n- **tests/test_cache.py** — regression tests for the cache\n- 4/4 tests pass; three lookups of one user now make **one** network call" },
];

// the explorer subagent's own conversation (its first user message is the task prompt)
const SUB_STEPS = [
  { tools: [
      ["search_structural", { pattern: "fetch_remote($$$)" }],
      ["aggregate", { pattern: "fetch_remote", by: "file" }],
    ] },
  { final: "One call site: `auth/handler.py:6` in `resolve()`. `net/remote.py` only defines it; the tests reach it through `resolve`." },
];

function chunk(delta, finish = null) {
  return { id: "c", object: "chat.completion.chunk", created: 0, model: MODEL,
           choices: [{ index: 0, delta, finish_reason: finish }] };
}
const send = (res, o) => res.write(`data: ${JSON.stringify(o)}\n\n`);

// stream text in small word-ish pieces at a natural pace
// The mock model behaves like a real fast model: a short think before the
// first token, then a steady stream (~80 tok/s, ~4 chars per token). That is
// the only pacing; agentty itself and every tool run at real speed.
const MODEL_TTFT_MS = Number(process.env.DEMO_TTFT_MS ?? 700);
const MODEL_CHARS_PER_S = Number(process.env.DEMO_CHARS_PER_S ?? 320);
const charDelay = (n) => sleep((n * 1000) / MODEL_CHARS_PER_S);
async function streamText(res, text) {
  const parts = text.match(/\S+\s*|\s+/g) || [];
  for (const p of parts) { send(res, chunk({ content: p })); await charDelay(p.length); }
}

let callSeq = 0;
let finished;                                   // resolves once the final answer has streamed
const done = new Promise((r) => (finished = r));
async function respond(res, messages) {
  const lastUser = messages.map((m) => m.role).lastIndexOf("user");
  const turn = messages.slice(lastUser + 1).filter((m) => m.role === "assistant").length;
  const text = (c) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => p.text || "").join("") : "");
  const sub = messages.some((m) => m.role === "user" && text(m.content).includes(SUBAGENT_PROMPT));
  const script = sub ? SUB_STEPS : CLIP?.steps ?? STEPS;
  const step = script[Math.min(turn, script.length - 1)];
  const toolResults = messages.filter((m) => m.role === "tool").length;
  await sleep(MODEL_TTFT_MS);
  send(res, chunk({ role: "assistant", content: "" }));
  if (step.say) await streamText(res, step.say + "\n");
  if (step.final) {
    await streamText(res, step.final);
    send(res, chunk({}, "stop"));
    if (step === (CLIP?.steps ?? STEPS).at(-1)) setTimeout(finished, CLIP ? 300 : 2500);
  } else {
    // a batch of calls, each with its own index; arguments stream in so the
    // cards fill live
    for (const [k, [name, args]] of step.tools.entries()) {
      const id = `call_${++callSeq}`;
      const json = JSON.stringify(args);
      send(res, chunk({ tool_calls: [{ index: k, id, type: "function", function: { name, arguments: "" } }] }));
      for (let i = 0; i < json.length; i += 24) {
        send(res, chunk({ tool_calls: [{ index: k, function: { arguments: json.slice(i, i + 24) } }] }));
        await charDelay(24);
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
    return res.end(JSON.stringify({ object: "list", data: (CLIP?.models ?? [MODEL]).map((id) => ({ id, object: "model" })) }));
  }
  if (req.method === "POST" && url.startsWith("/v1/chat/completions")) {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      const b = JSON.parse(body);
      // DEMO_DUMP_TOOLS=file: write the tool schemas agentty offers the model
      if (process.env.DEMO_DUMP_TOOLS && b.tools?.length) fs.writeFileSync(process.env.DEMO_DUMP_TOOLS, JSON.stringify(b.tools, null, 1));
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
};
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
if (CLIP) {
  // a clip: its own key script. { type } types at a steady cadence (one key per
  // 30fps tick), { key } sends raw bytes, { wait } pauses, { done } waits for
  // the scripted model to finish its answer
  for (const a of CLIP.keys) {
    if (a.wait) await sleep(a.wait);
    if (a.type) for (const ch of a.type) { pty.write(ch); await sleep(1000 / (a.cps ?? 30)); }
    if (a.key) pty.write(a.key);
    if (a.done) await Promise.race([done, sleep(30000)]);
  }
} else {
  const prompt = "test_handler is failing — make resolve() use the token cache and add a test";
  // one keystroke per 30fps tick: agentty redraws on every key, so a steady
  // cadence gives the replay an even frame rate while typing
  for (const ch of prompt) { pty.write(ch); await sleep(1000 / 30); }
  await sleep(1000 / 30);
  pty.write("\r");
  await Promise.race([done, sleep(Number(process.env.RUN_MS || 60000))]);
}

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
if (!CLIP) console.log("handler.py after:\n" + fs.readFileSync(path.join(work, "auth/handler.py"), "utf8"));
fs.rmSync(SCRATCH, { recursive: true, force: true });
if (leaks) process.exit(1);

// pre-render the bytes into the row diffs the site actually ships
const { execFileSync } = await import("node:child_process");
execFileSync(process.execPath, [path.join(ROOT, "scripts/build-demo-screen.mjs"), OUT, SCREEN], { stdio: "inherit" });
