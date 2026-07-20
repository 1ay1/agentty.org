"use client";

import Link from "next/link";
import "./agentty-tui.css";
import "./session-home.css";
import { site } from "@/lib/site";
import { stats } from "@/lib/stats";
import { starLabel } from "@/lib/repo";
import { CopyRow } from "@/components/CopyRow";

/**
 * The homepage body rendered AS an agentty session transcript.
 *
 * Everything here uses the real TUI grammar lifted from
 * src/runtime/view/* (and mirrored in agentty-tui.css): magenta `❯ You`
 * user turns, a `✦ agentty` assistant turn, `╭─ … ─╮` bordered panels for
 * tool output, braille/✓ status glyphs, and a pinned composer + status bar.
 *
 * It is a *page-width* transcript (not the fixed 540px hero window), so it
 * reads as one long scrollback the visitor is scrolling through — the site
 * literally IS an agentty session.
 */

// ── a user turn: `❯ You` on a magenta rail ──
function UserTurn({ time, children }: { time: string; children: React.ReactNode }) {
  return (
    <div className="ttui-turn rail-mag sh-turn">
      <div className="row ttui-head">
        <span className="mag">❯</span>
        <span> </span>
        <span className="mag b">You</span>
        <span className="ttui-meta dim">{time}</span>
      </div>
      <div className="row ttui-blank" />
      <div className="row">
        <span className="bwhite">{children}</span>
      </div>
    </div>
  );
}

// ── an assistant turn: `✦ agentty` on a bright-magenta rail ──
function AgentTurn({
  time,
  children,
}: {
  time: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ttui-turn rail-bmag sh-turn">
      <div className="row ttui-head">
        <span className="bmag">✦</span>
        <span> </span>
        <span className="bmag b">agentty</span>
        <span className="ttui-meta dim">{time}</span>
      </div>
      <div className="row ttui-blank" />
      {children}
    </div>
  );
}

// ── a bordered ACTIONS-style panel ──
function Panel({
  cap,
  right,
  children,
}: {
  cap: string;
  right?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ttui-panel sh-panel">
      <div className="ttui-panel-top">
        <span className="dim">╭─</span>
        <span className="dim b ttui-cap">{` ${cap} `}</span>
        <span className="dim ttui-fill" />
        {right && <span className="dim b">{` ${right} `}</span>}
        <span className="dim">─╮</span>
      </div>
      {children}
      <div className="ttui-panel-bot">
        <span className="dim">╰</span>
        <span className="dim ttui-fill-bot" />
        <span className="dim">╯</span>
      </div>
    </div>
  );
}

// a padded content row inside a panel
function PRow({ children }: { children?: React.ReactNode }) {
  return (
    <div className="ttui-panel-line">
      <span className="ttui-edge dim">│</span>
      <span className="ttui-pad">{children}</span>
      <span className="ttui-edge dim">│</span>
    </div>
  );
}

// a key ──── value readout row inside a panel
function KV({
  k,
  v,
  tone,
}: {
  k: React.ReactNode;
  v: string;
  tone?: "ok" | "brand";
}) {
  return (
    <div className="ttui-panel-line">
      <span className="ttui-edge dim">│</span>
      <span className="ttui-pad sh-kv">
        <span className="white">{k}</span>
        <span className="dim sh-dots" />
        <span className={tone === "ok" ? "bgreen b" : tone === "brand" ? "bmag b" : "bwhite b"}>
          {v}
        </span>
      </span>
      <span className="ttui-edge dim">│</span>
    </div>
  );
}

