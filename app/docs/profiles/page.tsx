import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Note } from "@/components/Doc";

export const metadata: Metadata = {
  title: "Permission Profiles",
  description: "Ask, Write, and Minimal — how agentty gates writes, shell, and network.",
};

export default function Profiles() {
  return (
    <>
      <Breadcrumb title="Permission Profiles" />
      <h1>Permission Profiles</h1>
      <p className="lead">
        A profile decides which tool effects run automatically and which prompt you first.
        Cycle them anytime with <kbd>S-Tab</kbd>; your choice persists across sessions.
      </p>

      <div className="tablewrap" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr><th>Profile</th><th>Pure reads</th><th>Writes / edits</th><th>Shell / build</th><th>Network</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Write</strong></td><td>auto</td><td>auto</td><td>auto</td><td>auto</td></tr>
            <tr><td><strong>Ask</strong> (default)</td><td>auto</td><td>prompt</td><td>prompt</td><td>prompt</td></tr>
            <tr><td><strong>Minimal</strong></td><td>auto</td><td>prompt</td><td>prompt</td><td>prompt</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="ask">Ask (default)</h2>
      <p>
        Read-only tools run automatically; writes, shell calls, and network calls each
        prompt before running. The safe default for an unfamiliar repo.
      </p>

      <h2 id="write">Write (autonomous)</h2>
      <p>
        Everything runs without prompting. Use this when you trust the task and want
        agentty to move fast — paired with the sandbox and workspace boundary, an
        autonomous run still can&apos;t escape your project directory or read your secrets.
      </p>

      <h2 id="minimal">Minimal</h2>
      <p>
        The most conservative profile — only pure tools (reads, search, definition lookup)
        run automatically; everything else prompts, including operations Ask might batch.
      </p>

      <Note type="tip">
        The permission policy is a compile-time <code>constexpr</code> matrix guarded by{" "}
        <code>static_assert</code>s. Changing a policy cell breaks the build, not a test
        nobody runs — the safety guarantee is structural.
      </Note>

      <DocNav current="/docs/profiles" />
      <EditThisPage path="app/docs/profiles/page.tsx" />
    </>
  );
}
