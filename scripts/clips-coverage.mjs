#!/usr/bin/env node
// Which keys in the docs have a clip? Walks every docs page the way the site
// renders it (each [[key]] with the headings it sits under) and reports, per
// page, the keys that show a clip and the ones that don't, plus clips that no
// page uses and how old each recording is.
//
//   node scripts/clips-coverage.mjs           summary + keys without a clip
//   node scripts/clips-coverage.mjs --all     every key, covered or not
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLIPS, GENERIC, NOT_CLIPPED, clipFor } from "./demo-clips.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "content/docs");
const manifest = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, "public/clips/manifest.json"), "utf8")); } catch { return { clips: {} }; } })();
const all = process.argv.includes("--all");

const used = new Set();
const missing = new Map(); // key → [pages]
let keys = 0, covered = 0;
for (const f of fs.readdirSync(DOCS).filter((f) => f.endsWith(".md")).sort()) {
  const text = fs.readFileSync(path.join(DOCS, f), "utf8").replace(/^---[\s\S]*?---\n/, "").replace(/```[\s\S]*?```/g, "");
  let sections = [];
  const rows = [];
  for (const line of text.split("\n")) {
    const h = line.match(/^(#{2,6})\s+(.*)$/);
    if (h) { const level = h[1].length; sections = [...sections.slice(0, level - 2), h[2].replace(/\[\[([^\]]+)\]\]/g, "$1")]; continue; }
    for (const m of line.matchAll(/\]\(clip:([a-z0-9-]+)\)/g)) used.add(m[1]);
    for (const m of line.matchAll(/\[\[([^\]\n]+)\]\]/g)) {
      keys++;
      const id = clipFor(m[1], sections);
      if (id) { covered++; used.add(id); if (all) rows.push(`  ✓ ${m[1].padEnd(16)} ${id}`); }
      else if (GENERIC.includes(m[1])) { keys--; }
      else { (missing.get(m[1]) ?? missing.set(m[1], new Set()).get(m[1])).add(f.replace(/\.md$/, "")); if (all) rows.push(`  · ${m[1]}`); }
    }
  }
  if (all && rows.length) console.log(`${f}\n${rows.join("\n")}`);
}

console.log(`\n${covered}/${keys} key mentions show a clip (generic keys like Enter and arrows not counted) (${Math.round((covered / keys) * 100)}%), ${Object.keys(CLIPS).length} clips defined`);
const gaps = [...missing].filter(([k]) => !NOT_CLIPPED[k]).sort((a, b) => b[1].size - a[1].size);
const known = [...missing].filter(([k]) => NOT_CLIPPED[k]);
console.log(gaps.length ? `\nkeys without a clip (by how often the docs mention them):` : `\nno gaps: every documented key that can be recorded has a clip`);
for (const [k, pages] of gaps) console.log(`  ${k.padEnd(18)} ${[...pages].join(", ")}`);
if (known.length) console.log(`\nnot recordable with a scripted model:`);
for (const [k, pages] of known) console.log(`  ${k.padEnd(18)} ${NOT_CLIPPED[k]} (${[...pages].join(", ")})`);
const unused = Object.keys(CLIPS).filter((id) => !used.has(id));
if (unused.length) console.log(`\nclips no page shows: ${unused.join(", ")}`);
const agentty = manifest.agentty;
const old = Object.keys(CLIPS).filter((id) => !manifest.clips[id] || manifest.clips[id].version !== agentty);
console.log(`\nrecorded with agentty ${agentty ?? "?"}: ${Object.keys(CLIPS).length - old.length}/${Object.keys(CLIPS).length}${old.length ? ` (not current: ${old.join(", ")})` : ""}`);
