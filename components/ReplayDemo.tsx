import screenData from "@/lib/demo-screen.json";
import { ReplayTerminal } from "@/components/ReplayTerminal";
import { GLYPH_CSS, className, styleRule, type Screen } from "@/lib/replay";

/**
 * Server component (runs at build time): renders the recording's opening
 * screen as plain HTML, so the demo is fully painted before any JS loads —
 * no empty box, no layout shift. ReplayTerminal then adopts these exact
 * nodes and plays the rest of the session in place.
 */
export function ReplayDemo() {
  const s = screenData as unknown as Screen;
  const first = new Map(s.frames[0]?.[1] ?? []);
  const used = new Set<number>();
  first.forEach((segs) => segs.forEach((g) => used.add(s.classes[g[3]][0])));
  const css = GLYPH_CSS + [...used].map((i) => styleRule(i, s.styles[i])).join("");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <ReplayTerminal cols={s.cols} rows={s.rows} fg={s.fg} bg={s.bg}>
        {Array.from({ length: s.rows }, (_, y) => (
          <div key={y}>
            {(first.get(y) ?? []).map(([col, w, text, c]) => (
              <span key={col} data-c={col} className={className(s.classes[c])}
                style={{ left: `calc(var(--cw) * ${col})`, width: `calc(var(--cw) * ${w})` }}>
                {text}
              </span>
            ))}
          </div>
        ))}
      </ReplayTerminal>
    </>
  );
}
