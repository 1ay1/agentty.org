import "./agentty-tui.css";

/**
 * A faithful static replica of the agentty TUI, matching the real widget
 * structure: speaker turns with a bold left rail, the rounded AgentTimeline
 * "Actions" panel (tree glyphs + status icons + connectors + footer), a
 * bordered composer, and the status bar. Glyphs and colors mirror
 * src/runtime/view/* and maya/include/maya/widget/agent_timeline.hpp.
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
        {/* ── USER TURN ── */}
        <div className="ttui-turn rail-mag">
          <div className="row">
            <span className="mag b">❯ </span>
            <span className="mag b">You</span>
          </div>
          <div className="row">
            <span className="bwhite">refactor the auth handler to use the new token cache</span>
          </div>
        </div>

        <div className="ttui-rule" />

        {/* ── ASSISTANT TURN ── */}
        <div className="ttui-turn rail-bmag">
          <div className="row">
            <span className="bmag b">✦ </span>
            <span className="bmag b">Opus 4.7</span>
            <span className="faint">{"   12:34 · 4.2s · turn 3"}</span>
          </div>

          {/* Actions panel (AgentTimeline) */}
          <div className="ttui-panel">
            <div className="ttui-panel-top">
              <span className="dim">╭─</span>
              <span className="dim b ttui-cap">{" ᴀᴄᴛɪᴏɴs · 4/4 "}</span>
              <span className="dim ttui-fill">────────────────────────</span>
              <span className="dim b">{" 4.2s "}</span>
              <span className="dim">─╮</span>
            </div>

            {/* stats row */}
            <div className="ttui-panel-row">
              <span className="cyan b">ɪɴsᴘᴇᴄᴛ</span><span className="white"> 2</span>
              <span className="faint">{"  ·  "}</span>
              <span className="mag b">ᴍᴜᴛᴀᴛᴇ</span><span className="white"> 1</span>
              <span className="faint">{"  ·  "}</span>
              <span className="cyan b">sʜᴇʟʟ</span><span className="white"> 1</span>
            </div>

            {/* event: read (first) */}
            <div className="ttui-panel-row">
              <span className="cyan dim">╭─</span>
              <span> </span><span className="bgreen b">✓</span>
              <span>{"  "}</span><span className="cyan dim b">Read</span>
              <span>{"  "}</span><span className="cyan dim i">src/auth/handler.cpp</span>
              <span className="ttui-elapsed faint">142ms</span>
            </div>
            <div className="ttui-panel-row"><span className="cyan dim">{"   │"}</span></div>

            {/* event: grep */}
            <div className="ttui-panel-row">
              <span className="cyan dim">├─</span>
              <span> </span><span className="bgreen b">✓</span>
              <span>{"  "}</span><span className="cyan dim b">Grep</span>
              <span>{"  "}</span><span className="cyan dim i">TokenCache · 3 files</span>
              <span className="ttui-elapsed faint">89ms</span>
            </div>
            <div className="ttui-panel-row"><span className="mag dim">{"   │"}</span></div>

            {/* event: edit */}
            <div className="ttui-panel-row">
              <span className="mag dim">├─</span>
              <span> </span><span className="bgreen b">✓</span>
              <span>{"  "}</span><span className="mag dim b">Edit</span>
              <span>{"  "}</span><span className="mag dim i">src/auth/handler.cpp</span>
              <span className="ttui-elapsed green">+18 −9</span>
            </div>
            {/* edit body preview, striped with │ */}
            <div className="ttui-panel-row"><span className="mag dim">{"   │  "}</span><span className="faint">@@ resolve() @@</span></div>
            <div className="ttui-panel-row"><span className="mag dim">{"   │  "}</span><span className="red">{"- return fetch_remote(id);"}</span></div>
            <div className="ttui-panel-row"><span className="mag dim">{"   │  "}</span><span className="green">{"+ if (auto v = cache.lookup(id)) return *v;"}</span></div>
            <div className="ttui-panel-row"><span className="cyan dim">{"   │"}</span></div>

            {/* event: bash (last) */}
            <div className="ttui-panel-row">
              <span className="cyan dim">╰─</span>
              <span> </span><span className="bgreen b">✓</span>
              <span>{"  "}</span><span className="cyan dim b">Bash</span>
              <span>{"  "}</span><span className="cyan dim i">cmake --build build -j</span>
              <span className="ttui-elapsed yellow">3.6s</span>
            </div>
            <div className="ttui-panel-row"><span className="cyan dim">{"   │  "}</span><span className="faint">[100%] Built target agentty · exit 0</span></div>

            {/* footer */}
            <div className="ttui-panel-row">
              <span>{"   "}</span><span className="bgreen b">✓ ᴅᴏɴᴇ</span>
              <span className="white">{"   4 actions   4.2s"}</span>
            </div>

            <div className="ttui-panel-bot">
              <span className="dim">╰──────────────────────────────────────────────╯</span>
            </div>
          </div>

          {/* assistant prose */}
          <div className="row ttui-prose">
            <span className="bwhite">Auth handler now resolves through </span>
            <span className="bcyan">TokenCache::lookup</span>
            <span className="bwhite">, falling back to a</span>
          </div>
          <div className="row ttui-prose">
            <span className="bwhite">network refresh only on a miss. Build is green.</span>
          </div>
        </div>

        {/* ── COMPOSER ── */}
        <div className="ttui-composer">
          <div className="ttui-comp-top dim">╭────────────────────────────────────────────────╮</div>
          <div className="ttui-comp-mid">
            <span className="dim">│ </span>
            <span className="bmag b">❯ </span>
            <span className="faint">type a message…</span>
            <span className="term-cursor"> </span>
            <span className="ttui-comp-right faint">~120 tok</span>
            <span className="dim"> │</span>
          </div>
          <div className="ttui-comp-bot dim">╰────────────────────────────────────────────────╯</div>
        </div>

        {/* ── STATUS BAR ── */}
        <div className="ttui-status">
          <span className="bcyan">▎</span>
          <span className="cyan b"> Ready</span>
          <span className="faint">{"   "}</span>
          <span className="byellow">⚡</span>
          <span className="faint"> 0 t/s ▁▁▂▁▃▂▁ </span>
          <span className="bmag b">◆ Opus 4.7</span>
          <span className="faint">{"   "}</span>
          <span className="green">▰▰▰▰</span><span className="faint">▱▱▱▱▱▱ 38%</span>
        </div>
        <div className="ttui-shortcuts faint">
          <span><span className="bwhite">↵</span> send</span>
          <span><span className="bwhite">^K</span> palette</span>
          <span><span className="bwhite">^J</span> threads</span>
          <span><span className="bwhite">S-Tab</span> profile</span>
          <span><span className="bwhite">^C</span> quit</span>
        </div>
      </div>
    </div>
  );
}
