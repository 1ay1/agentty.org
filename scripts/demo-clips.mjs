// Docs clips: short recordings of the real agentty, made by record-demo.mjs
// (DEMO_CLIP=<id>) and shown in the docs when you hover a key or a phrase
// that names the feature. `node scripts/record-clips.mjs` re-records them all
// against the current agentty and refuses any recording whose `expect` checks
// fail, so a UI change can't silently publish a wrong clip.
//
// A clip:
//   title     shown in the clip window's header
//   on        [{ keys, context? }] — the [[keys]] in the docs that show this
//             clip. With `context` (a string or several), only under a heading
//             containing it (Ctrl+R reviews diffs, renames under "Thread list")
//   keys      the key script: { wait: ms } · { type: "text", cps } · { key }
//             raw bytes · { done: true } wait for the scripted answer · { mark }
//             name this moment for `expect`
//   steps     scripted model turns for each message sent (see record-demo.mjs)
//   expect    [{ at: mark | "end", has: "text" | /re/ }]: must be on screen
//   kitty     answer the kitty keyboard query (Ctrl+Tab, Shift+Enter need it)
//   cols/rows terminal size (default 84×24), models: what the mock host lists

export const KEY = {
  enter: "\r", esc: "\x1b", tab: "\t", sTab: "\x1b[Z", bs: "\x7f",
  up: "\x1b[A", down: "\x1b[B", right: "\x1b[C", left: "\x1b[D",
  altEnter: "\x1b\r", altUp: "\x1b[1;3A", altDown: "\x1b[1;3B", altLeft: "\x1b[1;3D", altRight: "\x1b[1;3C",
  altBs: "\x1b\x7f", altD: "\x1bd", altK: "\x1bk",
  ctrl: (c) => String.fromCharCode(c.toUpperCase().charCodeAt(0) - 64),
  ctrlSlash: "\x1f", ctrlTab: "\x1b[9;5u", shiftEnter: "\x1b[13;2u",
};
const C = KEY.ctrl;
const SIZE = { cols: 84, rows: 24 };
const MODELS = ["qwen3-coder:30b", "devstral:24b", "gpt-oss:20b", "deepseek-r1:32b", "llama3.3:70b", "qwen2.5-coder:14b"];
const ANSWER = (text) => [{ final: text }];
const say = (text, cps = 40) => [{ type: text, cps }, { wait: 150 }, { key: KEY.enter }, { done: true }, { wait: 500 }];

const TODO = (done) => ({ todos: [
  "Read the migration guide", "Update the config loader", "Run the test suite",
].map((content, i) => ({ content, status: i < done ? "completed" : i === done ? "in_progress" : "pending" })) });

const EDIT_TWO = [
  { tools: [
    ["edit", { path: "auth/handler.py", edits: [
      { old_text: `    return fetch_remote(user_id)\n`, new_text: `    if user_id is None:\n        raise ValueError("user_id is required")\n    return fetch_remote(user_id)\n` },
    ] }],
    ["edit", { path: "net/remote.py", edits: [
      { old_text: `def fetch_remote(user_id):\n`, new_text: `def fetch_remote(user_id: int) -> str:\n` },
    ] }],
  ] },
  { final: "Added the check and typed fetch_remote." },
];

