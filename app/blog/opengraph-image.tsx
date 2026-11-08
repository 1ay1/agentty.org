import { OG_SIZE, ogCard } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "agentty blog";

export default function Image() {
  return ogCard({ section: "blog", title: "Notes from building agentty", meta: "Release notes, performance deep dives, and design notes." });
}
