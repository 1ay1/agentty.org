import Link from "next/link";
import bench from "@/lib/bench.generated.json";

// Real measurements of terminal agent harnesses (scripts/bench-agents.mjs),
// drawn as plain text bars. Server component: zero JS.

type Tool = (typeof bench.tools)[number];
type Metric = { key: string; label: string; unit: string; value: (t: Tool) => number; fmt: (v: number) => string };

export const METRICS: Metric[] = [
  { key: "ready", label: "launch → ready to type", unit: "ms", value: (t) => t.readyMs.median, fmt: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`) },
  { key: "rss", label: "memory while idle", unit: "MB", value: (t) => t.idleRssMB, fmt: (v) => `${Math.round(v)} MB` },
  { key: "disk", label: "on disk, with runtime", unit: "MB", value: (t) => t.diskMB, fmt: (v) => `${Math.round(v)} MB` },
  { key: "startup", label: "`--version` startup", unit: "ms", value: (t) => t.startupMs.median, fmt: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${v < 10 ? v.toFixed(1) : Math.round(v)} ms`) },
];

const WIDTH = 34;                     // bar cells for the largest value
const EIGHTHS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"];

function bar(v: number, max: number) {
  const cells = (v / max) * WIDTH;
  const full = Math.floor(cells), rest = Math.round((cells - full) * 8);
  const s = "█".repeat(full) + (rest === 8 ? "█" : EIGHTHS[rest]);
  return s || "▏";                    // always show something
}

export function BenchBars({ metrics = ["ready"] }: { metrics?: string[] }) {
  const nameW = Math.max(...bench.tools.map((t) => t.name.length));
  return (
    <div className="bench">
      {METRICS.filter((m) => metrics.includes(m.key)).map((m) => {
        const rows = [...bench.tools].sort((a, b) => m.value(a) - m.value(b));
        const max = Math.max(...rows.map(m.value));
        return (
          <figure key={m.key} className="bench-metric">
            <figcaption>{m.label}, lower is better</figcaption>
            <pre aria-label={`${m.label}: ` + rows.map((t) => `${t.name} ${m.fmt(m.value(t))}`).join(", ")}>
              {rows.map((t) => (
                <span key={t.id} className={t.id === "agentty" ? "bench-row is-us" : "bench-row"}>
                  {t.name.padEnd(nameW)}  <span className="bench-bar">{bar(m.value(t), max)}</span> {m.fmt(m.value(t))}
                  {"\n"}
                </span>
              ))}
            </pre>
          </figure>
        );
      })}
      <p className="bench-note">
        median of 10 launches, same machine, fresh install, no login ·{" "}
        <Link href="/benchmarks/">method &amp; all numbers</Link>
      </p>
    </div>
  );
}
