import screenData from "@/lib/demo-screen.json";
import { ReplayTerminal } from "@/components/ReplayTerminal";
import { GLYPH_CSS, segClass, segments, styleRule, type Screen } from "@/lib/replay";

/**
 * Server component (runs at build time): renders the recording's opening
 * screen as plain HTML, so the demo is fully painted before any JS loads —
 * no empty box, no layout shift. ReplayTerminal then takes it over and plays
 * the rest of the session in the same DOM.
 */
export function ReplayDemo() {
  const s = screenData as unknown as Screen;
  const first = new Map(s.frames[0]?.[1] ?? []);
  const used = new Set<number>();
  first.forEach((runs) => runs.forEach((r) => used.add(r[0])));
  const css = GLYPH_CSS + [...used].map((i) => styleRule(i, s.styles[i])).join("");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <ReplayTerminal cols={s.cols} rows={s.rows} fg={s.fg} bg={s.bg}>
        {Array.from({ length: s.rows }, (_, y) => (
          <div key={y}>
            {segments(first.get(y) ?? [], s.styles).map((g) => (
              <span key={g[0]} className={segClass(g)} style={{ left: `${g[0]}ch`, width: `${g[1]}ch` }}>
                {g[2]}
              </span>
            ))}
          </div>
        ))}
      </ReplayTerminal>
    </>
  );
}
