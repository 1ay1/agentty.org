import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb, EditThisPage } from "@/components/DocMeta";
import { Note } from "@/components/Doc";
import { DocNav } from "@/components/DocNav";
import { stats } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Introduction",
  description: "What agentty is, who it's for, and what makes it different.",
  alternates: { canonical: "/docs" },
};

export default function DocsIndex() {
  return (
    <>
      <Breadcrumb title="Introduction" />
      <h1>Introduction</h1>
      <p className="lead">
        agentty is a native C++26 terminal coding agent — a drop-in alternative to
        <code> claude-code</code> that ships as a single {stats.sizeMB} static binary.
      </p>

      <p>
        It signs in with your existing <strong>Claude Pro/Max OAuth</strong> subscription
        (or an <code>ANTHROPIC_API_KEY</code>) — or points at <strong>OpenAI, Groq,
        OpenRouter, Together, Cerebras</strong>, or a local <strong>Ollama</strong> model.
        It runs every shell call in a sandbox by default, and can drive an agent on an
        air-gapped host through a single SSH command. No Node, no Python, no Electron,
        no <code>npm install</code>.
      </p>

      <h2 id="who">Who it&apos;s for</h2>
      <ul>
        <li>You want a <strong>single-binary coding agent</strong> with zero runtime dependencies.</li>
        <li>You care about <strong>cold-start speed</strong> and a TUI that never pauses for GC.</li>
        <li>You want <strong>your choice of model</strong> — Claude, GPT, or a local Ollama model — behind one client.</li>
        <li>You need to run an agent on an <strong>air-gapped host</strong> through an SSH tunnel.</li>
        <li>You want shell calls <strong>sandboxed by default</strong>, not as an afterthought.</li>
      </ul>

      <Note type="tip">
        Already convinced? Jump straight to <Link href="/docs/installation">Installation</Link>{" "}
        or the <Link href="/docs/quick-start">Quick Start</Link>.
      </Note>

      <h2 id="principles">Design principles</h2>
      <ul>
        <li><strong>Native speed.</strong> C++26, statically linked, <code>posix_spawn</code> everywhere. Spawns in microseconds, no GC pauses mid-stream.</li>
        <li><strong>One static binary.</strong> {stats.sizeMB}. <code>curl | chmod +x | run</code>. No version drift between machines.</li>
        <li><strong>Sandbox by default.</strong> Every shell/build runs inside <code>bwrap</code> (Linux) / <code>sandbox-exec</code> (macOS). <code>~/.ssh</code>, <code>/etc</code>, other projects stay read-only.</li>
        <li><strong>One-command SSH air-gap.</strong> Relay bytes over SOCKS5-over-SSH; TLS pins end-to-end on the real upstreams.</li>
        <li><strong>Reads like a single function.</strong> The reducer is one <code>std::visit</code> over a closed event sum; the permission matrix is a <code>constexpr</code> with <code>static_assert</code>s — change a policy cell and the build breaks.</li>
      </ul>

      <h2 id="how-it-works">How it works, in one paragraph</h2>
      <p>
        agentty is a pure-functional update loop: <code>(Model, Msg) → (Model, Cmd)</code>.
        The view is a single function <code>Model → Element</code>, rendered by{" "}
        <a href="https://github.com/1ay1/maya" target="_blank" rel="noopener noreferrer">maya</a>,
        a sister TUI engine. The Anthropic provider speaks HTTP/2 + SSE directly through an
        in-house <code>nghttp2</code> + OpenSSL stack. Subprocesses use <code>posix_spawn</code> +{" "}
        <code>poll(2)</code> with in-process kill deadlines. See{" "}
        <Link href="/docs/architecture">Architecture</Link> for the full tour.
      </p>

      <h2 id="status">Project status</h2>
      <p>
        Works on Linux, macOS, and Windows — all three actively tested and built daily.
        Prebuilt release binaries ship for Linux (x86_64, aarch64) and Windows (x86_64);
        macOS builds from source in seconds. Pre-1.0 and moving fast.
      </p>

      <DocNav current="/docs" />
      <EditThisPage path="app/docs/page.tsx" />
    </>
  );
}
