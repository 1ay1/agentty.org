#!/usr/bin/env node
// Check a pre-rendered session (lib/demo-screen*.json) for tool cards left
// half-drawn: replays the frames like a terminal and requires every tool card
// in the final scrollback to be finished (✓), once, with no spinner left.
//
//   node scripts/check-demo.mjs lib/demo-screen.json [more.json …]
import fs from "node:fs";

const CARD = /^\s*┃?\s*│?\s*(\S)\s{2,}([A-Z][A-Za-z ]+?)\s{2,}(\S.*?)\s*│?$/;
const TITLES = /^(Todo|Repo Map|Test|Git \w+|Code Search|Grep|Glob|Definition|Read|Outline|Read Filter|JSON Query|Agent|Edit|Patch|Write|Diagnostics|Shell|Remember|List|Fetch|Web Search|Docs Search|Extract|Aggregate|Replace|Move|Remove)$/;
// the same tool run twice with the same arguments is real, not a redraw
const REPEATABLE = new Set(["Test python3 -m unittest"]);

export function checkScreen(s) {
  const rows = [];
  for (const f of s.frames) for (const [y, segs] of f[1]) {
    const r = []; for (const [c, w, t] of segs) { const ch = [...t]; for (let k = 0; k < w; k++) r[c + k] = ch[k] ?? " "; } rows[y] = r;
  }
  const lines = rows.map((r) => (r || []).map((x) => x ?? " ").join("").trimEnd());
  const cards = [];
  for (const l of lines) { const m = l.match(CARD); if (m && TITLES.test(m[2])) cards.push([m[1], m[2], m[3].slice(0, 40)]); }
  const problems = [];
  for (const c of cards) if (c[0] !== "✓") problems.push(`not finished: ${c.join(" ")}`);
  const counts = new Map();
  for (const c of cards) { const k = `${c[1]} ${c[2]}`; counts.set(k, (counts.get(k) ?? 0) + 1); }
  for (const [k, n] of counts) if (n > (REPEATABLE.has(k) ? 2 : 1)) problems.push(`drawn ${n}×: ${k}`);
  for (const l of lines) if (/R U N N I N G|[⠀-⣿]\s{2,}[A-Z]/.test(l)) problems.push(`spinner left: ${l.trim().slice(0, 60)}`);
  return { cards, problems };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let bad = 0;
  for (const f of process.argv.slice(2)) {
    const { cards, problems } = checkScreen(JSON.parse(fs.readFileSync(f, "utf8")));
    console.log(`${f}: ${cards.length} cards, ${new Set(cards.map((c) => c[1])).size} tools${problems.length ? `, ${problems.length} problem(s)` : ", clean"}`);
    for (const p of problems) console.log("  " + p);
    bad += problems.length;
  }
  process.exitCode = bad ? 1 : 0;
}
