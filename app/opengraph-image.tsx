import { ImageResponse } from "next/og";
import { stats } from "@/lib/stats";

export const dynamic = "force-static";
export const alt = "agentty — blazing-fast Claude in your terminal";
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
          backgroundColor: "#08090c",
          backgroundImage:
            "radial-gradient(1000px 560px at 84% -12%, rgba(139,140,249,0.28), transparent 62%), radial-gradient(720px 460px at 6% 110%, rgba(94,234,212,0.18), transparent 58%)",
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
          <span style={{ color: "#8b8cf9" }}>▌</span>
          <span style={{ color: "#f2f4f8" }}>agentty</span>
        </div>

        <div
          style={{
            marginTop: "34px",
            fontSize: "76px",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            color: "#f2f4f8",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          Blazing-fast&nbsp;
          <span
            style={{
              backgroundImage: "linear-gradient(110deg,#8b8cf9,#5eead4)",
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
            color: "#a4adbb",
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
            color: "#5eead4",
          }}
        >
          <span style={{ color: "#8b8cf9" }}>$</span>
          <span style={{ color: "#c9d1d9" }}>
            curl -fsSL agentty.org/install.sh | sh
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
