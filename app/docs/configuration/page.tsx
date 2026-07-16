import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code } from "@/components/Doc";

export const metadata: Metadata = {
  title: "Configuration",
  description: "Environment variables and on-disk paths agentty reads.",
  alternates: { canonical: "/docs/configuration" },
};

const envs: [string, string][] = [
  ["ANTHROPIC_API_KEY", "Claude API key used when no -k flag is passed. Second-highest priority in credential resolution."],
  ["CLAUDE_CODE_OAUTH_TOKEN", "OAuth token from the env (reuses Claude Code's token) — below API key but above on-disk creds. No refresh token."],
  ["OPENAI_API_KEY", "Key for --provider openai, and the fallback key for every other OpenAI-compatible provider."],
  ["GROQ_API_KEY / OPENROUTER_API_KEY / TOGETHER_API_KEY / CEREBRAS_API_KEY", "Provider-specific keys, checked before OPENAI_API_KEY for that provider. Ollama needs none."],
  ["AGENTTY_SOCKS_PROXY", "Route all TCP through this SOCKS5 proxy host:port (set automatically by airgap mode)."],
  ["AGENTTY_API_HOST", "Override the API host (host[:port]) — dial a different upstream while keeping TLS pinning."],
  ["AGENTTY_OAUTH_HOST", "Override the OAuth host (host[:port])."],
  ["AGENTTY_INSECURE", "Set to 1 to skip TLS peer verification. Last-resort only — never ship it."],
  ["AGENTTY_AIRGAP_SSH", "Extra flags injected into the ssh invocation for airgap (laptop side)."],
  ["AGENTTY_CLIPBOARD_CMD", "Shell command that writes image bytes to stdout — used for Ctrl+V image paste over SSH."],
  ["AGENTTY_MCP_CONFIG", "Explicit path to an mcp.json, overriding the project/user lookup."],
  ["AGENTTY_MCP_ALLOW_PROJECT", "Set truthy to trust a project-local .agentty/mcp.json (gated off by default)."],
  ["AGENTTY_DOCS_DIR", "Folder of documents to index for the search_docs RAG tool (defaults to ./docs)."],
  ["AGENTTY_EMBED_MODEL / AGENTTY_OLLAMA_HOST", "Embedding model + Ollama host for the local search_docs RAG pipeline."],
  ["AGENTTY_DEBUG_API / AGENTTY_DEBUG_FILE", "Set AGENTTY_DEBUG_API=1 to dump streaming provider events to AGENTTY_DEBUG_FILE."],
  ["SSL_CERT_FILE / SSL_CERT_DIR / CURL_CA_BUNDLE", "Override the TLS root store agentty trusts (standard OpenSSL vars)."],
];

export default function Configuration() {
  return (
    <>
      <Breadcrumb title="Configuration" />
      <h1>Configuration</h1>
      <p className="lead">
        agentty is configured through flags, environment variables, and two on-disk paths.
        There is no sprawling config file to learn.
      </p>

      <h2 id="env">Environment variables</h2>
      <div className="tablewrap" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr><th style={{ whiteSpace: "nowrap" }}>Variable</th><th>Effect</th></tr>
          </thead>
          <tbody>
            {envs.map(([k, d]) => (
              <tr key={k}><td className="mono"><code>{k}</code></td><td>{d}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="paths">On-disk paths</h2>
      <p>Credentials live under XDG config; everything else lives under <code>~/.agentty</code>.</p>
      <ul>
        <li><code>~/.config/agentty/credentials.json</code> — Claude OAuth token or API key, mode <code>0600</code> (honours <code>$XDG_CONFIG_HOME</code>).</li>
        <li><code>~/.agentty/settings.json</code> — persisted provider, model, per-provider models, reasoning effort, favourite models, permission profile, and in-app-pasted provider keys.</li>
        <li><code>~/.agentty/threads/&lt;id&gt;.json</code> — one JSON file per thread (flat, keyed by thread id).</li>
        <li><code>~/.agentty/memory.jsonl</code> — user-scope <code>remember</code> facts (cross-workspace); <code>&lt;project&gt;/.agentty/memory.jsonl</code> holds project-scope facts.</li>
        <li><code>~/.agentty/skills/</code>, <code>~/.agents/skills/</code>, <code>~/.claude/skills/</code> — personal <a href="/docs/skills">Agent Skills</a>; the same three dirs under <code>&lt;project&gt;/</code> shadow them.</li>
        <li><code>~/.agentty/mcp.json</code> (trusted) and <code>&lt;project&gt;/.agentty/mcp.json</code> (gated behind <code>AGENTTY_MCP_ALLOW_PROJECT</code>) — <a href="/docs/mcp">MCP servers</a> to connect on startup. <code>AGENTTY_MCP_CONFIG</code> overrides both.</li>
      </ul>

      <h2 id="memory-files">CLAUDE.md guidance</h2>
      <p>
        On the Claude backend, agentty appends up to three user-authored guidance files to
        the system prompt (each capped at 64&nbsp;KiB, mtime-cached):
      </p>
      <ul>
        <li><code>~/CLAUDE.md</code> — user tier (every workspace).</li>
        <li><code>&lt;project&gt;/CLAUDE.md</code> — project tier.</li>
        <li><code>&lt;project&gt;/CLAUDE.local.md</code> — local tier (gitignore it for personal notes).</li>
      </ul>

      <h2 id="settings">Persisted settings</h2>
      <p>
        <code>--provider</code>, <code>-m</code>/<code>--model</code>, the reasoning
        effort tier, favourited models, and your permission profile are written to{" "}
        <code>~/.agentty/settings.json</code> whenever you change them in-app — so the
        next launch resumes exactly where you left off. There is nothing to hand-edit;
        the picker (<code>^P</code> / <code>^/</code>) and <code>S-Tab</code> manage it.
      </p>

      <h2 id="workspace">Choosing a workspace</h2>
      <p>By default the launch directory is the workspace. Override without <code>cd</code>:</p>
      <Code>{`agentty --workspace ~/code/other-project
agentty --workspace /          # opt out of the boundary entirely`}</Code>

      <h2 id="trust-store">TLS trust store</h2>
      <p>
        agentty picks up the system trust store at startup. Behind a TLS-terminating
        corporate proxy, install the proxy&apos;s CA into the system store
        (<code>update-ca-certificates</code> / <code>update-ca-trust</code>). See{" "}
        <a href="/docs/proxies">Corporate Proxies</a>.
      </p>

      <DocNav current="/docs/configuration" />
      <EditThisPage path="app/docs/configuration/page.tsx" />
    </>
  );
}
