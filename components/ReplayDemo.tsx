import dark from "@/lib/demo-screen.json";
import light from "@/lib/demo-screen-light.json";
import { ReplayTerminal } from "@/components/ReplayTerminal";
import { GLYPH_CSS, PREFIX, className, styleRule, type DemoTheme, type Screen } from "@/lib/replay";

/**
 * Server component (runs at build time): renders the recording's opening
 * screen as plain HTML, so the demo is fully painted before any JS loads —
 * no empty box, no layout shift. The session is recorded twice, in agentty's
 * own Flexoki Dark and Flexoki Light themes; both opening screens are in the
 * HTML and CSS shows the one that matches the site's theme. ReplayTerminal
 * then adopts those nodes and plays the rest in place, switching recordings
 * (and keeping its place) when the site theme changes.
 */
function opening(theme: DemoTheme, s: Screen) {
  const p = PREFIX[theme];
  const first = new Map(s.frames[0]?.[1] ?? []);
  const used = new Set<number>();
  first.forEach((segs) => segs.forEach((g) => used.add(s.classes[g[3]][0])));
  const css = [...used].map((i) => styleRule(i, s.styles[i], p)).join("");
  const rows = Array.from({ length: s.rows }, (_, y) => (
    <div key={y}>
      {(first.get(y) ?? []).map(([col, w, text, c]) => (
        <span key={col} data-c={col} className={className(s.classes[c], p)}
          style={{ left: `${(col * 0.6).toFixed(1)}em`, width: `${(w * 0.6).toFixed(1)}em` }}>
          {text}
        </span>
      ))}
    </div>
  ));
  return { css, rows, fg: s.fg, bg: s.bg };
}

export function ReplayDemo() {
  const d = opening("dark", dark as unknown as Screen);
  const l = opening("light", light as unknown as Screen);
  const s = dark as unknown as Screen;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLYPH_CSS + d.css + l.css }} />
      <ReplayTerminal cols={s.cols} rows={s.rows} dark={d} light={l} />
    </>
  );
}
