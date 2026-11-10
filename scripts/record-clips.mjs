#!/usr/bin/env node
// Record every docs clip (scripts/demo-clips.mjs) in both of agentty's themes:
// demo/clips/<id>[-light].json (raw PTY bytes) and public/clips/<id>[-light].json
// (the pre-rendered frames the docs play on hover).
//
//   node scripts/record-clips.mjs [id …]      (default: all)
//   AGENTTY_BIN=/path/to/agentty overrides the binary
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLIPS } from "./demo-clips.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CLIPS);
for (const id of ids) {
  for (const theme of ["Flexoki Dark", "Flexoki Light"]) {
    console.log(`==> ${id} · ${theme}`);
    execFileSync(process.execPath, [path.join(here, "record-demo.mjs")], {
      stdio: "inherit", env: { ...process.env, DEMO_CLIP: id, DEMO_THEME: theme },
    });
  }
}
