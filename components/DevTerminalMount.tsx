"use client";

import dynamic from "next/dynamic";

// Client-only mount: the terminal is stateful, keyboard-driven, and touches
// window/document, so it must not render on the server.
const DevTerminal = dynamic(() => import("./DevTerminal"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#07080b",
        color: "#5c6370",
        fontFamily: "var(--font-mono), ui-monospace, monospace",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
      }}
    >
      ⠋ booting agentty…
    </div>
  ),
});

export function DevTerminalMount() {
  return <DevTerminal />;
}
