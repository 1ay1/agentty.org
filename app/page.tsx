import Link from "next/link";
import { site } from "@/lib/site";
import { repo, starLabel } from "@/lib/repo";
import { CopyRow } from "@/components/CopyRow";
import { ReplayDemo } from "@/components/ReplayDemo";
import { BenchBars } from "@/components/BenchBars";
import { AgenttyLogo } from "@/components/AgenttyLogo";

export default function Home() {
  return (
    <div className="home">
      <header className="home-head">
        <div className="home-logo"><AgenttyLogo /></div>
        <h1>Blazing-fast <Link href="/agent-harness/">agent harness</Link> for your terminal.</h1>
        <p>One small binary, any model.</p>
      </header>

      <figure className="home-demo">
        <ReplayDemo />
        <figcaption>a real agentty session, replayed from the terminal</figcaption>
      </figure>

      <section className="home-bench" aria-label="Benchmarks">
        <BenchBars metrics={["ready", "rss"]} />
      </section>

      <section className="home-info">
        <dl className="home-facts">
          <dt>install</dt>
          <dd className="home-install">
            <CopyRow cmd={site.installOneLiner} />
            <span>Linux, macOS, Windows · x86_64 &amp; aarch64 · same line updates it</span>
          </dd>
          <dt>sandbox</dt><dd>kernel-enforced by claybin; <code>~/.ssh</code>, <code>~/.aws</code>, <code>.env</code> masked</dd>
          <dt>models</dt><dd>switch live: <kbd>^P</kbd> provider, <kbd>^/</kbd> model</dd>
          <dt>editors</dt><dd>Zed over ACP; MCP both ways</dd>
          <dt>air-gap</dt><dd><code>agentty airgap user@host</code> over SSH</dd>
          <dt>memory</dt><dd>threads, checkpoints, subagents, local retrieval</dd>
        </dl>
      </section>

      <nav className="home-links" aria-label="More">
        <Link href="/docs/">docs</Link>
        <Link href="/docs/quick-start/">quick start</Link>
        <Link href="/docs/providers/">providers</Link>
        <a href={repo.url} target="_blank" rel="noreferrer">github <span>{starLabel}</span></a>
        <a href={site.discord} target="_blank" rel="noopener noreferrer">discord</a>
        <Link href="/blog/">blog</Link>
        <Link href="/guides/">guides</Link>
        <Link href="/changelog/">changelog</Link>
        <span className="home-license">
          MIT · <Link href="/license/">license</Link> · <Link href="/security/">security</Link> ·{" "}
          <Link href="/acknowledgements/">acknowledgements</Link> · <Link href="/code-of-conduct/">code of conduct</Link>
        </span>
      </nav>
    </div>
  );
}
