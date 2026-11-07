import Link from "next/link";
import { site } from "@/lib/site";
import { stats } from "@/lib/stats";
import { repo, starLabel } from "@/lib/repo";
import { CopyRow } from "@/components/CopyRow";
import { ReplayDemo } from "@/components/ReplayDemo";

// Copy and heading structure are the original home page's (pre-redesign),
// kept verbatim for search ranking; only the presentation is minimal.
export default function Home() {
  return (
    <div className="home">
      <header className="home-head">
        <h1>Blazing-fast coding agent in your terminal.</h1>
        <p>
          A drop-in alternative to <code>claude-code</code>, written in C++26.
          A <strong>{stats.sizeMB} static binary</strong> with millisecond cold
          start, sandboxed by default, one-command SSH air-gap, and it runs
          inside Zed over ACP. Sign in with your existing
          Claude&nbsp;Pro/Max, ChatGPT, Copilot, or Kimi &mdash; or point it
          at DeepSeek, Gemini, Grok, OpenAI, Groq, or a local Ollama model.
          No Node, no Python, no <code>npm install</code>.
        </p>
        <p>
          <Link href="/docs/installation">Get started</Link> ·{" "}
          <Link href="/docs">Read the docs &rarr;</Link>
        </p>
      </header>

      <figure className="home-demo">
        <ReplayDemo />
        <figcaption>a real agentty session, replayed byte-for-byte from the terminal &mdash; fixing a failing test</figcaption>
      </figure>

      <section>
        <h2>Install in one line</h2>
        <CopyRow cmd={site.installOneLiner} />
        <p className="dim">
          No Node, no Python, no <code>npm install</code> — just a single {stats.sizeMB} static binary.
        </p>
      </section>

      <section>
        <dl className="facts">
          <dt>Single static binary</dt><dd>{stats.sizeMB}</dd>
          <dt>Cold start</dt><dd>{stats.coldStart}</dd>
          <dt>Runtime dependencies</dt><dd>0</dd>
          <dt>Native, no GC</dt><dd>C++26</dd>
          <dt>Stars on GitHub</dt><dd><a href={repo.url} target="_blank" rel="noreferrer">{starLabel}</a></dd>
        </dl>
        <p className="dim">
          Size &amp; cold-start are the Linux&nbsp;x86_64 build, measured on each deploy;
          other platforms vary — see the{" "}
          <Link href="/docs/installation#latest">per-platform download sizes</Link>.
        </p>
      </section>

      <section id="speed">
        <h2>Native, not interpreted.</h2>
        <p>
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
              <tr><td>Cold-start <code>--help</code></td><td>{stats.coldStart}</td><td>~150 ms</td></tr>
              <tr><td><code>--version</code></td><td>{stats.coldStart}</td><td>~60 ms</td></tr>
              <tr><td>Binary on disk</td><td>{stats.sizeMB}</td><td>222 MB (+ Node runtime)</td></tr>
              <tr><td>Install</td><td>curl | chmod +x</td><td>npm i -g + Node</td></tr>
              <tr><td>GC pauses mid-stream</td><td>None</td><td>V8 GC</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="features">
        <h2>Everything the official client does &mdash; and the things it doesn&apos;t.</h2>
        <p>A full coding agent, not a thin wrapper. Grouped by what you came for.</p>

        <div className="feat-group">
          <h3>Performance &amp; footprint</h3>
          <h4>Native speed</h4><p>C++26, statically linked, <code>posix_spawn</code> everywhere. Spawns in microseconds, no GC pauses mid-stream, no warmup. The redraw loop is a <code>poll(2)</code> over the model stream and your input fd &mdash; every keystroke lands on the next frame.</p>
          <h4>One static binary</h4><p>{stats.sizeMB}. <code>curl | chmod +x | run</code>. No Node runtime, no <code>npm install</code>, no version drift between machines.</p>
          <h4>Inline render</h4><p>Lives at the bottom of your terminal, preserves scrollback, never takes over the screen. Diffs, todos, and exit codes get purpose-built widgets.</p>
        </div>

        <div className="feat-group">
          <h3>Models &amp; auth</h3>
          <h4>Any model</h4><p>Claude by default via your Pro/Max subscription &mdash; or sign in with ChatGPT, Copilot, or Kimi, or key in DeepSeek, Gemini, Grok, GPT, Groq, OpenRouter, Together, Cerebras, and local Ollama. Switch backends and models live with <code>^P</code>&nbsp;/&nbsp;<code>^/</code>, no restart. <Link href="/docs/providers">Providers &rarr;</Link></p>
          <h4>Adjustable reasoning</h4><p>Dial thinking effort per model &mdash; fast answers for small edits, deep reasoning for hard refactors, without leaving the thread.</p>
          <h4>Paste images</h4><p>Drop a PNG/JPEG/GIF/WebP path or <code>^V</code> from the clipboard &mdash; screenshots, diagrams, and mockups go to the model inline.</p>
        </div>

        <div className="feat-group">
          <h3>Safety &amp; isolation</h3>
          <h4>Sandbox by default</h4><p>Every shell and build call runs inside <code>bwrap</code> (Linux) / <code>sandbox-exec</code> (macOS). Workspace, system libs, and network stay reachable; <code>~/.ssh</code>, <code>/etc</code>, and other projects are read-only. An approved bash call still can&apos;t <code>cat ~/.ssh/id_rsa</code>.</p>
          <h4>Permission profiles</h4><p>Start in <strong>Ask</strong>; <code>S-Tab</code> cycles to <strong>Write</strong> or <strong>Minimal</strong>. Every effect is gated by a compile-time permission matrix. <Link href="/docs/profiles">Profiles &rarr;</Link></p>
          <h4>Workspace boundary</h4><p>Filesystem tools refuse paths outside the launch directory. Opt out explicitly with <code>--workspace /</code>.</p>
        </div>

        <div className="feat-group">
          <h3>Workflow &amp; memory</h3>
          <h4>Smart Mode</h4><p>A self-supervised orchestrator that puts each turn on the model it deserves. Pin your <strong>flagship / mid / cheap</strong> models to <strong>Strategic / Implementation / Utility</strong> roles &mdash; the lead does the thinking and delegates mechanical work to subagents, reasoning effort scales to each turn&apos;s complexity, and a per-workspace prior <em>learns your repo</em> across sessions so routing gets sharper the more you use it. Everything toggleable; <strong>off is a byte-for-byte no-op</strong>. <Link href="/docs/smart-mode">Smart Mode &rarr;</Link></p>
          <h4>Learns your codebase</h4><p>Agent Skills teach it your conventions from a <code>SKILL.md</code>; <code>remember</code>/<code>forget</code> give it durable cross-session memory; <code>search_docs</code> runs a frontier-grade local <Link href="/docs/retrieval">retrieval engine</Link> over your knowledge corpus &mdash; hybrid BM25 + dense embeddings, HNSW ANN, GraphRAG expansion, and a learning loop that gets sharper the more you use it. All local, zero dependencies. Teach it once, every thread knows. <Link href="/docs/skills">Skills &rarr;</Link></p>
          <h4>Threads that persist</h4><p>Every conversation is a saved thread you reopen with <code>^J</code>. Long threads compact automatically so you never blow the context window mid-task.</p>
          <h4>Isolated subagents</h4><p>The <code>task</code> tool spawns a subagent with its own context window, then returns one condensed report &mdash; keeping your main thread focused.</p>
          <h4>Run code blocks</h4><p>When a reply hands you shell commands, <code>^G</code> runs one interactively on your real terminal &mdash; sudo prompts work, output streams live, <code>^C</code> kills the command not agentty.</p>
          <h4>Rewind to any checkpoint</h4><p>Every user turn in a git repo pins a worktree snapshot. The palette lists every checkpoint with a <code>N files &middot; +A &minus;D</code> summary of what&apos;s changed since, so <code>Enter</code> rewinds files <em>and</em> transcript &mdash; never blind.</p>
          <h4>Mentions &amp; palette</h4><p>Type <code>@</code> to mention a file, <code>#</code> to jump to a symbol, <code>/</code> or <code>^K</code> for the command palette. The composer knows your project.</p>
        </div>

        <div className="feat-group">
          <h3>Reach &amp; extensibility</h3>
          <h4>One-command SSH air-gap</h4><p><code>agentty airgap user@host</code> runs the agent on a box with no direct internet &mdash; your laptop relays the bytes over SOCKS5-over-SSH. TLS pins on the real upstreams end-to-end, so the network in between can&apos;t MITM you.</p>
          <h4>Runs inside Zed (ACP)</h4><p><code>agentty acp</code> speaks the Agent Client Protocol &mdash; a first-class agent panel in Zed with streaming text, inline diffs, and native permission prompts. Same engine as the TUI. <Link href="/docs/acp">Set it up &rarr;</Link></p>
          <h4>MCP, both ways</h4><p>Serve agentty&apos;s tools to any MCP client with <code>mcp-serve</code>, or consume other MCP servers from <code>.agentty/mcp.json</code> &mdash; their tools appear indistinguishable from native ones. <Link href="/docs/mcp">MCP &rarr;</Link></p>
        </div>
      </section>

      <section id="providers">
        <h2>Claude by default. Any model on demand.</h2>
        <p>
          Sign in once with your <strong>Claude Pro/Max</strong> subscription, or point
          agentty at any OpenAI-compatible backend. Switch live mid-thread with
          <code> ^P</code> &mdash; no restart, no re-auth.
        </p>
        <div className="tablewrap">
          <table>
            <tbody>
              <tr><td><code>agentty</code></td><td>Claude via OAuth (Pro/Max) or API key &mdash; the default</td></tr>
              <tr><td><code>--provider openai</code></td><td>GPT and o-series on <code>api.openai.com</code></td></tr>
              <tr><td><code>--provider groq</code></td><td>Llama/Mixtral on Groq LPUs &mdash; very fast</td></tr>
              <tr><td><code>--provider openrouter</code></td><td>Any model via <code>openrouter.ai</code></td></tr>
              <tr><td><code>--provider together</code></td><td>Open models on <code>together.ai</code></td></tr>
              <tr><td><code>--provider cerebras</code></td><td>Wafer-scale inference &mdash; very fast</td></tr>
              <tr><td><code>--provider ollama</code></td><td>Local models at <code>localhost:11434</code> &mdash; no key, no cloud</td></tr>
              <tr><td><code>--provider host:port</code></td><td>Any raw OpenAI-compatible endpoint</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Behind an enterprise gateway? <code>--auth-header X-API-Key</code> sends your key
          under a custom header instead of the standard bearer.
        </p>
        <p><Link href="/docs/providers">Providers &amp; models reference &rarr;</Link></p>
      </section>

      <section id="compare">
        <h2>The single-binary pick.</h2>
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th></th><th>agentty</th><th>claude-code</th><th>aider</th></tr>
            </thead>
            <tbody>
              <tr><td>Language / runtime</td><td>C++26 — static binary</td><td>TypeScript / Node</td><td>Python</td></tr>
              <tr><td>Footprint</td><td>{stats.sizeMB}</td><td>npm + Node runtime</td><td>pip + Python runtime</td></tr>
              <tr><td>Platforms</td><td>Linux · macOS · Windows</td><td>Linux · macOS · Windows</td><td>Linux · macOS · Windows</td></tr>
              <tr><td>Air-gapped mode</td><td>Yes (SOCKS5/SSH)</td><td>No</td><td>No</td></tr>
              <tr><td>Editor integration (ACP)</td><td>Yes (Zed)</td><td>Yes (Zed)</td><td>No</td></tr>
              <tr><td>Auth</td><td>OAuth (Pro/Max) + API key</td><td>OAuth + API key</td><td>per-provider env vars</td></tr>
              <tr><td>Models</td><td>Claude · ChatGPT · Copilot · Kimi · DeepSeek · Gemini · Grok · GPT · Groq · Ollama</td><td>Claude (Anthropic)</td><td>many providers</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="tools">
        <h2>A purpose-built widget for everything.</h2>
        <p>
          Diffs render as diffs, search groups by file, bash shows exit codes, todos
          become checklists. Every tool effect is gated by a compile-time permission matrix.
        </p>
        <div className="tablewrap">
          <table>
            <tbody>
              <tr><td><code>read · write · edit</code></td><td>File IO with atomic writes and diff rendering</td></tr>
              <tr><td><code>grep · glob · list_dir · find_definition</code></td><td>Search, listing, and symbol lookup across the codebase</td></tr>
              <tr><td><code>bash · diagnostics</code></td><td>Sandboxed shell and build, with exit codes</td></tr>
              <tr><td><code>git_status · git_diff · git_log · git_commit</code></td><td>Version control, rendered natively</td></tr>
              <tr><td><code>web_fetch · web_search</code></td><td>Reach the web for docs and APIs</td></tr>
              <tr><td><code>search_docs · search_code · skill · task</code></td><td>Local RAG over your knowledge corpus, semantic code search, on-demand skills, and isolated subagents</td></tr>
              <tr><td><code>todo · remember · forget · wipe_memory</code></td><td>Planning and durable cross-session memory</td></tr>
            </tbody>
          </table>
        </div>
        <p><Link href="/docs/tools">Full tool reference &rarr;</Link></p>
      </section>

      <section>
        <blockquote className="home-quote">
          &ldquo;No JIT warmup, no <code>require()</code> graph to walk, no GC ticking while
          bytes stream in from the API. The redraw loop is a <code>poll(2)</code> over the
          model stream and your input fd — every keystroke lands on the next frame.&rdquo;
          <span> — from the design notes</span>
        </blockquote>
      </section>

      <section id="open-source">
        <h2>Built in the open, MIT licensed.</h2>
        <div className="feat-group">
          <h3>Read the source</h3>
          <p>The reducer is one <code>std::visit</code> over a closed event sum; the view is a single <code>Model &rarr; Element</code> function; the permission matrix is a <code>constexpr</code> with <code>static_assert</code>s. Change a policy cell and the build breaks — not a test nobody runs. <a href={site.github} target="_blank" rel="noopener noreferrer">Browse the repo &rarr;</a></p>
          <h3>Get involved</h3>
          <p>Bug reports, fixes, and well-scoped features are all welcome. Start with the contributing guide. <Link href="/contributing">How to contribute &rarr;</Link></p>
          <h3>Join the community</h3>
          <p>Hang out in the Discord to ask questions, share sessions, and get help — there&apos;s an AI helper bot that answers agentty questions using the real agent. <a href={site.discord} target="_blank" rel="noopener noreferrer">Join the Discord &rarr;</a></p>
        </div>
      </section>

      <section>
        <h2>Ready in one line.</h2>
        <p>Linux, macOS &amp; Windows · x86_64 &amp; aarch64. The same line updates it.</p>
        <CopyRow cmd={site.installOneLiner} />
        <p>
          <Link href="/docs/quick-start">Quick start guide</Link> ·{" "}
          <a href={site.discord} target="_blank" rel="noopener noreferrer">Join the Discord &rarr;</a> ·{" "}
          <a href={site.github} target="_blank" rel="noopener noreferrer">Star on GitHub &rarr;</a>
        </p>
      </section>
    </div>
  );
}
