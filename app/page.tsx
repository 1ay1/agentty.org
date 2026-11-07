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
        <ul className="home-facts">
          <li>Sandboxed shell: <code>bwrap</code> / <code>sandbox-exec</code>; <code>~/.ssh</code> stays out of reach.</li>
          <li>Switch provider or model mid-thread with <code>^P</code>, no restart.</li>
          <li>Runs in Zed over ACP; serves and consumes MCP.</li>
          <li>Air-gap a whole session over SSH: <code>agentty airgap user@host</code>.</li>
          <li>Saved threads, checkpoints you can rewind, subagents, local retrieval.</li>
        </ul>
      </section>

      <p className="home-links">
        <Link href="/docs">Docs</Link> · <Link href="/docs/quick-start">Quick start</Link> ·{" "}
        <Link href="/docs/providers">Providers</Link> ·{" "}
        <a href={repo.url} target="_blank" rel="noreferrer">GitHub ({starLabel})</a> ·{" "}
        <a href={site.discord} target="_blank" rel="noopener noreferrer">Discord</a> · MIT
      </p>
    </div>
  );
}
