import "./agentty-tui.css";

/**
 * A faithful static replica of the agentty TUI. Every glyph, color, and
 * layout decision is lifted directly from the real source:
 *   - turn header / rail  → src/runtime/view/thread/turn/turn.cpp + maya/widget/turn.hpp
 *   - Actions panel       → maya/widget/agent_timeline.hpp + agent_timeline.cpp
 *   - tool colors / detail→ src/runtime/view/thread/turn/agent_timeline/tool_helpers.cpp
 *   - status bar          → maya/widget/status_bar.hpp + src/runtime/view/status_bar/*
 *   - palette             → include/agentty/runtime/view/palette.hpp
 *
 * Glyphs:  ❯ user · ✦ assistant · ╭─ ├─ ╰─ tree · │ connector · ✓ done
 *          ● model/idle · ⚡ rate · ▎ title edge · ▌ phase rail · ─ accent
 * small_caps: every letter uppercased + space-separated → "A C T I O N S".
 */
export function AgenttyTui() {
  return (
    <div className="ttui" role="img" aria-label="agentty terminal interface showing a coding session">
      <div className="ttui-bar">
        <span className="ttui-dot r" />
        <span className="ttui-dot y" />
        <span className="ttui-dot g" />
        <span className="ttui-title">agentty — ~/projects/app</span>
      </div>

      <div className="ttui-body">
        {/* ── USER TURN ── rail: bold left border, role_brand (magenta) ── */}
        <div className="ttui-turn rail-mag">
          <div className="row ttui-head">
            <span className="mag">❯</span>
            <span> </span>
            <span className="mag b">You</span>
            <span className="ttui-meta dim">12:34</span>
          </div>
          <div className="row ttui-blank" />
          <div className="row">
            <span className="bwhite">refactor the auth handler to use the new token cache</span>
          </div>
        </div>

        {/* ── ASSISTANT TURN ── rail: role_brand_alt (bright_magenta, Opus) ── */}
        <div className="ttui-turn rail-bmag">
          <div className="row ttui-head">
            <span className="bmag">✦</span>
            <span> </span>
            <span className="bmag b">Opus 4.7</span>
            <span className="ttui-meta dim">{"12:34  ·  4.2s  ·  turn 3"}</span>
          </div>
          <div className="row ttui-blank" />

          {/* Actions panel — maya::AgentTimeline (rounded border) */}
          <div className="ttui-panel">
            {/* top border with start title + end title */}
            <div className="ttui-panel-top">
              <span className="dim">╭─</span>
              <span className="dim b ttui-cap">{" A C T I O N S  ·  4/4 "}</span>
              <span className="dim ttui-fill" />
              <span className="dim b">{" 4.2s "}</span>
              <span className="dim">─╮</span>
            </div>

            {/* stats row: small-caps category · count, dots ornamental */}
            <div className="ttui-panel-line">
              <span className="ttui-edge dim">│</span>
              <span className="ttui-pad">
                <span className="cyan b">I N S P E C T</span><span className="white"> 2</span>
                <span className="dim">{"  ·  "}</span>
                <span className="mag b">M U T A T E</span><span className="white"> 1</span>
                <span className="dim">{"  ·  "}</span>
                <span className="cyan b">E X E C U T E</span><span className="white"> 1</span>
              </span>
              <span className="ttui-edge dim">│</span>
            </div>
            <div className="ttui-panel-line"><span className="ttui-edge dim">│</span><span className="ttui-pad" /><span className="ttui-edge dim">│</span></div>

            {/* event 0 — Read (inspect → bright_cyan, dim because terminal) */}
            <PanelRow>
              <span className="cyan dim">╭─</span>
              <span> </span><span className="bgreen b">✓</span>
              <span>{"  "}</span><span className="cyan dim b">Read</span>
              <span>{"  "}</span><span className="cyan dim i">{"src/auth/handler.cpp  ·  214 lines"}</span>
              <span className="ttui-elapsed dim">{"142ms"}</span>
            </PanelRow>
            {/* connector: color of NEXT event status (Done → bright_black) */}
            <PanelRow><span className="dim">{"   │"}</span></PanelRow>

            {/* event 1 — Grep (inspect → bright_cyan) */}
            <PanelRow>
              <span className="cyan dim">├─</span>
              <span> </span><span className="bgreen b">✓</span>
              <span>{"  "}</span><span className="cyan dim b">Grep</span>
              <span>{"  "}</span><span className="cyan dim i">{"TokenCache  ·  3 matches"}</span>
              <span className="ttui-elapsed dim">{" 89ms"}</span>
            </PanelRow>
            <PanelRow><span className="dim">{"   │"}</span></PanelRow>

            {/* event 2 — Edit (mutate → magenta) */}
            <PanelRow>
              <span className="mag dim">├─</span>
              <span> </span><span className="bgreen b">✓</span>
              <span>{"  "}</span><span className="mag dim b">Edit</span>
              <span>{"  "}</span><span className="mag dim i">{"src/auth/handler.cpp  (+18 −9)"}</span>
              <span className="ttui-elapsed green">{"  6ms"}</span>
            </PanelRow>
            {/* body preview, striped with the event's `│` connector */}
            <PanelRow><span className="mag dim">{"   │  "}</span><span className="dim">{"@@ resolve(id) @@"}</span></PanelRow>
            <PanelRow><span className="mag dim">{"   │  "}</span><span className="red">{"- return fetch_remote(id);"}</span></PanelRow>
            <PanelRow><span className="mag dim">{"   │  "}</span><span className="green">{"+ if (auto v = cache.lookup(id)) return *v;"}</span></PanelRow>
            <PanelRow><span className="dim">{"   │"}</span></PanelRow>

            {/* event 3 — Bash (execute → cyan), last → ╰─ */}
            <PanelRow>
              <span className="cyan dim">╰─</span>
              <span> </span><span className="bgreen b">✓</span>
              <span>{"  "}</span><span className="cyan dim b">Bash</span>
              <span>{"  "}</span><span className="cyan dim i">{"cmake --build build -j"}</span>
              <span className="ttui-elapsed yellow">{"  3.6s"}</span>
            </PanelRow>
            <PanelRow><span className="dim">{"   │  "}</span><span className="dim">{"[100%] Built target agentty"}</span></PanelRow>

            {/* footer — present whole lifetime; ✓ DONE in success color */}
            <PanelRow><span className="ttui-pad" /></PanelRow>
            <PanelRow>
              <span>{"   "}</span><span className="bgreen b">{"✓ "}</span>
              <span className="bgreen b">D O N E</span>
              <span className="white">{"   4 actions   4.2s"}</span>
            </PanelRow>

            <div className="ttui-panel-bot">
              <span className="dim">╰</span>
              <span className="dim ttui-fill-bot" />
              <span className="dim">╯</span>
            </div>
          </div>

          {/* assistant prose — bright_white body, bright_cyan code refs */}
          <div className="row ttui-blank" />
          <div className="row ttui-prose">
            <span className="bwhite">Auth handler now resolves through </span>
            <span className="bcyan">TokenCache::lookup</span>
            <span className="bwhite">, falling back to a network</span>
          </div>
          <div className="row ttui-prose">
            <span className="bwhite">refresh only on a miss. Build is green.</span>
          </div>
        </div>

        {/* ── COMPOSER ── maya::Composer (rounded border, 2-row body) ── */}
        <div className="ttui-composer">
          <div className="ttui-comp-top">
            <span className="dim">╭</span>
            <span className="dim ttui-fill-bot" />
            <span className="dim">╮</span>
          </div>
          <div className="ttui-comp-mid">
            <span className="dim">│ </span>
            <span className="bmag b">❯ </span>
            <span className="dim">type a message…</span>
            <span className="term-cursor"> </span>
            <span className="ttui-comp-right" />
            <span className="dim"> │</span>
          </div>
          <div className="ttui-comp-bot">
            <span className="dim">╰</span>
            <span className="dim ttui-fill-bot" />
            <span className="dim">╯</span>
          </div>
        </div>

        {/* ── STATUS BAR ── maya::StatusBar: accent / activity / accent ── */}
        <div className="ttui-accent dim">────────────────────────────────────────────────────────────</div>
        <div className="ttui-status">
          <div className="ttui-status-left">
            <span> </span>
            <span className="cyan">▎</span>
            <span className="white"> refactor auth</span>
            <span className="dim">{"   ·   "}</span>
            <span className="dim">▌</span>
            <span> </span>
            <span className="dim">●</span>
            <span className="dim b"> Ready</span>
          </div>
          <div className="ttui-status-right">
            <span className="yellow">⚡ </span>
            <span className="cyan">{"  0.0"}</span>
            <span className="cyan"> t/s </span>
            <span className="cyan">▁▁▂▁▃▂▁▁▂▁▂▃▂▁▁▁</span>
            <span className="dim">{"   ·   "}</span>
            <span className="bmag">● </span>
            <span className="bmag">Opus 4.7</span>
            <span className="dim">{" · "}</span>
            <span className="green">████</span><span className="dim">░░░░░░ 38%</span>
            <span> </span>
          </div>
        </div>
        <div className="ttui-accent dim">────────────────────────────────────────────────────────────</div>
      </div>
    </div>
  );
}

/* A single content row inside the Actions panel: left border, padded
   content, right border — mirrors maya's bordered card with padding(0,1). */
function PanelRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="ttui-panel-line">
      <span className="ttui-edge dim">│</span>
      <span className="ttui-pad">{children}</span>
      <span className="ttui-edge dim">│</span>
    </div>
  );
}
