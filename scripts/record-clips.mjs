#!/usr/bin/env node
// Record the docs clips (scripts/demo-clips.mjs) against the real agentty, in
// both of its themes, and publish only the ones that pass their checks.
//
//   node scripts/record-clips.mjs              every clip
//   node scripts/record-clips.mjs model-picker queue     just these
//   node scripts/record-clips.mjs --stale      only clips recorded with an older agentty
//   AGENTTY_BIN=/path/to/agentty               a specific binary (default: latest release)
//
// Each recording lands in a temp file first. Its `expect` checks run against
// the screen as the docs will play it; only a passing pair (dark + light)
// replaces public/clips/<id>[-light].json, and only if it looks different from
// the published one (else the old file stays and only its version moves). The
// raw PTY captures stay out of the repo. A failing clip keeps its previous
// recording and is reported, so a changed UI can't publish a wrong clip.
// public/clips/manifest.json records which agentty each clip shows.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLIPS } from "./demo-clips.mjs";
import { agenttyBin, versionOf } from "./agentty-bin.mjs";
import { lengthMs, sameLook, screenAt } from "./recording-look.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUB = path.join(ROOT, "public/clips");
const MANIFEST = path.join(PUB, "manifest.json");

const BIN = await agenttyBin();
const VERSION = versionOf(BIN);

const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : { clips: {} };
const args = process.argv.slice(2);
const stale = args.includes("--stale");
const asked = args.filter((a) => !a.startsWith("--"));
for (const id of asked) if (!CLIPS[id]) throw new Error(`no clip "${id}"`);
const ids = (asked.length ? asked : Object.keys(CLIPS)).filter((id) => !stale || manifest.clips[id]?.version !== VERSION);
console.log(`agentty ${VERSION}: recording ${ids.length} clip(s)${stale ? " (stale only)" : ""}`);

function check(clip, screenFile) {
  const s = JSON.parse(fs.readFileSync(screenFile, "utf8"));
  const end = lengthMs(s);
  const fails = [];
  for (const e of clip.expect ?? []) {
    const at = e.at === "end" ? end + 1000 : s.marks?.[e.at] ?? NaN;
    if (Number.isNaN(at)) { fails.push(`no mark "${e.at}"`); continue; }
    const screen = screenAt(s, at);
    const ok = e.has instanceof RegExp ? e.has.test(screen) : screen.includes(e.has);
    if (!ok) fails.push(`at ${e.at}: expected ${e.has}\n${screen.split("\n").map((l) => "      │" + l).join("\n")}`);
  }
  return fails;
}

// ── record ─────────────────────────────────────────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agentty-clips-"));
fs.mkdirSync(PUB, { recursive: true });
const report = [];
for (const id of ids) {
  const clip = CLIPS[id];
  const files = [];
  let fails = [];
  for (const [theme, sfx] of [["Flexoki Dark", ""], ["Flexoki Light", "-light"]]) {
    const raw = path.join(tmp, `${id}${sfx}.raw.json`), scr = path.join(tmp, `${id}${sfx}.json`);
    try {
      execFileSync(process.execPath, [path.join(ROOT, "scripts/record-demo.mjs"), raw, scr], {
        stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, AGENTTY_BIN: BIN, DEMO_CLIP: id, DEMO_THEME: theme },
      });
      fails.push(...check(clip, scr).map((f) => `${theme}: ${f}`));
    } catch (e) {
      fails.push(`${theme}: recording failed: ${String(e.stderr || e.message).trim().split("\n").slice(-3).join(" ")}`);
    }
    files.push([scr, path.join(PUB, `${id}${sfx}.json`)]);
  }
  if (fails.length) {
    report.push([id, "FAIL", fails]);
    console.log(`  ✗ ${id}${manifest.clips[id] ? ` (keeping the ${manifest.clips[id].version} recording)` : " (not published)"}`);
    for (const f of fails) console.log("      " + f.split("\n").join("\n      "));
  } else {
    // the same UI as the published recording: keep that file (git stays small)
    const unchanged = files.every(([from, to]) => sameLook(from, to));
    if (!unchanged) for (const [from, to] of files) fs.copyFileSync(from, to);
    manifest.clips[id] = { version: VERSION, recorded: unchanged ? manifest.clips[id]?.recorded : new Date().toISOString().slice(0, 10) };
    report.push([id, "ok"]);
    console.log(`  ✓ ${id}${unchanged ? " (unchanged)" : ""}`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });

// drop clips that no longer exist in demo-clips.mjs
for (const id of Object.keys(manifest.clips)) if (!CLIPS[id]) {
  delete manifest.clips[id];
  for (const f of [`${id}.json`, `${id}-light.json`]) fs.rmSync(path.join(PUB, f), { force: true });
}
manifest.agentty = VERSION;
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

const failed = report.filter((r) => r[1] === "FAIL").length;
console.log(`\n${report.length - failed}/${report.length} recorded with agentty ${VERSION}${failed ? `, ${failed} failed (see above)` : ""}`);
process.exitCode = failed ? 2 : 0;
