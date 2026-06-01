import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Notable changes to agentty. Versions follow SemVer.",
};

export default function Changelog() {
  return (
    <div className="page">
      <h1>Changelog</h1>
      <p className="lead">
        All notable changes to agentty. Versions follow{" "}
        <a href="https://semver.org/" target="_blank" rel="noopener noreferrer">SemVer</a>.
        The canonical source is{" "}
        <a href={`${site.github}/blob/master/CHANGELOG.md`} target="_blank" rel="noopener noreferrer">CHANGELOG.md</a>.
      </p>

      <div className="cl-entry">
        <div className="cl-ver"><h2>Unreleased</h2></div>

        <div><span className="cl-tag added">Added</span></div>
        <ul>
          <li><code>--version</code> / <code>-V</code> / <code>version</code> — prints the build version baked from <code>CMakeLists.txt</code> and exits.</li>
          <li>Queued messages render as preview rows in the transcript, visually identical to real user turns.</li>
          <li><code>↑</code> on an empty composer recalls every queued message back into the buffer for editing.</li>
          <li>Composer placeholder hints <code>press ↑ to edit queued — type to queue another…</code> when the queue is non-empty.</li>
          <li>Retry status shows an attempt counter: <code>transient — retrying in 5s (attempt 2/6)…</code></li>
        </ul>

        <div><span className="cl-tag changed">Changed</span></div>
        <ul>
          <li><strong>Transport reliability.</strong> Anthropic&apos;s <code>Retry-After</code> header is parsed on 429/529 and used as the authoritative backoff, clamped to <code>[1s, 120s]</code>, with ±20% jitter to break retry sync.</li>
          <li><strong>Cancel cleanup.</strong> <code>Esc</code> now does full teardown synchronously — drains partial reply, marks non-terminal tool calls failed, resets pending permission.</li>
          <li>Status banner replaced by a notification takeover on the shortcut row; no new rows added.</li>
          <li><code>submit_message</code> now queues on any non-Idle phase, making the guarantee structural.</li>
        </ul>

        <div><span className="cl-tag fixed">Fixed</span></div>
        <ul>
          <li><strong>Stuck after Esc.</strong> A cancelled worker&apos;s trailing <code>StreamError</code> could null out a new turn&apos;s cancel token; <code>launch_stream</code> now guards dispatch so no events from a cancelled worker reach the reducer.</li>
          <li>Removed the redundant <code>N messages queued</code> row; the composer&apos;s own <code>❚ N queued</code> chip is the single source of truth.</li>
        </ul>
      </div>

      <div className="cl-entry">
        <div className="cl-ver"><h2>0.1.0</h2><span className="cl-date">Initial public release</span></div>
        <p>
          Pre-1.0. Core loop, tools, streaming, permission profiles, in-app auth,
          persistence, and cross-platform subprocess all working. Linux gets daily smoke
          testing; macOS and Windows code paths exist throughout.
        </p>
        <h3>Major surfaces</h3>
        <ul>
          <li>Native C++26 TUI rendering through the <code>maya</code> widget engine. Single ~9 MB static binary.</li>
          <li>Anthropic provider speaking HTTP/2 + SSE directly via in-house <code>nghttp2</code> + OpenSSL. OAuth (PKCE) + API key.</li>
          <li>Full tool set with a compile-time effect set + permission policy enforced via <code>static_assert</code>.</li>
          <li>Permission profiles: Write, Ask, Minimal — cycle on <code>S-Tab</code>.</li>
          <li>Sandboxed bash by default — <code>bwrap</code> on Linux, <code>sandbox-exec</code> on macOS.</li>
          <li>Workspace boundary, SSH air-gap mode, atomic persistence, smoothed streaming, inline rendering.</li>
        </ul>
        <div><span className="cl-tag stub">Stubbed honestly</span></div>
        <ul>
          <li><strong>Checkpoint restore</strong> — markers exist; <code>RestoreCheckpoint</code> surfaces &quot;not implemented yet&quot;.</li>
          <li><strong>Diff review pane</strong> — modal renders, but <code>pending_changes</code> isn&apos;t populated by any tool yet.</li>
        </ul>
      </div>
    </div>
  );
}
