import Link from "next/link";
import { site } from "@/lib/site";
import { stats } from "@/lib/stats";
import { CopyRow } from "@/components/CopyRow";
import { CountUp } from "@/components/CountUp";
import { AgenttyTui } from "@/components/AgenttyTui";
import { AgenttyLogo } from "@/components/AgenttyLogo";
import { HeroBackgroundLazy } from "@/components/HeroBackgroundLazy";

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="hero">
      <HeroBackgroundLazy />
        <div className="wrap hero-grid">
          <div className="hero-inner">
            <div className="hero-logo">
              <AgenttyLogo />
            </div>
            <h1>
              Blazing-fast <span className="grad">Claude</span>
              <br /> in your terminal.
            </h1>
            <p className="lede">
              A drop-in alternative to <code>claude-code</code>, written in C++26.{" "}
              <strong>{stats.sizeMB}&nbsp;binary</strong>, <strong>millisecond cold start</strong>,{" "}
              <strong>sandboxed by default</strong>, SSH air-gap in one command. Signs in with your
              existing <strong>Claude Pro/Max</strong> &mdash; no Node, Python, Electron, or{" "}
              <code>npm install</code>.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/docs/installation" data-magnetic>
                Get started
              </Link>
              <Link className="btn btn-ghost" href="/docs" data-magnetic>
                Read the docs →
              </Link>
            </div>
          </div>

          <div className="hero-tui">
            <AgenttyTui />
          </div>
        </div>
      </section>

      {/* INSTALL */}
      <section className="install-band">
        <div className="wrap install-inner">
          <p className="install-kicker">Install in one line</p>
          <CopyRow cmd={site.installOneLiner} typed />
          <p className="install-note">
            No Node, no Python, no <code>npm install</code> — just a single {stats.sizeMB} static binary.
          </p>
        </div>
      </section>

      {/* STATS */}
      <section className="block" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <div className="stats">
            <div className="stat" data-reveal><CountUp value={stats.sizeMB} /><div className="lbl">Single static binary</div></div>
            <div className="stat" data-reveal><CountUp value={stats.coldStart} /><div className="lbl">Cold start</div></div>
            <div className="stat" data-reveal><CountUp value="0" /><div className="lbl">Runtime dependencies</div></div>
            <div className="stat" data-reveal><div className="num">C++26</div><div className="lbl">Native, no GC</div></div>
          </div>
          <p className="stats-note">
            Size &amp; cold-start are the Linux&nbsp;x86_64 build, measured on each deploy;
            other platforms vary — see the{" "}
            <Link href="/docs/installation#latest">per-platform download sizes</Link>.
          </p>
        </div>
      </section>

      {/* SPEED */}
      <section className="block" id="speed">
        <div className="wrap">
          <p className="eyebrow">Speed</p>
          <h2 className="section-title">Native, not interpreted.</h2>
          <p className="section-sub">
            Measured on the same Arch box, same shell, same day. No JIT warmup, no
            <code> require()</code> graph to walk, no GC ticking while bytes stream in.
            Figures are the Linux&nbsp;x86_64 build &mdash; <Link href="/docs/installation#latest">other platforms here</Link>.
          </p>
          <div className="tablewrap">
            <table>
              <thead>
                <tr><th></th><th>agentty (C++26)</th><th>claude-code (Node)</th></tr>
              </thead>
              <tbody>
                <tr><td>Cold-start <code>--help</code></td><td><span className="win">{stats.coldStart}</span></td><td>~150 ms</td></tr>
                <tr><td><code>--version</code></td><td><span className="win">{stats.coldStart}</span></td><td>~60 ms</td></tr>
                <tr><td>Binary on disk</td><td><span className="win">{stats.sizeMB}</span></td><td>222 MB (+ Node runtime)</td></tr>
                <tr><td>Install</td><td><span className="win">curl | chmod +x</span></td><td>npm i -g + Node</td></tr>
                <tr><td>GC pauses mid-stream</td><td><span className="win">None</span></td><td>V8 GC</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="block" id="features">
        <div className="wrap">
          <p className="eyebrow">Why agentty</p>
          <h2 className="section-title">Four things the official client doesn&apos;t try to do.</h2>
          <div className="grid grid-3" style={{ marginTop: 28 }}>
            <div className="card tilt" data-reveal><span className="ico">⚡</span><h3>Native speed</h3><p>C++26, statically linked, <code>posix_spawn</code> everywhere. Spawns in microseconds, no GC pauses mid-stream, no warmup.</p></div>
            <div className="card tilt" data-reveal><span className="ico">📦</span><h3>One static binary</h3><p>{stats.sizeMB}. <code>curl | chmod +x | run</code>. No Node runtime, no <code>npm install</code>, no version drift between machines.</p></div>
            <div className="card tilt" data-reveal><span className="ico">🛡️</span><h3>Sandbox by default</h3><p>Every shell and build call runs inside <code>bwrap</code> (Linux) / <code>sandbox-exec</code> (macOS). Workspace, system libs, and network stay reachable; <code>~/.ssh</code>, <code>/etc</code>, and other projects are read-only. An approved bash call still can&apos;t <code>cat ~/.ssh/id_rsa</code>.</p></div>
            <div className="card tilt" data-reveal><span className="ico">🔌</span><h3>One-command SSH air-gap</h3><p><code>agentty airgap user@host</code> runs the agent on a box with no direct internet — your laptop relays the bytes over SOCKS5-over-SSH. TLS pins on the real upstreams end-to-end, so the network in between can&apos;t MITM you.</p></div>
            <div className="card tilt" data-reveal><span className="ico">📐</span><h3>Workspace boundary</h3><p>Filesystem tools refuse paths outside the launch directory. Opt out explicitly with <code>--workspace /</code>.</p></div>
            <div className="card tilt" data-reveal><span className="ico">📜</span><h3>Inline render</h3><p>Lives at the bottom of your terminal, preserves scrollback, never takes over the screen.</p></div>
          </div>
        </div>
      </section>

      {/* COMPARE */}
      <section className="block" id="compare">
        <div className="wrap">
          <p className="eyebrow">How it compares</p>
          <h2 className="section-title">The single-binary pick.</h2>
          <div className="tablewrap">
            <table>
              <thead>
                <tr><th></th><th>agentty</th><th>claude-code</th><th>aider</th></tr>
              </thead>
              <tbody>
                <tr><td>Language / runtime</td><td><span className="win">C++26 — static binary</span></td><td>TypeScript / Node</td><td>Python</td></tr>
                <tr><td>Footprint</td><td><span className="win">~9 MB</span></td><td>npm + Node runtime</td><td>pip + Python runtime</td></tr>
                <tr><td>Platforms</td><td><span className="win">Linux · macOS · Windows</span></td><td>Linux · macOS · Windows</td><td>Linux · macOS · Windows</td></tr>
                <tr><td>Air-gapped mode</td><td><span className="win">Yes (SOCKS5/SSH)</span></td><td>No</td><td>No</td></tr>
                <tr><td>Auth</td><td>OAuth (Pro/Max) + API key</td><td>OAuth + API key</td><td>per-provider env vars</td></tr>
                <tr><td>Models</td><td>Claude (Anthropic)</td><td>Claude (Anthropic)</td><td>many providers</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* TOOLS */}
      <section className="block" id="tools">
        <div className="wrap">
          <p className="eyebrow">Tools</p>
          <h2 className="section-title">A purpose-built widget for everything.</h2>
          <p className="section-sub">
            Diffs render as diffs, search groups by file, bash shows exit codes, todos
            become checklists. Every tool effect is gated by a compile-time permission matrix.
          </p>
          <div className="tablewrap">
            <table>
              <tbody>
                <tr><td className="mono"><code>read · write · edit</code></td><td>File IO with atomic writes and diff rendering</td></tr>
                <tr><td className="mono"><code>grep · glob · find_definition</code></td><td>Search and symbol lookup across the codebase</td></tr>
                <tr><td className="mono"><code>bash · diagnostics</code></td><td>Sandboxed shell and build, with exit codes</td></tr>
                <tr><td className="mono"><code>git_status · git_diff · git_log · git_commit</code></td><td>Version control, rendered natively</td></tr>
                <tr><td className="mono"><code>web_fetch · web_search</code></td><td>Reach the web for docs and APIs</td></tr>
                <tr><td className="mono"><code>todo · remember · forget</code></td><td>Planning and durable cross-session memory</td></tr>
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 18 }}>
            <Link href="/docs/tools">Full tool reference →</Link>
          </p>
        </div>
      </section>

      {/* QUOTE */}
      <section className="block">
        <div className="wrap">
          <blockquote className="quote">
            &ldquo;No JIT warmup, no <code>require()</code> graph to walk, no GC ticking while
            bytes stream in from the API. The redraw loop is a <code>poll(2)</code> over the
            model stream and your input fd — every keystroke lands on the next frame.&rdquo;
            <span className="by">— from the design notes</span>
          </blockquote>
        </div>
      </section>

      {/* OPEN SOURCE */}
      <section className="block" id="open-source">
        <div className="wrap">
          <p className="eyebrow">Open source</p>
          <h2 className="section-title">Built in the open, MIT licensed.</h2>
          <div className="boxrow" style={{ marginTop: 28 }}>
            <div className="bigbox tilt" data-reveal>
              <h3>Read the source</h3>
              <p>The reducer is one <code>std::visit</code> over a closed event sum; the view is a single <code>Model &rarr; Element</code> function; the permission matrix is a <code>constexpr</code> with <code>static_assert</code>s. Change a policy cell and the build breaks — not a test nobody runs.</p>
              <a className="btn btn-ghost" href={site.github} target="_blank" rel="noopener noreferrer" data-magnetic>Browse the repo →</a>
            </div>
            <div className="bigbox tilt" data-reveal>
              <h3>Get involved</h3>
              <p>Bug reports, fixes, and well-scoped features are all welcome. Start with the contributing guide.</p>
              <Link className="btn btn-ghost" href="/contributing" data-magnetic>How to contribute →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-mesh" aria-hidden />
        <div className="wrap">
          <h2>Ready in one line.</h2>
          <p>Linux, macOS &amp; Windows · x86_64 &amp; aarch64. The same line updates it.</p>
          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            <CopyRow cmd={site.installOneLiner} />
          </div>
          <div className="hero-actions" style={{ justifyContent: "center", marginTop: 26 }}>
            <Link className="btn btn-primary" href="/docs/quick-start" data-magnetic>Quick start guide</Link>
            <a className="btn btn-ghost" href={site.github} target="_blank" rel="noopener noreferrer" data-magnetic>Star on GitHub →</a>
          </div>
        </div>
      </section>
    </>
  );
}