export const CLIPS = {
  // ── global ──────────────────────────────────────────────────────────────
  "command-palette": {
    title: "Command palette", on: [{ keys: ["Ctrl+K"] }], ...SIZE,
    keys: [{ wait: 500 }, { key: C("k") }, { wait: 1100 }, { type: "thre", cps: 8 }, { wait: 900, mark: "filtered" },
      { key: KEY.down }, { wait: 500 }, { key: KEY.down }, { wait: 1200 }, { key: KEY.esc }, { wait: 500 }],
    expect: [{ at: "filtered", has: "Command Palette" }, { at: "filtered", has: "Open threads" }],
  },
  "model-picker": {
    title: "Model picker", on: [{ keys: ["Ctrl+/"] }, { keys: ["Ctrl+F", "Enter", "↑", "↓", "Esc"], context: "model picker" }], ...SIZE, models: MODELS,
    keys: [{ wait: 500 }, { key: KEY.ctrlSlash }, { wait: 1200 }, { key: KEY.down }, { wait: 450 }, { key: KEY.down }, { wait: 450 },
      { type: "dev", cps: 7 }, { wait: 1300, mark: "search" }, { key: KEY.enter }, { wait: 1400 }],
    expect: [{ at: "search", has: "Devstral" }, { at: "end", has: "Devstral 24b" }],
  },
  "model-swap": {
    title: "Swap to the previous model", on: [{ keys: ["Ctrl+Tab"] }], ...SIZE, models: MODELS, kitty: true,
    keys: [{ wait: 400 }, { key: KEY.ctrlSlash }, { wait: 700 }, { type: "deepseek", cps: 10 }, { wait: 900 }, { key: KEY.enter },
      { wait: 1500, mark: "picked" }, { key: KEY.ctrlTab }, { wait: 1500, mark: "swapped" }, { key: KEY.ctrlTab }, { wait: 1500 }],
    expect: [{ at: "picked", has: /Deepseek R1/i }, { at: "swapped", has: /Qwen3 Coder 30b\s+▌/ }],
  },
  "provider-picker": {
    title: "Provider picker", on: [{ keys: ["Ctrl+P"] }, { keys: ["Ctrl+D", "Enter", "↑", "↓", "Esc", "c", "u", "o"], context: ["provider picker", "Pick a provider", "Adding one from the TUI"] }], ...SIZE,
    keys: [{ wait: 500 }, { key: C("p") }, { wait: 1400 }, { key: KEY.down }, { wait: 500 }, { key: KEY.down }, { wait: 500 },
      { key: KEY.down }, { wait: 1500, mark: "open" }, { key: KEY.esc }, { wait: 500 }],
    expect: [{ at: "open", has: "Providers" }],
  },
  profiles: {
    title: "Permission profiles", on: [{ keys: ["S-Tab", "Shift+Tab"] }], ...SIZE,
    keys: [{ wait: 700 }, { key: KEY.sTab }, { wait: 1300, mark: "ask" }, { key: KEY.sTab }, { wait: 1300, mark: "minimal" }, { key: KEY.sTab }, { wait: 1300 }],
    expect: [{ at: "ask", has: /A\s?S\s?K/ }, { at: "minimal", has: /M\s?I\s?N\s?I\s?M\s?A\s?L/ }, { at: "end", has: /W\s?R\s?I\s?T\s?E/ }],
  },
  "permission-prompt": {
    title: "Asking before it acts", on: [], ...SIZE,
    steps: [
      { say: "Running the tests.", tools: [["shell", { command: "python3 -m unittest -q", display_description: "Run the tests" }]] },
      { final: "One failing test: repeat lookups hit the network each time." },
    ],
    keys: [{ wait: 400 }, { key: KEY.sTab }, { wait: 700 }, { type: "run the tests", cps: 40 }, { key: KEY.enter }, { wait: 2600, mark: "asked" },
      { type: "y", cps: 2 }, { done: true }, { wait: 1200 }],
    expect: [{ at: "asked", has: /[Aa]llow|[Aa]pprove|[Pp]ermission/ }, { at: "end", has: "failing test" }],
  },
  "todo-plan": {
    title: "Plan view", on: [{ keys: ["Ctrl+T"] }], ...SIZE,
    steps: [{ say: "Planning it out.", tools: [["todo", TODO(1)]] }, { final: "Plan's ready; I'm on step 2." }],
    keys: [{ wait: 400 }, ...say("migrate the config loader to v2"), { key: C("t") }, { wait: 2600, mark: "plan" }, { key: KEY.esc }, { wait: 500 }],
    expect: [{ at: "plan", has: "Update the config loader" }],
  },
  "diff-review": {
    title: "Review changes", on: [{ keys: ["Ctrl+R"] },
      { keys: ["j", "k", "h", "l", "y", "n", "Enter", "Tab", "↑", "↓", "Ctrl+A", "Ctrl+X", "Esc", "q", "PgDn", "PgUp", "Ctrl+D", "Ctrl+U"], context: "Review pane" }],
    ...SIZE, steps: EDIT_TWO,
    keys: [{ wait: 400 }, ...say("type resolve and reject a missing user id"), { key: C("r") }, { wait: 2000, mark: "review" },
      { type: "y", cps: 2 }, { wait: 1300, mark: "kept" }, { type: "n", cps: 2 }, { wait: 1500, mark: "undone" }, { key: KEY.esc }, { wait: 700 }],
    expect: [{ at: "review", has: "Review changes" }, { at: "kept", has: /1 kept/ }, { at: "undone", has: /1 undone/ }],
  },
  "inspect-outputs": {
    title: "Inspect tool outputs", on: [{ keys: ["Ctrl+O"] }], ...SIZE,
    steps: [{ tools: [["grep", { pattern: "def " }]] }, { final: "Four functions across three files." }],
    keys: [{ wait: 400 }, ...say("list the functions"), { key: C("o") }, { wait: 1800, mark: "open" }, { key: KEY.down }, { wait: 900 }, { key: KEY.esc }, { wait: 500 }],
    expect: [{ at: "open", has: "def " }],
  },
  "smart-mode": {
    title: "Smart Mode", on: [{ keys: ["Ctrl+S"] }, { keys: ["↑", "↓", "Enter", "x", "Esc"], context: ["The overlay", "Assigning models"] }], ...SIZE,
    keys: [{ wait: 500 }, { key: C("s") }, { wait: 1800, mark: "open" }, { key: KEY.down }, { wait: 700 }, { key: KEY.down }, { wait: 1200 }, { key: KEY.esc }, { wait: 500 }],
    expect: [{ at: "open", has: /Smart/ }],
  },
  "run-code": {
    title: "Run a code block", on: [{ keys: ["Ctrl+G"] }, { keys: ["Enter", "a", "y", "Esc", "Ctrl+C"], context: "Run code blocks" }], ...SIZE,
    steps: [{ final: "Run the tests with:\n\n```sh\npython3 -m unittest -v\n```\n\nand the cache stats with:\n\n```sh\ngit log --oneline -3\n```" }],
    keys: [{ wait: 400 }, ...say("how do I run the tests?"), { key: C("g") }, { wait: 1600, mark: "list" }, { key: KEY.enter }, { wait: 2600, mark: "ran" }, { key: KEY.enter }, { wait: 1200 }],
    expect: [{ at: "list", has: "python3 -m unittest -v" }],
  },

  // ── threads ─────────────────────────────────────────────────────────────
  "new-thread": {
    title: "New thread", on: [{ keys: ["Ctrl+N"] }], ...SIZE,
    steps: ANSWER("`resolve()` returns the user's token from `fetch_remote`."),
    keys: [{ wait: 300 }, ...say("what does resolve do?"), { wait: 600, mark: "before" }, { key: C("n") }, { wait: 1600 }],
    expect: [{ at: "before", has: "fetch_remote" }, { at: "end", has: "calm middleware" }],
  },
  "thread-list": {
    title: "Thread list", on: [{ keys: ["Ctrl+J"] },
      { keys: ["↑", "↓", "Enter", "Tab", "S-Tab", "Home", "End", "PgUp", "PgDn", "Ctrl+R", "Ctrl+D", "Ctrl+N", "Esc", "←", "→", "Shift+↑", "Shift+↓", "Shift+←", "Shift+→"], context: ["Thread list", "Managing threads"] }],
    ...SIZE, steps: ANSWER("Done."),
    keys: [{ wait: 300 }, ...say("explain the token cache", 60), { key: C("n") }, { wait: 500 }, ...say("why are the tests slow", 60),
      { key: C("n") }, { wait: 500 }, ...say("add a readme section", 60), { key: C("j") }, { wait: 1500, mark: "list" },
      { key: KEY.down }, { wait: 600 }, { key: KEY.down }, { wait: 800 }, { type: "cach", cps: 7 }, { wait: 1100, mark: "filter" }, { key: KEY.enter }, { wait: 1300 }],
    expect: [{ at: "list", has: /Readme/i }, { at: "filter", has: /Token Cache|token cache/i }],
  },
  "thread-cycle": {
    title: "Quick-cycle threads", on: [{ keys: ["Alt+←/→", "Ctrl+←/→", "Alt+←", "Alt+→"] }], ...SIZE, steps: ANSWER("Done."),
    keys: [{ wait: 300 }, ...say("explain the token cache", 60), { key: C("n") }, { wait: 500 }, ...say("why are the tests slow", 60),
      // agentty 0.9.51: the cycle keys use the thread list as last loaded (the
      // first press only loads it); opening the list once loads both threads
      { key: C("j") }, { wait: 900 }, { key: KEY.esc }, { wait: 700 }, { key: KEY.altLeft }, { wait: 1600, mark: "older" }, { key: KEY.altRight }, { wait: 1600 }],
    expect: [{ at: "older", has: "explain the token cache" }, { at: "end", has: "why are the tests slow" }],
  },

  // ── composer ────────────────────────────────────────────────────────────
  "slash-commands": {
    title: "Slash commands", on: [{ keys: ["/"] }, { keys: ["Tab", "Enter", "Up", "Down", "Ctrl+P", "Ctrl+N", "Esc"], context: ["Invoking", "Browsing commands"] }], ...SIZE,
    keys: [{ wait: 500 }, { type: "/", cps: 8 }, { wait: 1200 }, { type: "mo", cps: 6 }, { wait: 1000, mark: "filtered" },
      { key: KEY.down }, { wait: 1300 }, { key: KEY.esc }, { wait: 400 }],
    expect: [{ at: "filtered", has: "/model" }],
  },
  "file-mention": {
    title: "Mention a file", on: [{ keys: ["@"] }], ...SIZE,
    keys: [{ wait: 500 }, { type: "explain ", cps: 20 }, { type: "@", cps: 8 }, { wait: 1000 }, { type: "hand", cps: 7 },
      { wait: 1000, mark: "picker" }, { key: KEY.enter }, { wait: 1300 }],
    expect: [{ at: "picker", has: "handler.py" }],
  },
  "symbol-picker": {
    title: "Jump to a symbol", on: [{ keys: ["#"] }], ...SIZE,
    keys: [{ wait: 500 }, { type: "why is ", cps: 20 }, { type: "#", cps: 8 }, { wait: 1000 }, { type: "reso", cps: 7 },
      { wait: 1200, mark: "picker" }, { key: KEY.enter }, { wait: 300 }, { type: " slow?", cps: 20 }, { wait: 1200 }],
    expect: [{ at: "picker", has: "resolve" }],
  },
  "composer-expand": {
    title: "Expanded composer", on: [{ keys: ["Ctrl+E"] }], ...SIZE,
    keys: [{ wait: 400 }, { type: "a longer prompt, ", cps: 30 }, { key: C("e") }, { wait: 1100, mark: "tall" },
      { type: "with room to think", cps: 30 }, { key: KEY.altEnter }, { type: "across several lines", cps: 30 }, { wait: 900 }, { key: C("e") }, { wait: 1100 }],
    expect: [{ at: "tall", has: "a longer prompt" }],
  },
  multiline: {
    title: "A new line in the message", on: [{ keys: ["Shift+Enter", "Alt+Enter"] }], ...SIZE, kitty: true,
    keys: [{ wait: 400 }, { type: "first, read the guide", cps: 30 }, { key: KEY.shiftEnter }, { wait: 300 }, { type: "then update the loader", cps: 30 },
      { key: KEY.shiftEnter }, { wait: 300 }, { type: "then run the tests", cps: 30 }, { wait: 1300, mark: "three" }],
    expect: [{ at: "three", has: "then update the loader" }, { at: "three", has: "then run the tests" }],
  },
  editing: {
    title: "Editing like readline", on: [{ keys: ["Ctrl+W", "Alt+D", "Ctrl+U", "Alt+K", "Ctrl+Z", "Ctrl+Y", "Ctrl+Y / Ctrl+Shift+Z", "Backspace", "Ctrl+←", "Ctrl+→", "Home", "End"], context: "Composer" }],
    ...SIZE,
    keys: [{ wait: 400 }, { type: "make resolve use the token cache quickly", cps: 30 }, { wait: 500 }, { key: C("w") }, { wait: 700, mark: "word" },
      { key: C("z") }, { wait: 800, mark: "undo" }, { key: C("u") }, { wait: 800, mark: "killed" }, { key: C("z") }, { wait: 1200 }],
    expect: [{ at: "word", has: "the token cache " }, { at: "undo", has: "cache quickly" }],
  },
  history: {
    title: "Message history", on: [{ keys: ["↑", "↓", "Ctrl+Shift+Z"], context: "History" }], ...SIZE, steps: ANSWER("Done."),
    keys: [{ wait: 300 }, ...say("run the tests", 50), ...say("show the diff", 50), { key: KEY.up }, { wait: 900, mark: "back1" },
      { key: KEY.up }, { wait: 900, mark: "back2" }, { key: KEY.down }, { wait: 1000 }],
    expect: [{ at: "back1", has: "show the diff" }, { at: "back2", has: "run the tests" }],
  },
  queue: {
    title: "Queue while it works", on: [{ keys: ["Alt+↑", "Alt+↓", "Alt+Backspace"] }, { keys: ["↑", "Enter", "Esc"], context: "Queue behavior" }], ...SIZE,
    steps: [{ say: "Reading the handler.", tools: [["shell", { command: "sleep 3; cat auth/handler.py", display_description: "Read the handler" }]] }, { final: "It calls `fetch_remote` every time." }],
    keys: [{ wait: 300 }, { type: "what does resolve do", cps: 40 }, { key: KEY.enter }, { wait: 900 }, { type: "then add a cache", cps: 30 }, { key: KEY.enter },
      { wait: 900, mark: "queued" }, { done: true }, { wait: 2500 }],
    expect: [{ at: "queued", has: /queued/ }],
  },
};

