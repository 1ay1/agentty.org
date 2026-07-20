import Link from "next/link";
import { site } from "@/lib/site";
import { stats } from "@/lib/stats";
import { repo, starLabel } from "@/lib/repo";
import { CopyRow } from "@/components/CopyRow";
import { AgenttyTui } from "@/components/AgenttyTui";
import { AgenttyLogo } from "@/components/AgenttyLogo";
import { HeroBackgroundLazy } from "@/components/HeroBackgroundLazy";

/**
 * The homepage IS an agentty session.
 *
 * It opens with a boot banner, then every section is a command the user
 * "ran" (`$ agentty --features`, `--providers`, …). The output of each
 * command renders as a framed TUI panel hung off a left timeline rail,
 * closing with an exit-status stamp — exactly the shape of the real app's
 * turn timeline. No generic SaaS cards; the page reads like the tool.
 */

// A section header rendered as a shell command line.
function Cmd({
  bin = "agentty",
  flag,
  arg,
  comment,
}: {
  bin?: string;
  flag?: string;
  arg?: string;
  comment?: string;
}) {
  return (
    <div className="sx-cmd">
      <span className="sx-node" aria-hidden />
      <span className="sx-prompt">❯</span>
      <span className="sx-bin">{bin}</span>
      {flag && <span className="sx-flag">{flag}</span>}
      {arg && <span className="sx-arg">{arg}</span>}
      {comment && <span className="sx-comment"># {comment}</span>}
    </div>
  );
}

function Exit({ dur, note }: { dur: string; note?: string }) {
  return (
    <p className="sx-exit">
      <b>✓ exit 0</b>
      <span className="dur">· {dur}</span>
      {note && <span className="dur">· {note}</span>}
    </p>
  );
}

export default function Home() {
  return (
    <div className="session">
      {/* ── boot / hero ─────────────────────────────────────────── */}
      <section className="boot hero">
        <HeroBackgroundLazy />
        <div style={{ position: "relative", zIndex: 1 }}>
          <p className="boot-line">
            <span className="ok">●</span> booting <span className="b">agentty</span>{" "}
            v{stats.version} · <span className="c">C++26</span> · one static binary
          </p>
          <p className="boot-line">
            <span className="ok">✓</span> cold start <span className="c">{stats.coldStart}</span> ·{" "}
            {stats.sizeMB} · sandboxed · no Node / Python / Electron
          </p>

          <div style={{ margin: "22px 0 4px" }}>
            <AgenttyLogo />
          </div>

          <h1 className="boot-headline">
            A blazing-fast <span className="grad">coding agent</span>
            <br /> that lives in your terminal.
          </h1>

          <p className="boot-lede">
            A drop-in, native alternative to <code>claude-code</code>. Signs in with
            your existing <strong>Claude Pro/Max</strong> — or points at OpenAI, Groq,
            OpenRouter, Together, Cerebras, or a local <strong>Ollama</strong> model.
            Sandboxed by default, SSH air-gap in one command, and it{" "}
            <strong>runs inside Zed</strong> over ACP.
          </p>

          <div style={{ maxWidth: 560 }}>
            <CopyRow cmd={site.installOneLiner} />
          </div>

          <div className="hero-actions" style={{ marginTop: 22 }}>
            <Link className="btn btn-primary" href="/docs/quick-start" data-magnetic>
              Quick start →
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

          <div style={{ marginTop: 40 }}>
            <AgenttyTui />
          </div>
        </div>
      </section>

      {/* ── $ agentty --version : the spec readout ──────────────── */}
      <section className="sx">
        <Cmd flag="--version" comment="what you actually get" />
        <div className="panel">
          <div className="panel-head">
            <span className="tag">stdout</span>
            <span>spec</span>
            <span className="spacer" />
            <span className="hint">measured from the real binary</span>
          </div>
          <div className="panel-body">
            <div className="readout">
              <div className="rline hit">
                <span className="k">binary size</span>
                <span className="lead" />
                <span className="v brand">{stats.sizeMB}</span>
              </div>
              <div className="rline hit">
                <span className="k">cold start (<code>--version</code>)</span>
                <span className="lead" />
                <span className="v ok">{stats.coldStart}</span>
              </div>
              <div className="rline hit">
                <span className="k">runtime deps</span>
                <span className="lead" />
                <span className="v ok">0 — statically linked</span>
              </div>
              <div className="rline hit">
                <span className="k">language</span>
                <span className="lead" />
                <span className="v">C++26</span>
              </div>
              <div className="rline hit">
                <span className="k">platforms</span>
                <span className="lead" />
                <span className="v">linux · macos · x86_64 &amp; aarch64</span>
              </div>
              <div className="rline hit">
                <span className="k">license</span>
                <span className="lead" />
                <span className="v">{site.license}</span>
              </div>
            </div>
          </div>
        </div>
        <Exit dur="2 ms" />
      </section>

      {/* ── $ agentty --features : the capability grid ──────────── */}
      <section className="sx">
        <Cmd flag="--features" comment="why it feels different" />
        <div className="panel">
          <div className="panel-head">
            <span className="tag">stdout</span>
            <span>capabilities</span>
            <span className="spacer" />
            <span className="hint">
              press <kbd>j</kbd>/<kbd>k</kbd> to scan
            </span>
          </div>
          <div className="panel-body">
            <div className="pgrid">
              {FEATURES.map((f, i) => (
                <div className="pcell" key={f.title}>
                  <span className="pcell-key">
                    {f.key} <span className="id">#{String(i + 1).padStart(2, "0")}</span>
                  </span>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Exit dur="instant" note={`${FEATURES.length} features`} />
      </section>

      {/* ── $ agentty --providers : model backends ──────────────── */}
      <section className="sx">
        <Cmd flag="--providers" arg="--list" comment="bring your own model" />
        <div className="panel">
          <div className="panel-head">
            <span className="tag">stdout</span>
            <span>providers</span>
            <span className="spacer" />
            <span className="hint">any OpenAI-compatible endpoint works</span>
          </div>
          <div className="panel-body">
            <div className="readout">
              {PROVIDERS.map((p) => (
                <div className="rline hit" key={p.name}>
                  <span className="k">{p.name}</span>
                  <span className="lead" />
                  <span className={`v ${p.tone}`}>{p.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Exit dur="ready" />
      </section>

      {/* ── $ agentty diff claude-code : the comparison ─────────── */}
      <section className="sx">
        <Cmd bin="agentty" flag="diff" arg="claude-code" comment="honest tradeoffs" />
        <div className="panel">
          <div className="panel-head">
            <span className="tag">stdout</span>
            <span>agentty vs claude-code</span>
            <span className="spacer" />
            <span className="hint">— / + is us</span>
          </div>
          <div className="panel-body tablescroll">
            <table className="ptable">
              <thead>
                <tr>
                  <th>dimension</th>
                  <th>agentty</th>
                  <th>claude-code</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((r) => (
                  <tr key={r.dim}>
                    <td>{r.dim}</td>
                    <td className="win">{r.us}</td>
                    <td>{r.them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <Exit dur="—" note="same OAuth, same account" />
      </section>

      {/* ── $ agentty install : the CTA ─────────────────────────── */}
      <section className="sx sx--last">
        <Cmd flag="install" comment="one line, then you're in" />
        <div className="panel">
          <div className="panel-head">
            <span className="tag">exec</span>
            <span>installer</span>
            <span className="spacer" />
            <span className="hint">linux · macos · x86_64 &amp; aarch64</span>
          </div>
          <div className="panel-body">
            <CopyRow cmd={site.installOneLiner} />
            <p
              style={{
                fontFamily: "var(--sans)",
                color: "var(--text-dim)",
                fontSize: 14,
                margin: "14px 0 0",
              }}
            >
              Detects your platform, drops one static binary on <code>$PATH</code>, and
              self-updates from the same line. Windows?{" "}
              <code>{site.installOneLinerWindows}</code>
            </p>
            <div className="hero-actions" style={{ marginTop: 20 }}>
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
                ★ Star on GitHub
              </a>
            </div>
          </div>
        </div>
        <Exit dur="welcome aboard" />
      </section>
    </div>
  );
}

/* ── content ─────────────────────────────────────────────────── */

const FEATURES = [
  {
    key: "SPEED",
    title: "Millisecond cold start",
    body: "A single static C++26 binary. It's alive before an Electron splash screen would have finished measuring your CPU.",
  },
  {
    key: "SANDBOX",
    title: "Sandboxed by default",
    body: "Every tool call runs inside an OS sandbox. Filesystem and network access are gated, not assumed.",
  },
  {
    key: "AIRGAP",
    title: "SSH air-gap in one command",
    body: "Push the agent onto a remote box and drive it over SSH — no ports opened, no daemon, nothing to trust.",
  },
  {
    key: "ACP",
    title: "Runs inside Zed",
    body: "Speaks the Agent Client Protocol, so it drops straight into Zed's agent panel as a first-class backend.",
  },
  {
    key: "AUTH",
    title: "Your Claude Pro/Max",
    body: "The exact OAuth flow Claude Code uses. No extra billing — sign in with the plan you already pay for.",
  },
  {
    key: "NO-DEPS",
    title: "Nothing to install first",
    body: "No Node, no Python, no Electron runtime. curl one line and it runs on a fresh box with zero prerequisites.",
  },
];

const PROVIDERS = [
  { name: "Claude Pro / Max", detail: "OAuth · default", tone: "brand" },
  { name: "Anthropic API", detail: "API key", tone: "" },
  { name: "OpenAI", detail: "gpt-* models", tone: "" },
  { name: "Groq · Cerebras", detail: "fast inference", tone: "" },
  { name: "OpenRouter · Together", detail: "aggregators", tone: "" },
  { name: "Ollama", detail: "local · offline", tone: "ok" },
];

const COMPARE = [
  { dim: "runtime", us: "one static binary", them: "Node + Electron" },
  { dim: "cold start", us: "~2 ms", them: "seconds" },
  { dim: "install size", us: "≈13 MB", them: "hundreds of MB" },
  { dim: "sandbox", us: "on by default", them: "opt-in" },
  { dim: "SSH air-gap", us: "one command", them: "—" },
  { dim: "editor", us: "TUI + Zed (ACP)", them: "TUI" },
  { dim: "providers", us: "Claude + 6 more", them: "Claude only" },
];
