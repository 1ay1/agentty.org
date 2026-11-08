#!/usr/bin/env node
// bench-agents.mjs — measure what the HARNESS costs you, not the model.
//
// For each tool, with a fresh empty HOME (no config, no login) on the same
// machine, sequentially:
//   startup   `--version`, 3 warm-ups then 30 timed runs → median / p10 / p90
//   launch    open the interactive UI in a real pseudo-terminal; time until the
//             first screen is fully drawn (output quiet for 500 ms) → 8 runs
//   memory    resident memory of the whole process tree once that screen is up
//   disk      everything the tool needs on disk, including the runtime it
//             needs (Node.js or Python) if it isn't a self-contained binary
//
//   node scripts/bench-agents.mjs [benchDir]   → lib/bench.generated.json
import { spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { spawn: ptySpawn } = createRequire(path.join(ROOT, "deploy/live/package.json"))("node-pty");
const B = process.argv[2] || path.join(os.homedir(), "bench-agents");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NODE = execFileSync("which", ["node"], { encoding: "utf8" }).trim();

const TOOLS = [
  { id: "agentty", name: "agentty", bin: `${B}/agentty/agentty`, dir: `${B}/agentty`, runtime: null },
  { id: "claude", name: "Claude Code", bin: `${B}/claude/node_modules/.bin/claude`, dir: `${B}/claude/node_modules`, runtime: null },
  { id: "codex", name: "Codex CLI", bin: `${B}/codex/node_modules/.bin/codex`, dir: `${B}/codex/node_modules`, runtime: "node" },
  { id: "gemini", name: "Gemini CLI", bin: `${B}/gemini/node_modules/.bin/gemini`, dir: `${B}/gemini/node_modules`, runtime: "node" },
  { id: "opencode", name: "opencode", bin: `${B}/opencode/node_modules/.bin/opencode`, dir: `${B}/opencode/node_modules`, runtime: null },
  { id: "aider", name: "Aider", bin: `${B}/aider/bin/aider`, dir: [`${B}/aider/tool`, `${B}/aider/python`], runtime: null },
];

// ── helpers ────────────────────────────────────────────────────────────────
const du = (p) => (fs.existsSync(p) ? Number(execFileSync("du", ["-sbL", p], { encoding: "utf8" }).split("\t")[0]) : 0);
function nodeRuntimeBytes() {
  // the node executable plus any non-system shared library it loads (libnode etc.)
  let n = fs.statSync(fs.realpathSync(NODE)).size;
  const ldd = execFileSync("ldd", [fs.realpathSync(NODE)], { encoding: "utf8" });
  for (const m of ldd.matchAll(/=>\s+(\S+)/g)) if (/libnode|libuv|libcares|libnghttp|libbrotli|libicu|libada|libsimdjson|libsimdutf/.test(m[1])) n += fs.statSync(fs.realpathSync(m[1])).size;
  return n;
}
const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b), q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { median: +q(0.5).toFixed(1), p10: +q(0.1).toFixed(1), p90: +q(0.9).toFixed(1), runs: s.length };
};
const freshHome = () => fs.mkdtempSync(path.join(B, "home-"));
const envFor = (home) => ({
  PATH: `${path.dirname(NODE)}:/usr/bin:/bin`, HOME: home, USER: "bench", LANG: "en_US.UTF-8",
  TERM: "xterm-256color", COLORTERM: "truecolor", XDG_CONFIG_HOME: `${home}/.config`, XDG_DATA_HOME: `${home}/.local/share`,
  XDG_CACHE_HOME: `${home}/.cache`, XDG_STATE_HOME: `${home}/.local/state`,
});
function treeRss(pid) {
  // resident memory of pid and all descendants (kB → bytes)
  let total = 0;
  const walk = (p) => {
    try { total += Number(fs.readFileSync(`/proc/${p}/status`, "utf8").match(/VmRSS:\s+(\d+)/)?.[1] ?? 0) * 1024; } catch { return; }
    for (const t of fs.readdirSync(`/proc/${p}/task`)) {
      try { for (const c of fs.readFileSync(`/proc/${p}/task/${t}/children`, "utf8").trim().split(/\s+/).filter(Boolean)) walk(c); } catch {}
    }
  };
  walk(pid);
  return total;
}

// Every measurement is interleaved round-robin across tools (A B C … A B C …)
// so background load on the machine lands on every tool equally.

