import screenData from "@/lib/demo-screen.json";
import { ReplayTerminal } from "@/components/ReplayTerminal";
import { runCells, styleRule, type Screen } from "@/lib/replay";

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
  const css = [...used].map((i) => styleRule(i, s.styles[i])).join("");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <ReplayTerminal cols={s.cols} rows={s.rows} fg={s.fg} bg={s.bg}>
        {Array.from({ length: s.rows }, (_, y) => {
          let col = 0;
          return (
            <div key={y}>
              {(first.get(y) ?? []).map((r) => {
                const at = col, w = runCells(r);
                col += w;
                return (
                  <span key={at} className={`s${r[0]}`} style={{ left: `${at}ch`, width: `${w}ch` }}>
                    {r[1]}
                  </span>
                );
              })}
            </div>
          );
        })}
      </ReplayTerminal>
    </>
  );
}
