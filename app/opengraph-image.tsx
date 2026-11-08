import { OG_SIZE, ogCard } from "@/lib/og";
import { stats } from "@/lib/stats";

export const dynamic = "force-static";
export const alt = "agentty — the agent harness for your terminal";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return ogCard({
    section: "agent harness",
    title: "Blazing-fast agent harness for your terminal.",
    meta: `Use the Claude, ChatGPT or Copilot plan you already pay for, or any model. One ${stats.sizeMB} binary, sandboxed by default.`,
  });
}
