import { AgenttyTui } from "@/components/AgenttyTui";

/**
 * Isolated capture page — renders ONLY the live TUI on a clean page bg,
 * sized exactly to the widget, so a headless browser can screenshot the
 * real component animation frame-by-frame for the README GIF. Not linked
 * from the site nav; exists purely as a recording surface.
 */
export default function DemoCapture() {
  return (
    <div
      id="capture"
      style={{
        background: "#08090c",
        width: 812,
        padding: "16px",
        display: "inline-block",
      }}
    >
      <AgenttyTui />
    </div>
  );
}
