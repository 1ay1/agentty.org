// The docs clips (scripts/demo-clips.mjs): short recordings of the real
// agentty, pre-rendered to public/clips/<id>[-light].json. The docs show one
// when you hover a key that has a clip in that section ([[Ctrl+K]]) or a link
// written as [the command palette](clip:command-palette). Only clips that are
// recorded (both themes on disk) are offered.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { CLIPS, clipFor as resolve } from "../scripts/demo-clips.mjs";

export type ClipInfo = { id: string; title: string };

const recorded = (id: string) =>
  existsSync(join(process.cwd(), "public/clips", `${id}.json`)) && existsSync(join(process.cwd(), "public/clips", `${id}-light.json`));

export const clips: Record<string, ClipInfo> = Object.fromEntries(
  Object.entries(CLIPS as Record<string, { title: string }>)
    .filter(([id]) => recorded(id))
    .map(([id, c]) => [id, { id, title: c.title }]),
);

/** The clip a key mentioned under these headings shows, if one is recorded. */
export function clipFor(key: string, sections: string[]): string | undefined {
  const id = resolve(key, sections);
  return id && clips[id] ? id : undefined;
}
