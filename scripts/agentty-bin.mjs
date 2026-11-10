// The agentty binary the recordings show: AGENTTY_BIN, else the latest
// GitHub release for this machine (downloaded once into the temp dir).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export async function latestTag() {
  // the releases/latest page redirects to /tag/vX.Y.Z — no API, no rate limit
  const r = await fetch("https://github.com/agentty-org/agentty/releases/latest", { redirect: "manual" });
  const tag = (r.headers.get("location") || "").split("/tag/")[1];
  if (!tag) throw new Error(`can't resolve the latest agentty release (HTTP ${r.status})`);
  return tag;
}

export async function agenttyBin() {
  if (process.env.AGENTTY_BIN) return process.env.AGENTTY_BIN;
  const tag = await latestTag();
  const dest = path.join(os.tmpdir(), `agentty-${tag}`);
  if (!fs.existsSync(dest)) {
    const bin = await fetch(`https://github.com/agentty-org/agentty/releases/download/${tag}/agentty-linux-x86_64`);
    if (!bin.ok) throw new Error(`agentty ${tag}: download ${bin.status}`);
    fs.writeFileSync(dest + ".part", Buffer.from(await bin.arrayBuffer()), { mode: 0o755 });
    fs.renameSync(dest + ".part", dest);
  }
  return dest;
}

/** "0.9.51" */
export function versionOf(bin) {
  const out = execFileSync(bin, ["--version"], { encoding: "utf8", env: { ...process.env, HOME: os.tmpdir() } });
  return out.match(/agentty (\S+)/)?.[1] ?? "unknown";
}
