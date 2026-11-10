// Reading a pre-rendered recording (lib/demo-screen*.json, public/clips/*.json):
// the screen at a moment, and its "look": the screens at the moments that
// matter, with what changes on every run blanked. Two recordings with the
// same look show the same UI, so the recorders keep the old file and a
// release that didn't change the UI adds nothing to git.
import fs from "node:fs";

const read = (f) => (typeof f === "string" ? JSON.parse(fs.readFileSync(f, "utf8")) : f);

/** Total length of a recording, in ms. */
export const lengthMs = (s) => (read(s).frames.reduce((a, f, i) => a + (i ? f[0] : 0), 0) * 1000) / read(s).fps;

/** The visible screen at `ms` from the start, as text. */
export function screenAt(file, ms) {
  const s = read(file);
  const rows = [];
  let tick = 0;
  const want = (ms * s.fps) / 1000;
  for (const [i, [delay, changes]] of s.frames.entries()) {
    if (i > 0) tick += delay;
    if (i > 0 && tick > want) break;
    for (const [y, segs] of changes) {
      const r = [];
      for (const [c, w, t] of segs) { const ch = [...t]; for (let k = 0; k < w; k++) r[c + k] = ch[k] ?? " "; }
      rows[y] = r.map((x) => x ?? " ").join("");
    }
  }
  return rows.slice(Math.max(0, rows.length - s.rows)).map((r) => r ?? "").join("\n");
}

const norm = (t) => t
  .replace(/[\u2800-\u28ff]/g, "*")                          // spinners
  .replace(/\b\d+(\.\d+)?\s?(ms|s|m)\b/g, "#")               // durations
  .replace(/\b\d+(\.\d+)?\s?t\/s\b/g, "#")                    // throughput
  .replace(/\[[0-9a-f]{8}\]/g, "[#]")                        // memory ids
  .replace(/\b[0-9a-f]{7,8}\b/g, "#")                        // short hashes
  .replace(/[\d.]+k?\/[\d.]+k/g, "#")                        // context counters
  .replace(/~\d+ tok/g, "~# tok")
  .replace(/\b\d+w\b/g, "#w")
  .replace(/[▁▂▃▄▅▆▇█░]{6,}/g, "#")                          // sparklines, meters
  .replace(/ +$/gm, "");

/** The screens at every named moment and at the end, normalised. */
export function look(file) {
  const s = read(file);
  const at = [...Object.values(s.marks ?? {}), lengthMs(s) + 1000].sort((a, b) => a - b);
  return at.map((ms) => norm(screenAt(s, ms))).join("\n\u0000\n");
}

/** True when two recordings show the same UI at the moments that matter. */
export function sameLook(a, b) {
  if (!fs.existsSync(a) || !fs.existsSync(b)) return false;
  return look(a) === look(b);
}
