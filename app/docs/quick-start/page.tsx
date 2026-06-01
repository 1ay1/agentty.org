import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code, Note } from "@/components/Doc";

export const metadata: Metadata = {
  title: "Quick Start",
  description: "From install to your first agent turn in under a minute.",
};

export default function QuickStart() {
  return (
    <>
      <Breadcrumb title="Quick Start" />
      <h1>Quick Start</h1>
      <p className="lead">Install, sign in, and run your first turn in under a minute.</p>

      <h2 id="launch">1. Launch in your project</h2>
      <p>The current working directory is the workspace root — agentty&apos;s filesystem tools won&apos;t touch anything outside it.</p>
      <Code>{`cd path/to/your/project
agentty`}</Code>

      <h2 id="auth">2. Sign in</h2>
      <p>First launch opens an auth modal. Pick one:</p>
      <ul>
        <li><strong>OAuth (Claude Pro/Max)</strong> — opens your browser; the callback writes the token to <code>~/.config/agentty/credentials.json</code> (mode <code>0600</code>).</li>
        <li><strong>API key</strong> — paste an <code>sk-ant-…</code> token, saved to the same file.</li>
      </ul>
      <Note type="tip">
        OAuth against your existing Pro/Max subscription is the main path — no extra
        billing, same account you already pay for. See <a href="/docs/authentication">Authentication</a>.
      </Note>

      <h2 id="first-turn">3. Your first turn</h2>
      <p>
        Type a request, hit <kbd>Enter</kbd>. agentty streams the reply and lands tool
        calls inline. Mid-stream typing queues your next message and sends it when the
        current turn finishes. <kbd>Esc</kbd> cancels.
      </p>
      <Code>{`▌ add a --version flag that prints the build version and exits`}</Code>

      <h2 id="profiles">4. Pick a permission profile</h2>
      <p>
        You start in <strong>Ask</strong> — writes, shell calls, and network calls each
        prompt before running. Press <kbd>S-Tab</kbd> to cycle to <strong>Write</strong>{" "}
        (autonomous) or <strong>Minimal</strong> (prompts for everything but pure reads).
        Your choice persists.
      </p>

      <h2 id="next">Where to go next</h2>
      <ul>
        <li><a href="/docs/interface">The Interface</a> — what every part of the screen means.</li>
        <li><a href="/docs/keybindings">Keybindings</a> — the full keymap.</li>
        <li><a href="/docs/tools">Tools</a> — what agentty can actually do.</li>
        <li><a href="/docs/airgap">SSH Air-gap</a> — run on a box with no internet.</li>
      </ul>

      <DocNav current="/docs/quick-start" />
      <EditThisPage path="app/docs/quick-start/page.tsx" />
    </>
  );
}
