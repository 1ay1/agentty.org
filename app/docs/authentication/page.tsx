import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code, Note } from "@/components/Doc";

export const metadata: Metadata = {
  title: "Authentication",
  description: "OAuth, API keys, and the credential override order.",
};

export default function Authentication() {
  return (
    <>
      <Breadcrumb title="Authentication" />
      <h1>Authentication</h1>
      <p className="lead">
        agentty authenticates with your Claude Pro/Max OAuth subscription or an Anthropic
        API key. Both flow through the same login path.
      </p>

      <h2 id="oauth">OAuth (Claude Pro/Max)</h2>
      <p>
        The main path. On first launch the auth modal opens your browser; the callback
        writes the token to <code>~/.config/agentty/credentials.json</code> at mode{" "}
        <code>0600</code>. agentty picks the right header on relaunch automatically — no
        extra billing, the same account you already pay for.
      </p>

      <h2 id="api-key">API key</h2>
      <p>Paste an <code>sk-ant-…</code> token into the modal. Saved to the same credentials file.</p>

      <h2 id="order">Override order</h2>
      <p>Highest priority first:</p>
      <ol>
        <li><code>-k &lt;key&gt;</code> / <code>--key &lt;key&gt;</code> — single-session, never written to disk.</li>
        <li><code>ANTHROPIC_API_KEY</code> environment variable.</li>
        <li><code>CLAUDE_CODE_OAUTH_TOKEN</code> environment variable.</li>
        <li>The on-disk credentials from the modal.</li>
      </ol>

      <h2 id="non-interactive">Non-interactive auth (over SSH)</h2>
      <Code>{`agentty login     # complete auth without entering a thread
agentty logout    # clear stored credentials
agentty status    # show which auth source will be used`}</Code>

      <Note type="warn">
        Credentials are stored at mode <code>0600</code> and written atomically
        (temp&nbsp;+&nbsp;fsync&nbsp;+&nbsp;rename). Treat the file like any other secret —
        anyone who can read it can act as you against the Anthropic API.
      </Note>

      <DocNav current="/docs/authentication" />
      <EditThisPage path="app/docs/authentication/page.tsx" />
    </>
  );
}