Object.assign(CLIPS, {
  fork: {
    title: "Fork a thread", on: [{ keys: ["↑↓", "j", "k", "Enter", "Esc"], context: "Forking" }], ...SIZE,
    steps: ANSWER("`resolve()` returns the token from `fetch_remote`, no caching."),
    keys: [{ wait: 300 }, ...say("what does resolve do?"), { key: C("k") }, { wait: 800 }, { type: "fork", cps: 8 }, { wait: 800 }, { key: KEY.enter },
      { wait: 1300, mark: "picker" }, { key: KEY.down }, { wait: 800 }, { key: KEY.enter }, { wait: 2000, mark: "forked" }],
    expect: [{ at: "picker", has: /RAG/ }, { at: "forked", has: /Fork/ }],
  },
  rewind: {
    title: "Rewind to a checkpoint", on: [{ keys: ["↑↓", "j", "k", "Enter", "Esc"], context: ["Checkpoints", "rewind"] }], ...SIZE,
    steps: EDIT_TWO,
    keys: [{ wait: 300 }, ...say("type resolve and reject a missing user id"), { key: C("k") }, { wait: 800 }, { type: "rewind", cps: 8 }, { wait: 800 },
      { key: KEY.enter }, { wait: 1800, mark: "picker" }, { key: KEY.esc }, { wait: 500 }],
    expect: [{ at: "picker", has: /turn|checkpoint/i }],
  },
});

