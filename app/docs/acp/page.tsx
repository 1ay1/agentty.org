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
          <strong>Session modes</strong> &mdash; the three permission tiers (<code>Ask</code> /{" "}
          <code>Write</code> / <code>Minimal</code>) surface as ACP session modes, so you can switch
          them live from Zed&apos;s mode picker (<code>session/set_mode</code>) without restarting
          the agent. The starting tier is the <code>--profile</code> flag.
        </li>
        <li>
          <strong>Cancellation</strong> &mdash; stop a turn from Zed and the in-flight stream tears
          down.
        </li>
        <li>
          <strong>Full session lifecycle</strong> &mdash; agentty advertises and implements the
          complete ACP v1 session surface: <code>session/new</code>, <code>session/load</code>,{" "}
          <code>session/resume</code>, <code>session/list</code>, <code>session/close</code>,{" "}
          <code>session/delete</code>, plus <code>logout</code>. Zed can enumerate past sessions,
          reopen any of them, and prune them &mdash; all backed by the on-disk thread store.
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
        2.0 over stdio and implements the full ACP v1 agent surface:{" "}
        <code>initialize</code> (capability negotiation), <code>authenticate</code>,{" "}
        <code>session/new</code>, <code>session/load</code>, <code>session/resume</code>,{" "}
        <code>session/list</code>, <code>session/close</code>, <code>session/delete</code>,{" "}
        <code>session/set_mode</code>, <code>session/prompt</code> (drives a complete agent turn),
        and <code>session/cancel</code>. While a turn runs it streams{" "}
        <code>session/update</code> notifications &mdash; <code>agent_message_chunk</code> for model
        text, <code>tool_call</code> / <code>tool_call_update</code> for every tool &mdash; and
        calls back with <code>session/request_permission</code> before any side-effecting tool runs.
        There is no maya/UI dependency, so cold start is fast: ACP mode prewarms the TLS/DNS
        connection to Anthropic before serving, eliminating the first-prompt handshake latency.
      </p>
      <Note type="tip">
        Run <code>agentty acp</code> by hand and it sits waiting for newline-delimited JSON-RPC on
        stdin (diagnostics go to stderr; stdout is the protocol channel). The repo ships two
        reference clients: <code>scripts/acp_smoke.py</code> drives a full initialize &rarr; prompt
        &rarr; tool &rarr; permission round-trip, and <code>scripts/acp_methods_test.py</code>
        exercises the rest of the v1 method surface (modes, list/resume/close/delete, logout)
        offline. The wire protocol itself lives in the{" "}
        <code>acp-cpp</code> submodule &mdash; agentty no longer hand-rolls JSON-RPC.
      </Note>

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

      <h2 id="airgap">agentty-in-Zed on an air-gapped remote</h2>
      <p>
        Yes &mdash; you can run agentty inside Zed against a server with <strong>zero internet
        access</strong>. Your laptop relays every byte; nothing runs on the remote besides the
        agent and your shell session. <code>agentty airgap &lt;host&gt; --acp</code> generates the
        whole Zed config for you, so there&apos;s no hand-assembled <code>ssh -N -R</code> tunnel or
        <code>env</code> block to maintain.
      </p>

      <h3 id="airgap-roles">The two machines</h3>
      <ul>
        <li>
          <strong>Laptop</strong> &mdash; has internet, has your Anthropic OAuth/API key, runs
          Zed, runs <code>ssh</code>. This is the relay. <em>Everything below is done here.</em>
        </li>
        <li>
          <strong>Remote</strong> &mdash; the air-gapped box. No internet. Runs{" "}
          <code>agentty acp</code>, spawned by Zed over ssh.
        </li>
      </ul>

      <h3 id="airgap-prereqs">Prerequisites</h3>
      <ol>
        <li>
          <code>agentty</code> installed on <strong>both</strong> machines (<code>which
          agentty</code> on each prints a path).
        </li>
        <li>
          Passwordless SSH from laptop to remote (<code>ssh user@remote echo ok</code> returns{" "}
          <code>ok</code> without prompting). If it prompts, run{" "}
          <code>ssh-copy-id user@remote</code> first.
        </li>
        <li>
          You&apos;re logged in on the laptop (<code>agentty status</code> shows OAuth or API key).
          If not: <code>agentty login</code>.
        </li>
        <li>Zed installed on the laptop.</li>
      </ol>

      <h3 id="airgap-setup">One-time setup (two commands, ~5 seconds)</h3>
      <p>From the laptop:</p>
      <Code>{`# 1. Copy your Anthropic credentials to the remote (once):
agentty airgap --setup user@remote

# 2. Print the Zed config block for this remote:
agentty airgap user@remote --acp -m claude-haiku-4-5 --profile ask`}</Code>
      <p>
        The second command <strong>prints to stderr and exits</strong> &mdash; it does not start
        anything. You&apos;ll see something like:
      </p>
      <Code>{`agentty airgap --acp: add this to Zed's settings.json
  → /home/you/.config/zed/settings.json:

  "agent_servers": {
    "agentty (airgap)": {
      "command": "ssh",
      "args": ["-T", "-R", "1080", "-o", "ExitOnForwardFailure=yes", ...
              "user@remote",
              "AGENTTY_SOCKS_PROXY=localhost:1080 exec agentty acp -m claude-haiku-4-5 --profile ask"]
    }
  }`}</Code>

      <h3 id="airgap-wire">Wire it into Zed (one paste)</h3>
      <ol>
        <li>
          Open Zed&apos;s settings: <code>cmd-,</code> (macOS) or <code>ctrl-,</code> (Linux).
        </li>
        <li>
          Paste the printed <code>&quot;agent_servers&quot;</code> block into the JSON. If you
          already have an <code>agent_servers</code> object, merge the{" "}
          <code>&quot;agentty (airgap)&quot;</code> key into it.
        </li>
        <li>Save.</li>
      </ol>

      <h3 id="airgap-use">Use it</h3>
      <ol>
        <li>Open the agent panel in Zed: <code>cmd-?</code> / <code>ctrl-?</code>.</li>
        <li>From the agent picker, pick <strong>agentty (airgap)</strong>.</li>
        <li>Prompt.</li>
      </ol>
      <p>
        That&apos;s it. Zed spawns <code>ssh</code> directly &mdash; a single process is the
        tunnel, the agent, and the JSON-RPC transport. Zed owns its lifecycle: close the agent
        panel and the ssh + remote <code>agentty acp</code> both die. No background{" "}
        <code>ssh -N</code>, no wrapper script, no daemon.
      </p>

      <h3 id="airgap-internals">What&apos;s happening under the hood</h3>
      <ul>
        <li>
          Zed runs{" "}
          <code>ssh -R 1080 user@remote &apos;AGENTTY_SOCKS_PROXY=localhost:1080 exec agentty acp
          …&apos;</code> directly.
        </li>
        <li>
          <code>-R 1080</code> exposes a SOCKS5 proxy on the remote&apos;s{" "}
          <code>localhost:1080</code>. The remote <code>agentty</code> routes every outbound
          connection (chat, OAuth refresh, <code>web_fetch</code>, <code>web_search</code>) through
          it. Those connections tunnel back over SSH and are dialed by your laptop.
        </li>
        <li>ACP JSON-RPC flows over ssh&apos;s stdio. No extra port, no extra process.</li>
        <li>
          TLS still negotiates end-to-end with the real upstream (api.anthropic.com etc.). The
          laptop sees encrypted bytes only &mdash; it can&apos;t MITM.
        </li>
      </ul>

      <Note type="warn" label="Trust model (read before --setup)">
        <code>--setup</code> copies your laptop&apos;s{" "}
        <code>~/.config/agentty/credentials.json</code> to the remote (chmod 600). That file
        contains your OAuth refresh token (or API key). A compromised remote can exfiltrate it
        independent of the tunnel. <strong>agentty airgap protects the network between laptop and
        remote, not the remote itself</strong> &mdash; treat the remote as a credential-bearing
        peer, not a sandboxed proxy. See <a href="/docs/airgap">SSH Air-gap</a>.
      </Note>

      <h3 id="airgap-troubleshooting">Troubleshooting</h3>
      <ul>
        <li>
          <strong>Zed shows the agent greyed out / &quot;failed to start&quot;</strong> &mdash;
          check <code>~/.local/share/zed/logs/Zed.log</code> (Linux) or{" "}
          <code>~/Library/Logs/Zed/Zed.log</code> (macOS) for the ssh spawn line. Common causes:
          <code>ssh</code> not on Zed&apos;s PATH (rare), the remote prompts for a password (run{" "}
          <code>ssh-copy-id</code> first), or <code>agentty</code> isn&apos;t on the remote&apos;s
          PATH (pass <code>--remote-agentty /full/path/to/agentty</code> to the{" "}
          <code>airgap</code> command, then re-print the config).
        </li>
        <li>
          <strong>&quot;connection refused&quot; or &quot;could not resolve host&quot; mid-turn</strong>{" "}
          &mdash; the SOCKS tunnel dropped, usually a flaky network on the laptop. Close the agent
          panel in Zed and reopen &mdash; Zed respawns ssh.
        </li>
        <li>
          <strong>Slow first response</strong> &mdash; the first TLS handshake to
          api.anthropic.com tunnels through ssh, adding ~100 ms. Subsequent turns reuse the
          connection.
        </li>
        <li>
          <strong><code>agentty: command not found</code> in the ssh spawn log</strong> &mdash;
          agentty isn&apos;t on the remote shell&apos;s non-interactive PATH ({" "}
          <code>ssh user@remote &apos;echo $PATH&apos;</code> shows what Zed sees). Install it
          system-wide on the remote, or re-print the config with{" "}
          <code>--remote-agentty /full/path/to/agentty</code>.
        </li>
        <li>
          <strong>The remote needs a non-default ssh port / key / jump host</strong> &mdash; export{" "}
          <code>AGENTTY_AIRGAP_SSH=&quot;-p 2222 -i ~/.ssh/work -J bastion&quot;</code> before
          running <code>agentty airgap … --acp</code>. Those flags get embedded into the printed
          config.
        </li>
      </ul>

      <Note type="tip">
        Want to confirm the tunnel works before touching Zed? <code>agentty airgap user@remote</code>{" "}
        (no <code>--acp</code>) launches the agentty <em>TUI</em> running on the remote, in your
        local terminal. If that works, the ACP version will too &mdash; same tunnel, different
        transport.
      </Note>

      <DocNav current="/docs/acp" />
      <EditThisPage path="app/docs/acp/page.tsx" />
    </>
  );
}
