#!/usr/bin/env node
// Capture real command output for the docs. Every ```run block in the docs /
// content holds one `agentty …` command; this runs it against the real binary
// (fresh HOME, no colour, no network) and writes lib/captured.generated.json,
// which both the site and the terminal edition render under the command with
// "output from vX, captured at build". Docs can't drift from the program.
//
// Like measure-stats.mjs: never fails the deploy. Without a binary it keeps
// the committed file.

import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir, homedir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "lib", "captured.generated.json");

function findBinary() {
  if (process.env.AGENTTY_BIN && existsSync(process.env.AGENTTY_BIN)) return process.env.AGENTTY_BIN;
  for (const dir of (process.env.PATH || "").split(":")) if (dir && existsSync(join(dir, "agentty"))) return join(dir, "agentty");
  for (const p of [join(homedir(), ".local", "bin", "agentty"), "/usr/local/bin/agentty", "/usr/bin/agentty"]) if (existsSync(p)) return p;
  return null;
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : f.endsWith(".md") ? [p] : [];
  });
}

// ```run blocks → commands. Only plain `agentty <args>`: no shell, no pipes.
const commands = new Set();
for (const f of walk(join(ROOT, "content"))) {
  for (const m of readFileSync(f, "utf8").matchAll(/^```run[ \t]*\n([\s\S]*?)\n```/gm)) {
    const cmd = m[1].trim();
    if (!/^agentty( [\w@./:=-]+)*$/.test(cmd)) {
      console.warn(`   [capture] skipping ${JSON.stringify(cmd)} in ${f}: only plain \`agentty …\` commands run`);
      continue;
    }
    commands.add(cmd);
  }
}

const bin = findBinary();
if (!bin) {
  console.warn("   [capture] no agentty binary found; keeping committed lib/captured.generated.json");
  process.exit(0);
}

const home = mkdtempSync(join(tmpdir(), "agentty-capture-"));
const env = {
  PATH: "/usr/bin:/bin", HOME: home, TERM: "dumb", NO_COLOR: "1", LANG: "C.UTF-8",
  AGENTTY_NO_UPDATE_CHECK: "1", COLUMNS: "80",
};
const run = (args) => spawnSync(bin, args, { env, cwd: home, encoding: "utf8", timeout: 15000, input: "" });

const version = (run(["--version"]).stdout.match(/agentty (\S+)/) || [])[1];
const outputs = {};
for (const cmd of commands) {
  const r = run(cmd.split(" ").slice(1));
  let text = `${r.stdout || ""}${r.stderr || ""}`;
  text = text
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
    .split("\n")
    .filter((l) => !/^log: /.test(l)) // the log-path notice, not part of the answer
    .join("\n")
    .replaceAll(home, "~")
    .replace(/\s+$/, "");
  outputs[cmd] = text;
  console.log(`   [capture] ${cmd} → ${text.split("\n").length} line(s)`);
}
rmSync(home, { recursive: true, force: true });

writeFileSync(OUT, JSON.stringify({ version: version ? `v${version}` : "", outputs }, null, 2) + "\n");
console.log(`   [capture] wrote lib/captured.generated.json (${Object.keys(outputs).length} command(s), ${version ? "v" + version : "unknown version"})`);
