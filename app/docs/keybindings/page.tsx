import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";

export const metadata: Metadata = {
  title: "Keybindings",
  description: "The complete agentty keymap.",
};

const keys: [string, string][] = [
  ["Enter", "Send the current message"],
  ["Alt+Enter", "Insert a newline in the composer"],
  ["Ctrl+E", "Expand the composer"],
  ["Esc", "Cancel the current turn / reject a permission prompt"],
  ["S-Tab", "Cycle permission profile (Ask → Write → Minimal)"],
  ["↑", "On empty composer: recall queued messages for editing"],
  ["Ctrl+K", "Command palette"],
  ["Ctrl+J", "Thread list"],
  ["Ctrl+T", "Todo / plan view"],
  ["Ctrl+/", "Model picker"],
  ["Ctrl+N", "New thread"],
  ["Ctrl+C", "Quit"],
];

export default function Keybindings() {
  return (
    <>
      <Breadcrumb title="Keybindings" />
      <h1>Keybindings</h1>
      <p className="lead">Everything you can do without leaving the home row.</p>

      <div className="tablewrap" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr><th style={{ width: 160 }}>Key</th><th>Action</th></tr>
          </thead>
          <tbody>
            {keys.map(([k, d]) => (
              <tr key={k}>
                <td><kbd>{k}</kbd></td>
                <td>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="queue">Queue behavior</h2>
      <p>
        Typing while a turn streams queues the message rather than interrupting. Press{" "}
        <kbd>↑</kbd> on an empty composer to pull every queued message back into the buffer
        (joined by newlines) with the cursor at the seam — destructive on the queue, so
        re-submit to re-queue. The composer placeholder hints{" "}
        <code>press ↑ to edit queued — type to queue another…</code> when relevant.
      </p>

      <DocNav current="/docs/keybindings" />
      <EditThisPage path="app/docs/keybindings/page.tsx" />
    </>
  );
}
