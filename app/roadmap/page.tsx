import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "What's shipped, what's in progress, and what's planned for agentty.",
};

type Item = { state: "done" | "prog" | "plan"; title: string; desc: string };

const items: Item[] = [
  { state: "done", title: "Core update loop & tools", desc: "Pure (Model, Msg) → (Model, Cmd) reducer, full tool set, compile-time permission matrix." },
  { state: "done", title: "Streaming HTTP/2 + SSE provider", desc: "In-house nghttp2 + OpenSSL stack, OAuth (PKCE) and API key auth." },
  { state: "done", title: "Sandboxed shell by default", desc: "bwrap on Linux, sandbox-exec on macOS, with the workspace boundary on filesystem tools." },
  { state: "done", title: "SSH air-gap mode", desc: "Run on an offline host, relaying traffic over SOCKS5-over-SSH with end-to-end TLS pinning." },
  { state: "done", title: "Cross-platform binaries", desc: "Prebuilt static binaries for Linux (x86_64, aarch64) and Windows; macOS builds from source." },
  { state: "prog", title: "macOS & Windows CI", desc: "Code paths exist and build daily; automated CI for those platforms is being wired up." },
  { state: "prog", title: "Checkpoint restore", desc: "CheckpointId and per-message markers exist; the restore action is being implemented." },
  { state: "prog", title: "Diff review pane", desc: "The modal renders; populating pending_changes from edit tools so review/accept/reject works." },
  { state: "plan", title: "Plugin / custom tool API", desc: "A stable surface for registering project-specific tools alongside the built-ins." },
  { state: "plan", title: "Session sharing & export", desc: "Export a thread to a shareable transcript; import for reproduction and bug reports." },
  { state: "plan", title: "Configurable keymaps", desc: "User-defined keybindings layered over the defaults." },
];

const label = { done: "Shipped", prog: "In progress", plan: "Planned" } as const;

export default function Roadmap() {
  return (
    <div className="page">
      <h1>Roadmap</h1>
      <p className="lead">
        agentty is pre-1.0 and moving fast. Here&apos;s what&apos;s shipped, what&apos;s
        being built, and what&apos;s on the horizon. The authoritative source is the{" "}
        <a href={`${site.github}/issues`} target="_blank" rel="noopener noreferrer">issue tracker</a>.
      </p>

      <div className="roadmap">
        {items.map((it, i) => (
          <div className="rm-item" key={i}>
            <span className={`rm-badge ${it.state}`}>{label[it.state]}</span>
            <div>
              <h3>{it.title}</h3>
              <p>{it.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <h2>Have an idea?</h2>
      <p>
        Feature requests and design discussions are welcome on{" "}
        <a href={site.issues} target="_blank" rel="noopener noreferrer">GitHub Issues</a>.
        Read the <a href="/contributing">contributing guide</a> first — well-scoped
        proposals with a clear use case move fastest.
      </p>
    </div>
  );
}
