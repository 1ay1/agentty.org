// Short clips of the real agentty, recorded by record-demo.mjs
// (DEMO_CLIP=<id>) and shown in the docs when you hover a key or a link
// that names the feature. Each clip: the terminal size, a key script, and,
// when the clip needs the model to do something, the scripted model turns.
//
//   keys: { wait: ms } pause · { type: "text", cps } type · { key: bytes } raw
//         key · { done: true } wait for the scripted answer to finish
//
// Record one:   DEMO_CLIP=model-picker node scripts/record-demo.mjs
// Record all:   node scripts/record-clips.mjs   (both themes)

const K = {
  ctrlK: "\x0b", ctrlP: "\x10", ctrlSlash: "\x1f", ctrlT: "\x14", ctrlR: "\x12", ctrlJ: "\n",
  sTab: "\x1b[Z", esc: "\x1b", down: "\x1b[B", up: "\x1b[A", right: "\x1b[C", enter: "\r",
};
const SIZE = { cols: 84, rows: 24 };
const MODELS = ["qwen3-coder:30b", "devstral:24b", "gpt-oss:20b", "deepseek-r1:32b", "llama3.3:70b", "qwen2.5-coder:14b"];

const TODO = (done) => ({ todos: [
  "Read the migration guide", "Update the config loader", "Run the test suite",
].map((content, i) => ({ content, status: i < done ? "completed" : i === done ? "in_progress" : "pending" })) });

export const CLIPS = {
  "command-palette": {
    title: "Command palette", keys_label: "Ctrl+K", ...SIZE,
    keys: [{ wait: 500 }, { key: K.ctrlK }, { wait: 1100 }, { type: "thre", cps: 8 }, { wait: 900 },
      { key: K.down }, { wait: 500 }, { key: K.down }, { wait: 1200 }, { key: K.esc }, { wait: 500 }],
  },
  "slash-commands": {
    title: "Slash commands", keys_label: "/", ...SIZE,
    keys: [{ wait: 500 }, { type: "/", cps: 8 }, { wait: 1200 }, { type: "mo", cps: 6 }, { wait: 1000 },
      { key: K.down }, { wait: 1300 }, { key: K.esc }, { wait: 400 }],
  },
  "model-picker": {
    title: "Model picker", keys_label: "Ctrl+/", ...SIZE, models: MODELS,
    keys: [{ wait: 500 }, { key: K.ctrlSlash }, { wait: 1200 }, { key: K.down }, { wait: 450 }, { key: K.down }, { wait: 450 },
      { type: "dev", cps: 7 }, { wait: 1300 }, { key: K.enter }, { wait: 1400 }],
  },
  "provider-picker": {
    title: "Provider picker", keys_label: "Ctrl+P", ...SIZE,
    keys: [{ wait: 500 }, { key: K.ctrlP }, { wait: 1400 }, { key: K.down }, { wait: 500 }, { key: K.down }, { wait: 500 },
      { key: K.down }, { wait: 1500 }, { key: K.esc }, { wait: 500 }],
  },
  profiles: {
    title: "Permission profiles", keys_label: "S-Tab", ...SIZE,
    keys: [{ wait: 700 }, { key: K.sTab }, { wait: 1300 }, { key: K.sTab }, { wait: 1300 }, { key: K.sTab }, { wait: 1300 }],
  },
  "file-mention": {
    title: "Mention a file", keys_label: "@", ...SIZE,
    keys: [{ wait: 500 }, { type: "explain ", cps: 20 }, { type: "@", cps: 8 }, { wait: 1000 }, { type: "hand", cps: 7 },
      { wait: 1000 }, { key: K.enter }, { wait: 1300 }],
  },
  "todo-plan": {
    title: "Plan view", keys_label: "Ctrl+T", ...SIZE,
    steps: [
      { say: "Planning it out.", tools: [["todo", TODO(1)]] },
      { final: "Plan's ready; I'm on step 2." },
    ],
    keys: [{ wait: 400 }, { type: "migrate the config loader to v2", cps: 40 }, { key: K.enter }, { done: true }, { wait: 700 },
      { key: K.ctrlT }, { wait: 2600 }, { key: K.esc }, { wait: 500 }],
  },
  "diff-review": {
    title: "Review changes", keys_label: "Ctrl+R", ...SIZE,
    steps: [
      { tools: [["edit", { path: "auth/handler.py", edits: [
        { old_text: `    return fetch_remote(user_id)\n`, new_text: `    if user_id is None:\n        raise ValueError("user_id is required")\n    return fetch_remote(user_id)\n` },
      ] }]] },
      { final: "Added the check." },
    ],
    keys: [{ wait: 400 }, { type: "reject a missing user id in resolve()", cps: 40 }, { key: K.enter }, { done: true }, { wait: 700 },
      { key: K.ctrlR }, { wait: 2400 }, { key: K.down }, { wait: 900 }, { key: K.esc }, { wait: 500 }],
  },
};
