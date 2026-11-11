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
  // The bob runs in CSS on the GPU; this only pauses it off screen (or in a
  // hidden tab) and drives the heartbeat: a class on for 180 ms of every
  // 5.76 s, so the 288 cells are restyled twice per beat, not every frame.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false, beat = 0, off = 0;
    const flash = () => {
      el.classList.add("flash");
      off = window.setTimeout(() => el.classList.remove("flash"), 180);
    };
    const run = () => {
      const on = seen && !document.hidden;
      el.classList.toggle("paused", !on);
      if (still) return;
      if (on && !beat) beat = window.setInterval(flash, 5760);
      else if (!on && beat) { clearInterval(beat); beat = 0; }
    };
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; run(); });
    io.observe(el);
    document.addEventListener("visibilitychange", run);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", run); clearInterval(beat); clearTimeout(off); };
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
              // the bob starts when this letter's drop ends (li*180 + 900 ms);
              // the 0.7 rad/letter phase of the TUI's travelling wave is
              // li * 0.7/(2π) * 4000 ≈ li*446 ms earlier in the 4 s loop
              "--bob-delay": `${li * 180 + 900 - li * 446}ms`,
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