export function SessionHome() {
  return (
    <div className="sh">
      <div className="sh-window">
        {/* window titlebar — same chrome as the hero TUI */}
        <div className="ttui-bar sh-bar">
          <span className="ttui-dot r" />
          <span className="ttui-dot y" />
          <span className="ttui-dot g" />
          <span className="ttui-title">agentty — ~/why-agentty</span>
        </div>

        <div className="ttui sh-scroll">
          {/* ═══ TURN 1 — the pitch ═══ */}
          <UserTurn time="00:00">what is agentty and why should I use it?</UserTurn>

          <AgentTurn time="00:00 · turn 1">
            <div className="row ttui-prose">
              <span className="bwhite">
                A <span className="bmag b">blazing-fast coding agent</span> that lives in
                your terminal — a native <span className="bcyan">C++26</span> drop-in
                alternative to <span className="bcyan">claude-code</span>. One static
                binary, <span className="bcyan">{stats.coldStart}</span> cold start,{" "}
                <span className="bgreen">sandboxed by default</span>. No Node, no Python,
                no Electron.
              </span>
            </div>
            <div className="row ttui-blank" />
            <Panel cap="agentty --version" right="spec">
              <KV k="binary size" v={stats.sizeMB} tone="brand" />
              <KV k="cold start" v={stats.coldStart} tone="ok" />
              <KV k="runtime deps" v="0 · statically linked" tone="ok" />
              <KV k="language" v="C++26" />
              <KV k="platforms" v="linux · macos · x86_64/aarch64" />
              <KV k="license" v={site.license} />
            </Panel>
          </AgentTurn>

          {/* ═══ TURN 2 — features ═══ */}
          <UserTurn time="00:03">show me what makes it different</UserTurn>

          <AgentTurn time="00:03 · turn 2">
            <Panel cap="A C T I O N S · 6/6" right="4.2s">
              <PRow>
                <span className="cyan b">I N S P E C T</span>
                <span className="white"> 2</span>
                <span className="dim">{"   ·   "}</span>
                <span className="mag b">M U T A T E</span>
                <span className="white"> 2</span>
                <span className="dim">{"   ·   "}</span>
                <span className="cyan b">E X E C U T E</span>
                <span className="white"> 2</span>
              </PRow>
              <PRow />
              {FEATURES.map((f, i) => {
                const glyph = i === 0 ? "╭─" : i === FEATURES.length - 1 ? "╰─" : "├─";
                return (
                  <div key={f.title}>
                    <div className="ttui-panel-line">
                      <span className="ttui-edge dim">│</span>
                      <span className="ttui-pad sh-feat">
                        <span className={`${f.tone} dim`}>{glyph}</span>
                        <span> </span>
                        <span className="bgreen b">✓</span>
                        <span>{"  "}</span>
                        <span className={`${f.tone} b`}>{f.key}</span>
                        <span>{"  "}</span>
                        <span className="bwhite sh-feat-title">{f.title}</span>
                      </span>
                      <span className="ttui-edge dim">│</span>
                    </div>
                    <div className="ttui-panel-line">
                      <span className="ttui-edge dim">│</span>
                      <span className="ttui-pad sh-feat-body">
                        <span className={`${f.tone} dim`}>{"   │  "}</span>
                        <span className="white i">{f.body}</span>
                      </span>
                      <span className="ttui-edge dim">│</span>
                    </div>
                    {i < FEATURES.length - 1 && (
                      <div className="ttui-panel-line">
                        <span className="ttui-edge dim">│</span>
                        <span className="ttui-pad">
                          <span className="dim">{"   │"}</span>
                        </span>
                        <span className="ttui-edge dim">│</span>
                      </div>
                    )}
                  </div>
                );
              })}
              <PRow />
              <PRow>
                <span className="bgreen b">{"✓ "}</span>
                <span className="bgreen b">D O N E</span>
                <span className="white">{"   6 capabilities"}</span>
              </PRow>
            </Panel>
          </AgentTurn>

          {/* ═══ TURN 3 — providers ═══ */}
          <UserTurn time="00:05">which models can it run?</UserTurn>

          <AgentTurn time="00:05 · turn 3">
            <div className="row ttui-prose">
              <span className="bwhite">
                Bring your own model — Claude by default, or any{" "}
                <span className="bcyan">OpenAI-compatible</span> endpoint, right down to a
                local <span className="bcyan">Ollama</span> running offline.
              </span>
            </div>
            <div className="row ttui-blank" />
            <Panel cap="agentty --providers --list" right="7">
              {PROVIDERS.map((p) => (
                <KV key={p.name} k={p.name} v={p.detail} tone={p.tone} />
              ))}
            </Panel>
          </AgentTurn>

          {/* ═══ TURN 4 — comparison ═══ */}
          <UserTurn time="00:07">how does it compare to claude-code?</UserTurn>

          <AgentTurn time="00:07 · turn 4">
            <Panel cap="agentty diff claude-code" right="+ is us">
              <PRow>
                <span className="dim sh-cmp-h">dimension</span>
                <span className="mag b sh-cmp-h">agentty</span>
                <span className="dim sh-cmp-h">claude-code</span>
              </PRow>
              <PRow />
              {COMPARE.map((r) => (
                <div className="ttui-panel-line" key={r.dim}>
                  <span className="ttui-edge dim">│</span>
                  <span className="ttui-pad sh-cmp">
                    <span className="white">{r.dim}</span>
                    <span className="bgreen b">{r.us}</span>
                    <span className="dim">{r.them}</span>
                  </span>
                  <span className="ttui-edge dim">│</span>
                </div>
              ))}
            </Panel>
          </AgentTurn>

          {/* ═══ TURN 5 — install / CTA ═══ */}
          <UserTurn time="00:09">ok. how do I install it?</UserTurn>

          <AgentTurn time="00:09 · turn 5">
            <div className="row ttui-prose">
              <span className="bwhite">One line. It detects your platform, drops the
                static binary on <span className="bcyan">$PATH</span>, and self-updates
                from the same command.</span>
            </div>
            <div className="row ttui-blank" />
            <div className="sh-install">
              <CopyRow cmd={site.installOneLiner} />
            </div>
            <div className="row ttui-blank" />
            <div className="sh-cta">
              <Link className="btn btn-primary" href="/docs/quick-start" data-magnetic>
                Read the quick start →
              </Link>
              <a
                className="btn btn-ghost"
                href={site.github}
                target="_blank"
                rel="noopener noreferrer"
                data-magnetic
              >
                ★ {starLabel} on GitHub
              </a>
            </div>
          </AgentTurn>
        </div>

        {/* pinned composer + status bar — the live session chrome */}
        <div className="sh-chrome">
          <div className="ttui-composer sh-composer">
            <div className="ttui-comp-top">
              <span className="dim">╭</span>
              <span className="dim ttui-fill-bot" />
              <span className="dim">╮</span>
            </div>
            <div className="ttui-comp-mid">
              <span className="dim">│ </span>
              <span className="bmag b">❯ </span>
              <span className="dim">ask agentty anything…</span>
              <span className="ttui-comp-right" />
              <span className="dim"> │</span>
            </div>
            <div className="ttui-comp-bot">
              <span className="dim">╰</span>
              <span className="dim ttui-fill-bot" />
              <span className="dim">╯</span>
            </div>
          </div>
          <div className="ttui-accent dim" aria-hidden />
          <div className="ttui-status">
            <div className="ttui-status-left">
              <span className="cyan">▎</span>
              <span className="white"> why-agentty</span>
              <span className="dim">{"   ·   "}</span>
              <span className="dim">●</span>
              <span className="dim b"> Ready</span>
            </div>
            <div className="ttui-status-right">
              <span className="bmag">● </span>
              <span className="bmag">Opus 4.5</span>
              <span className="dim">{" · "}</span>
              <span className="green">████</span>
              <span className="dim">░░░░░░ 38%</span>
            </div>
          </div>
          <div className="ttui-accent dim" aria-hidden />
        </div>
      </div>
    </div>
  );
}

