// Build-time token values for the docs {{...}} substitutions (see lib/docs.ts).
// Sourced from the same live release/stats accessors the rest of the site uses,
// so a doc's install commands and size claims always match the deployed binary.

import { release, versionLabel } from "./release";
import { stats } from "./stats";
import { site } from "./site";
import bench from "./bench.generated.json";

const fmtMs = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${v < 10 ? v.toFixed(1) : Math.round(v)} ms`;
const us = bench.tools.find((t) => t.id === "agentty")!;
const times = (v: number, base: number) => {
  const r = v / base;
  return `${r >= 10 ? Math.round(r) : r.toFixed(1)}×`;
};

// Measured numbers from scripts/bench-agents.mjs, so content quotes the same
// figures as /benchmarks: {{bench.<id>.ready|rss|disk|start|version}}, and
// {{bench.<id>.readyX|rssX|diskX|startX}} for "how many times agentty".
const benchTokens: Record<string, string> = { "bench.date": bench.measured.slice(0, 10) };
for (const t of bench.tools) {
  const p = `bench.${t.id}`;
  benchTokens[`${p}.ready`] = fmtMs(t.readyMs.median);
  benchTokens[`${p}.start`] = fmtMs(t.startupMs.median);
  benchTokens[`${p}.rss`] = `${Math.round(t.idleRssMB)} MB`;
  benchTokens[`${p}.disk`] = `${Math.round(t.diskMB)} MB`;
  benchTokens[`${p}.version`] = t.version;
  benchTokens[`${p}.readyX`] = times(t.readyMs.median, us.readyMs.median);
  benchTokens[`${p}.startX`] = times(t.startupMs.median, us.startupMs.median);
  benchTokens[`${p}.rssX`] = times(t.idleRssMB, us.idleRssMB);
  benchTokens[`${p}.diskX`] = times(t.diskMB, us.diskMB);
}

export const docsTokens: Record<string, string> = {
  ...benchTokens,
  version: release.version,
  versionLabel,
  sizeMB: stats.sizeMB,
  coldStartMs: stats.coldStart,
  installOneLiner: site.installOneLiner,
  installOneLinerWindows: site.installOneLinerWindows,
  github: site.github,
  releasesLatest: site.releasesLatest,
};

// Substitute {{token}} placeholders with live release/stats values. Unknown
// tokens are left as-is.
export function applyTokens(text: string): string {
  return text.replace(/\{\{([\w.]+)\}\}/g, (whole, key: string) =>
    key in docsTokens ? docsTokens[key] : whole,
  );
}
