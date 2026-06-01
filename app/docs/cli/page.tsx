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
agentty --workspace ~/code/project     # run against another workspace
agentty -k sk-ant-…                     # single-session key, never written to disk`}</Code>

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
            <tr><td className="mono"><code>agentty --version</code></td><td>Print <code>agentty &lt;version&gt;</code> and exit.</td></tr>
            <tr><td className="mono"><code>agentty --help</code></td><td>Print usage and exit.</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="flags">Common flags</h2>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Flag</th><th>Effect</th></tr></thead>
          <tbody>
            <tr><td className="mono"><code>-k</code>, <code>--key &lt;key&gt;</code></td><td>Use this API key for one session; never written to disk.</td></tr>
            <tr><td className="mono"><code>--workspace &lt;path&gt;</code></td><td>Set the workspace root without <code>cd</code>.</td></tr>
            <tr><td className="mono"><code>-V</code>, <code>--version</code></td><td>Print the build version and exit.</td></tr>
            <tr><td className="mono"><code>--setup</code></td><td>(airgap) Copy credentials to the remote on first run.</td></tr>
            <tr><td className="mono"><code>--remote-agentty &lt;path&gt;</code></td><td>(airgap) Path to agentty on the remote if not on PATH.</td></tr>
          </tbody>
        </table>
      </div>

      <DocNav current="/docs/cli" />
      <EditThisPage path="app/docs/cli/page.tsx" />
    </>
  );
}
