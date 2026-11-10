#!/usr/bin/env node
// Keep every recording on agentty.org in step with agentty itself: the home
// page session and the docs clips. Run it any time; it only records when the
// latest agentty release is newer than what the recordings show.
//
//   node scripts/update-recordings.mjs           record what's out of date
//   node scripts/update-recordings.mjs --force   re-record everything
//   node scripts/update-recordings.mjs --push    then commit and push (the
//                                                 recorder service does this)
//
// Nothing broken is ever published: the home session must pass
// scripts/check-demo.mjs in both themes, and each clip its own `expect`
// checks (scripts/record-clips.mjs). Whatever fails keeps its last good
// recording and is listed in the report. Versions live in
// demo/recordings.json (home) and public/clips/manifest.json (clips).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { agenttyBin, versionOf } from "./agentty-bin.mjs";
import { checkScreen } from "./check-demo.mjs";
import { sameLook } from "./recording-look.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const force = process.argv.includes("--force");
const push = process.argv.includes("--push");
const rel = (p) => path.join(ROOT, p);
const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(rel(p), "utf8")); } catch { return d; } };

const BIN = await agenttyBin();
const VERSION = versionOf(BIN);
const home = readJson("demo/recordings.json", {});
const clips = readJson("public/clips/manifest.json", { clips: {} });
const env = { ...process.env, AGENTTY_BIN: BIN };
const report = [];

// ── the home page session ───────────────────────────────────────────────────
if (force || home.agentty !== VERSION) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agentty-home-"));
  const out = [];
  let ok = true;
  for (const [theme, sfx] of [["Flexoki Dark", ""], ["Flexoki Light", "-light"]]) {
    const raw = path.join(tmp, `session${sfx}.json`), scr = path.join(tmp, `screen${sfx}.json`);
    try {
      execFileSync(process.execPath, [rel("scripts/record-demo.mjs"), raw, scr], { stdio: ["ignore", "ignore", "pipe"], env: { ...env, DEMO_THEME: theme } });
      const { problems } = checkScreen(JSON.parse(fs.readFileSync(scr, "utf8")));
      if (problems.length) { ok = false; report.push(`home (${theme}): ${problems.join("; ")}`); }
    } catch (e) {
      ok = false;
      report.push(`home (${theme}): recording failed: ${String(e.stderr || e.message).trim().split("\n").slice(-2).join(" ")}`);
    }
    out.push([scr, `lib/demo-screen${sfx}.json`]);
  }
  if (ok) {
    const unchanged = out.every(([from, to]) => sameLook(from, rel(to)));
    if (!unchanged) for (const [from, to] of out) fs.copyFileSync(from, rel(to));
    fs.writeFileSync(rel("demo/recordings.json"), JSON.stringify({ agentty: VERSION, recorded: new Date().toISOString().slice(0, 10) }, null, 2) + "\n");
    console.log(`home session: recorded with agentty ${VERSION}`);
  } else console.log(`home session: kept the ${home.agentty ?? "previous"} recording`);
  fs.rmSync(tmp, { recursive: true, force: true });
} else console.log(`home session: already agentty ${VERSION}`);

// ── the docs clips ─────────────────────────────────────────────────────────
try {
  execFileSync(process.execPath, [rel("scripts/record-clips.mjs"), ...(force ? [] : ["--stale"])], { stdio: "inherit", env });
} catch {
  report.push(`clips: some failed their checks (above); they keep their last good recording`);
}

// ── publish ─────────────────────────────────────────────────────────────────
const git = (...a) => execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8" }).trim();
const changed = git("status", "--porcelain", "--", "demo/recordings.json", "lib/demo-screen.json", "lib/demo-screen-light.json", "public/clips");
if (report.length) console.log(`\nproblems:\n  ${report.join("\n  ")}`);
if (!changed) { console.log("\nnothing changed"); process.exit(report.length ? 2 : 0); }
if (push) {
  git("add", "--", "demo/recordings.json", "lib/demo-screen.json", "lib/demo-screen-light.json", "public/clips");
  const n = Object.values(readJson("public/clips/manifest.json", { clips: {} }).clips).filter((c) => c.version === VERSION).length;
  git("commit", "-q", "-m", `recordings: agentty ${VERSION} (home session${report.length ? ", partial" : ""}, ${n} clips)`);
  git("push", "-q", "origin", "HEAD:master");
  console.log(`\npushed: recordings for agentty ${VERSION}`);
} else console.log(`\nrecordings updated (not committed; --push to publish)`);
process.exitCode = report.length ? 2 : 0;
