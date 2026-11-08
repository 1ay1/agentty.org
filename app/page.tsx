import Link from "next/link";
import { site } from "@/lib/site";
import { repo, starLabel } from "@/lib/repo";
import { CopyRow } from "@/components/CopyRow";
import { ReplayDemo } from "@/components/ReplayDemo";
import { AgenttyLogo } from "@/components/AgenttyLogo";

export default function Home() {
  return (
    <div className="home">
      <header className="home-head">
        <div className="home-logo"><AgenttyLogo /></div>
        <h1>Blazing-fast coding agent in your terminal.</h1>
        <p>One small binary, any model.</p>
      </header>

      <figure className="home-demo">
        <ReplayDemo />
        <figcaption>a real agentty session, replayed from the terminal</figcaption>
      </figure>

      <section>
        <h2>Install</h2>
        <CopyRow cmd={site.installOneLiner} />
        <p className="dim">Linux, macOS, Windows · x86_64 &amp; aarch64. Same line updates it.</p>
      </section>

      <section>
        <dl className="home-facts">
          <dt>sandbox</dt><dd>every shell call runs in <code>bwrap</code> / <code>sandbox-exec</code>; <code>~/.ssh</code> stays out of reach</dd>
          <dt>models</dt><dd>switch provider or model mid-thread with <kbd>^P</kbd>, no restart</dd>
          <dt>editors</dt><dd>runs in Zed over ACP; serves and consumes MCP</dd>
          <dt>air-gap</dt><dd><code>agentty airgap user@host</code> runs a whole session over SSH</dd>
          <dt>memory</dt><dd>saved threads, rewindable checkpoints, subagents, local retrieval</dd>
        </dl>
      </section>

      <nav className="home-links" aria-label="More">
        <Link href="/docs">docs</Link>
        <Link href="/docs/quick-start">quick start</Link>
        <Link href="/docs/providers">providers</Link>
        <a href={repo.url} target="_blank" rel="noreferrer">github <span>{starLabel}</span></a>
        <a href={site.discord} target="_blank" rel="noopener noreferrer">discord</a>
        <span className="home-license">MIT</span>
      </nav>
    </div>
  );
}