// Keys too generic to deserve a clip on their own (they're explained by the
// feature they sit next to); the coverage report doesn't count them as gaps.
export const GENERIC = ["Enter", "Esc", "esc", "↑", "↓", "←", "→", "Tab", "Up", "Down", "Ctrl+C", "Ctrl+L", "Ctrl+V", "Alt+V", "Ctrl+Cmd+V", "Ctrl+Shift+V"];

// ── which clip a key shows ─────────────────────────────────────────────────
// "Ctrl+K", "^K", "C-k", "ctrl k" all name the same key.
export const normKey = (k) =>
  String(k).trim().toLowerCase().replace(/^\^/, "ctrl+").replace(/^c-/, "ctrl+").replace(/\s+/g, "+").replace(/^shift\+tab$/, "s-tab");

const ctxList = (c) => (c == null ? [] : Array.isArray(c) ? c : [c]);
const ENTRIES = Object.entries(CLIPS).flatMap(([id, c]) => (c.on ?? []).flatMap((o) => o.keys.map((k) => ({ id, key: normKey(k), contexts: ctxList(o.context) }))));
const CONTEXTS = [...new Set(ENTRIES.flatMap((e) => e.contexts))];

/** The clip for a [[key]] mentioned under these headings (outermost first), or null. */
export function clipFor(key, sections = []) {
  const k = normKey(key);
  const where = sections.join(" › ");
  const inContext = CONTEXTS.filter((c) => where.includes(c));
  // inside a section that belongs to a context, that context's clip wins;
  // otherwise the key's general clip
  // the innermost matching heading wins (a table under "Thread list" inside "Keys")
  const own = ENTRIES.filter((e) => e.key === k && e.contexts.some((c) => inContext.includes(c)))
    .sort((a, b) => Math.max(...b.contexts.map((c) => where.lastIndexOf(c))) - Math.max(...a.contexts.map((c) => where.lastIndexOf(c))))[0];
  if (own) return own.id;
  const hit = ENTRIES.find((e) => e.key === k && !e.contexts.length);
  return hit ? hit.id : null;
}