// ── startup: `--version` ───────────────────────────────────────────────────
function oneVersion(tool, env) {
  const t0 = process.hrtime.bigint();
  const r = spawnSync(tool.bin, ["--version"], { env, stdio: ["ignore", "pipe", "pipe"], timeout: 30000 });
  if (r.status !== 0) throw new Error(`${tool.id} --version exited ${r.status}: ${String(r.stderr).slice(0, 200)}`);
  return Number(process.hrtime.bigint() - t0) / 1e6;
}

// ── launch: interactive UI in a pty, until the first screen settles ────────
async function oneLaunch(tool) {
  const home = freshHome();
  fs.mkdirSync(`${home}/project`);
  const t0 = performance.now();
  const p = ptySpawn(tool.bin, [], { name: "xterm-256color", cols: 100, rows: 30, cwd: `${home}/project`, env: envFor(home) });
  let last = 0, bytes = 0;
  p.onData((d) => {
    bytes += d.length; last = performance.now();
    // answer terminal queries like a real terminal would
    if (d.includes("\x1b[6n")) p.write("\x1b[30;1R");
    if (d.includes("\x1b]11;?")) p.write("\x1b]11;rgb:1010/0f0f/0f0f\x1b\\");
    if (d.includes("\x1b]10;?")) p.write("\x1b]10;rgb:cece/cdcd/c3c3\x1b\\");
    if (d.includes("\x1b[c")) p.write("\x1b[?62;22c");
  });
  while (performance.now() - t0 < 30000) {
    await sleep(20);
    if (bytes > 200 && performance.now() - last >= 500) break;
  }
  const settled = last - t0, mem = treeRss(p.pid);
  try { p.kill("SIGKILL"); } catch {}
  await sleep(150);
  fs.rmSync(home, { recursive: true, force: true });
  return { settled, mem };
}

// ── run ────────────────────────────────────────────────────────────────────
const nodeBytes = nodeRuntimeBytes();
const pythonNote = "uv-managed CPython 3.12 (what aider's official installer uses)";
const out = {
  measured: new Date().toISOString(),
  machine: { cpu: os.cpus()[0].model.trim(), threads: os.cpus().length, memGB: Math.round(os.totalmem() / 2 ** 30), os: `${os.type()} ${os.release()}`, node: process.version },
  method: "fresh empty HOME per tool, no login, no network needed; runs interleaved round-robin across tools so background load is shared equally",
  tools: [],
};
const versions = TOOLS.map((t) => String(spawnSync(t.bin, ["--version"], { env: envFor(os.tmpdir()), encoding: "utf8" }).stdout).trim().split("\n")[0]);
const homes = TOOLS.map(() => freshHome()), envs = homes.map(envFor);
const vt = TOOLS.map(() => []);
for (let round = 0; round < 33; round++)
  TOOLS.forEach((t, k) => { const ms = oneVersion(t, envs[k]); if (round >= 3) vt[k].push(ms); });
homes.forEach((h) => fs.rmSync(h, { recursive: true, force: true }));
console.log("startup done");
const lt = TOOLS.map(() => []), lm = TOOLS.map(() => []);
for (let round = 0; round < 9; round++)
  for (const [k, t] of TOOLS.entries()) { const r = await oneLaunch(t); if (round >= 1) { lt[k].push(r.settled); lm[k].push(r.mem); } }
console.log("launch done");
for (const [k, tool] of TOOLS.entries()) {
  const s = stats(vt[k]), ready = stats(lt[k]);
  const rssMB = +(lm[k].sort((a, b) => a - b)[lm[k].length >> 1] / 1048576).toFixed(1);
  const pkg = [].concat(tool.dir).reduce((a, d) => a + du(d), 0);
  const runtime = tool.runtime === "node" ? nodeBytes : 0;
  const diskMB = +((pkg + runtime) / 1048576).toFixed(1);
  console.log(`${tool.name.padEnd(12)} ${versions[k].slice(0, 26).padEnd(26)} startup ${String(s.median).padStart(7)}ms  ready ${String(ready.median).padStart(7)}ms  rss ${String(rssMB).padStart(6)}MB  disk ${diskMB}MB`);
  out.tools.push({
    id: tool.id, name: tool.name, version: versions[k],
    startupMs: s, readyMs: ready, idleRssMB: rssMB,
    diskMB, packageMB: +(pkg / 1048576).toFixed(1),
    runtime: tool.runtime ? { name: tool.runtime, MB: +(runtime / 1048576).toFixed(1) } : tool.id === "aider" ? { name: "python", MB: null, note: pythonNote } : null,
  });
}
fs.writeFileSync(path.join(ROOT, "lib/bench.generated.json"), JSON.stringify(out, null, 1) + "\n");
console.log("→ lib/bench.generated.json");
