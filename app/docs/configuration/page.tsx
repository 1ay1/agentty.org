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
  ["ANTHROPIC_API_KEY", "API key used when no -k flag is passed. Second-highest priority."],
  ["CLAUDE_CODE_OAUTH_TOKEN", "OAuth token from the env, below API key but above on-disk creds."],
  ["AGENTTY_SOCKS_PROXY", "Route all TCP through this SOCKS5 proxy (set automatically by airgap mode)."],
  ["AGENTTY_AIRGAP_SSH", "Extra flags injected into the ssh invocation for airgap."],
  ["AGENTTY_INSECURE", "Set to 1 to skip TLS peer verification. Last-resort only — never ship it."],
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
      <ul>
        <li><code>~/.config/agentty/credentials.json</code> — auth token, mode <code>0600</code>.</li>
        <li><code>~/.agentty/threads/&lt;workspace-hash&gt;/</code> — one JSON file per thread.</li>
      </ul>

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
