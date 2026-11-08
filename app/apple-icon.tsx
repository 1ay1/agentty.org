import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS home-screen / bookmark icon (iOS ignores SVG touch icons).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#100f0f" }}>
        <div style={{ width: "34px", height: "104px", backgroundColor: "#ce5d97" }} />
      </div>
    ),
    size,
  );
}
