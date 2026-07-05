import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";

export const metadata: Metadata = {
  title: "The Interface",
  description: "A tour of the agentty TUI — composer, transcript, status bar, and tool widgets.",
  alternates: { canonical: "/docs/interface" },
};

export default function Interface() {
  return (
    <>
      <Breadcrumb title="The Interface" />
      <h1>The Interface</h1>
      <p className="lead">
        agentty renders inline at the bottom of your terminal. It never takes over the
        screen — your scrollback stays intact, the status bar overlays on top.
      </p>

      <h2 id="transcript">The transcript</h2>
      <p>
        Conversation history flows in your terminal&apos;s normal scrollback. Your turns,
        the assistant&apos;s replies, and every tool call render in order. Queued messages
        appear as preview rows above the composer — visually identical to real user turns.
      </p>

      <h2 id="composer">The composer</h2>
      <p>
        The input box at the bottom. Type and press <kbd>Enter</kbd> to send.{" "}
        <kbd>Alt+Enter</kbd> inserts a newline. <kbd>Ctrl+E</kbd> expands the composer for
        longer prompts. A <code>❚ N queued</code> chip shows how many messages are waiting.
      </p>
      <p>
        Type while a turn is streaming and your message <strong>queues</strong> — it lands
        automatically when the current turn finishes. On an empty composer, press{" "}
        <kbd>↑</kbd> to recall every queued message back into the buffer for editing.
      </p>
      <p>
        The composer is project-aware: type <kbd>@</kbd> to mention a file, <kbd>#</kbd>{" "}
        to jump to a symbol, <kbd>/</kbd> for slash commands (e.g. <code>/compact</code>),
        and <kbd>Ctrl+K</kbd> for the command palette. Drop an image file&apos;s path (or
        paste with <kbd>Ctrl+V</kbd>) to attach a PNG, JPEG, GIF, or WebP inline.
      </p>

      <h2 id="status">The status bar</h2>
      <p>
        A single row at the bottom edge shows the active profile, provider, and model,
        plus the current phase. When something needs your attention — a transient retry,
        an error — it swaps in a banner-style notification (<code>▎⚠ &lt;text&gt;</code>{" "}
        for errors, <code>▎ &lt;text&gt;</code> for info) and reverts to the keybindings
        strip when the toast expires. Switch provider with <kbd>Ctrl+P</kbd> and model with{" "}
        <kbd>Ctrl+/</kbd> without leaving the thread.
      </p>

      <h2 id="tool-widgets">Tool widgets</h2>
      <p>
        Each tool gets a purpose-built widget — agentty doesn&apos;t just print raw JSON:
      </p>
      <ul>
        <li><strong>Diffs render as diffs</strong> — additions and deletions, color-coded.</li>
        <li><strong>Search results group by file</strong>, with line numbers.</li>
        <li><strong>bash shows exit codes</strong> and streamed output.</li>
        <li><strong>todos become checklists</strong> you can watch tick off.</li>
      </ul>

      <h2 id="streaming">Smooth streaming</h2>
      <p>
        SSE deltas drip into the screen at ⅛ buffer per tick (clamped 32–256 chars), so
        server-side batching doesn&apos;t translate into chunky on-screen text. Where the
        terminal supports it, frames are wrapped in DEC 2026 begin/end-sync to avoid tearing.
      </p>

      <DocNav current="/docs/interface" />
      <EditThisPage path="app/docs/interface/page.tsx" />
    </>
  );
}
