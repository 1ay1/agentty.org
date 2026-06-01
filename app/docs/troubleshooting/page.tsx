import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code, Note } from "@/components/Doc";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Troubleshooting",
  description: "Common issues and how to resolve them.",
};

export default function Troubleshooting() {
  return (
    <>
      <Breadcrumb title="Troubleshooting" />
      <h1>Troubleshooting</h1>
      <p className="lead">The usual suspects, and how to get unstuck.</p>

      <h2 id="stuck">agentty seems stuck after Esc</h2>
      <p>
        Fixed in current builds — a cancelled worker thread could null out a new turn&apos;s
        cancel token. Update to the latest release. If you still see it, restart the process
        and file a bug with your <code>git rev-parse HEAD</code> (or release version).
      </p>

      <h2 id="cert">Certificate / TLS verification errors</h2>
      <p>
        You&apos;re likely behind a TLS-terminating proxy. Install the proxy&apos;s CA into
        the system trust store — see <a href="/docs/proxies">Corporate Proxies</a>. As a
        last resort, <code>AGENTTY_INSECURE=1</code> skips verification (not for shared use).
      </p>

      <h2 id="auth">Auth not picked up</h2>
      <p>Check which source agentty will use:</p>
      <Code>{`agentty status`}</Code>
      <p>
        Remember the override order: <code>--key</code> &gt; <code>ANTHROPIC_API_KEY</code>{" "}
        &gt; <code>CLAUDE_CODE_OAUTH_TOKEN</code> &gt; on-disk credentials. An env var will
        shadow the credentials file.
      </p>

      <h2 id="airgap">Air-gap connection fails</h2>
      <ul>
        <li>Confirm OpenSSH ≥ 7.6 on <em>both</em> ends.</li>
        <li>Make sure agentty is on the remote PATH, or pass <code>--remote-agentty PATH</code>.</li>
        <li>Run <code>--setup</code> once so credentials are copied to the remote.</li>
      </ul>

      <h2 id="render">Garbled rendering</h2>
      <p>
        Some terminals lag on DEC 2026 synchronized output. File a bug with your{" "}
        <code>$TERM</code>, the terminal emulator name, and a screenshot.
      </p>

      <Note>
        Found something not covered here?{" "}
        <a href={site.issues} target="_blank" rel="noopener noreferrer">Open an issue</a> with{" "}
        <code>$TERM</code>, your emulator, the version, and a screenshot or paste of the
        relevant block.
      </Note>

      <DocNav current="/docs/troubleshooting" />
      <EditThisPage path="app/docs/troubleshooting/page.tsx" />
    </>
  );
}
