import { OG_SIZE, ogCard } from "@/lib/og";
import bench from "@/lib/bench.generated.json";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Agent harness benchmarks";

export default function Image() {
  const a = bench.tools.find((t) => t.id === "agentty")!;
  return ogCard({
    section: "benchmarks",
    title: "Agent harness benchmarks",
    meta: `agentty is ready to type in ${Math.round(a.readyMs.median)} ms using ${Math.round(a.idleRssMB)} MB, measured against Claude Code, Codex CLI, Gemini CLI, opencode, jcode and Aider.`,
  });
}
