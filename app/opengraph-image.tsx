import { ImageResponse } from "next/og";
import { stats } from "@/lib/stats";

export const dynamic = "force-static";
export const alt = "agentty — a blazing-fast coding agent in your terminal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#0d1117",
          backgroundImage:
            "radial-gradient(1000px 560px at 84% -12%, rgba(88, 166, 255,0.28), transparent 62%), radial-gradient(720px 460px at 6% 110%, rgba(210, 168, 255,0.18), transparent 58%)",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            color: "#e29be0",
            fontSize: "34px",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ color: "#58a6ff" }}>▌</span>
          <span style={{ color: "#e6edf3" }}>agentty</span>
        </div>

        <div
          style={{
            marginTop: "34px",
            fontSize: "76px",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            color: "#e6edf3",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          Blazing-fast&nbsp;
          <span
            style={{
              backgroundImage: "linear-gradient(110deg,#58a6ff,#d2a8ff)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Claude
          </span>
          &nbsp;in your terminal.
        </div>

        <div
          style={{
            marginTop: "30px",
            fontSize: "30px",
            color: "#8b949e",
            lineHeight: 1.4,
            maxWidth: "1000px",
          }}
        >
          {`A C++26 alternative to claude-code. ${stats.sizeMB} static binary · millisecond cold start · sandboxed by default · SSH air-gap in one command.`}
        </div>

        <div
          style={{
            marginTop: "44px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: "26px",
            color: "#d2a8ff",
          }}
        >
          <span style={{ color: "#58a6ff" }}>$</span>
          <span style={{ color: "#e6edf3" }}>
            curl -fsSL agentty.org/install.sh | sh
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
