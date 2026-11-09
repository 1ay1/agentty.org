import type { Metadata } from "next";
import Link from "next/link";
import bench from "@/lib/bench.generated.json";
import { BenchBars } from "@/components/BenchBars";
import { site } from "@/lib/site";

const URL = `${site.url}/benchmarks/`;
const TITLE = "Agent harness benchmarks: startup, memory, disk";
const DESCRIPTION =
  "Measured, not claimed: launch time, idle memory, disk footprint and startup of agentty, Claude Code, Codex CLI, Gemini CLI, opencode, jcode and Aider on one machine.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ["agent harness benchmark", "claude code startup time", "codex cli memory", "gemini cli slow", "opencode memory", "jcode benchmark", "coding agent benchmark"],
  alternates: { canonical: "/benchmarks/" },
  openGraph: { type: "article", title: TITLE, description: DESCRIPTION, url: URL },
};

const date = new Date(bench.measured).toISOString().slice(0, 10);
const ms = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${v.toFixed(1)} ms`);

export default function Benchmarks() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: TITLE,
    description: DESCRIPTION,
    url: URL,
    dateModified: bench.measured,
    creator: { "@type": "Organization", name: "agentty", url: site.url },
    license: "https://creativecommons.org/licenses/by/4.0/",
    variableMeasured: ["launch to ready (ms)", "idle memory (MB)", "disk with runtime (MB)", "--version startup (ms)"],
    measurementTechnique: bench.method,
  };
  return (
    <article className="page post">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/" aria-label="Home">~</Link>
        <span className="sep">/</span>
        <span className="cur">Benchmarks</span>
      </nav>
      <header className="post-head">
        <h1>Agent harness benchmarks</h1>
        <p className="post-meta">
          <time dateTime={bench.measured}>measured {date}</time>
          <span>{bench.tools.length} tools</span>
        </p>
        <p className="lead">
          What each <Link href="/agent-harness/">agent harness</Link> costs you before the model does any work:
          how long until you can type, how much memory it holds while it waits, and how much disk it needs.
          Same machine, fresh install, no login, every run interleaved across tools.
        </p>
      </header>

      <div className="doc-body">
        <BenchBars metrics={["ready", "rss", "disk", "startup"]} />

        <h2 id="all-numbers">All numbers</h2>
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>tool</th><th>version</th><th className="num">ready to type</th><th className="num">idle memory</th><th className="num">disk</th><th className="num"><code>--version</code></th></tr>
            </thead>
            <tbody>
              {bench.tools.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.version.replace(/^(agentty|aider|codex-cli)\s+/, "").replace(/\s*\(.*\)$/, "")}</td>
                  <td className="num">{ms(t.readyMs.median)} <span className="bench-range">({ms(t.readyMs.p10)}–{ms(t.readyMs.p90)})</span></td>
                  <td className="num">{t.idleRssMB} MB</td>
                  <td className="num">{t.diskMB} MB{t.runtime?.MB ? <span className="bench-range"> (incl. {Math.round(t.runtime.MB)} MB {t.runtime.name})</span> : null}</td>
                  <td className="num">{ms(t.startupMs.median)} <span className="bench-range">({ms(t.startupMs.p10)}–{ms(t.startupMs.p90)})</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Median, with the 10th–90th percentile range in brackets.</p>

        <h2 id="method">Method</h2>
        <ul>
          <li><strong>Ready to type:</strong> launch the interactive UI in a real pseudo-terminal and time until its first prompt is fully on screen, read from the rendered terminal (not raw output). Each tool first completes its one-time setup, so this is the launch a returning user sees. 10 timed launches.</li>
          <li><strong>Idle memory:</strong> resident memory of the whole process tree, 2 s after the prompt appears. jcode runs its UI as a client of a background server that it starts on first launch and leaves running; that server is counted in its memory, and it is already running for the timed launches, as it would be for a returning user.</li>
          <li><strong>Disk:</strong> everything the tool needs, as installed by its official method, including the Node.js runtime when it needs one. Aider&apos;s figure includes the Python 3.12 its installer sets up.</li>
          <li><strong><code>--version</code> startup:</strong> process start to exit, 3 warm-ups then 30 timed runs.</li>
          <li><strong>Fairness:</strong> a fresh, empty home directory per tool; no accounts, keys or network needed; runs interleaved round-robin so background load on the machine lands on every tool equally. Network access doesn&apos;t change the results.</li>
          <li><strong>Close results:</strong> agentty and jcode launch within the same range (see the brackets in the table); treat that as a tie, not a win.</li>
          <li><strong>Not measured:</strong> how well each agent solves tasks. That depends mostly on the model, and every harness here can use strong ones.</li>
        </ul>

        <h2 id="machine">Machine</h2>
        <p>
          {bench.machine.cpu} ({bench.machine.threads} threads), {bench.machine.memGB} GB RAM, {bench.machine.os}. A modest
          laptop-class CPU on purpose: startup costs that hide on a fast desktop show up here.
        </p>

        <h2 id="reproduce">Reproduce it</h2>
        <p>
          The script is <a href={`${site.github.replace("/agentty", "/agentty.org")}/blob/master/scripts/bench-agents.mjs`}>scripts/bench-agents.mjs</a>.
          Install each tool by its official method, then run it; it writes the JSON this page is built from.
        </p>
        <div className="codeblock">
          <div className="codeblock-head"><span>sh</span></div>
          <pre className="code"><code>node scripts/bench-agents.mjs ~/bench-agents</code></pre>
        </div>
      </div>
    </article>
  );
}
