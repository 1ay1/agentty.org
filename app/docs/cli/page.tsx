import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code } from "@/components/Doc";

export const metadata: Metadata = {
  title: "CLI Reference",
  description: "Every agentty subcommand and flag.",
  alternates: { canonical: "/docs/cli" },
};

export default function Cli() {
  return (
    <>
      <Breadcrumb title="CLI Reference" />
      <h1>CLI Reference</h1>
      <p className="lead">agentty is one binary with a handful of subcommands and flags.</p>

      <h2 id="run">Running</h2>
      <Code>{`agentty                                # run in the current directory
agentty -w ~/code/project              # run against another workspace
agentty -m claude-opus-4-5             # pick a model for the session
agentty --provider openai -m gpt-4o    # run against a different backend
agentty --provider ollama              # local model, no key, no cloud
agentty -k sk-ant-…                     # single-session key, never written to disk
agentty --sandbox on                   # require an OS sandbox for bash/diagnostics`}</Code>

      <h2 id="subcommands">Subcommands</h2>
      <div className="tablewrap" style={{ marginBottom: 24 }}>
        <table>
          <thead><tr><th>Command</th><th>What it does</th></tr></thead>
          <tbody>
            <tr><td className="mono"><code>agentty</code></td><td>Start an interactive thread in the workspace.</td></tr>
            <tr><td className="mono"><code>agentty login</code></td><td>Authenticate non-interactively (useful over SSH).</td></tr>
            <tr><td className="mono"><code>agentty logout</code></td><td>Clear stored credentials.</td></tr>
            <tr><td className="mono"><code>agentty status</code></td><td>Print which auth source will be used.</td></tr>
            <tr><td className="mono"><code>agentty airgap user@host</code></td><td>Run the agent on a remote host through an SSH SOCKS tunnel.</td></tr>
            <tr><td className="mono"><code>agentty acp</code></td><td>Run headless as an <a href="/docs/acp">Agent Client Protocol</a> agent for Zed (JSON-RPC over stdio).</td></tr>
            <tr><td className="mono"><code>agentty mcp-serve</code></td><td>Serve agentty&apos;s native tools over <a href="/docs/mcp">MCP</a> (stdio). Point any MCP client at it.</td></tr>
            <tr><td className="mono"><code>agentty skills</code></td><td>List discovered <a href="/docs/skills">Agent Skills</a> with spec-lint diagnostics (exit 1 on warnings — CI-friendly).</td></tr>
            <tr><td className="mono"><code>agentty --version</code></td><td>Print <code>agentty &lt;version&gt;</code> and exit.</td></tr>
            <tr><td className="mono"><code>agentty --help</code></td><td>Print usage and exit.</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="palette">Command palette</h2>
      <p>
        Inside a thread there are no typed <code>/command</code> literals — press{" "}
        <code>^K</code> (or <code>/</code> on an empty composer) to open a fuzzy command
        palette. The fixed command set:
      </p>
      <div className="tablewrap" style={{ marginBottom: 24 }}>
        <table>
          <thead><tr><th>Command</th><th>What it does</th></tr></thead>
          <tbody>
            <tr><td>New thread</td><td>Start a fresh conversation.</td></tr>
            <tr><td>Compact context</td><td>Replace history with a structured summary to reclaim the context window.</td></tr>
            <tr><td>Review changes</td><td>Open the diff review pane (also <code>^R</code>).</td></tr>
            <tr><td>Accept all / Reject all changes</td><td>Apply or discard every pending hunk.</td></tr>
            <tr><td>Rewind to checkpoint</td><td>Jump to an earlier turn&apos;s worktree snapshot via a diff-preview picker (git repo + idle session; see <a href="/docs/threads#checkpoints">Checkpoints</a>).</td></tr>
            <tr><td>Cycle profile</td><td>Ask → Minimal → Write (also <code>S-Tab</code>).</td></tr>
            <tr><td>Open model picker / Switch provider</td><td>Change the active model (<code>^/</code>) or backend (<code>^P</code>).</td></tr>
            <tr><td>Open threads / Open plan</td><td>Browse saved conversations (<code>^J</code>) or view the todo plan (<code>^T</code>).</td></tr>
            <tr><td>Run code block</td><td>Run a fenced block from the last reply (<code>^G</code>).</td></tr>
            <tr><td>Login / Quit</td><td>Sign in, or exit agentty.</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="flags">Options</h2>
      <p>These mirror <code>agentty --help</code> exactly.</p>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Flag</th><th>Effect</th></tr></thead>
          <tbody>
            <tr><td className="mono"><code>-k</code>, <code>--key &lt;key&gt;</code></td><td>API-key override for this session; never written to disk.</td></tr>
            <tr><td className="mono"><code>-m</code>, <code>--model &lt;id&gt;</code></td><td>Model id for the session (e.g. <code>claude-opus-4-5</code>).</td></tr>
            <tr><td className="mono"><code>--provider &lt;p&gt;</code></td><td>LLM backend: <code>anthropic</code> (default) or an OpenAI-compatible one — <code>openai</code> · <code>groq</code> · <code>openrouter</code> · <code>together</code> · <code>cerebras</code> · <code>ollama</code>, or a raw <code>host:port</code>. Persisted like <code>-m</code>; switch live with <code>^P</code>. See <a href="/docs/providers">Providers &amp; Models</a>.</td></tr>
            <tr><td className="mono"><code>-p</code>, <code>--profile &lt;mode&gt;</code></td><td>ACP permission tier (Zed shows the prompts): <code>ask</code> (default) · <code>minimal</code> (also prompt reads) · <code>write</code> (never prompt reads).</td></tr>
            <tr><td className="mono"><code>-w</code>, <code>--workspace &lt;dir&gt;</code></td><td>Sandbox filesystem tools to this directory (default: cwd). Tools refuse paths outside it. Pass <code>--workspace /</code> to disable the gate.</td></tr>
            <tr><td className="mono"><code>--sandbox &lt;mode&gt;</code></td><td>Wrap <code>bash</code>/<code>diagnostics</code> in an OS-native sandbox. <code>auto</code> (default) · <code>on</code> (require a backend) · <code>off</code> (disable).</td></tr>
            <tr><td className="mono"><code>-V</code>, <code>--version</code></td><td>Print the agentty version and exit.</td></tr>
            <tr><td className="mono"><code>-h</code>, <code>--help</code></td><td>Show usage and exit.</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="airgap-flags">Air-gap flags</h2>
      <p>Passed to <code>agentty airgap</code> — see <code>agentty airgap --help</code>.</p>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Flag</th><th>Effect</th></tr></thead>
          <tbody>
            <tr><td className="mono"><code>--setup</code></td><td>Copy credentials to the remote on first run.</td></tr>
            <tr><td className="mono"><code>--acp</code></td><td>Print a ready-to-paste Zed <code>agent_servers</code> config that tunnels <code>agentty acp</code> over ssh stdio. Flags after it are forwarded to the remote agent. See <a href="/docs/acp#airgap">Zed / ACP</a>.</td></tr>
            <tr><td className="mono"><code>--remote-agentty &lt;path&gt;</code></td><td>Path to agentty on the remote if it isn&apos;t on <code>PATH</code>.</td></tr>
          </tbody>
        </table>
      </div>

      <DocNav current="/docs/cli" />
      <EditThisPage path="app/docs/cli/page.tsx" />
    </>
  );
}
