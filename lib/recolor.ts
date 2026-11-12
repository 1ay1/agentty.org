// recolor.ts: repaint a recording made in one colour scheme in another.
//
// agentty draws from its theme's named slots (primary, accent, success, text,
// muted, surface, ...), but much of what lands on screen is a BLEND of them:
// streaming text fading in, dimmed hints, the wordmark's gradient, borders
// mixed toward the background. Only 8 of the demo's 320 recorded colours are
// a slot exactly, so a lookup table can't recolour it.
//
// Instead, in OKLab (where straight lines are perceptually even), every
// recorded colour is projected onto the segment between the two slot colours
// that explain it best: "60% of the way from muted to text, plus a small
// tint". The same blend is then rebuilt between the NEW scheme's two slots,
// and the tint carried over. A fade stays a fade, a gradient stays a
// gradient, a dimmed hint stays dimmed, in whatever scheme you pick.

type Lab = [number, number, number];

const toLin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toSrgb = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

function hexRgb(c: string): [number, number, number, number] | null {
  let m = c.match(/^#([0-9a-f]{6})$/i);
  if (m) { const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]; }
  m = c.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)$/i);
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  return null;
}
function lab([r, g, b]: number[]): Lab {
  const R = toLin(r / 255), G = toLin(g / 255), B = toLin(b / 255);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function rgb([L, a, b]: Lab): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const out = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return "#" + out.map((v) => Math.round(Math.min(1, Math.max(0, toSrgb(v))) * 255).toString(16).padStart(2, "0")).join("");
}
const sub = (a: Lab, b: Lab): Lab => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Lab, b: Lab): Lab => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Lab, k: number): Lab => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Lab, b: Lab) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** A colour mapper from the scheme `from` to the scheme `to` (same slot order). */
export function makeRecolor(from: string[], to: string[]): (c: string) => string {
  // anchors: every slot, plus white and black (the wordmark flashes white),
  // each paired with where it goes; duplicate source colours collapse
  const src: Lab[] = [], dst: Lab[] = [];
  const seen = new Set<string>();
  const push = (a: string, b: string) => {
    const k = a.toLowerCase();
    const ra = hexRgb(a), rb = hexRgb(b);
    if (seen.has(k) || !ra || !rb) return;
    seen.add(k); src.push(lab(ra)); dst.push(lab(rb));
  };
  from.forEach((c, i) => push(c, to[i]));
  push("#ffffff", "#ffffff"); push("#000000", "#000000");

  const cache = new Map<string, string>();
  return (c: string) => {
    let hit = cache.get(c);
    if (hit !== undefined) return hit;
    const px = hexRgb(c);
    if (!px) return c;
    const p = lab(px);
    let best = Infinity, out: Lab = p;
    for (let i = 0; i < src.length; i++) {
      // one slot, with the tint carried over
      const ri = sub(p, src[i]), ei = dot(ri, ri);
      if (ei < best) { best = ei; out = add(dst[i], ri); }
      for (let j = i + 1; j < src.length; j++) {
        // a blend of two slots: project onto the segment between them
        const d = sub(src[j], src[i]), dd = dot(d, d);
        if (dd < 1e-9) continue;
        const t = Math.min(1, Math.max(0, dot(ri, d) / dd));
        const r = sub(p, add(src[i], mul(d, t))), e = dot(r, r);
        if (e < best) { best = e; out = add(add(dst[i], mul(sub(dst[j], dst[i]), t)), r); }
      }
    }
    const hex = rgb(out);
    hit = px[3] < 1 ? `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${px[3]})` : hex;
    cache.set(c, hit);
    return hit;
  };
}
