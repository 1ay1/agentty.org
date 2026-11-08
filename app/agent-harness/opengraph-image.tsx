import { OG_SIZE, ogCard } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "What is an agent harness?";

export default function Image() {
  return ogCard({
    section: "agent harness",
    title: "What is an agent harness?",
    meta: "The software around a model that makes it a working agent: tools, sandbox, context, any model.",
  });
}