/* ── content ── */

const FEATURES = [
  { key: "SPEED", tone: "cyan", title: "Millisecond cold start", body: "One static C++26 binary — alive before an Electron splash finishes measuring your CPU." },
  { key: "SANDBOX", tone: "mag", title: "Sandboxed by default", body: "Every tool call runs in an OS sandbox. Filesystem and network are gated, not assumed." },
  { key: "AIRGAP", tone: "cyan", title: "SSH air-gap in one command", body: "Drive the agent on a remote box over SSH — no ports opened, no daemon, nothing to trust." },
  { key: "ACP", tone: "mag", title: "Runs inside Zed", body: "Speaks the Agent Client Protocol — drops into Zed's agent panel as a first-class backend." },
  { key: "AUTH", tone: "cyan", title: "Your Claude Pro/Max", body: "The exact OAuth flow Claude Code uses. No extra billing — use the plan you already pay for." },
  { key: "NODEPS", tone: "mag", title: "Nothing to install first", body: "No Node, Python, or Electron. curl one line; it runs on a fresh box with zero prerequisites." },
];

const PROVIDERS: { name: string; detail: string; tone?: "ok" | "brand" }[] = [
  { name: "Claude Pro / Max", detail: "OAuth · default", tone: "brand" },
  { name: "Anthropic API", detail: "API key" },
  { name: "OpenAI", detail: "gpt-* models" },
  { name: "Groq · Cerebras", detail: "fast inference" },
  { name: "OpenRouter · Together", detail: "aggregators" },
  { name: "Ollama", detail: "local · offline", tone: "ok" },
];

const COMPARE = [
  { dim: "runtime", us: "one static binary", them: "Node + Electron" },
  { dim: "cold start", us: "~2 ms", them: "seconds" },
  { dim: "install size", us: "≈13 MB", them: "hundreds of MB" },
  { dim: "sandbox", us: "on by default", them: "opt-in" },
  { dim: "SSH air-gap", us: "one command", them: "—" },
  { dim: "editor", us: "TUI + Zed (ACP)", them: "TUI only" },
  { dim: "providers", us: "Claude + 6 more", them: "Claude only" },
];
