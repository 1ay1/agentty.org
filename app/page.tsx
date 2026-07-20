import Link from "next/link";
import { site } from "@/lib/site";
import { stats } from "@/lib/stats";
import { starLabel } from "@/lib/repo";
import { CopyRow } from "@/components/CopyRow";
import { AgenttyTui } from "@/components/AgenttyTui";
import { AgenttyLogo } from "@/components/AgenttyLogo";
import { HeroBackgroundLazy } from "@/components/HeroBackgroundLazy";
import { SessionHome } from "@/components/SessionHome";

export default function Home() {
  return (
    <>
      {/* ── HERO (unchanged) ── */}
      <section className="hero">
        <HeroBackgroundLazy />
        <div className="wrap hero-grid">
          <div className="hero-inner">
            <div className="hero-logo">
              <AgenttyLogo />
            </div>
            <h1>
              Blazing-fast <span className="grad">coding agent</span>
              <br /> in your terminal.
            </h1>
            <p className="lede">
              A drop-in alternative to <code>claude-code</code>, written in C++26.{" "}
              <strong>{stats.sizeMB}&nbsp;binary</strong>,{" "}
              <strong>millisecond cold start</strong>,{" "}
              <strong>sandboxed by default</strong>, SSH air-gap in one command, and{" "}
              <strong>runs inside Zed</strong> over ACP. Signs in with your existing{" "}
              <strong>Claude Pro/Max</strong> &mdash; or point it at OpenAI, Groq,
              OpenRouter, Together, Cerebras, or a local Ollama model.
            </p>
            <div style={{ maxWidth: 560, width: "100%" }}>
              <CopyRow cmd={site.installOneLiner} typed />
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
          </div>
          <div className="hero-tui">
            <AgenttyTui />
          </div>
        </div>
      </section>

      {/* ── BODY: the whole page rendered as one agentty session ── */}
      <SessionHome />
    </>
  );
}
