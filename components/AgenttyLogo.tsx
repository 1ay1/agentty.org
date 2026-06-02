"use client";

import { useEffect, useRef, useState } from "react";
import "./agentty-logo.css";

/**
 * Exact replica of agentty's welcome-screen wordmark: "»AGENTTY" drawn in
 * a 6×7 pixel-art bitmap font, rendered through half-block cells (▀ ▄ █),
 * in bright-magenta. Animations match maya/widget/welcome_screen.hpp:
 *   Phase 1 [0, ~1.3s]  — cascade drop: each glyph falls in from above
 *                         with a 100ms stagger + ease-out cubic.
 *   Phase 2 [forever]   — per-letter sine bob (±1.5px, 2.2s period,
 *                         0.7rad/letter phase shift → wave travels L→R).
 *   Heartbeat           — every ~3.2s the whole mark flashes white 80ms.
 *
 * Glyph bitmaps are transcribed verbatim from welcome_screen.hpp.
 */

const FONT_W = 6;
const FONT_H = 7;
const SPACER = 1;
const TEXT = ">AGENTTY";

// 6×7 pixel-art font, '#' = lit. Transcribed exactly from the source.
const GLYPHS: Record<string, string[]> = {
  ">": [
    "      ",
    "#  #  ",
    "## ## ",
    " ## ##",
    "## ## ",
    "#  #  ",
    "      ",
  ],
  A: [
    "  ##  ",
    " #  # ",
    "#    #",
    "######",
    "#    #",
    "#    #",
    "#    #",
  ],
  G: [
    " #### ",
    "#    #",
    "#     ",
    "#  ###",
    "#    #",
    "#    #",
    " #### ",
  ],
  E: [
    "######",
    "#     ",
    "#     ",
    "##### ",
    "#     ",
    "#     ",
    "######",
  ],
  N: [
    "#    #",
    "##   #",
    "# #  #",
    "#  # #",
    "#   ##",
    "#    #",
    "#    #",
  ],
  T: [
    "######",
    "  ##  ",
    "  ##  ",
    "  ##  ",
    "  ##  ",
    "  ##  ",
    "  ##  ",
  ],
  Y: [
    "#    #",
    "#    #",
    " #  # ",
    "  ##  ",
    "  ##  ",
    "  ##  ",
    "  ##  ",
  ],
};

// canvas geometry — mirrors the source's pad layout
const PAD_TOP = 1;
const PAD_BOTTOM = 2;
const LETTER_Y = PAD_TOP;
const PW = TEXT.length * FONT_W + (TEXT.length - 1) * SPACER; // pixel width
const PH = FONT_H + PAD_TOP + PAD_BOTTOM;
const CH = Math.ceil(PH / 2); // cell rows (2 pixels per cell vertically)
const GRID_ROWS = CH * 2;

// animation params (ms / px) — verbatim from the source
const STAGGER_MS = 100;
const DROP_MS = 500;
const PHASE1_END = (TEXT.length - 1) * STAGGER_MS + DROP_MS;
const BOB_AMP = 1.5;
const BOB_PERIOD = 2200;
const BOB_LETTER_PHASE = 0.7;
const PULSE_PERIOD = 3200;
const PULSE_WIDTH = 80;
const OFF = -(FONT_H + PAD_TOP + 1); // off-screen-above start

function letterYOffset(li: number, age: number): number {
  const dropStart = li * STAGGER_MS;
  const dropEnd = dropStart + DROP_MS;
  if (age < dropStart) return OFF;
  if (age < dropEnd) {
    const t = (age - dropStart) / DROP_MS;
    const eased = 1 - (1 - t) * (1 - t) * (1 - t); // ease-out cubic
    return OFF * (1 - eased);
  }
  // phase 2 — sine bob with per-letter phase offset
  const t = age - dropEnd;
  const phase = (2 * Math.PI * t) / BOB_PERIOD + li * BOB_LETTER_PHASE;
  return Math.sin(phase) * BOB_AMP;
}

// which letter index a pixel column belongs to (for per-letter bob)
function letterAt(x: number): number {
  return Math.floor(x / (FONT_W + SPACER));
}

type CellKind = " " | "▀" | "▄" | "█";

export function AgenttyLogo() {
  const [age, setAge] = useState(0);
  const start = useRef<number | null>(null);
  const raf = useRef<number>(0);

  useEffect(() => {
    // Respect reduced-motion: render the fully-settled logo (no rAF loop, no
    // per-frame React re-renders) so there's zero ongoing main-thread cost.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setAge(PHASE1_END + 1);
      return;
    }

    const tick = (now: number) => {
      if (start.current === null) start.current = now;
      // Only pay the re-render cost while the tab is visible.
      if (!document.hidden) setAge(now - start.current);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  // heartbeat — only after phase 1 settles
  const inPulse =
    age > PHASE1_END && (age - PHASE1_END) % PULSE_PERIOD < PULSE_WIDTH;

  // build the pixel grid: lit[y*PW + x] = true
  const lit = new Uint8Array(PW * GRID_ROWS);
  for (let li = 0; li < TEXT.length; li++) {
    const g = GLYPHS[TEXT[li]];
    if (!g) continue;
    const baseX = li * (FONT_W + SPACER);
    const dy = Math.round(letterYOffset(li, age));
    for (let row = 0; row < FONT_H; row++) {
      const rowStr = g[row];
      for (let col = 0; col < FONT_W; col++) {
        if (rowStr[col] !== "#") continue;
        const x = baseX + col;
        const y = LETTER_Y + row + dy;
        if (y < 0 || y >= GRID_ROWS) continue;
        lit[y * PW + x] = 1;
      }
    }
  }

  // compose half-block cells
  const rows: { kind: CellKind }[][] = [];
  for (let cy = 0; cy < CH; cy++) {
    const cells: { kind: CellKind }[] = [];
    for (let x = 0; x < PW; x++) {
      const top = lit[cy * 2 * PW + x] === 1;
      const bot = lit[(cy * 2 + 1) * PW + x] === 1;
      let kind: CellKind = " ";
      if (top && bot) kind = "█";
      else if (top) kind = "▀";
      else if (bot) kind = "▄";
      cells.push({ kind });
    }
    rows.push(cells);
  }

  const color = inPulse ? "#ffffff" : "var(--logo-mag)";

  return (
    <div
      className="agentty-logo lg"
      role="img"
      aria-label="agentty"
      style={{ color }}
    >
      {rows.map((cells, cy) => (
        <div className="logo-row" key={cy}>
          {cells.map((c, x) => (
            <span key={x} className={c.kind === " " ? "px off" : "px on"}>
              {c.kind === " " ? "\u00a0" : c.kind}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
