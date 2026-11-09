import Link from "next/link";
import { site } from "@/lib/site";
import { stats } from "@/lib/stats";
import { versionLabel } from "@/lib/release";
import bench from "@/lib/bench.generated.json";

// The site's footer, drawn like agentty's own status bar: one line of plain
// facts on the left, one counterweight on the right. Real numbers only.
const us = bench.tools.find((t) => t.id === "agentty")!;
const built = new Date().toISOString().slice(0, 10);

export function StatusLine() {
  return (
    <footer className="statusline">
      <p className="statusline-facts">
        <span className="statusline-mark" aria-hidden="true">▌</span>
        <Link href="/changelog/">agentty {versionLabel}</Link>
        <span>MIT</span>
        <span>{stats.sizeMB.replace(/\.\d+ MB$/, " MB")}</span>
        <span>{Math.round(us.readyMs.median)} ms to ready</span>
        <span>built {built}</span>
      </p>
      <p className="statusline-links">
        <a href={site.github}>github</a>
        <a href={site.discord}>discord</a>
        <span className="statusline-help"><kbd>?</kbd> shortcuts</span>
      </p>
    </footer>
  );
}
