#!/usr/bin/env node
// sync-static.mjs — pull docs/website/static/* from the agentty repo into
// public/, so pages that agentty itself generates (agentty.org/paste, the
// images-as-text page from `agentty paste page`) stay byte-identical to the
// binary that decodes them. Same 3-tier source + never-fails contract as
// sync-docs.mjs / sync-changelog.mjs.
//
// Mapping: static/<name>.html → public/<name>/index.html (trailingSlash: true
// serves it at /<name>/); any other file → public/<name>.
//
// Source resolution, in order:
//   1. AGENTTY_DIR env var (an agentty checkout)
//   2. GitHub raw at AGENTTY_DOCS_REF (default: master), from a fixed list

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");

const REF = process.env.AGENTTY_DOCS_REF || "master";
const REPO = "1ay1/agentty";
// What the agentty repo publishes. A new file there needs a line here, so a
// stray file can never land on the site by accident.
const FILES = ["paste.html"];

function out_path(name) {
  if (extname(name) === ".html") return join(PUBLIC, basename(name, ".html"), "index.html");
  return join(PUBLIC, name);
}

async function read(name) {
  const dir = process.env.AGENTTY_DIR && join(process.env.AGENTTY_DIR, "docs", "website", "static");
  if (dir && existsSync(join(dir, name))) return readFileSync(join(dir, name));
  const url = `https://raw.githubusercontent.com/${REPO}/${REF}/docs/website/static/${name}`;
  const r = await fetch(url, { headers: { "User-Agent": "agentty-site-sync" } });
  if (!r.ok) throw new Error(`${name}: GitHub ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

let ok = 0;
for (const name of FILES) {
  try {
    const bytes = await read(name);
    if (bytes.length === 0) throw new Error(`${name}: empty`);
    const out = out_path(name);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, bytes);
    ok++;
    console.log(`   [sync-static] ${name} → ${out.slice(ROOT.length + 1)} (${bytes.length} bytes)`);
  } catch (err) {
    console.warn(`   [sync-static] SKIPPED ${name} (${err.message}); keeping the committed copy`);
  }
}
console.log(`   [sync-static] ${ok}/${FILES.length} files`);
process.exit(0);
