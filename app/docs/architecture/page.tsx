import type { Metadata } from "next";
import { DocNav } from "@/components/DocNav";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Code, Note } from "@/components/Doc";

export const metadata: Metadata = {
  title: "Architecture",
  description: "The update loop, the view function, the provider, and the subprocess model.",
  alternates: { canonical: "/docs/architecture" },
};

export default function Architecture() {
  return (
    <>
      <Breadcrumb title="Architecture" />
      <h1>Architecture</h1>
      <p className="lead">
        agentty is small enough to read in an afternoon. The whole thing is a pure update
        loop with a single render function and a closed set of effects.
      </p>

      <h2 id="loop">The update loop</h2>
      <p>
        Everything is one pure function: <code>(Model, Msg) → (Model, Cmd)</code>. State
        transitions are total and inspectable. Strong ID newtypes —{" "}
        <code>ToolCallId</code>, <code>ThreadId</code>, <code>OAuthCode</code>,{" "}
        <code>PkceVerifier</code> — mean swapping two arguments is a compile error, not a
        debugging session.
      </p>
      <Code>{`Msg  →  reducer (one std::visit over a closed event sum)  →  (Model, Cmd)
Cmd  →  runtime executes side effects  →  new Msg events`}</Code>

      <h2 id="view">The view</h2>
      <p>
        Rendering is a single function <code>Model → Element</code>. agentty builds widget
        Configs from <code>Model</code> state; the actual chrome — every glyph, layout
        decision, and breathing animation — is owned by{" "}
        <a href="https://github.com/1ay1/maya" target="_blank" rel="noopener noreferrer">maya</a>,
        a sister header-mostly TUI engine. The host constructs no Elements directly.
      </p>

      <h2 id="provider">The provider</h2>
      <p>
        The Anthropic provider speaks HTTP/2 + SSE directly through an in-house{" "}
        <code>nghttp2</code> + OpenSSL stack. OAuth (PKCE) and API key both flow through the
        same <code>auth::cmd_login</code> path. SSE deltas are smoothed into the screen at ⅛
        buffer per tick so server batching doesn&apos;t produce chunky text.
      </p>

      <h2 id="subprocess">The subprocess model</h2>
      <p>
        Subprocesses use <code>posix_spawn</code> + <code>poll(2)</code> with in-process{" "}
        <code>SIGTERM → SIGKILL</code> deadlines on POSIX, and <code>CreateProcessW</code> +
        a reader thread on Windows. No GNU <code>timeout</code> dependency, no{" "}
        <code>popen</code> quoting hazards. File writes are atomic:{" "}
        <code>write</code> + <code>fsync</code>/<code>_commit</code> +{" "}
        <code>rename</code>/<code>MoveFileExW</code>.
      </p>

      <h2 id="permissions">The permission matrix</h2>
      <p>
        The permission policy is a <code>constexpr</code> matrix guarded by{" "}
        <code>static_assert</code>s. Each tool declares its effect set at compile time;
        changing a policy cell breaks the build rather than silently weakening a guarantee.
      </p>

      <Note type="tip">
        Going deeper? The repo&apos;s <code>docs/RENDERING.md</code> walks the view pipeline
        turn-by-turn and <code>docs/UI.md</code> is the per-widget Config reference.
      </Note>

      <DocNav current="/docs/architecture" />
      <EditThisPage path="app/docs/architecture/page.tsx" />
    </>
  );
}
