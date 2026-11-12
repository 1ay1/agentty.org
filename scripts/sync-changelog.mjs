#!/usr/bin/env node
// sync-changelog.mjs — pull CHANGELOG.md from the agentty repo into
// content/changelog.md so the /changelog page always reflects the real release
// history with zero human intervention. Never fails the deploy.
//
// Source: GitHub (agentty-org/agentty at $AGENTTY_DOCS_REF, default master).
// A local checkout is used ONLY when AGENTTY_DIR names one. It used to fall
// back to ../agentty implicitly, and that checkout is a working copy nobody
// pulls: the page sat at v0.9.51 while three releases shipped, with every
// deploy reporting OK (the same failure sync-docs.mjs already had removed).

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "content", "changelog.md");

const REF = process.env.AGENTTY_DOCS_REF || "master";
const REPO = "agentty-org/agentty";
const RAW = `https://raw.githubusercontent.com/${REPO}/${REF}/CHANGELOG.md`;

function localSource() {
  if (process.env.AGENTTY_DIR && existsSync(join(process.env.AGENTTY_DIR, "CHANGELOG.md")))
    return join(process.env.AGENTTY_DIR, "CHANGELOG.md");
  return null;
}

try {
  let text;
  const local = localSource();
  if (local) {
    text = readFileSync(local, "utf8");
    console.log(`   [sync-changelog] source: local ${local}`);
  } else {
    const r = await fetch(RAW, { headers: { "User-Agent": "agentty-site-sync" } });
    if (!r.ok) throw new Error(`GitHub ${r.status}`);
    text = await r.text();
    console.log(`   [sync-changelog] source: GitHub ${REPO}@${REF}`);
  }
  if (!text.trim()) throw new Error("empty changelog");
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, text);
  console.log(`   [sync-changelog] wrote content/changelog.md (${text.split("\n").length} lines)`);
} catch (err) {
  console.warn(`   [sync-changelog] SKIPPED (${err.message}); using committed content/changelog.md`);
  process.exit(0);
}
