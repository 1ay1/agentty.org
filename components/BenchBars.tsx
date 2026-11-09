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
  { key: "startup", label: "--version startup", unit: "ms", value: (t) => t.startupMs.median, fmt: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${v < 10 ? v.toFixed(1) : Math.round(v)} ms`) },
];

export function BenchBars({ metrics = ["ready"] }: { metrics?: string[] }) {
  return (
    <div className="bench">
      {METRICS.filter((m) => metrics.includes(m.key)).map((m) => {
        const rows = [...bench.tools].sort((a, b) => m.value(a) - m.value(b));
        const max = Math.max(...rows.map(m.value));
        const us = m.value(bench.tools.find((t) => t.id === "agentty")!);
        return (
          <figure key={m.key} className="bench-metric">
            <figcaption>{m.label} <span>lower is better</span></figcaption>
            <ol aria-label={`${m.label}: ` + rows.map((t) => `${t.name} ${m.fmt(m.value(t))}`).join(", ")}>
              {rows.map((t) => {
                const v = m.value(t), ratio = v / us;
                return (
                  <li key={t.id} className={t.id === "agentty" ? "is-us" : undefined}>
                    <span className="bench-name">{t.name}</span>
                    <span className="bench-track">
                      <span className="bench-bar" style={{ width: `calc((100% - 15ch) * ${Math.max(0.006, v / max).toFixed(4)})` }} />
                      <span className="bench-val">
                        {m.fmt(v)}
                        {t.id !== "agentty" && ratio >= 1.15 && <span className="bench-x">{ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}×</span>}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </figure>
        );
      })}
      <p className="bench-note">
        median of 10 launches · same machine · fresh install, no login ·{" "}
        <Link href="/benchmarks/">method &amp; all numbers</Link>
      </p>
    </div>
  );
}
