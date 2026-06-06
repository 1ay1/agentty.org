import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code, Note } from "@/components/Doc";

export const metadata: Metadata = {
  title: "Use agentty inside Zed (ACP)",
  description:
    "Run agentty as an Agent Client Protocol agent inside Zed — streaming responses, inline diffs, native permission prompts, session reload, and a one-command air-gapped setup. Same engine as the TUI, driven over JSON-RPC on stdio.",
  alternates: { canonical: "/docs/acp" },
};

export default function ACP() {
  return (
    <>
      <Breadcrumb title="Use agentty inside Zed (ACP)" />
      <h1>Use agentty inside Zed (ACP)</h1>
      <p className="lead">
        agentty speaks the{" "}
        <a href="https://agentclientprotocol.com" target="_blank" rel="noopener noreferrer">
          Agent Client Protocol
        </a>{" "}
        &mdash; the same protocol Zed uses to drive Claude Code and Gemini. Point Zed at the{" "}
        <code>agentty acp</code> subcommand and your terminal agent becomes a first-class agent
        panel inside the editor: streaming responses, inline diffs for every edit, and native
        permission prompts before any file write or shell command.
      </p>

      <h2 id="setup">Set up in Zed</h2>
      <p>
        Add this to Zed&apos;s <code>settings.json</code> (<code>zed: open settings</code>):
      </p>
      <Code filename="settings.json">{`{
  "agent_servers": {
    "agentty": {
      "command": "agentty",
      "args": ["acp"]
    }
  }
}`}</Code>
      <p>
        Then open the agent panel (<code>cmd-?</code> / <code>ctrl-?</code>), pick{" "}
        <strong>agentty</strong> from the agent list, and prompt. Auth is whatever{" "}
        <code>agentty login</code> already set up &mdash; the ACP process reads the same{" "}
        <code>~/.config/agentty/credentials.json</code>, so there&apos;s nothing extra to
        configure.
      </p>

      <h2 id="model-profile">Model &amp; permission profile</h2>
      <p>
        Set the model per-subprocess in the <code>args</code>. In ACP mode <code>-m</code> is an{" "}
        <em>ephemeral</em> override &mdash; it does <strong>not</strong> clobber your TUI&apos;s
        saved model:
      </p>
      <Code filename="settings.json">{`{
  "agent_servers": {
    "agentty": {
      "command": "agentty",
      "args": ["acp", "-m", "claude-haiku-4-5", "--profile", "ask"]
    }
  }
}`}</Code>
      <p>
        <code>--profile</code> picks how eagerly Zed prompts you before a tool runs:
      </p>
      <ul>
        <li>
          <strong><code>ask</code></strong> (default) &mdash; prompt for <code>write</code> /{" "}
          <code>edit</code> / <code>bash</code> / network; read-only inspection (<code>read</code> /{" "}
          <code>grep</code> / <code>glob</code> / <code>list_dir</code>) runs without a dialog so
          the loop stays fluid.
        </li>
        <li>
          <strong><code>minimal</code></strong> &mdash; prompt for <em>everything</em> that touches
          the outside world, reads included. Tightest leash.
        </li>
        <li>
          <strong><code>write</code></strong> &mdash; same write/exec/net prompts as{" "}
          <code>ask</code>, but never prompts for reads.
        </li>
      </ul>

      <h2 id="what-works">What works over ACP</h2>
      <ul>
        <li>
          <strong>Streaming text</strong> &mdash; the model&apos;s reply renders token-by-token in
          Zed&apos;s panel.
        </li>
        <li>
          <strong>Tool calls</strong> &mdash; every <code>read</code> / <code>edit</code> /{" "}
          <code>bash</code> / <code>grep</code> / … shows up as a Zed tool card with the right
          icon, the raw arguments, and live status (pending → running → done/failed).
        </li>
        <li>
          <strong>Inline diffs</strong> &mdash; <code>write</code> and <code>edit</code> emit ACP{" "}
          <code>diff</code> content, so Zed renders the file change inline and lets you review it in
          place.
        </li>
        <li>
          <strong>Follow-along</strong> &mdash; read/edit/write/grep tool calls carry the file path
          as an ACP <code>location</code>, so Zed can open and highlight the file the agent is
          touching in real time.
        </li>
        <li>
          <strong>Permission prompts</strong> &mdash; side-effecting tools (<code>bash</code>,{" "}
          <code>write</code>, <code>edit</code>, network) trigger Zed&apos;s native allow/reject
          dialog before they run; <code>--profile</code> tunes exactly which tools prompt.
        </li>
        <li>
          <strong>Cancellation</strong> &mdash; stop a turn from Zed and the in-flight stream tears
          down.
        </li>
        <li>
          <strong>Session persistence + reload</strong> &mdash; every session is written to
          agentty&apos;s on-disk thread store after each turn (the <em>same</em> format the TUI
          uses), so it survives a subprocess restart. Zed can <code>session/load</code> to resume a
          past conversation: agentty replays the full transcript (user + assistant messages and
          tool cards) as <code>session/update</code> notifications, then hands back control.
          Sessions started in Zed also show up in the standalone TUI&apos;s thread picker, and vice
          versa.
        </li>
        <li>
          <strong>Workspace sandbox</strong> &mdash; file tools stay inside the session&apos;s{" "}
          <code>cwd</code> (the folder you opened in Zed); <code>bash</code> is wrapped in
          bwrap/sandbox-exec exactly like the standalone TUI.
        </li>
      </ul>
      <Note type="tip">
        The ACP agent is the <em>same</em> engine as the TUI &mdash; same provider, same tools,
        same wire-message shaping, same permission policy &mdash; just driven over JSON-RPC on
        stdio instead of a terminal. Any other ACP client (not just Zed) works the same way.
      </Note>

      <h2 id="protocol">The protocol surface</h2>
      <p>
        <code>agentty acp</code> is a headless subcommand that speaks newline-delimited JSON-RPC
        2.0 over stdio and implements the full ACP v1 agent surface: <code>initialize</code>{" "}
        (capability negotiation), <code>authenticate</code>, <code>session/new</code>,{" "}
        <code>session/load</code>, <code>session/prompt</code> (drives a complete agent turn), and{" "}
        <code>session/cancel</code>. While a turn runs it streams <code>session/update</code>{" "}
        notifications &mdash; <code>agent_message_chunk</code> for model text,{" "}
        <code>tool_call</code> / <code>tool_call_update</code> for every tool &mdash; and calls back
        with <code>session/request_permission</code> before any side-effecting tool runs. There is
        no maya/UI dependency, so cold start is fast: ACP mode prewarms the TLS/DNS connection to
        Anthropic before serving, eliminating the first-prompt handshake latency.
      </p>

      <h2 id="workspace-sandbox">Loosen the workspace or sandbox</h2>
      <p>
        The same <code>--workspace</code> and <code>--sandbox</code> switches the TUI accepts apply
        in ACP mode (they run before the agent starts), so you can loosen or disable both from the
        Zed <code>args</code>:
      </p>
      <Code filename="settings.json">{`{
  "agent_servers": {
    "agentty": {
      "command": "agentty",
      "args": ["acp", "--workspace", "/", "--sandbox", "off"]
    }
  }
}`}</Code>

      <h2 id="airgap">Zed against an air-gapped host</h2>
      <p>
        To run agentty inside Zed on a remote box with no direct internet, let agentty generate the
        config for you:
      </p>
      <Code>{`agentty airgap <host> --acp [flags…]`}</Code>
      <p>
        The <code>--acp</code> form prints a ready-to-paste Zed <code>agent_servers</code> config
        (and the path to your <code>settings.json</code>) whose <code>command</code> is{" "}
        <code>ssh</code> itself &mdash; its args open the reverse SOCKS5 tunnel <em>and</em> exec
        the remote <code>agentty acp</code> in a single invocation, with the ACP JSON-RPC riding
        ssh&apos;s stdio. One ssh process is the tunnel, the agent, and the transport; Zed owns its
        lifecycle, so there&apos;s nothing to babysit. Everything after <code>--acp</code> (e.g.{" "}
        <code>-m</code>, <code>--profile</code>, <code>--workspace</code>, <code>--sandbox</code>)
        is forwarded verbatim to the remote agent.
      </p>
      <Note type="warn" label="Trust model">
        Pair with <code>--setup</code> to copy your credentials to the remote first. As with any
        air-gap use, the remote is trusted with your tokens &mdash; use it only on hosts you&apos;d
        already trust with the same secret. See <a href="/docs/airgap">SSH Air-gap</a>.
      </Note>

      <DocNav current="/docs/acp" />
      <EditThisPage path="app/docs/acp/page.tsx" />
    </>
  );
}
