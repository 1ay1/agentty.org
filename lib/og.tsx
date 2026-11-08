import { ImageResponse } from "next/og";

// One social-card design for the whole site, rendered at build time: the
// site's own look (Flexoki black, agentty magenta, monospace), a section
// label and the page's real title, so every shared link unfurls as itself.
export const OG_SIZE = { width: 1200, height: 630 };

export function ogCard({ section, title, meta }: { section: string; title: string; meta?: string }) {
  const size = title.length > 70 ? 54 : title.length > 40 ? 64 : 76;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "72px 80px", backgroundColor: "#100f0f", fontFamily: "monospace",
          borderLeft: "14px solid #ce5d97",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: "30px", fontWeight: 700 }}>
          <span style={{ width: "12px", height: "34px", backgroundColor: "#ce5d97" }} />
          <span style={{ color: "#cecdc3" }}>agentty</span>
          <span style={{ color: "#878580", fontWeight: 400 }}>/ {section}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ fontSize: `${size}px`, fontWeight: 800, lineHeight: 1.12, color: "#cecdc3", maxWidth: "1040px" }}>
            {title}
          </div>
          {meta && <div style={{ fontSize: "26px", color: "#878580", maxWidth: "1040px" }}>{meta}</div>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "24px", color: "#878580" }}>
          <span>agentty.org</span>
          <span style={{ color: "#3aa99f" }}>agent harness · any model</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
