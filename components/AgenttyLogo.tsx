"use client";

import { useEffect, useRef } from "react";
import "./agentty-logo.css";

/**
 * agentty's welcome-screen wordmark: ">AGENTTY" drawn in a 6×7 pixel-art
 * bitmap font, rendered through half-block cells (▀ ▄ █) in bright-magenta.
 *
 * Animation is driven entirely by CSS (composited transform + color), not by
 * a per-frame React re-render. The static glyph grid is built ONCE at module
 * scope and rendered once; each letter is its own column that CSS animates:
 *   • drop-in cascade — per-letter `animation-delay` (100ms stagger)
 *   • sine bob        — infinite per-letter transform, phase-shifted L→R
 *   • heartbeat       — color flash on the whole mark
 * This keeps the main thread idle (no rAF, no setState) → no long tasks.
 */

import { TEXT, buildLetter } from "@/lib/wordmark";

const LETTERS = TEXT.split("").map((ch) => buildLetter(ch));

export function AgenttyLogo() {
  const ref = useRef<HTMLDivElement>(null);
  // The bob and the heartbeat, stepped like the TUI's own frame clock: one
  // 12 fps timer, running only while the wordmark is on screen in a visible
  // tab. Each tick writes 8 `translate`s (compositor-only); the flash is a
  // class on for 150 ms of every 5.76 s.
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const letters = [...el.querySelectorAll<HTMLElement>(".logo-letter")];
    const t0 = performance.now();
    let timer = 0, seen = false;
    const tick = () => {
      const t = performance.now() - t0;
      letters.forEach((l, li) => {
        const start = li * 180 + 900;                 // the bob starts when this letter's drop ends
        const ph = t < start ? 0 : ((t - start) / 4000) * 2 * Math.PI + li * 0.7;
        l.style.translate = `0 ${(-0.16 * Math.sin(ph)).toFixed(3)}em`;
      });
      const beat = (t - 2160) % 5760;
      el.classList.toggle("flash", t > 2160 && beat > 5410 && beat < 5590);
    };
    const run = () => {
      const on = seen && !document.hidden;
      if (on && !timer) { tick(); timer = window.setInterval(tick, 83); }
      else if (!on && timer) { clearInterval(timer); timer = 0; }
    };
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; run(); });
    io.observe(el);
    document.addEventListener("visibilitychange", run);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", run); clearInterval(timer); };
  }, []);

  return (
    <div ref={ref} className="agentty-logo lg" role="img" aria-label="agentty">
      {LETTERS.map((cells, li) => (
        <span
          className="logo-letter"
          key={li}
          style={
            {
              "--li": li,
              // Cascade drop: 180ms stagger per letter (TUI kStaggerMs 100ms,
              // slowed 1.8×). Runs once.
              "--delay": `${li * 180}ms`,
            } as React.CSSProperties
          }
        >
          {cells.map((line, cy) => (
            <span className="logo-row" key={cy}>
              {line.map((c, x) => (
                <span key={x} className={c === " " ? "px off" : "px on"}>
                  {c === " " ? "\u00a0" : c}
                </span>
              ))}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}
