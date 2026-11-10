// The docs clips (scripts/demo-clips.mjs): short recordings of the real
// agentty, pre-rendered to public/clips/<id>[-light].json. The docs show one
// when you hover a key that has a clip ([[Ctrl+K]]) or a link written as
// [the command palette](clip:command-palette).
import { CLIPS } from "../scripts/demo-clips.mjs";

export type ClipInfo = { id: string; title: string; key: string };

export const clips: Record<string, ClipInfo> = Object.fromEntries(
  Object.entries(CLIPS as Record<string, { title: string; keys_label: string }>).map(([id, c]) => [
    id, { id, title: c.title, key: c.keys_label },
  ]),
);

// "Ctrl+K", "^K", "C-k", "ctrl k" all name the same key
const norm = (k: string) =>
  k.trim().toLowerCase().replace(/^\^/, "ctrl+").replace(/^c-/, "ctrl+").replace(/\s+/g, "+").replace(/^shift\+tab$/, "s-tab");

const byKey = new Map(Object.values(clips).map((c) => [norm(c.key), c.id]));

/** The clip a key shows, if any. */
export const clipForKey = (key: string): string | undefined => byKey.get(norm(key));
