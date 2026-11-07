import Link from "next/link";
import { site } from "@/lib/site";
import { stats } from "@/lib/stats";
import { repo, starLabel } from "@/lib/repo";
import { CopyRow } from "@/components/CopyRow";
import { ReplayTerminal } from "@/components/ReplayTerminal";

export default function Home() {
  return (
    <div className="home">
      <header className="home-head">
        <h1>agentty</h1>
        <p className="home-tag">A fast coding agent for your terminal, written in C++26.</p>
        <p>
          A drop-in alternative to <code>claude-code</code>: one {stats.sizeMB} static
          binary, millisecond cold start, sandboxed by default. Sign in with Claude
          Pro/Max, ChatGPT, Copilot, or Kimi &mdash; or point it at DeepSeek, Gemini,
          Grok, OpenAI, Groq, or a local Ollama model. No Node, no Python,
          no <code>npm install</code>.
        </p>
      </header>

      <figure className="home-demo">
        <ReplayTerminal />
        <figcaption>a real agentty session, replayed byte-for-byte from the terminal &mdash; fixing a failing test</figcaption>
      </figure>

      <section>
        <h2>Install</h2>
        <CopyRow cmd={site.installOneLiner} />
        <p className="dim">
          Linux, macOS &amp; Windows · x86_64 &amp; aarch64. The same line updates it.{" "}
          <Link href="/docs/installation">Other install methods</Link> ·{" "}
          <Link href="/docs/quick-start">Quick start</Link>
        </p>
      </section>

      <section>
        <h2>At a glance</h2>
        <dl className="facts">
          <dt>binary</dt><dd>{stats.sizeMB}, statically linked</dd>
          <dt>cold start</dt><dd>{stats.coldStart}</dd>
          <dt>runtime deps</dt><dd>0</dd>
          <dt>language</dt><dd>C++26, no GC</dd>
          <dt>license</dt><dd>{site.license}</dd>
          <dt>stars</dt><dd><a href={repo.url} target="_blank" rel="noreferrer">{starLabel}</a></dd>
        </dl>
        <p className="dim">
          Linux x86_64 build, measured on each deploy &mdash;{" "}
          <Link href="/docs/installation#latest">other platforms</Link>.
        </p>
      </section>

      <section id="speed">
        <h2>Speed</h2>
        <p>
          Same box, same shell, same day. No JIT warmup, no <code>require()</code> graph
          to walk, no GC ticking while bytes stream in.
        </p>
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th></th><th>agentty</th><th>claude-code</th></tr>
            </thead>
            <tbody>
              <tr><td>cold start <code>--help</code></td><td>{stats.coldStart}</td><td>~150 ms</td></tr>
              <tr><td><code>--version</code></td><td>{stats.coldStart}</td><td>~60 ms</td></tr>
              <tr><td>binary on disk</td><td>{stats.sizeMB}</td><td>222 MB + Node</td></tr>
              <tr><td>install</td><td>curl | chmod +x</td><td>npm i -g + Node</td></tr>
              <tr><td>GC pauses</td><td>none</td><td>V8 GC</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="features">
        <h2>Features</h2>
        <ul className="feats">
          <li><b>Any model.</b> Claude via Pro/Max by default; ChatGPT, Copilot, Kimi, DeepSeek, Gemini, Grok, GPT, Groq, OpenRouter, Together, Cerebras, Ollama. Switch live with <code>^P</code>. <Link href="/docs/providers">providers</Link></li>
          <li><b>Sandboxed shell.</b> Every bash/build call runs in <code>bwrap</code> (Linux) or <code>sandbox-exec</code> (macOS); <code>~/.ssh</code> and <code>/etc</code> are read-only.</li>
          <li><b>Permission profiles.</b> Ask / Write / Minimal, enforced by a compile-time permission matrix. <Link href="/docs/profiles">profiles</Link></li>
          <li><b>Smart Mode.</b> Routes each turn to a flagship, mid, or cheap model and learns your repo over time. Off is a byte-for-byte no-op. <Link href="/docs/smart-mode">smart mode</Link></li>
          <li><b>Memory &amp; skills.</b> <code>SKILL.md</code> conventions, <code>remember</code>/<code>forget</code>, and a local <Link href="/docs/retrieval">retrieval engine</Link> (BM25 + embeddings + HNSW).</li>
          <li><b>Threads &amp; checkpoints.</b> Saved threads (<code>^J</code>), auto-compaction, and rewind to any turn&apos;s worktree snapshot.</li>
          <li><b>Subagents.</b> <code>task</code> runs work in an isolated context and returns one report.</li>
          <li><b>SSH air-gap.</b> <code>agentty airgap user@host</code> runs on a box with no internet, relayed over SOCKS5-over-SSH.</li>
          <li><b>Zed (ACP) &amp; MCP.</b> <code>agentty acp</code> for Zed&apos;s agent panel; serve or consume MCP tools. <Link href="/docs/acp">acp</Link> · <Link href="/docs/mcp">mcp</Link></li>
          <li><b>Inline render.</b> Lives at the bottom of your terminal and keeps scrollback.</li>
        </ul>
      </section>

      <section id="providers">
        <h2>Providers</h2>
        <div className="tablewrap">
          <table>
            <tbody>
              <tr><td><code>agentty</code></td><td>Claude via OAuth (Pro/Max) or API key</td></tr>
              <tr><td><code>--provider openai</code></td><td>GPT and o-series</td></tr>
              <tr><td><code>--provider groq</code></td><td>Groq LPUs</td></tr>
              <tr><td><code>--provider openrouter</code></td><td>any model via openrouter.ai</td></tr>
              <tr><td><code>--provider together</code></td><td>open models on together.ai</td></tr>
              <tr><td><code>--provider cerebras</code></td><td>wafer-scale inference</td></tr>
              <tr><td><code>--provider ollama</code></td><td>local, <code>localhost:11434</code></td></tr>
              <tr><td><code>--provider host:port</code></td><td>any OpenAI-compatible endpoint</td></tr>
            </tbody>
          </table>
        </div>
        <p className="dim">
          Behind a gateway? <code>--auth-header X-API-Key</code> sends the key under a custom header.
        </p>
      </section>

      <section id="compare">
        <h2>Compared</h2>
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th></th><th>agentty</th><th>claude-code</th><th>aider</th></tr>
            </thead>
            <tbody>
              <tr><td>runtime</td><td>C++26 static binary</td><td>Node</td><td>Python</td></tr>
              <tr><td>footprint</td><td>{stats.sizeMB}</td><td>npm + Node</td><td>pip + Python</td></tr>
              <tr><td>air-gapped</td><td>yes (SOCKS5/SSH)</td><td>no</td><td>no</td></tr>
              <tr><td>Zed (ACP)</td><td>yes</td><td>yes</td><td>no</td></tr>
              <tr><td>models</td><td>Claude, GPT, Gemini, Grok, DeepSeek, Kimi, Ollama, &hellip;</td><td>Claude</td><td>many</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="tools">
        <h2>Tools</h2>
        <div className="tablewrap">
          <table>
            <tbody>
              <tr><td><code>read write edit</code></td><td>atomic file IO with diffs</td></tr>
              <tr><td><code>grep glob list_dir find_definition</code></td><td>search and symbol lookup</td></tr>
              <tr><td><code>bash diagnostics</code></td><td>sandboxed shell and build</td></tr>
              <tr><td><code>git_status git_diff git_log git_commit</code></td><td>version control</td></tr>
              <tr><td><code>web_fetch web_search</code></td><td>docs and APIs</td></tr>
              <tr><td><code>search_docs search_code skill task</code></td><td>local RAG, code search, skills, subagents</td></tr>
              <tr><td><code>todo remember forget</code></td><td>planning and memory</td></tr>
            </tbody>
          </table>
        </div>
        <p><Link href="/docs/tools">Full tool reference</Link></p>
      </section>

      <section id="open-source">
        <h2>Source</h2>
        <p>
          MIT licensed. The reducer is one <code>std::visit</code> over a closed event sum;
          the view is a single <code>Model &rarr; Element</code> function; the permission
          matrix is a <code>constexpr</code> with <code>static_assert</code>s.
        </p>
        <p>
          <a href={site.github} target="_blank" rel="noopener noreferrer">GitHub</a> ·{" "}
          <Link href="/contributing">Contributing</Link> ·{" "}
          <a href={site.discord} target="_blank" rel="noopener noreferrer">Discord</a> ·{" "}
          <Link href="/blog">Blog</Link> ·{" "}
          <Link href="/changelog">Changelog</Link>
        </p>
      </section>
    </div>
  );
}
