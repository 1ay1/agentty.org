// scripts/gen-themes.mjs — the site's theme list, taken from agentty.
//
// agentty ships 615 colour schemes (maya/include/maya/style/schemes.hpp,
// generated from iTerm2-Color-Schemes and mapped onto maya's semantic
// slots). This reads that header and writes public/themes.json, which the
// site's theme picker fetches the first time it opens, so picking "Nord"
// here gives the same colours as picking Nord in agentty's Appearance pane.
//
//   node scripts/gen-themes.mjs [path/to/schemes.hpp]
//
// Without a path it reads GitHub (agentty-org/maya@master), so a scheme added
// to maya reaches the site on the next deploy. A local file is used only when
// named (argument or MAYA_SCHEMES): a sibling checkout may be months behind.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL = process.argv[2] || process.env.MAYA_SCHEMES || "";
const REMOTE = "https://raw.githubusercontent.com/agentty-org/maya/master/include/maya/style/schemes.hpp";

let src = "";
if (LOCAL && existsSync(LOCAL)) { src = readFileSync(LOCAL, "utf8"); console.log(`themes: ${LOCAL}`); }
else {
  const r = await fetch(REMOTE, { headers: { "User-Agent": "agentty-site-sync" } });
  if (!r.ok) throw new Error(`themes: ${REMOTE} → ${r.status}`);
  src = await r.text();
  console.log(`themes: ${REMOTE}`);
}

// inline constexpr Theme ident { .slot = Color::hex(0xRRGGBB), ... };
const bodies = new Map();
for (const m of src.matchAll(/inline constexpr Theme (\w+) \{([^}]*)\};/g)) {
  const slots = {};
  for (const s of m[2].matchAll(/\.(\w+)\s*=\s*Color::hex\(0x([0-9A-Fa-f]{6})\)/g)) slots[s[1]] = s[2].toLowerCase();
  bodies.set(m[1], slots);
}
// {"Display Name", &ident},
const table = src.slice(src.indexOf("inline constexpr NamedTheme schemes[]"));
// every slot maya's Theme has, in the order the site reads them: the first
// twelve drive the site's own tokens, all of them drive the demo's recolour
const SLOTS = ["background", "surface", "border", "text", "muted", "accent", "primary", "secondary", "info", "warning", "error", "highlight",
  "success", "inverse_text", "diff_added", "diff_removed", "diff_changed", "selection", "cursor", "link", "placeholder", "shadow", "overlay"];
const out = [];
for (const m of table.matchAll(/\{"((?:[^"\\]|\\.)*)", &(\w+)\}/g)) {
  const t = bodies.get(m[2]);
  if (!t || SLOTS.some((k) => !t[k])) continue;
  out.push([m[1].replace(/\\"/g, '"'), ...SLOTS.map((k) => t[k])]);
}
if (out.length < 100) throw new Error(`themes: only parsed ${out.length} schemes`);
writeFileSync(join(ROOT, "public", "themes.json"), JSON.stringify({ slots: SLOTS, themes: out }) + "\n");
// the scheme the demo was RECORDED in (agentty's Flexoki), bundled with the
// page: the recolour needs it before themes.json is ever fetched
const base = Object.fromEntries(["Flexoki Dark", "Flexoki Light"].map((n) => [n, out.find((t) => t[0] === n)?.slice(1)]));
writeFileSync(join(ROOT, "lib", "demo-base-slots.generated.json"), JSON.stringify({ slots: SLOTS, dark: base["Flexoki Dark"], light: base["Flexoki Light"] }) + "\n");
console.log(`themes: ${out.length} schemes → public/themes.json`);
